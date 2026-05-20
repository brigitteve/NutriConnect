import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ExternalLink, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/nutritionists")({
  component: NutritionistsPage,
  head: () => ({ meta: [{ title: "Mi Red de Expertos — NutriConnect" }] }),
});

function NutritionistsPage() {
  const { profile } = useAuth();
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("nutritionists").select("*").then(({ data }) => setList(data ?? []));
  }, []);

  if (profile && profile.tier !== "premium") return <Navigate to="/discover" />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold">Mi Red de Expertos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Nutricionistas certificados para guiarte. NutriConnect no automatiza criterios médicos.
      </p>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
        <ShieldAlert className="mt-0.5 h-5 w-5 text-warning-foreground" />
        <div>
          <strong>Política de no-automatización.</strong> Este espacio te conecta con un experto humano.
          Recibe la guía por fuera de la app y vuelve para ajustar manualmente tus preferencias o crear platos personalizados.
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {list.map((n) => (
          <div key={n.id} className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div
                className="h-14 w-14 shrink-0 rounded-2xl bg-muted"
                style={{ backgroundImage: n.photo_url ? `url(${n.photo_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
              />
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold">{n.full_name}</h3>
                <div className="text-xs text-muted-foreground">CNP {n.cnp} · {n.specialty}</div>
                {n.bio && <p className="mt-2 text-sm text-muted-foreground">{n.bio}</p>}
                {n.contact_url && (
                  <a
                    href={n.contact_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
                  >
                    Contactar <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground sm:col-span-2">
            Aún no hay nutricionistas en el directorio.
          </p>
        )}
      </div>
    </div>
  );
}
