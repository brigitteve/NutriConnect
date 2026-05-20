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
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return toast.error("Elige primero cómo quieres registrarte.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/home`,
        data: { role, full_name: fullName },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
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
