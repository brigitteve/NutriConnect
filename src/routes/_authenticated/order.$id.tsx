import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PipelineBar } from "@/components/PipelineBar";
import { toast } from "sonner";
import type { OrderStatus } from "@/lib/constants";
import { TAG_LABELS } from "@/lib/constants";
import { ImagePlus, Send, CheckCircle2, ArrowRight, QrCode, Receipt } from "lucide-react";

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
  pendiente_pago: "esperando_validacion",
  esperando_validacion: "pago_confirmado",
  pago_confirmado: "en_preparacion",
  en_preparacion: "preparando",
  preparando: "listo_para_enviar",
  listo_para_enviar: "entregado",
  entregado: null,
  cancelado: null,
};

function OrderPage() {
  const { id } = Route.useParams();
  const { profile } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadKind, setUploadKind] = useState<"qr" | "voucher" | "image">("image");
  const listEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: o } = await supabase.from("orders_chat_hub").select("*").eq("id", id).maybeSingle();
      setOrder(o as Order);
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
    const path = `${order.id}/${Date.now()}-${file.name}`;
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
    if (kind === "voucher" && isClient) {
      await supabase.from("orders_chat_hub").update({ status: "esperando_validacion" }).eq("id", order.id);
    }
    toast.success("Adjunto enviado");
  };

  const setPrice = async () => {
    const p = Number(priceInput);
    if (!p || p <= 0) return toast.error("Precio inválido");
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
    setPriceInput("");
  };

  const acceptRecipe = async () => {
    await supabase
      .from("orders_chat_hub")
      .update({ status: "pago_confirmado" })
      .eq("id", order.id);
    await supabase.from("chat_messages").insert({
      order_id: order.id,
      sender_id: profile.id,
      message_text: "✅ Receta aceptada. Pago confirmado. Comenzamos preparación.",
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
      message_text: `➡️ Estado: ${next.replaceAll("_", " ")}`,
      kind: "system",
    });
    if (next === "entregado") toast.success("¡Entregado! Puntos y métricas actualizados.");
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
                <Button onClick={setPrice} className="rounded-full">Fijar precio</Button>
              </div>
            )}
            <Button variant="outline" className="rounded-full" onClick={() => { setUploadKind("qr"); fileRef.current?.click(); }}>
              <QrCode className="mr-1.5 h-4 w-4" /> Subir QR de cobro
            </Button>
            {order.status === "esperando_validacion" && (
              <Button onClick={acceptRecipe} className="rounded-full bg-success text-success-foreground hover:bg-success/90">
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Aceptar receta
              </Button>
            )}
            {NEXT_STAGE[order.status] && order.status !== "esperando_validacion" && order.status !== "pendiente_pago" && order.status !== "chat_activo" && (
              <Button onClick={advance} variant="outline" className="rounded-full">
                Avanzar a {NEXT_STAGE[order.status]!.replaceAll("_", " ")} <ArrowRight className="ml-1.5 h-4 w-4" />
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
        <div className="mt-4 rounded-3xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Adjunta tu comprobante</h3>
          <p className="mt-1 text-xs text-muted-foreground">Escanea el QR del restaurante y deposita. Luego sube la captura.</p>
          <Button className="mt-3 rounded-full" onClick={() => { setUploadKind("voucher"); fileRef.current?.click(); }}>
            <Receipt className="mr-1.5 h-4 w-4" /> Subir voucher
          </Button>
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
    </div>
  );
}
