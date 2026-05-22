import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Heart, AlertTriangle, Info, Smile } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
  head: () => ({ meta: [{ title: "Cuestionario de Salud — NutriConnect" }] }),
});

const ALLERGY_OPTIONS = [
  { id: "mariscos", label: "Pescados y Mariscos", emoji: "🐟" },
  { id: "mani", label: "Frutos Secos / Maní", emoji: "🥜" },
  { id: "huevo", label: "Huevo", emoji: "🥚" },
  { id: "soya", label: "Soya / Legumbres", emoji: "🫘" },
];

const INTOLERANCE_OPTIONS = [
  { id: "lactosa", label: "Lactosa / Lácteos", emoji: "🥛", mapTo: "sin_lacteos" },
  { id: "gluten", label: "Gluten / Trigo", emoji: "🌾", mapTo: "sin_gluten" },
  { id: "fructosa", label: "Fructosa / Azúcares", emoji: "🍎" },
];

const DISEASE_OPTIONS = [
  { id: "diabetes", label: "Diabetes", emoji: "🩸", mapTo: "sin_azucar" },
  { id: "hipertension", label: "Hipertensión", emoji: "🧂", mapTo: "bajo_sodio" },
  { id: "colesterol", label: "Colesterol Alto", emoji: "🍳" },
  { id: "renal", label: "Insuficiencia Renal", emoji: "💧" },
];

const TEXTURE_OPTIONS = [
  { id: "facil_masticar", label: "Fácil de Masticar / Suave / Puré", emoji: "🥣" },
  { id: "porciones_reducidas", label: "Porción Reducida (Digestión lenta)", emoji: "🍽️" },
  { id: "sin_condimentos", label: "Sabor Suave / Sin Condimentos", emoji: "🍃" },
];

