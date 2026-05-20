import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useDemoStore } from "@/lib/store";
import { TAG_LABELS } from "@/lib/constants";
import { Award, Flame, Sparkles, Target, Utensils, QrCode, UploadCloud, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Panel restaurante — NutriConnect" }] }),
});

function DashboardPage() {
  const { profile } = useAuth();
  const { view } = useDemoStore();
  const [meta, setMeta] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [dishCount, setDishCount] = useState(0);
  const [uploadingQR, setUploadingQR] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const effective = view === "cliente" ? "usuario" : view === "restaurante" ? "restaurante" : profile?.role;

  useEffect(() => {
    if (!profile) return;
    supabase.from("restaurants_metadata").select("*").eq("id", profile.id).maybeSingle().then(({ data }) => setMeta(data));
    supabase.from("orders_chat_hub").select("id", { count: "exact", head: true }).eq("restaurant_id", profile.id).not("status", "in", "(entregado,cancelado)").then(({ count }) => setPendingCount(count ?? 0));
    supabase.from("restaurant_dishes").select("id", { count: "exact", head: true }).eq("restaurant_id", profile.id).then(({ count }) => setDishCount(count ?? 0));
  }, [profile]);

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingQR(true);
    const path = `qr/${profile.id}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("chat-uploads").upload(path, file);
    
    if (uploadError) {
      toast.error(uploadError.message);
      setUploadingQR(false);
      return;
    }

    const { data: pub } = supabase.storage.from("chat-uploads").getPublicUrl(path);
    
    const { error: updateError } = await supabase
      .from("restaurants_metadata")
      .update({ qr_url: pub.publicUrl })
      .eq("id", profile.id);

    if (updateError) {
      toast.error(updateError.message);
    } else {
      toast.success("Código QR actualizado correctamente.");
      setMeta({ ...meta, qr_url: pub.publicUrl });
    }
    
    setUploadingQR(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (effective === "usuario") return <Navigate to="/discover" />;
  if (!meta) return <div className="p-10 text-center text-sm text-muted-foreground">Cargando…</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold">Hola, {meta.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tu reputación se construye con cada plato entregado.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Flame className="h-4 w-4 text-primary" />} value={meta.total_orders_completed} label="Platos entregados" />
        <Stat icon={<Target className="h-4 w-4 text-success" />} value={`${Number(meta.successful_delivery_rate).toFixed(1)}%`} label="Efectividad" />
        <Stat icon={<Sparkles className="h-4 w-4 text-warning" />} value={meta.points} label="Puntos" />
        <Stat icon={<Award className="h-4 w-4 text-primary" />} value={meta.badges?.length ?? 0} label="Badges" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Link to="/incoming" className="rounded-3xl border border-border bg-card p-5 hover:border-foreground/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Bandeja de pedidos</h3>
              <p className="text-sm text-muted-foreground">Atiende, cobra y avanza estados.</p>
            </div>
            <span className="rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">{pendingCount}</span>
          </div>
        </Link>
        <Link to="/dishes" className="rounded-3xl border border-border bg-card p-5 hover:border-foreground/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Mi carta base</h3>
              <p className="text-sm text-muted-foreground">Recetas etiquetadas que activan el matchmaking.</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm font-semibold">
              <Utensils className="h-3.5 w-3.5" /> {dishCount}
            </span>
          </div>
        </Link>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" /> Configurar Medio de Cobro
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">Sube tu código QR de Yape o Plin. Se enviará automáticamente a los clientes al fijar el precio de un pedido.</p>
        
        <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full border-2 border-dashed border-border rounded-2xl p-6 text-center hover:bg-muted/50 transition">
            {meta.qr_url ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-success" />
                <span className="text-sm font-medium text-success">QR configurado correctamente</span>
                <img src={meta.qr_url} alt="QR de cobro" className="mt-2 w-32 h-32 object-contain rounded-xl border bg-white" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <QrCode className="h-8 w-8" />
                <span className="text-sm">Aún no has configurado tu QR</span>
              </div>
            )}
          </div>
          
          <div className="flex-shrink-0 w-full sm:w-auto">
            <input type="file" accept="image/*" className="hidden" ref={fileRef} onChange={handleQRUpload} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingQR}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
            >
              <UploadCloud className="h-4 w-4" /> {uploadingQR ? "Subiendo..." : meta.qr_url ? "Actualizar QR" : "Subir QR de Cobro"}
            </button>
          </div>
        </div>
      </div>

      {meta.badges?.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tus badges</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {meta.badges.map((b: string) => (
              <span key={b} className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                <Award className="h-3 w-3" /> {b}
              </span>
            ))}
          </div>
        </div>
      )}

      {Object.keys(meta.specific_counters ?? {}).length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Por categoría</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(meta.specific_counters as Record<string, number>).map(([k, v]) => (
              <span key={k} className="rounded-full bg-card px-3 py-1 text-xs font-medium ring-1 ring-border">
                🔥 {v} {TAG_LABELS[k] ?? k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">{icon} {label}</div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
    </div>
  );
}
