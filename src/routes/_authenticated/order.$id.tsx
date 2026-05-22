import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PipelineBar } from "@/components/PipelineBar";
import { toast } from "sonner";
import type { OrderStatus } from "@/lib/constants";
import { TAG_LABELS } from "@/lib/constants";
import { ImagePlus, Send, CheckCircle2, ArrowRight, QrCode } from "lucide-react";

export const Route = createFileRoute("/_authenticated/order/$id")({
  component: OrderPage,
});

interface Order {
  id: string;
  client_id: string;
  restaurant_id: string;
  dish_name: string | null;
  status: OrderStatus;
  is_premium_custom: boolean;
  base_price: number | null;
  final_price: number | null;
  customized_recipe: { portions?: number; specs?: string } | null;
  health_tags: string[];
}
interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  message_text: string | null;
  image_url: string | null;
  kind: string;
  created_at: string;
}

const NEXT_STAGE: Record<OrderStatus, OrderStatus | null> = {
  chat_activo: "pendiente_pago",
  pendiente_pago: "en_cocina",
  en_cocina: "entregado",
  entregado: null,
  cancelado: null,
};

function OrderPage() {
  const { id } = Route.useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadKind, setUploadKind] = useState<"qr" | "voucher" | "image">("image");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const listEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: o } = await supabase.from("orders_chat_hub").select("*").eq("id", id).maybeSingle();
      setOrder(o as Order);
      if (o) {
        const { data: meta } = await supabase
          .from("restaurants_metadata")
          .select("qr_url")
          .eq("id", o.restaurant_id)
          .maybeSingle();
        if (meta?.qr_url) {
          setQrUrl(meta.qr_url);
        }
      }
      const { data: m } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: true });
      setMessages((m as Message[]) ?? []);
    };
    fetchAll();

    const ch = supabase
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders_chat_hub", filter: `id=eq.${id}` },
        (payload) => {
          if (payload.new) setOrder(payload.new as Order);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `order_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => { listEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  if (!order || !profile) return <div className="p-10 text-center text-sm text-muted-foreground">Cargando pedido…</div>;

  const isRestaurant = profile.id === order.restaurant_id;
  const isClient = profile.id === order.client_id;

  const sendText = async () => {
    if (!text.trim()) return;
    const { error } = await supabase.from("chat_messages").insert({
      order_id: order.id,
      sender_id: profile.id,
      message_text: text,
      kind: "text",
    });
    if (error) return toast.error(error.message);
    setText("");
  };

  const uploadFile = async (file: File, kind: "qr" | "voucher" | "image") => {
    const path = `chats/${order.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("chat-uploads").upload(path, file);
    if (error) return toast.error(error.message);
    const { data: pub } = supabase.storage.from("chat-uploads").getPublicUrl(path);
    await supabase.from("chat_messages").insert({
      order_id: order.id,
      sender_id: profile.id,
      image_url: pub.publicUrl,
      kind,
      message_text: kind === "qr" ? "Código QR de cobro" : kind === "voucher" ? "Comprobante de pago" : null,
    });
    toast.success("Adjunto enviado");
  };

  const setPrice = async () => {
    const p = Number(priceInput);
    if (!p || p <= 0) return toast.error("Precio inválido");

    const { data: meta } = await supabase.from("restaurants_metadata").select("qr_url").eq("id", profile.id).maybeSingle();

    await supabase
      .from("orders_chat_hub")
      .update({ final_price: p, status: "pendiente_pago" })
      .eq("id", order.id);
    await supabase.from("chat_messages").insert({
      order_id: order.id,
      sender_id: profile.id,
      message_text: `💰 Precio fijado: S/ ${p.toFixed(2)}. Esperando pago.`,
      kind: "system",
    });

    if (meta?.qr_url) {
      await supabase.from("chat_messages").insert({
        order_id: order.id,
        sender_id: profile.id,
        image_url: meta.qr_url,
        message_text: "Código QR de cobro (Automático)",
        kind: "qr",
      });
    }

    setPriceInput("");
  };

  const acceptPayment = async () => {
    await supabase
      .from("orders_chat_hub")
      .update({ status: "en_cocina" })
      .eq("id", order.id);
    await supabase.from("chat_messages").insert({
      order_id: order.id,
      sender_id: profile.id,
      message_text: "✅ Pago confirmado. El plato está en preparación.",
      kind: "system",
    });
    toast.success("Pago confirmado. Pipeline activado.");
  };

  const advance = async () => {
    const next = NEXT_STAGE[order.status];
    if (!next) return;
    await supabase.from("orders_chat_hub").update({ status: next }).eq("id", order.id);
    await supabase.from("chat_messages").insert({
      order_id: order.id,
      sender_id: profile.id,
      message_text: `➡️ Estado: ${next === "entregado" ? "Entregado" : "En Cocina"}`,
      kind: "system",
    });
    if (next === "entregado") {
      toast.success("¡Entregado! Puntos y métricas actualizados.");
      setShowSuccessModal(true);
      setTimeout(() => {
        navigate({ to: "/dashboard" });
      }, 4000);
    }
  };

  const cancel = async () => {
    await supabase.from("orders_chat_hub").update({ status: "cancelado" }).eq("id", order.id);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link to="/orders" className="text-sm text-muted-foreground hover:underline">← Mis pedidos</Link>

      <div className="mt-3 rounded-3xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Pedido</div>
            <h1 className="font-display text-2xl font-semibold">{order.dish_name}</h1>
            <div className="mt-1 flex flex-wrap gap-1">
              {order.health_tags.map((t) => (
                <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{TAG_LABELS[t] ?? t}</span>
              ))}
              {order.is_premium_custom && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Premium · personalizado</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-xl font-semibold">
              {order.final_price ? `S/ ${Number(order.final_price).toFixed(2)}` : "Pendiente"}
            </div>
            <div className="text-[10px] uppercase text-muted-foreground">precio final</div>
          </div>
        </div>

        {order.customized_recipe && (
          <div className="mt-3 rounded-xl bg-muted/60 p-3 text-xs">
            <strong>Personalización:</strong> {order.customized_recipe.portions ?? 1} porción(es).{" "}
            {order.customized_recipe.specs && <>Specs: {order.customized_recipe.specs}</>}
          </div>
        )}
      </div>

      <div className="mt-4">
        <PipelineBar status={order.status} />
      </div>

      {/* Restaurant actions */}
      {isRestaurant && (
        <div className="mt-4 rounded-3xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Controles del restaurante</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {order.is_premium_custom && order.status === "chat_activo" && (
              <div className="flex w-full items-center gap-2">
                <Input
                  placeholder="Fija el precio (S/)"
                  type="number"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                />
                <Button onClick={setPrice} className="rounded-full">Enviar Cotización</Button>
              </div>
            )}
            {order.status === "pendiente_pago" && (
              <Button onClick={acceptPayment} className="rounded-full bg-success text-success-foreground hover:bg-success/90">
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Confirmar Pago e Iniciar Cocina
              </Button>
            )}
            {order.status === "en_cocina" && (
              <Button onClick={advance} variant="outline" className="rounded-full border-success text-success hover:bg-success/10">
                📦 Despachar Pedido
              </Button>
            )}
            {order.status !== "entregado" && order.status !== "cancelado" && (
              <Button variant="ghost" className="rounded-full text-destructive" onClick={cancel}>Cancelar</Button>
            )}
          </div>
        </div>
      )}

      {/* Client actions */}
      {isClient && order.status === "pendiente_pago" && (
        <div className="mt-4 rounded-3xl border border-border bg-card p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Adjunta tu comprobante</h3>
            <p className="mt-1 text-xs text-muted-foreground">Escanea el QR del restaurante y deposita. Luego sube la captura del váucher.</p>
          </div>
          {/* Payment card */}
          <Card className="mb-4 bg-card/80">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Pago pendiente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">Plato: {order.dish_name}</p>
              <p className="text-2xl font-bold">{order.final_price ? `S/ ${Number(order.final_price).toFixed(2)}` : 'Pendiente'}</p>
              <Button onClick={() => { setUploadKind("voucher"); fileRef.current?.click(); }} className="w-full">
                📸 Subir comprobante de Yape/Plin
              </Button>
            </CardContent>
          </Card>
          {qrUrl && (
            <div className="flex flex-col items-center justify-center p-3 border border-dashed border-border rounded-2xl bg-muted/20 max-w-xs mx-auto">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Código QR de Pago</span>
              <div className="w-48 h-48 overflow-hidden rounded-xl border bg-white flex items-center justify-center p-2 shadow-inner">
                <img src={qrUrl} alt="QR del Restaurante" className="h-full w-full object-contain" />
              </div>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadFile(f, uploadKind);
          e.target.value = "";
        }}
      />

      {/* Chat */}
      <div className="mt-4 flex h-[450px] flex-col rounded-3xl border border-border bg-card">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay mensajes en este pedido.</p>
          )}
          {messages.map((m) => {
            const own = m.sender_id === profile.id;
            const system = m.kind === "system";
            if (system) {
              return (
                <div key={m.id} className="text-center text-xs text-muted-foreground">{m.message_text}</div>
              );
            }
            return (
              <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${own ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.image_url && (
                    <a href={m.image_url} target="_blank" rel="noreferrer">
                      <img src={m.image_url} alt="adjunto" className="max-h-48 rounded-xl object-cover" />
                    </a>
                  )}
                  {m.message_text && <div className="mt-1 text-sm">{m.message_text}</div>}
                </div>
              </div>
            );
          })}
          <div ref={listEnd} />
        </div>
        <div className="flex items-center gap-2 border-t border-border p-3">
          <Button size="icon" variant="ghost" onClick={() => { setUploadKind("image"); fileRef.current?.click(); }}>
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Escribe un mensaje…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendText(); }}
          />
          <Button size="icon" onClick={sendText}><Send className="h-4 w-4" /></Button>
        </div>
      </div>
      {showSuccessModal && (
        <>
          <Confetti />
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="mx-4 max-w-md w-full rounded-3xl border border-border bg-card p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="h-12 w-12 animate-bounce" />
              </div>
              <h2 className="mt-6 font-display text-2xl font-bold tracking-tight text-foreground">
                ¡Felicidades!
              </h2>
              <p className="mt-2 text-lg font-medium text-muted-foreground">
                Haz vendido una receta saludable 🎉🥗
              </p>
              <p className="mt-4 text-xs text-muted-foreground animate-pulse">
                Redireccionando al dashboard en breve...
              </p>
              <Button
                onClick={() => navigate({ to: "/dashboard" })}
                className="mt-6 w-full rounded-full bg-primary py-6 text-base font-semibold"
              >
                Ir al Dashboard ahora
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }
    };
    window.addEventListener("resize", handleResize);

    const colors = ["#FFC107", "#FF5722", "#E91E63", "#9C27B0", "#3F51B5", "#00BCD4", "#4CAF50", "#8BC34A"];
    const pieces: Array<{
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    for (let i = 0; i < 150; i++) {
      pieces.push({
        x: Math.random() * width,
        y: Math.random() * height - height,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.random() * 4 - 2,
        speedY: Math.random() * 4 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 4 - 2,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      let active = false;

      pieces.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        if (p.y < height) active = true;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (active) {
        animationFrameId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[100] h-full w-full"
    />
  );
}
