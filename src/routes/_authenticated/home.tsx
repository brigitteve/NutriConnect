import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useDemoStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomeRedirect,
});

function HomeRedirect() {
  const { profile } = useAuth();
  const { view } = useDemoStore();
  if (!profile) return null;

  const effective =
    view === "cliente" ? "usuario" : view === "restaurante" ? "restaurante" : profile.role;

  if (effective === "restaurante") return <Navigate to="/dashboard" />;
  if (!profile.onboarding_complete) return <Navigate to="/onboarding" />;
  return <Navigate to="/discover" />;
}
