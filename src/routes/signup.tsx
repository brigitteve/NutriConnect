import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UtensilsCrossed, User } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({ meta: [{ title: "Registrarme — NutriConnect" }] }),
});

function SignupPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"usuario" | "restaurante" | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);

  // Dynamic IMC Calculation
  const h = parseFloat(height);
  const w = parseFloat(weight);
  const imc = h > 0 && w > 0 ? w / (h * h) : null;

  const getImcInfo = (val: number) => {
    if (val < 18.5) return { label: "Bajo Peso", color: "bg-amber-100 text-amber-800 border-amber-200" };
    if (val < 25) return { label: "Peso Saludable", color: "bg-success/15 text-success border-success/30" };
    if (val < 30) return { label: "Sobrepeso", color: "bg-orange-100 text-orange-800 border-orange-200" };
    return { label: "Obesidad", color: "bg-destructive/15 text-destructive border-destructive/30" };
  };

  const imcInfo = imc ? getImcInfo(imc) : null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return toast.error("Elige primero cómo quieres registrarte.");
    
    let heightVal = role === "usuario" ? parseFloat(height) : null;
    let weightVal = role === "usuario" ? parseFloat(weight) : null;
    let imcVal = imc ? parseFloat(imc.toFixed(2)) : null;

    if (role === "usuario") {
      if (!heightVal || heightVal <= 0 || heightVal > 3) {
        return toast.error("Por favor, ingresa una talla válida en metros (ej. 1.70)");
      }
      if (!weightVal || weightVal <= 0 || weightVal > 400) {
        return toast.error("Por favor, ingresa un peso válido en kg (ej. 70)");
      }
    }

    setLoading(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/home`,
        data: { 
          role, 
          full_name: fullName,
          height: heightVal,
          weight: weightVal,
          imc: imcVal,
        },
      },
    });

    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }

    // Direct fallback insert/update to profiles to guarantee schema compliance
    if (signUpData?.user && role === "usuario") {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          height: heightVal,
          weight: weightVal,
          imc: imcVal,
        })
        .eq("id", signUpData.user.id);
      
      if (profileError) {
        console.warn("Direct profiles update warning:", profileError.message);
      }
    }

    setLoading(false);
    toast.success("Cuenta creada. ¡Bienvenido a NutriConnect!");
    navigate({ to: "/home" });
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col px-4 py-12">
      <h1 className="font-display text-3xl font-semibold">Crea tu cuenta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Elige cómo vas a usar NutriConnect. No podrás cambiarlo después.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <RoleCard
          active={role === "usuario"}
          onClick={() => setRole("usuario")}
          icon={<User className="h-5 w-5" />}
          title="Comensal"
          desc="Como con precisión según mis restricciones."
        />
        <RoleCard
          active={role === "restaurante"}
          onClick={() => setRole("restaurante")}
          icon={<UtensilsCrossed className="h-5 w-5" />}
          title="Restaurante"
          desc="Publico mi carta y recibo pedidos a la medida."
        />
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">{role === "restaurante" ? "Nombre del restaurante" : "Tu nombre"}</Label>
          <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={role === "restaurante" ? "Ej. La Cocina Verde" : "Ej. María Pérez"} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {role === "usuario" && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-4 animate-in slide-in-from-top-4 duration-300">
            <h3 className="font-display text-sm font-semibold text-primary">📏 Medidas Corporales</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="height">Talla (metros)</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="2.5"
                  placeholder="Ej: 1.70"
                  required
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="10"
                  max="300"
                  placeholder="Ej: 72.5"
                  required
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
            </div>

            {imc !== null && (
              <div className="flex items-center justify-between rounded-xl border p-3 bg-muted/30">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Tu IMC Calculado</div>
                  <div className="font-display text-2xl font-bold text-foreground mt-0.5">{imc.toFixed(2)}</div>
                </div>
                {imcInfo && (
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${imcInfo.color}`}>
                    {imcInfo.label}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading || !role}>
          {loading ? "Creando cuenta…" : "Registrarme"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta? <Link to="/login" className="font-medium text-primary hover:underline">Entra</Link>
      </p>

      <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
        <h3 className="font-semibold text-primary">💼 ¿Eres Nutricionista?</h3>
        <p className="mt-1 text-xs text-muted-foreground">Únete a nuestra red de aliados y capta clientes Premium.</p>
        <Button asChild variant="outline" size="sm" className="mt-3 rounded-full border-primary/20 hover:bg-primary/10 text-primary">
          <Link to="/b2b-nutritionists">Ver beneficios</Link>
        </Button>
      </div>
    </div>
  );
}

function RoleCard({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border bg-card hover:border-foreground/30"
      }`}
    >
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
        {icon}
      </div>
      <div className="mt-3 font-display text-base font-semibold">{title}</div>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}
