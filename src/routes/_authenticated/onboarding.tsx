import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { DIET_OPTIONS, RESTRICTION_OPTIONS, GOAL_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [diets, setDiets] = useState<string[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [goal, setGoal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDiets(profile.diets ?? []);
      setRestrictions(profile.medical_restrictions ?? []);
      setGoal(profile.fitness_goal);
    }
  }, [profile]);

  if (profile?.role === "restaurante") {
    navigate({ to: "/dashboard" });
    return null;
  }

  if (profile?.role === "admin") {
    navigate({ to: "/admin" });
    return null;
  }

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const submit = async () => {
    if (!profile) return;
    if (diets.length === 0 && restrictions.length === 0) {
      return toast.error("Marca al menos una dieta o restricción.");
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        diets,
        medical_restrictions: restrictions,
        fitness_goal: goal,
        onboarding_complete: true,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Preferencias guardadas. Cargando tus restaurantes…");
    navigate({ to: "/discover" });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-success/10 text-success">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold">Preferencias de Salud</h1>
            <p className="text-sm text-muted-foreground">Solo te mostraremos restaurantes seguros para ti.</p>
          </div>
        </div>

        <Section title="Dietas">
          <Chips options={DIET_OPTIONS} selected={diets} onToggle={(v) => setDiets(toggle(diets, v))} />
        </Section>

        <Section title="Restricciones / Alergias">
          <Chips
            options={RESTRICTION_OPTIONS}
            selected={restrictions}
            onToggle={(v) => setRestrictions(toggle(restrictions, v))}
          />
        </Section>

        <Section title="Objetivo nutricional (opcional)">
          <Chips
            options={GOAL_OPTIONS}
            selected={goal ? [goal] : []}
            onToggle={(v) => setGoal(goal === v ? null : v)}
          />
        </Section>

        <Button onClick={submit} disabled={saving} className="mt-8 w-full" size="lg">
          {saving ? "Guardando…" : "Continuar"}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Chips({
  options,
  selected,
  onToggle,
}: {
  options: readonly { id: string; label: string; emoji?: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:border-foreground/30"
            }`}
          >
            {"emoji" in o && o.emoji ? `${o.emoji} ` : ""}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