function OnboardingPage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // State arrays for questionnaire
  const [allergies, setAllergies] = useState<string[]>([]);
  const [intolerances, setIntolerances] = useState<string[]>([]);
  const [chronicDiseases, setChronicDiseases] = useState<string[]>([]);
  const [specialNeeds, setSpecialNeeds] = useState<string[]>([]);

  // State strings for custom comments
  const [allergiesCustom, setAllergiesCustom] = useState("");
  const [intolerancesCustom, setIntolerancesCustom] = useState("");
  const [chronicDiseasesCustom, setChronicDiseasesCustom] = useState("");
  const [specialNeedsCustom, setSpecialNeedsCustom] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setAllergies(profile.allergies ?? []);
      setIntolerances(profile.intolerances ?? []);
      setChronicDiseases(profile.chronic_diseases ?? []);
      setSpecialNeeds(profile.special_needs ?? []);
      setAllergiesCustom(profile.allergies_custom ?? "");
      setIntolerancesCustom(profile.intolerances_custom ?? "");
      setChronicDiseasesCustom(profile.chronic_diseases_custom ?? "");
      setSpecialNeedsCustom(profile.special_needs_custom ?? "");
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
    setSaving(true);

    // Compute retro-compatible diets and medical restrictions
    const mappedRestrictions: string[] = [];
    
    // Auto map intolerances to compatible filters
    if (intolerances.includes("lactosa")) mappedRestrictions.push("sin_lacteos");
    if (intolerances.includes("gluten")) mappedRestrictions.push("sin_gluten");
    
    // Auto map chronic diseases to compatible filters
    if (chronicDiseases.includes("diabetes")) mappedRestrictions.push("sin_azucar");
    if (chronicDiseases.includes("hipertension")) mappedRestrictions.push("bajo_sodio");

    // Add generic tag for soft textures to trigger in home page
    if (specialNeeds.includes("facil_masticar")) mappedRestrictions.push("facil_masticar");

    const { error } = await supabase
      .from("profiles")
      .update({
        allergies,
        intolerances,
        chronic_diseases: chronicDiseases,
        special_needs: specialNeeds,
        allergies_custom: allergiesCustom || null,
        intolerances_custom: intolerancesCustom || null,
        chronic_diseases_custom: chronicDiseasesCustom || null,
        special_needs_custom: specialNeedsCustom || null,
        medical_restrictions: mappedRestrictions,
        onboarding_complete: true,
      })
      .eq("id", profile.id);

    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Perfil de salud configurado. Cargando platos aptos para ti…");
    navigate({ to: "/discover" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <div className="rounded-3xl border border-border bg-card p-6 md:p-10 shadow-xl space-y-8">
        
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-border/60 pb-6">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-success/15 text-success">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Perfil Médico y de Restricciones
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Diseñado especialmente para comensales y adultos mayores. Cuéntanos qué alimentos debes evitar o qué texturas requieres.
            </p>
          </div>
        </div>

        {/* Informative Alert for accessibility */}
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 flex gap-3 text-xs md:text-sm text-primary">
          <Smile className="h-5 w-5 shrink-0" />
          <div>
            <strong>Consejo de Accesibilidad:</strong> Puedes hacer clic sobre cualquier tarjeta para marcar tus opciones. Si tienes alguna condición no listada, descríbela en el campo de texto debajo de cada sección.
          </div>
        </div>

        {/* Section 1: Allergies */}
        <SectionView
          title="1. Alergias Alimentarias ⚠️"
          desc="Marca los ingredientes que producen reacciones alérgicas o shock en tu organismo."
        >
          <ChipsContainer
            options={ALLERGY_OPTIONS}
            selected={allergies}
            onToggle={(id) => setAllergies(toggle(allergies, id))}
          />
          <CustomInput
            label="¿Otra alergia? Escríbela aquí:"
            value={allergiesCustom}
            onChange={setAllergiesCustom}
            placeholder="Ej. Alergia a la fresa, kiwi, etc."
          />
        </SectionView>

        {/* Section 2: Intolerances */}
        <SectionView
          title="2. Intolerancias Comunes 🥛"
          desc="Ingredientes que te causan malestar digestivo o pesadez."
        >
          <ChipsContainer
            options={INTOLERANCE_OPTIONS}
            selected={intolerances}
            onToggle={(id) => setIntolerances(toggle(intolerances, id))}
          />
          <CustomInput
            label="¿Otra intolerancia digestiva? Escríbela aquí:"
            value={intolerancesCustom}
            onChange={setIntolerancesCustom}
            placeholder="Ej. Intolerancia a las legumbres, ajo, cebolla, etc."
          />
        </SectionView>

        {/* Section 3: Chronic Diseases */}
        <SectionView
          title="3. Condiciones o Enfermedades Crónicas ❤️"
          desc="Para ayudarte a controlar tu ingesta diaria de azúcar, sodio, grasas o potasio."
        >
          <ChipsContainer
            options={DISEASE_OPTIONS}
            selected={chronicDiseases}
            onToggle={(id) => setChronicDiseases(toggle(chronicDiseases, id))}
          />
          <CustomInput
            label="¿Alguna otra condición médica diagnóstica? Escríbela aquí:"
            value={chronicDiseasesCustom}
            onChange={setChronicDiseasesCustom}
            placeholder="Ej. Ácido úrico elevado, colon irritable, etc."
          />
        </SectionView>

        {/* Section 4: Texture and Portion Requirements */}
        <SectionView
          title="4. Consistencia de Alimentos y Porciones 🥣"
          desc="Especial para adultos mayores con dificultades de masticación o digestión lenta."
        >
          <ChipsContainer
            options={TEXTURE_OPTIONS}
            selected={specialNeeds}
            onToggle={(id) => setSpecialNeeds(toggle(specialNeeds, id))}
          />
          <CustomInput
            label="¿Algún requerimiento especial de porción o textura? Escríbelo aquí:"
            value={specialNeedsCustom}
            onChange={setSpecialNeedsCustom}
            placeholder="Ej. Carne picada extremadamente fina, purés colados, etc."
          />
        </SectionView>

        {/* Submit */}
        <div className="pt-4 border-t border-border/60">
          <Button
            onClick={submit}
            disabled={saving}
            className="w-full rounded-2xl py-7 text-base font-semibold shadow-lg hover:shadow-xl transition"
            size="lg"
          >
            {saving ? "Guardando Preferencias de Salud..." : "Guardar Preferencias e Ir al Home ✨"}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-3">
            Garantizamos que solo verás alimentos 100% aptos para tus requerimientos seleccionados.
          </p>
        </div>

      </div>
    </div>
  );
}

function SectionView({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ChipsContainer({
  options,
  selected,
  onToggle,
}: {
  options: Array<{ id: string; label: string; emoji: string }>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((o) => {
        const isSelected = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition duration-200 ${
              isSelected
                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                : "border-border bg-background hover:border-foreground/20 hover:bg-muted/30"
            }`}
          >
            <span className="text-2xl shrink-0" role="img" aria-label={o.label}>
              {o.emoji}
            </span>
            <span className="font-medium text-sm md:text-base text-foreground leading-tight">
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CustomInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5 pt-1">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl border bg-background text-sm px-3.5 py-2 placeholder:text-muted-foreground/60 focus-visible:ring-primary"
      />
    </div>
  );
}
