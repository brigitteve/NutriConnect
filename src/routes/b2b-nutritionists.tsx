import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UploadCloud, CheckCircle2, Stethoscope, Users, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/b2b-nutritionists")({
  component: B2BNutritionistsPage,
  head: () => ({ meta: [{ title: "Alianza para Nutricionistas — NutriConnect" }] }),
});

const SPECIALTIES = [
  "Nutrición Clínica",
  "Nutrición Deportiva",
  "Nutrición Estética",
  "Nutrición Pediátrica",
  "Dietoterapia",
  "Nutrición Vegana/Vegetariana",
];

function B2BNutritionistsPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [cnp, setCnp] = useState("");
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const path = `leads/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("chat-uploads").upload(path, file);
    
    if (uploadError) {
      toast.error(uploadError.message);
      setLoading(false);
      return;
    }

    const { data: pub } = supabase.storage.from("chat-uploads").getPublicUrl(path);
    setImageUrl(pub.publicUrl);
    setLoading(false);
    toast.success("Foto subida correctamente");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) return toast.error("Por favor, sube una foto de perfil profesional.");
    
    setLoading(true);
    
    const { error } = await supabase.from("nutritionist_leads").insert({
      full_name: fullName,
      cnp_code: cnp,
      specialty: specialty,
      whatsapp_number: whatsapp,
      profile_image_url: imageUrl,
    });

    setLoading(false);

    if (error) {
      return toast.error(error.message);
    }

    toast.success("Postulación enviada correctamente.");
    
    // Open WhatsApp
    const message = `Hola equipo de NutriConnect, acabo de enviar mi postulación como Nutricionista (CNP: ${cnp}) y quiero coordinar el pago de mi suscripción para activarme en la red.`;
    const encodedMessage = encodeURIComponent(message);
    const developerNumber = "+51999999999"; // Replace with real number
    window.open(`https://wa.me/${developerNumber}?text=${encodedMessage}`, "_blank");
    
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-lg font-bold">
              N
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">NutriConnect B2B</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Volver</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 md:items-start">
          
          {/* Pitch Section */}
          <div className="space-y-8">
            <div>
              <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl text-primary">
                Multiplica tus consultas privadas.
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Aparece en nuestro directorio exclusivo de usuarios Premium. NutriConnect te conecta directamente con comensales comprometidos con su nutrición que buscan guía humana profesional.
              </p>
            </div>
            
            <div className="grid gap-6">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Pacientes Fit y Comprometidos</h3>
                  <p className="text-sm text-muted-foreground">Accede a una base de usuarios Premium dispuestos a invertir en su salud.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Sello de Verificación CNP</h3>
                  <p className="text-sm text-muted-foreground">Gana autoridad y confianza dentro de la comunidad mostrando tu colegiatura validada.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Impacto Directo y Retorno Real</h3>
                  <p className="text-sm text-muted-foreground">Un directorio limpio donde los usuarios te contactan directo a tu WhatsApp profesional.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h2 className="font-display text-2xl font-semibold">Postula a la Red Premium</h2>
            <p className="mt-1 text-sm text-muted-foreground">Completa tus datos y coordina tu membresía.</p>
            
            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ej. Dra. María Pérez" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cnp">Código CNP</Label>
                  <Input id="cnp" required value={cnp} onChange={(e) => setCnp(e.target.value)} placeholder="Ej. 12345" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="specialty">Especialidad Principal</Label>
                  <select 
                    id="specialty" 
                    value={specialty} 
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="whatsapp">WhatsApp de Contacto (con código de país)</Label>
                <Input id="whatsapp" required value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Ej. +51987654321" />
              </div>

              <div className="space-y-2">
                <Label>Foto de Perfil Profesional</Label>
                <div className="flex items-center gap-4">
                  {imageUrl ? (
                    <div className="relative h-16 w-16 shrink-0 rounded-full border-2 border-primary bg-muted overflow-hidden">
                      <img src={imageUrl} alt="Perfil" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted">
                      <UploadCloud className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input type="file" accept="image/*" className="hidden" ref={fileRef} onChange={handleImageUpload} />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={loading}>
                      {loading && !imageUrl ? "Subiendo..." : imageUrl ? "Cambiar foto" : "Seleccionar foto"}
                    </Button>
                    <p className="mt-1 text-[10px] text-muted-foreground">Sube una imagen clara para tu tarjeta en el directorio.</p>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" disabled={loading || !imageUrl}>
                🚀 Enviar Postulación y Contactar Soporte
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
