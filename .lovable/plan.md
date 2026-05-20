# NutriConnect — Plan de construcción (MVP funcional)

App PWA de precisión médico-gastronómica con dos roles (Comensal / Restaurante), matchmaking por restricciones, chat-hub de pedido con pipeline en tiempo real y gamificación.

## Stack
- React 19 + TanStack Start (ya en el template) + Vite + Tailwind v4 + shadcn/ui
- **Lovable Cloud** (Supabase gestionado) — Auth, Postgres, Realtime
- Zustand para estado UI (rol activo, switch demo, filtros)
- PWA: solo manifest + íconos (instalable, sin service worker — para no romper el preview de Lovable)

## Paleta y diseño
Tokens en `src/styles.css` (oklch):
- Coral `#FF5A5F` → `--primary` (acciones, CTAs, alertas)
- Esmeralda `#0E9F6E` → `--success` (estados confirmados, badges)
- Gris Oscuro `#1A202C` → `--foreground`
- Fondo crema sutil, tipografía: Inter (body) + Fraunces (display) — estética Airbnb/Yazio

## Esquema de base de datos (migración Supabase)

```sql
-- enums
create type app_role as enum ('usuario','restaurante');
create type user_tier as enum ('freemium','premium');
create type order_status as enum (
  'chat_activo','pendiente_pago','esperando_validacion',
  'pago_confirmado','en_preparacion','preparando',
  'listo_para_enviar','entregado','cancelado'
);

-- profiles (1:1 con auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role app_role not null,
  tier user_tier not null default 'freemium',
  diets text[] default '{}',
  medical_restrictions text[] default '{}',
  fitness_goal text,
  onboarding_complete boolean default false,
  safety_meals_ordered int default 0,
  created_at timestamptz default now()
);

-- restaurants_metadata
create table restaurants_metadata (
  id uuid primary key references profiles(id) on delete cascade,
  name text not null,
  qr_url text,
  points int default 0,
  badges text[] default '{}',
  total_orders_completed int default 0,
  successful_delivery_rate numeric default 100,
  specific_counters jsonb default '{}'::jsonb
);

-- restaurant_dishes
create table restaurant_dishes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references profiles(id) on delete cascade,
  dish_name text not null,
  description text,
  base_price numeric not null,
  health_tags text[] default '{}',
  created_at timestamptz default now()
);

-- orders_chat_hub
create table orders_chat_hub (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references profiles(id),
  restaurant_id uuid references profiles(id),
  dish_id uuid references restaurant_dishes(id),
  status order_status not null default 'chat_activo',
  final_price numeric,
  customized_recipe jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- chat_messages
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders_chat_hub(id) on delete cascade,
  sender_id uuid references profiles(id),
  message_text text,
  image_url text,
  created_at timestamptz default now()
);

-- nutritionists (directorio premium estático)
create table nutritionists (
  id uuid primary key default gen_random_uuid(),
  full_name text, cnp text, specialty text,
  contact_url text, photo_url text
);
```

**Trigger:** `handle_new_user()` lee `raw_user_meta_data->>'role'` y crea row en `profiles` (y en `restaurants_metadata` si role='restaurante').

**RLS:** activado en todas. Profiles: SELECT propio + lectura pública de restaurantes. Dishes: SELECT público, INSERT/UPDATE solo dueño. Orders: SELECT/INSERT/UPDATE si `auth.uid() IN (client_id, restaurant_id)`. Messages: igual via join.

**Trigger de gamificación:** al `UPDATE` `orders_chat_hub` con `status='entregado'`, suma puntos, incrementa `total_orders_completed`, suma al contador específico del tag del plato, otorga badge a los 50 platos seguros.

## Estructura de rutas (TanStack file-based)

```
src/routes/
  __root.tsx          — shell, providers, header con switch demo
  index.tsx           — landing pública (marketing breve + CTA)
  login.tsx           — login
  signup.tsx          — registro unificado con selector de rol
  _authenticated.tsx  — guard
  _authenticated/
    onboarding.tsx    — preferencias de salud obligatorias (usuario)
    home.tsx          — redirige según rol
    discover.tsx      — catálogo filtrado (usuario)
    restaurant.$id.tsx— perfil extendido del restaurante
    order.$id.tsx     — chat-hub del pedido con pipeline realtime
    orders.tsx        — historial / activas
    nutritionists.tsx — red premium
    dashboard.tsx     — panel del restaurante
    dishes.tsx        — CRUD recetas base (restaurante)
    incoming.tsx      — bandeja de pedidos (restaurante)
  api/public/
    sitemap[.]xml.ts
```

## Componentes clave
- `Header` con switch demo `[Vista Cliente | Vista Restaurante]` (Zustand `useDemoStore`)
- `DishCard` / `RestaurantCard` con métricas (platos por tag, badges, % efectividad)
- `OrderChatHub` — mensajes + barra de pipeline visual + acciones por rol
  - Restaurante: subir QR, fijar precio personalizado, botón "✅ Aceptar Receta", avanzar estado
  - Usuario: adjuntar voucher, ver pipeline, recibir notificaciones (toast)
- `PreferenceForm` (onboarding) y `PremiumCustomizer` (panel de porciones/specs)
- `NutritionistDirectory` con disclaimer de no-automatización

## Flujos cubiertos
1. **Registro** → metadata.role → trigger crea profile → si usuario sin preferencias → `/onboarding` forzado
2. **Matchmaking** → query con `health_tags @> user.restrictions AND health_tags @> user.diets` en `restaurant_dishes`, agrupada por restaurante
3. **Pedido freemium** → crea order con precio base, status `pendiente_pago`
4. **Pedido premium** → modal customizer → order con `customized_recipe`, status `chat_activo`, restaurante fija `final_price`
5. **Pipeline pago** → QR (restaurante) → voucher (cliente) → "Aceptar Receta" (restaurante) → avance manual de estados → `entregado` dispara gamificación
6. **Realtime** → suscripción a `orders_chat_hub` (status) y `chat_messages` (nuevos mensajes) por order_id
7. **Premium** → toggle de tier en perfil (demo) desbloquea customizer + directorio nutricionistas

## Detalles técnicos
- Storage bucket `chat-uploads` (público) para QR y vouchers
- Toggle "Premium" en perfil de usuario para demo (sin pasarela real)
- Switch demo del header alterna entre rutas de cliente y restaurante (no cambia auth)
- Seed: 4 restaurantes demo con dishes etiquetados (keto, vegan, sin_gluten, sin_lacteos, bajo_sodio, hipertrofia, quema_grasa) + 3 nutricionistas
- Imágenes generadas para hero y placeholders de platos

## Fuera de alcance del MVP
- Pasarela de pago real (solo flujo de voucher)
- Service worker / offline (manifest-only para evitar romper preview)
- Push notifications nativas (usamos toasts in-app + realtime)
- Cálculo automático de macros (explícitamente prohibido por requerimiento)

## Orden de ejecución
1. Habilitar Lovable Cloud
2. Migración SQL (tablas, enums, RLS, triggers, bucket)
3. Tokens de diseño + Header con switch demo
4. Auth (signup unificado, login, guard, onboarding)
5. Catálogo con matchmaking + perfil restaurante
6. Chat-hub con realtime + pipeline + gamificación
7. Premium: customizer + directorio nutricionistas
8. Panel restaurante (dishes CRUD + incoming orders)
9. Seed de demo + manifest PWA + QA

¿Procedo con la implementación completa, o quieres ajustar algo (recortar alcance, cambiar paleta, simplificar el panel restaurante)?