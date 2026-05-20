import { createFileRoute, Link } from "@tanstack/react-router";
import heroBowl from "@/assets/hero-bowl.jpg";
import { Button } from "@/components/ui/button";
import { Sparkles, ShieldCheck, ChefHat, Activity } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "NutriConnect — Precisión médico-gastronómica" },
      { name: "description", content: "Encuentra restaurantes que cocinan a la medida de tus restricciones y objetivos. Pago seguro, chat en vivo y trazabilidad real." },
    ],
  }),
});

function Landing() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> Precisión médico-gastronómica
            </span>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Tu cuerpo lo pide.
              <br />
              <span className="text-primary">La cocina lo entiende.</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground md:text-lg">
              Conectamos tus alergias, dietas y objetivos con restaurantes aliados que cocinan
              a tu medida. Cero suposiciones. Cero sorpresas.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-6">
                <Link to="/signup">Empezar gratis</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-6">
                <Link to="/login">Ya tengo cuenta</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" /> Cocinas verificadas</div>
              <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Trazabilidad en vivo</div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-primary/15 via-accent/40 to-success/15 blur-2xl" />
            <img
              src={heroBowl}
              alt="Bowl gourmet saludable con salmón, quinoa y vegetales"
              width={1280}
              height={896}
              className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-2xl"
            />
            <div className="absolute -bottom-6 -left-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-lg">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-success/15 text-success">
                <ChefHat className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Tasa de efectividad</div>
                <div className="font-display text-lg font-semibold">98.6%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-16 md:grid-cols-3">
        {[
          { t: "Matchmaking estricto", d: "Solo verás restaurantes con platos validados para tus restricciones exactas. Si eres Sin Gluten + Keto, eso es lo que aparece." },
          { t: "Pago con voucher trazado", d: "QR del restaurante, comprobante en el chat y aceptación física antes de cocinar. Cero pedidos al aire." },
          { t: "Gamificación real", d: "Los puntos y badges solo se otorgan al ENTREGAR. Lo que ves en una tarjeta, sucedió de verdad." },
        ].map((p) => (
          <div key={p.t} className="rounded-3xl border border-border bg-card p-6">
            <h3 className="font-display text-xl font-semibold">{p.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
