export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          kind: string
          message_text: string | null
          order_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          kind?: string
          message_text?: string | null
          order_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          kind?: string
          message_text?: string | null
          order_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_chat_hub"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nutritionists: {
        Row: {
          bio: string | null
          cnp: string | null
          contact_url: string | null
          created_at: string
          full_name: string
          id: string
          photo_url: string | null
          specialty: string | null
        }
        Insert: {
          bio?: string | null
          cnp?: string | null
          contact_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          photo_url?: string | null
          specialty?: string | null
        }
        Update: {
          bio?: string | null
          cnp?: string | null
          contact_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          photo_url?: string | null
          specialty?: string | null
        }
        Relationships: []
      }
      orders_chat_hub: {
        Row: {
          base_price: number | null
          client_id: string
          created_at: string
          customized_recipe: Json | null
          dish_id: string | null
          dish_name: string | null
          final_price: number | null
          health_tags: string[]
          id: string
          is_premium_custom: boolean
          restaurant_id: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          client_id: string
          created_at?: string
          customized_recipe?: Json | null
          dish_id?: string | null
          dish_name?: string | null
          final_price?: number | null
          health_tags?: string[]
          id?: string
          is_premium_custom?: boolean
          restaurant_id: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          client_id?: string
          created_at?: string
          customized_recipe?: Json | null
          dish_id?: string | null
          dish_name?: string | null
          final_price?: number | null
          health_tags?: string[]
          id?: string
          is_premium_custom?: boolean
          restaurant_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_chat_hub_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_chat_hub_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "restaurant_dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_chat_hub_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          badges: string[]
          created_at: string
          diets: string[]
          fitness_goal: string | null
          full_name: string | null
          id: string
          medical_restrictions: string[]
          onboarding_complete: boolean
          points: number
          role: Database["public"]["Enums"]["app_role"]
          safety_meals_ordered: number
          tier: Database["public"]["Enums"]["user_tier"]
          updated_at: string
        }
        Insert: {
          badges?: string[]
          created_at?: string
          diets?: string[]
          fitness_goal?: string | null
          full_name?: string | null
          id: string
          medical_restrictions?: string[]
          onboarding_complete?: boolean
          points?: number
          role?: Database["public"]["Enums"]["app_role"]
          safety_meals_ordered?: number
          tier?: Database["public"]["Enums"]["user_tier"]
          updated_at?: string
        }
        Update: {
          badges?: string[]
          created_at?: string
          diets?: string[]
          fitness_goal?: string | null
          full_name?: string | null
          id?: string
          medical_restrictions?: string[]
          onboarding_complete?: boolean
          points?: number
          role?: Database["public"]["Enums"]["app_role"]
          safety_meals_ordered?: number
          tier?: Database["public"]["Enums"]["user_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_dishes: {
        Row: {
          base_price: number
          created_at: string
          description: string | null
          dish_name: string
          health_tags: string[]
          id: string
          image_url: string | null
          restaurant_id: string
        }
        Insert: {
          base_price: number
          created_at?: string
          description?: string | null
          dish_name: string
          health_tags?: string[]
          id?: string
          image_url?: string | null
          restaurant_id: string
        }
        Update: {
          base_price?: number
          created_at?: string
          description?: string | null
          dish_name?: string
          health_tags?: string[]
          id?: string
          image_url?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_dishes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants_metadata: {
        Row: {
          badges: string[]
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          points: number
          qr_url: string | null
          specific_counters: Json
          successful_delivery_rate: number
          total_orders_completed: number
        }
        Insert: {
          badges?: string[]
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id: string
          name: string
          points?: number
          qr_url?: string | null
          specific_counters?: Json
          successful_delivery_rate?: number
          total_orders_completed?: number
        }
        Update: {
          badges?: string[]
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          points?: number
          qr_url?: string | null
          specific_counters?: Json
          successful_delivery_rate?: number
          total_orders_completed?: number
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_metadata_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "usuario" | "restaurante"
      order_status:
        | "chat_activo"
        | "pendiente_pago"
        | "esperando_validacion"
        | "pago_confirmado"
        | "en_preparacion"
        | "preparando"
        | "listo_para_enviar"
        | "entregado"
        | "cancelado"
      user_tier: "freemium" | "premium"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["usuario", "restaurante"],
      order_status: [
        "chat_activo",
        "pendiente_pago",
        "esperando_validacion",
        "pago_confirmado",
        "en_preparacion",
        "preparando",
        "listo_para_enviar",
        "entregado",
        "cancelado",
      ],
      user_tier: ["freemium", "premium"],
    },
  },
} as const
