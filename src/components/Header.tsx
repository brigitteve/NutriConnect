import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useDemoStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { LogOut, Sparkles } from "lucide-react";

export function Header() {
  const { profile, session, signOut } = useAuth();
  const { view, setView } = useDemoStore();
  const navigate = useNavigate();

  const effectiveRole =
    view === "cliente" ? "usuario" : view === "restaurante" ? "restaurante" : view === "admin" ? "admin" : profile?.role;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-lg font-bold">
            N
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">NutriConnect</span>
        </Link>

        {session && (
          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {effectiveRole === "usuario" ? (
              <>
                <NavLink to="/discover">Descubrir</NavLink>
                <NavLink to="/orders">Mis Pedidos</NavLink>
                {profile?.tier === "premium" && <NavLink to="/nutritionists">Nutricionistas</NavLink>}
              </>
            ) : effectiveRole === "restaurante" ? (
              <>
                <NavLink to="/dashboard">Panel</NavLink>
                <NavLink to="/dishes">Mi Carta</NavLink>
                <NavLink to="/incoming">Pedidos</NavLink>
              </>
            ) : effectiveRole === "admin" ? (
              <>
                <NavLink to="/admin">Panel Admin B2B</NavLink>
              </>
            ) : null}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          {session && (
            <div className="hidden items-center rounded-full border border-border bg-card p-1 text-xs font-medium sm:flex">
              <button
                onClick={() => {
                  setView("cliente");
                  navigate({ to: "/home" });
                }}
                className={`rounded-full px-3 py-1 transition ${
                  effectiveRole === "usuario"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Cliente
              </button>
              <button
                onClick={() => {
                  setView("restaurante");
                  navigate({ to: "/home" });
                }}
                className={`rounded-full px-3 py-1 transition ${
                  effectiveRole === "restaurante"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Restaurante
              </button>
              <button
                onClick={() => {
                  setView("admin");
                  navigate({ to: "/admin" });
                }}
                className={`rounded-full px-3 py-1 transition ${
                  effectiveRole === "admin"
                    ? "bg-destructive text-destructive-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Admin
              </button>
            </div>
          )}

          {profile?.tier === "premium" && (
            <span className="hidden items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success md:inline-flex">
              <Sparkles className="h-3 w-3" /> Premium
            </span>
          )}

          {session ? (
            <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label="Salir">
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Entrar</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">Registrarme</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
      activeProps={{ className: "bg-foreground text-background hover:bg-foreground" }}
    >
      {children}
    </Link>
  );
}

import type { ReactNode } from "react";
