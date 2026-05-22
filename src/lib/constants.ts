export const DIET_OPTIONS = [
  { id: "vegano", label: "Vegano", emoji: "🌱" },
  { id: "keto", label: "Keto", emoji: "🥑" },
  { id: "balanced", label: "Balanceado", emoji: "🥗" },
] as const;

export const RESTRICTION_OPTIONS = [
  { id: "sin_gluten", label: "Sin Gluten" },
  { id: "sin_lacteos", label: "Sin Lácteos" },
  { id: "sin_azucar", label: "Sin Azúcar" },
  { id: "bajo_sodio", label: "Bajo en Sodio" },
  { id: "facil_masticar", label: "Fácil de Masticar" },
] as const;

export const GOAL_OPTIONS = [
  { id: "quema_grasa", label: "Quema de Grasa" },
  { id: "hipertrofia", label: "Hipertrofia" },
] as const;

export const TAG_LABELS: Record<string, string> = {
  vegano: "Vegano",
  keto: "Keto",
  balanced: "Balanceado",
  sin_gluten: "Sin Gluten",
  sin_lacteos: "Sin Lácteos",
  sin_azucar: "Sin Azúcar",
  bajo_sodio: "Bajo en Sodio",
  facil_masticar: "Fácil de Masticar",
  quema_grasa: "Quema de Grasa",
  hipertrofia: "Hipertrofia",
};

export const ORDER_STAGES = [
  { id: "pago_confirmado", label: "Pago Confirmado" },
  { id: "esperando_validacion", label: "Validación de Capricho" },
  { id: "en_preparacion", label: "Inicia Preparación" },
  { id: "preparando", label: "Preparando" },
  { id: "listo_para_enviar", label: "Listo" },
  { id: "entregado", label: "Entregado" },
] as const;

export type OrderStatus =
  | "chat_activo"
  | "pendiente_pago"
  | "pago_confirmado"
  | "esperando_validacion"
  | "en_preparacion"
  | "preparando"
  | "listo_para_enviar"
  | "entregado"
  | "cancelado";
