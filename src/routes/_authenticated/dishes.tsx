import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useDemoStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DIET_OPTIONS, RESTRICTION_OPTIONS, GOAL_OPTIONS, TAG_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import { Trash2, Plus, UploadCloud } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dishes")({
  component: DishesPage,
  head: () => ({ meta: [{ title: "Mi carta — NutriConnect" }] }),
});

const ALL_TAGS = [...DIET_OPTIONS, ...RESTRICTION_OPTIONS, ...GOAL_OPTIONS];

function DishesPage() {
  const { profile } = useAuth();
  const { view } = useDemoStore();
  const [dishes, setDishes] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const effective = view === "cliente" ? "usuario" : view === "restaurante" ? "restaurante" : profile?.role;

  const reload = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("restaurant_dishes")
      .select("*")
      .eq("restaurant_id", profile.id)
      .order("created_at", { ascending: false });
    setDishes(data ?? []);
  };

  useEffect(() => { reload(); }, [profile?.id]);

  if (effective === "usuario") return <Navigate to="/discover" />;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingImage(true);
    const path = `dishes/${profile.id}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("chat-uploads").upload(path, file);
    
    if (uploadError) {
      toast.error(uploadError.message);
      setUploadingImage(false);
      return;
    }

    const { data: pub } = supabase.storage.from("chat-uploads").getPublicUrl(path);
    setImageUrl(pub.publicUrl);
    setUploadingImage(false);
    toast.success("Imagen del plato subida");
  };

  const add = async () => {
    if (!profile) return;
    if (!name || !price) return toast.error("Faltan nombre y precio");
    setSaving(true);
    const { error } = await supabase.from("restaurant_dishes").insert({
      restaurant_id: profile.id,
      dish_name: name,
      description: desc,
      base_price: Number(price),
      health_tags: tags,
      image_url: imageUrl,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setName(""); setDesc(""); setPrice(""); setTags([]); setImageUrl(null);
    toast.success("Plato agregado a tu carta");
    reload();
  };

  const remove = async (id: string) => {
    await supabase.from("restaurant_dishes").delete().eq("id", id);
    reload();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold">Mi carta base</h1>
      <p className="mt-1 text-sm text-muted-foreground">Las etiquetas activan el matchmaking con comensales compatibles.</p>

      <div className="mt-6 rounded-3xl border border-border bg-card p-5">
        <h3 className="font-display text-lg font-semibold">Nueva receta</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Nombre del plato</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Precio base (S/)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Descripción / insumos</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          
          <div className="space-y-2 md:col-span-2">
            <Label>Foto del Plato (Opcional)</Label>
            <div className="flex items-center gap-4">
              {imageUrl ? (
                <div className="relative h-16 w-16 shrink-0 rounded-2xl border bg-muted overflow-hidden">
                  <img src={imageUrl} alt="Plato" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-dashed border-muted-foreground/30 bg-muted">
                  <UploadCloud className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <input type="file" accept="image/*" className="hidden" ref={fileRef} onChange={handleImageUpload} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploadingImage}>
                  {uploadingImage ? "Subiendo..." : imageUrl ? "Cambiar imagen" : "Subir Foto"}
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <Label className="text-xs">Etiquetas de salud</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {ALL_TAGS.map((t) => {
              const on = tags.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTags(on ? tags.filter((x) => x !== t.id) : [...tags, t.id])}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <Button onClick={add} disabled={saving} className="mt-4 rounded-full"><Plus className="mr-1.5 h-4 w-4" />Agregar receta</Button>
      </div>

      <div className="mt-6 space-y-3">
        {dishes.map((d) => (
          <div key={d.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start gap-4">
              {d.image_url && (
                <div 
                  className="h-16 w-16 shrink-0 rounded-2xl bg-muted overflow-hidden"
                >
                  <img src={d.image_url} alt={d.dish_name} className="h-full w-full object-cover" />
                </div>
              )}
              <div>
                <div className="font-display text-base font-semibold">{d.dish_name}</div>
                <div className="text-xs text-muted-foreground">{d.description}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(d.health_tags ?? []).map((t: string) => (
                    <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{TAG_LABELS[t] ?? t}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-display text-lg font-semibold">S/ {Number(d.base_price).toFixed(2)}</div>
              <Button size="icon" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {dishes.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Aún no tienes platos en tu carta.
          </p>
        )}
      </div>
    </div>
  );
}
