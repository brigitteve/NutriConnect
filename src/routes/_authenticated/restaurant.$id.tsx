import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { TAG_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Award, Flame, ShoppingCart, Sparkles, Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant/$id")({
  component: RestaurantPage,
});

interface Dish {
  id: string;
  dish_name: string;
  description: string | null;
  base_price: number;
  health_tags: string[];
  image_url: string | null;
}
interface Meta {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  badges: string[];
  total_orders_completed: number;
  successful_delivery_rate: number;
  specific_counters: Record<string, number>;
  points: number;
}

function RestaurantPage() {
  const { id } = Route.useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);

  useEffect(() => {
    (async () => {
      const { data: m } = await supabase
        .from("restaurants_metadata")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      const { data: d } = await supabase
        .from("restaurant_dishes")
        .select("*")
        .eq("restaurant_id", id)
        .order("created_at", { ascending: false });
      setMeta(m as Meta);
      setDishes((d as Dish[]) ?? []);
    })();
  }, [id]);

  if (!meta) return <div className="p-10 text-center text-sm text-muted-foreground">Cargando…</div>;

  const orderFreemium = async (dish: Dish) => {
    if (!profile) return;
    const { data, error } = await supabase
      .from("orders_chat_hub")
      .insert({
        client_id: profile.id,
        restaurant_id: meta.id,
        dish_id: dish.id,
        dish_name: dish.dish_name,
        status: "pendiente_pago",
        is_premium_custom: false,
        base_price: dish.base_price,
        final_price: dish.base_price,
        health_tags: dish.health_tags,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    toast.success("Pedido enviado. ¡Revisa el chat!");
    navigate({ to: "/order/$id", params: { id: data.id } });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Hero */}
      <div
        className="aspect-[16/6] w-full rounded-3xl bg-muted"
        style={{ backgroundImage: meta.cover_url ? `url(${meta.cover_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">{meta.name}</h1>
          {meta.description && <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {meta.badges.map((b) => (
              <span key={b} className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                <Award className="h-3 w-3" /> {b}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat icon={<Flame className="h-4 w-4 text-primary" />} value={meta.total_orders_completed} label="entregados" />
          <Stat icon={<Target className="h-4 w-4 text-success" />} value={`${Number(meta.successful_delivery_rate).toFixed(1)}%`} label="efectividad" />
          <Stat icon={<Sparkles className="h-4 w-4 text-warning" />} value={meta.points} label="puntos" />
        </div>
      </div>

      {/* Counters */}
      {Object.keys(meta.specific_counters ?? {}).length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {Object.entries(meta.specific_counters).map(([k, v]) => (
            <span key={k} className="rounded-full bg-card px-3 py-1 text-xs font-medium ring-1 ring-border">
              🔥 {v} {TAG_LABELS[k] ?? k}
            </span>
          ))}
        </div>
      )}

      <h2 className="mt-10 font-display text-2xl font-semibold">Carta</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {dishes.map((d) => (
          <DishRow key={d.id} d={d} profile={profile} onFreemium={() => orderFreemium(d)} onPremium={(payload) => premiumOrder(d, payload)} />
        ))}
      </div>
    </div>
  );

  async function premiumOrder(dish: Dish, payload: { portions: number; specs: string }) {
    if (!profile) return;
    const { data, error } = await supabase
      .from("orders_chat_hub")
      .insert({
        client_id: profile.id,
        restaurant_id: meta!.id,
        dish_id: dish.id,
        dish_name: dish.dish_name,
        status: "chat_activo",
        is_premium_custom: true,
        base_price: dish.base_price,
        customized_recipe: payload,
        health_tags: dish.health_tags,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    await supabase.from("chat_messages").insert({
      order_id: data.id,
      sender_id: profile.id,
      kind: "system",
      message_text: `🛎️ Pedido Premium: ${payload.portions}× ${dish.dish_name}. Specs: ${payload.specs || "—"}. Esperando precio del restaurante.`,
    });
    toast.success("Pedido premium enviado. El restaurante fijará el precio.");
    navigate({ to: "/order/$id", params: { id: data.id } });
  }
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-center gap-1">{icon}<span className="font-display text-lg font-semibold">{value}</span></div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function DishRow({
  d,
  profile,
  onFreemium,
  onPremium,
}: {
  d: Dish;
  profile: ReturnType<typeof useAuth>["profile"];
  onFreemium: () => void;
  onPremium: (p: { portions: number; specs: string }) => void;
}) {
  const isPremium = profile?.tier === "premium";
  const [portions, setPortions] = useState(1);
  const [specs, setSpecs] = useState("");

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card flex flex-col justify-between">
      <div>
        {d.image_url && (
          <div className="aspect-[16/9] w-full bg-muted overflow-hidden border-b border-border">
            <img src={d.image_url} alt={d.dish_name} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold">{d.dish_name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>
            </div>
            <div className="text-right">
              <div className="font-display text-xl font-semibold">S/ {Number(d.base_price).toFixed(2)}</div>
              <div className="text-[10px] uppercase text-muted-foreground">precio base</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {d.health_tags.map((t) => (
              <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{TAG_LABELS[t] ?? t}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 pt-0 flex flex-wrap gap-2">
        <Button onClick={onFreemium} className="rounded-full">
          <ShoppingCart className="mr-1.5 h-4 w-4" /> Realizar pedido
        </Button>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant={isPremium ? "outline" : "ghost"} disabled={!isPremium} className="rounded-full">
              <Sparkles className="mr-1.5 h-4 w-4" />
              {isPremium ? "Personalizar (Premium)" : "Personalizar requiere Premium"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Personaliza tu pedido</DialogTitle></DialogHeader>
            <p className="text-xs text-muted-foreground">
              El restaurante revisará tu solicitud y fijará un precio basado en el peso y los insumos.
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Porciones</Label>
                <Input type="number" min={1} max={10} value={portions} onChange={(e) => setPortions(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Especificaciones según tus objetivos</Label>
                <Textarea
                  placeholder="Ej: doble proteína, sin aceite, arroz integral en lugar de blanco, 150g de quinoa exactos…"
                  value={specs}
                  onChange={(e) => setSpecs(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={() => onPremium({ portions, specs })}>
                Enviar pedido personalizado
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
