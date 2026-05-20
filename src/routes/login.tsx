import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Entrar — NutriConnect" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bienvenido de vuelta");
    navigate({ to: "/home" });
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <h1 className="font-display text-3xl font-semibold">Bienvenido de vuelta</h1>
      <p className="mt-1 text-sm text-muted-foreground">Entra para continuar con tu cocina de precisión.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Sin cuenta? <Link to="/signup" className="font-medium text-primary hover:underline">Regístrate</Link>
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
