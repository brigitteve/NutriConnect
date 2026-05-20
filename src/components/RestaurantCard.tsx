import { Link } from "@tanstack/react-router";
import { TAG_LABELS } from "@/lib/constants";
import { Flame, Target, Award } from "lucide-react";

export interface RestaurantCardData {
  id: string;
  name: string;
  cover_url: string | null;
  badges: string[];
  total_orders_completed: number;
  successful_delivery_rate: number;
  specific_counters: Record<string, number>;
  matchingDishes: Array<{ id: string; dish_name: string; description: string | null; base_price: number; health_tags: string[] }>;
}

export function RestaurantCard({ r }: { r: RestaurantCardData }) {
  const topDish = r.matchingDishes[0];
  const topTag = topDish?.health_tags[0];
  const counter = topTag ? r.specific_counters?.[topTag] ?? 0 : 0;

  return (
    <Link
      to="/restaurant/$id"
      params={{ id: r.id }}
      className="group block overflow-hidden rounded-3xl border border-border bg-card transition hover:shadow-xl"
    >
      <div
        className="relative aspect-[4/3] w-full bg-muted"
        style={{
          backgroundImage: r.cover_url ? `url(${r.cover_url})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute left-3 top-3 flex flex-wrap gap-1">
          {r.badges.slice(0, 2).map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1 rounded-full bg-background/95 px-2 py-1 text-[10px] font-semibold text-foreground shadow-sm"
            >
              <Award className="h-3 w-3 text-primary" /> {b}
            </span>
          ))}
        </div>
        {topTag && (
          <div className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm">
            🔥 {counter} {TAG_LABELS[topTag] ?? topTag} esta semana
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold leading-tight">{r.name}</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-semibold text-success">
            <Target className="h-3 w-3" />
            {r.successful_delivery_rate.toFixed(1)}%
          </span>
        </div>

        {topDish && (
          <div className="rounded-xl bg-muted/60 p-3">
            <div className="text-sm font-medium">{topDish.dish_name}</div>
            <p className="line-clamp-2 text-xs text-muted-foreground">{topDish.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {topDish.health_tags.slice(0, 3).map((t) => (
                <span key={t} className="rounded-full bg-card px-2 py-0.5 text-[10px] font-medium">
                  {TAG_LABELS[t] ?? t}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Flame className="h-3 w-3 text-primary" />
            {r.total_orders_completed} platos entregados
          </span>
          <span className="font-semibold text-primary group-hover:underline">Ver carta →</span>
        </div>
      </div>
    </Link>
  );
}
