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
  quema_grasa: "Quema de Grasa",
  hipertrofia: "Hipertrofia",
};

export const ORDER_STAGES = [
  { id: "pendiente_pago", label: "Pendiente de Pago" },
  { id: "esperando_validacion", label: "Esperando Validación" },
  { id: "pago_confirmado", label: "Pago Confirmado" },
  { id: "en_preparacion", label: "En Preparación" },
  { id: "preparando", label: "Preparando" },
  { id: "listo_para_enviar", label: "Listo para Enviar" },
  { id: "entregado", label: "Entregado" },
] as const;

export type OrderStatus =
  | "chat_activo"
  | "pendiente_pago"
  | "esperando_validacion"
  | "pago_confirmado"
  | "en_preparacion"
  | "preparando"
  | "listo_para_enviar"
  | "entregado"
  | "cancelado";
