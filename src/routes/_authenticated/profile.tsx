import * as React from "react";
import { Link, useNavigate, createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Star, Medal, Trophy, ShieldCheck } from "lucide-react";

// Route definition
export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [medals, setMedals] = React.useState<Array<{ id: string; name: string; icon: string }>>([]);

  React.useEffect(() => {
    if (!profile) return;
    // Fetch user medals (placeholder implementation). Adjust table/columns as needed.
    const fetchMedals = async () => {
      const { data, error } = await supabase
        .from("user_medals")
        .select("id, name, icon")
        .eq("user_id", profile.id);
      if (!error && data) setMedals(data as any);
    };
    fetchMedals();
  }, [profile]);

  if (!profile) return <div className="p-10 text-center text-sm text-muted-foreground">Cargando perfil…</div>;

  // Helper to render medical identity block
  const renderIdentityBlock = () => {
    // Example: combine medical restrictions into a readable string
    const blockedAllergens = profile.medical_restrictions?.join(", ") ?? "Ninguno";
    return (
      <Card className="bg-card/80">
        <CardHeader>
          <CardTitle>Identidad Médica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Filtrando: <span className="font-medium">{blockedAllergens}</span>
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/onboarding" })}
            className="mt-2"
          >
            <ShieldCheck className="mr-1 h-4 w-4" /> Ajustar Preferencias
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderGamificationRow = () => (
    <div className="flex gap-4">
      {/* Card 1: Nivel */}
      <Card className="flex-1">
        <CardHeader className="p-3">
          <CardTitle className="flex items-center text-sm">
            <Star className="mr-1 h-4 w-4 text-yellow-500" /> Nivel
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-2xl font-bold">7</CardContent>
        <CardFooter className="justify-center">
          <Badge variant="secondary">Progresso</Badge>
        </CardFooter>
      </Card>
      {/* Card 2: Puntos */}
      <Card className="flex-1">
        <CardHeader className="p-3">
          <CardTitle className="flex items-center text-sm">
            <Trophy className="mr-1 h-4 w-4 text-indigo-500" /> Puntos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-2xl font-bold">1240</CardContent>
        <CardFooter className="justify-center">
          <Badge variant="secondary">Acumulados</Badge>
        </CardFooter>
      </Card>
      {/* Card 3: Retos */}
      <Card className="flex-1">
        <CardHeader className="p-3">
          <CardTitle className="flex items-center text-sm">
            <Medal className="mr-1 h-4 w-4 text-amber-600" /> Retos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-2xl font-bold">3</CardContent>
        <CardFooter className="justify-center">
          <Badge variant="secondary">Completados</Badge>
        </CardFooter>
      </Card>
    </div>
  );

  const renderMedalsShowcase = () => (
    <Card className="bg-card/80">
      <CardHeader>
        <CardTitle>Mis Medallas</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {medals.length > 0 ? (
          medals.map((med) => (
            <div
              key={med.id}
              className="flex flex-col items-center space-y-1 p-2 border rounded-lg bg-muted/50"
            >
              {/* If the icon field stores an SVG path or a known Lucide name, render accordingly */}
              {med.icon ? (
                <img src={med.icon} alt={med.name} className="h-8 w-8" />
              ) : (
                <Medal className="h-8 w-8 text-primary" />
              )}
              <span className="text-xs font-medium text-center">{med.name}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground col-span-full text-center">
            Aún no tienes medallas.
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      {/* Tab navigation – the Header already includes the tab, but we keep visual grouping */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">Mi Perfil</TabsTrigger>
          <TabsTrigger value="settings">Ajustes</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="space-y-6">
          {renderIdentityBlock()}
          <div className="mt-4">{renderGamificationRow()}</div>
          <div className="mt-4">{renderMedalsShowcase()}</div>
        </TabsContent>
        <TabsContent value="settings">
          <Button asChild>
            <Link to="/onboarding">Editar mis preferencias de salud</Link>
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
