import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDemoStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin B2B — NutriConnect" }] }),
});

function AdminPage() {
  const { view } = useDemoStore();
  const [leads, setLeads] = useState<any[]>([]);

  const fetchLeads = async () => {
    const { data } = await supabase
      .from("nutritionist_leads")
      .select("*")
      .eq("status", "pendiente_revision")
      .order("created_at", { ascending: false });
    setLeads(data ?? []);
  };

  useEffect(() => {
    if (view === "admin") {
      fetchLeads();
    }
  }, [view]);

  if (view !== "admin") return <Navigate to="/home" />;

  const activateLead = async (lead: any) => {
    // 1. Update status
    const { error: updateErr } = await supabase
      .from("nutritionist_leads")
      .update({ status: "activo_pagado" })
      .eq("id", lead.id);
    
    if (updateErr) return toast.error(updateErr.message);

    // 2. Insert into nutritionists directory
    const { error: insertErr } = await supabase
      .from("nutritionists")
      .insert({
        full_name: lead.full_name,
        cnp: lead.cnp_code,
        specialty: lead.specialty,
        contact_url: `https://wa.me/${lead.whatsapp_number.replace(/\D/g, "")}`,
        photo_url: lead.profile_image_url
      });

    if (insertErr) return toast.error(insertErr.message);

    toast.success(`Membresía activada para ${lead.full_name}`);
    fetchLeads();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold">Panel Administrativo B2B</h1>
      <p className="mt-1 text-sm text-muted-foreground">Validación de pagos de membresía de Nutricionistas.</p>

      <div className="mt-8 grid gap-4">
        {leads.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No hay solicitudes pendientes de revisión.
          </div>
        )}
        {leads.map((lead) => (
          <div key={lead.id} className="flex items-center justify-between rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center gap-4">
              <div 
                className="h-16 w-16 rounded-2xl bg-muted"
                style={{ backgroundImage: lead.profile_image_url ? `url(${lead.profile_image_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
              />
              <div>
                <h3 className="font-display text-lg font-semibold">{lead.full_name}</h3>
                <div className="text-sm text-muted-foreground">CNP: {lead.cnp_code} · {lead.specialty}</div>
                <div className="mt-1 flex items-center gap-1 text-xs text-warning">
                  <Clock className="h-3 w-3" /> Pendiente de Validación
                </div>
              </div>
            </div>
            <Button onClick={() => activateLead(lead)} className="rounded-full bg-success text-success-foreground hover:bg-success/90">
              <CheckCircle className="mr-2 h-4 w-4" />
              Validar Pago y Activar
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
