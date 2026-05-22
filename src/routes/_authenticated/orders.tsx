import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ORDER_STAGES, type OrderStatus } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/orders")({
  component: OrdersPage,
  head: () => ({ meta: [{ title: "Mis pedidos — NutriConnect" }] }),
});

function OrdersPage() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);

  const effectiveRole = profile?.role ?? "usuario";

  useEffect(() => {
    if (!profile) return;
    const col = effectiveRole === "restaurante" ? "restaurant_id" : "client_id";
    supabase
      .from("orders_chat_hub")
      .select("*")
      .eq(col, profile.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => setOrders(data ?? []));
  }, [profile]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold">Mis pedidos</h1>
      <div className="mt-6 space-y-3">
        {orders.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Aún no tienes pedidos.
          </p>
        )}
        {orders.map((o) => {
          const stage = ORDER_STAGES.find((s) => s.id === o.status);
          return (
            <Link
              key={o.id}
              to="/order/$id"
              params={{ id: o.id }}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-foreground/30"
            >
              <div>
                <div className="font-display text-base font-semibold">{o.dish_name}</div>
                <div className="text-xs text-muted-foreground">{new Date(o.updated_at).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">
                  {o.final_price ? `S/ ${Number(o.final_price).toFixed(2)}` : "—"}
                </div>
                <span className={statusClass(o.status)}>{stage?.label ?? o.status}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function statusClass(s: OrderStatus) {
  const base = "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium";
  if (s === "entregado") return `${base} bg-success/10 text-success`;
  if (s === "cancelado") return `${base} bg-destructive/10 text-destructive`;
  return `${base} bg-primary/10 text-primary`;
}
