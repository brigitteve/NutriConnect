import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useDemoStore } from "@/lib/store";
import { TAG_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/incoming")({
  component: IncomingPage,
  head: () => ({ meta: [{ title: "Bandeja de pedidos — NutriConnect" }] }),
});

function IncomingPage() {
  const { profile } = useAuth();
  const { view } = useDemoStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"nuevos" | "cocina" | "historial">("nuevos");
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [removingOrderIds, setRemovingOrderIds] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  const effective = view === "cliente" ? "usuario" : view === "restaurante" ? "restaurante" : profile?.role;

  const load = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("orders_chat_hub")
      .select(`
        *,
        client:profiles!orders_chat_hub_client_id_fkey(full_name),
        chat_messages(id, image_url, kind)
      `)
      .eq("restaurant_id", profile.id)
      .order("updated_at", { ascending: false });
    
    setOrders(data ?? []);
  };

  useEffect(() => {
    if (!profile) return;
    load();

    const ch = supabase
      .channel("incoming-orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders_chat_hub", filter: `restaurant_id=eq.${profile.id}` },
        (payload) => {
          if (payload.eventType === "UPDATE" && payload.new.status === "cancelado") {
            toast("⚠️ El cliente canceló la solicitud", { icon: "⚠️" });
            setRemovingOrderIds((prev) => [...prev, payload.new.id]);
            setTimeout(() => {
              load();
            }, 300);
          } else {
            load();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [profile?.id]);

  if (effective === "usuario") return <Navigate to="/discover" />;

  const getElapsedTime = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Ahora mismo";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    return `Hace ${Math.floor(diffHours / 24)} d`;
  };

  const handleQuote = async (orderId: string, priceStr: string) => {
    const p = Number(priceStr);
    if (!p || p <= 0) return toast.error("Precio inválido");

    const { data: meta } = await supabase
      .from("restaurants_metadata")
      .select("qr_url")
      .eq("id", profile!.id)
      .maybeSingle();

    const { error } = await supabase
      .from("orders_chat_hub")
      .update({ final_price: p, status: "pendiente_pago" })
      .eq("id", orderId);

    if (error) return toast.error(error.message);

    await supabase.from("chat_messages").insert({
      order_id: orderId,
      sender_id: profile!.id,
      message_text: `💰 Precio fijado: S/ ${p.toFixed(2)}. Esperando pago.`,
      kind: "system",
    });

    if (meta?.qr_url) {
      await supabase.from("chat_messages").insert({
        order_id: orderId,
        sender_id: profile!.id,
        image_url: meta.qr_url,
        message_text: "Código QR de cobro (Automático)",
        kind: "qr",
      });
    }

    toast.success("Cotización enviada");
  };

  const handleAcceptPayment = async (orderId: string, orderIsPremium: boolean) => {
    setRemovingOrderIds((prev) => [...prev, orderId]);

    setTimeout(async () => {
      const { error } = await supabase
        .from("orders_chat_hub")
        .update({ status: "esperando_validacion" })
        .eq("id", orderId);

      if (error) {
        setRemovingOrderIds((prev) => prev.filter((id) => id !== orderId));
        return toast.error(error.message);
      }

      await supabase.from("chat_messages").insert({
        order_id: orderId,
        sender_id: profile!.id,
        message_text: "💵 Pago verificado y confirmado con éxito (Pago Confirmado).",
        kind: "system",
      });

      await supabase.from("chat_messages").insert({
        order_id: orderId,
        sender_id: profile!.id,
        message_text: orderIsPremium
          ? "📋 Esperando validación del comensal para confirmar su capricho..."
          : "📋 Esperando validación del comensal para aceptar la receta predefinida...",
        kind: "system",
      });

      toast.success("Pago confirmado. Esperando validación.");
    }, 300);
  };

  const handleStartPreparation = async (orderId: string) => {
    const { error } = await supabase
      .from("orders_chat_hub")
      .update({ status: "preparando" })
      .eq("id", orderId);

    if (error) return toast.error(error.message);

    await supabase.from("chat_messages").insert({
      order_id: orderId,
      sender_id: profile!.id,
      message_text: "🍳 Inicia preparación en la cocina. El chef está preparando los ingredientes saludables.",
      kind: "system",
    });

    toast.success("¡Pedido en preparación!");
  };

  const handleMarkAsReady = async (orderId: string) => {
    const { error } = await supabase
      .from("orders_chat_hub")
      .update({ status: "listo_para_enviar" })
      .eq("id", orderId);

    if (error) return toast.error(error.message);

    await supabase.from("chat_messages").insert({
      order_id: orderId,
      sender_id: profile!.id,
      message_text: "📦 ¡El plato está listo! Esperando despacho.",
      kind: "system",
    });

    toast.success("¡Plato marcado como listo!");
  };

  const handleCancel = async (orderId: string) => {
    setRemovingOrderIds((prev) => [...prev, orderId]);

    setTimeout(async () => {
      const { error } = await supabase
        .from("orders_chat_hub")
        .update({ status: "cancelado" })
        .eq("id", orderId);

      if (error) {
        setRemovingOrderIds((prev) => prev.filter((id) => id !== orderId));
        return toast.error(error.message);
      }

      await supabase.from("chat_messages").insert({
        order_id: orderId,
        sender_id: profile!.id,
        message_text: "❌ Pedido cancelado por el restaurante.",
        kind: "system",
      });

      toast.success("Pedido cancelado");
    }, 300);
  };

  const handleDispatch = async (orderId: string) => {
    setRemovingOrderIds((prev) => [...prev, orderId]);

    setTimeout(async () => {
      const { error } = await supabase
        .from("orders_chat_hub")
        .update({ status: "entregado" })
        .eq("id", orderId);

      if (error) {
        setRemovingOrderIds((prev) => prev.filter((id) => id !== orderId));
        return toast.error(error.message);
      }

      await supabase.from("chat_messages").insert({
        order_id: orderId,
        sender_id: profile!.id,
        message_text: `🎉 ¡Pedido entregado exitosamente al comensal!`,
        kind: "system",
      });

      toast.success("¡Pedido despachado!");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }, 300);
  };

  const countNuevos = orders.filter(
    (o) => (o.status === "chat_activo" || o.status === "pendiente_pago" || o.status === "pago_confirmado" || o.status === "esperando_validacion") && o.status !== "cancelado"
  ).length;

  const countCocina = orders.filter(
    (o) => (o.status === "en_preparacion" || o.status === "preparando" || o.status === "listo_para_enviar") && o.status !== "cancelado"
  ).length;

  const filteredOrders = orders.filter((o) => {
    if (o.status === "cancelado") return false;

    if (activeTab === "nuevos") {
      return o.status === "chat_activo" || o.status === "pendiente_pago" || o.status === "pago_confirmado" || o.status === "esperando_validacion";
    }
    if (activeTab === "cocina") {
      return o.status === "en_preparacion" || o.status === "preparando" || o.status === "listo_para_enviar";
    }
    if (activeTab === "historial") {
      return o.status === "entregado";
    }
    return false;
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      {showConfetti && <Confetti />}

      {/* Header and Filter Pills (Sticky) */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md pb-4 pt-2 border-b border-border">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">Bandeja de Pedidos</h1>
          <p className="text-xs text-muted-foreground">Gestiona tus comandas y atiende en tiempo real.</p>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab("nuevos")}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition shrink-0 ${
              activeTab === "nuevos"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            📥 Nuevos [{countNuevos}]
          </button>
          <button
            onClick={() => setActiveTab("cocina")}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition shrink-0 ${
              activeTab === "cocina"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            🍳 En Cocina [{countCocina}]
          </button>
          <button
            onClick={() => setActiveTab("historial")}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition shrink-0 ${
              activeTab === "historial"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            ✅ Historial
          </button>
        </div>
      </div>

      {/* List container */}
      <div className="mt-6 space-y-3">
        {filteredOrders.map((o) => {
          const isRemoving = removingOrderIds.includes(o.id);
          const elapsed = getElapsedTime(o.updated_at);
          const clientName = o.client?.full_name || "Cliente";
          const voucherMsg = o.chat_messages?.find((m: any) => m.kind === "voucher");

          return (
            <div
              key={o.id}
              className={`block rounded-2xl border border-border bg-card p-3.5 shadow-sm hover:border-foreground/15 transition-all duration-300 ${
                isRemoving ? "opacity-0 scale-95 pointer-events-none translate-x-4" : "opacity-100 scale-100"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground/90 flex items-center gap-1">
                  👤 {clientName}
                </span>
                <span className="flex items-center gap-1 font-medium">
                  🕒 {elapsed}
                </span>
              </div>

              {/* Card Body */}
              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <Link
                    to="/order/$id"
                    params={{ id: o.id }}
                    className="font-display text-sm font-semibold hover:underline block leading-tight"
                  >
                    {o.dish_name}
                  </Link>
                  <div className="flex flex-wrap gap-1">
                    {(o.health_tags ?? []).map((t: string) => (
                      <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                        {TAG_LABELS[t] ?? t}
                      </span>
                    ))}
                    {o.is_premium_custom && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                        Premium
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-foreground/80">
                    {o.final_price ? `S/ ${Number(o.final_price).toFixed(2)}` : "Pendiente"}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
                {o.status === "chat_activo" && (
                  <div className="flex w-full items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Precio (S/)"
                      className="h-8 w-24 text-xs rounded-full bg-background"
                      value={prices[o.id] ?? ""}
                      onChange={(e) => setPrices({ ...prices, [o.id]: e.target.value })}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleQuote(o.id, prices[o.id] ?? "")}
                      className="h-8 rounded-full text-xs"
                    >
                      Cotizar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancel(o.id)}
                      className="h-8 rounded-full text-xs text-destructive hover:bg-destructive/10 ml-auto"
                    >
                      ❌ Anular
                    </Button>
                  </div>
                )}

                {o.status === "pendiente_pago" && (
                  <div className="flex w-full items-center justify-between gap-2">
                    {voucherMsg ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={voucherMsg.image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="block h-10 w-10 shrink-0 overflow-hidden rounded-lg border bg-muted"
                        >
                          <img src={voucherMsg.image_url} alt="Comprobante" className="h-full w-full object-cover" />
                        </a>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptPayment(o.id, !!o.is_premium_custom)}
                          className="h-8 rounded-full text-xs bg-success text-success-foreground hover:bg-success/90 font-semibold"
                        >
                          Confirmar Pago
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-warning font-semibold animate-pulse flex items-center gap-1">
                        ⏳ Esperando pago...
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancel(o.id)}
                      className="h-8 rounded-full text-xs text-destructive hover:bg-destructive/10 ml-auto font-medium"
                    >
                      ❌ Anular
                    </Button>
                  </div>
                )}

                {o.status === "esperando_validacion" && (
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                      📋 Esperando validación del comensal...
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancel(o.id)}
                      className="h-8 rounded-full text-xs text-destructive hover:bg-destructive/10 ml-auto font-medium"
                    >
                      ❌ Anular
                    </Button>
                  </div>
                )}

                {o.status === "en_preparacion" && (
                  <div className="flex w-full justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleStartPreparation(o.id)}
                      className="h-8 rounded-full text-xs bg-primary text-primary-foreground hover:opacity-90 font-semibold"
                    >
                      Iniciar Cocina 🍳
                    </Button>
                  </div>
                )}

                {o.status === "preparando" && (
                  <div className="flex w-full justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleMarkAsReady(o.id)}
                      className="h-8 rounded-full text-xs bg-success text-success-foreground hover:bg-success/90 font-semibold"
                    >
                      Marcar como Listo 📦
                    </Button>
                  </div>
                )}

                {o.status === "listo_para_enviar" && (
                  <div className="flex w-full justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleDispatch(o.id)}
                      className="h-8 rounded-full text-xs bg-success text-success-foreground hover:bg-success/90 font-semibold animate-pulse"
                    >
                      Entregar Pedido 🛵
                    </Button>
                  </div>
                )}

                {o.status === "entregado" && (
                  <div className="flex w-full justify-between items-center text-[10px] text-success font-semibold">
                    <span>✅ Entregado con éxito</span>
                    <Link to="/order/$id" params={{ id: o.id }} className="text-primary hover:underline font-bold">
                      Ver detalles →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground animate-in fade-in duration-300">
            Sin pedidos en esta pestaña por ahora.
          </p>
        )}
      </div>
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

    for (let i = 0; i < 120; i++) {
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
