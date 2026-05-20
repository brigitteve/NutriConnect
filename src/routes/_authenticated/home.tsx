import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomeRedirect,
});

function HomeRedirect() {
  const { profile } = useAuth();
  if (!profile) return null;

  const effective = profile.role;

  if (effective === "restaurante") return <Navigate to="/dashboard" />;
  if (!profile.onboarding_complete) return <Navigate to="/onboarding" />;
  return <Navigate to="/discover" />;
}
