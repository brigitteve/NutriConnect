import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useDemoStore } from "@/lib/store";
import { ORDER_STAGES, TAG_LABELS } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/incoming")({
  component: IncomingPage,
  head: () => ({ meta: [{ title: "Bandeja de pedidos — NutriConnect" }] }),
});

function IncomingPage() {
  const { profile } = useAuth();
  const { view } = useDemoStore();
  const [orders, setOrders] = useState<any[]>([]);

  const effective = view === "cliente" ? "usuario" : view === "restaurante" ? "restaurante" : profile?.role;

  useEffect(() => {
    if (!profile) return;
    const load = () =>
      supabase
        .from("orders_chat_hub")
        .select("*")
        .eq("restaurant_id", profile.id)
        .order("updated_at", { ascending: false })
        .then(({ data }) => setOrders(data ?? []));
    load();
    const ch = supabase
      .channel("incoming-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders_chat_hub", filter: `restaurant_id=eq.${profile.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.id]);

  if (effective === "usuario") return <Navigate to="/discover" />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold">Bandeja de pedidos</h1>
      <p className="mt-1 text-sm text-muted-foreground">Cada comanda en tiempo real. Avanza, cobra y sirve.</p>

      <div className="mt-6 space-y-3">
        {orders.map((o) => {
          const stage = ORDER_STAGES.find((s) => s.id === o.status);
          return (
            <Link key={o.id} to="/order/$id" params={{ id: o.id }} className="block rounded-2xl border border-border bg-card p-4 hover:border-foreground/30">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-base font-semibold">{o.dish_name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{new Date(o.updated_at).toLocaleString()}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(o.health_tags ?? []).map((t: string) => (
                      <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{TAG_LABELS[t] ?? t}</span>
                    ))}
                    {o.is_premium_custom && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Premium</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {o.final_price ? `S/ ${Number(o.final_price).toFixed(2)}` : "Pendiente"}
                  </div>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${o.status === "entregado" ? "bg-success/10 text-success" : o.status === "cancelado" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                    {stage?.label ?? o.status}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
        {orders.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Sin pedidos por ahora. Tu carta hace el trabajo.
          </p>
        )}
      </div>
    </div>
  );
}
