import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { RestaurantCard, type RestaurantCardData } from "@/components/RestaurantCard";
import { TAG_LABELS } from "@/lib/constants";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/discover")({
  component: DiscoverPage,
  head: () => ({ meta: [{ title: "Descubrir restaurantes — NutriConnect" }] }),
});

function DiscoverPage() {
  const { profile, refreshProfile } = useAuth();
  const [data, setData] = useState<RestaurantCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      setLoading(true);
      const required = [...profile.medical_restrictions, ...profile.diets];
      const { data: dishes } = await supabase
        .from("restaurant_dishes")
        .select("*");
      const { data: restMeta } = await supabase
        .from("restaurants_metadata")
        .select("*");

      const metaById = new Map((restMeta ?? []).map((r) => [r.id, r]));
      const grouped = new Map<string, RestaurantCardData["matchingDishes"]>();
      for (const d of dishes ?? []) {
        const tags: string[] = d.health_tags ?? [];
        const matches = required.every((r) => tags.includes(r));
        if (!matches) continue;
        if (!metaById.has(d.restaurant_id)) continue;
        const arr = grouped.get(d.restaurant_id) ?? [];
        arr.push(d as RestaurantCardData["matchingDishes"][number]);
        grouped.set(d.restaurant_id, arr);
      }

      const result: RestaurantCardData[] = [];
      for (const [rid, matchingDishes] of grouped) {
        const m = metaById.get(rid)!;
        result.push({
          id: rid,
          name: m.name,
          cover_url: m.cover_url,
          badges: m.badges ?? [],
          total_orders_completed: m.total_orders_completed ?? 0,
          successful_delivery_rate: Number(m.successful_delivery_rate ?? 100),
          specific_counters: (m.specific_counters as Record<string, number>) ?? {},
          matchingDishes,
        });
      }
      setData(result);
      setLoading(false);
    };
    load();
  }, [profile]);

  if (!profile) return null;
  if (!profile.onboarding_complete && profile.role !== "admin") return <Navigate to="/onboarding" />;

  const togglePremium = async (checked: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ tier: checked ? "premium" : "freemium" })
      .eq("id", profile.id);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success(checked ? "✨ Premium activado" : "Volviste a Freemium");
  };

  const activeFilters = [...profile.medical_restrictions, ...profile.diets];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Para tu plato exacto</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeFilters.length > 0
              ? `Filtrando por: ${activeFilters.map((t) => TAG_LABELS[t] ?? t).join(" · ")}`
              : "Sin filtros activos"}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <Label htmlFor="prem" className="cursor-pointer text-sm">Modo Premium (demo)</Label>
          <Switch id="prem" checked={profile.tier === "premium"} onCheckedChange={togglePremium} />
        </div>
      </div>

      <div className="mt-3">
        <Link to="/onboarding" className="text-xs font-medium text-primary hover:underline">
          Ajustar mis preferencias →
        </Link>
      </div>

      {loading ? (
        <div className="mt-12 text-center text-sm text-muted-foreground">Cargando coincidencias…</div>
      ) : data.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <p className="font-display text-xl font-semibold">Aún no hay coincidencias exactas</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Los restaurantes aliados con tu perfil aparecerán acá. Ajusta tus preferencias o vuelve pronto.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((r) => <RestaurantCard key={r.id} r={r} />)}
        </div>
      )}
    </div>
  );
}
