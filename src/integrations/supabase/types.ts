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
      certificates: {
        Row: {
          code: string
          id: string
          issued_at: string
          module_id: string
          user_id: string
        }
        Insert: {
          code?: string
          id?: string
          issued_at?: string
          module_id: string
          user_id: string
        }
        Update: {
          code?: string
          id?: string
          issued_at?: string
          module_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      consulting_requests: {
        Row: {
          created_at: string
          crop: string | null
          id: string
          question: string
          replied_at: string | null
          reply: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          crop?: string | null
          id?: string
          question: string
          replied_at?: string | null
          reply?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          crop?: string | null
          id?: string
          question?: string
          replied_at?: string | null
          reply?: string | null
          user_id?: string
        }
        Relationships: []
      }
      diagnoses: {
        Row: {
          confidence: number | null
          created_at: string
          crop: string | null
          disease: string | null
          id: string
          photo_path: string
          prevention: string | null
          severity: string | null
          summary: string | null
          treatment: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          crop?: string | null
          disease?: string | null
          id?: string
          photo_path: string
          prevention?: string | null
          severity?: string | null
          summary?: string | null
          treatment?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          crop?: string | null
          disease?: string | null
          id?: string
          photo_path?: string
          prevention?: string | null
          severity?: string | null
          summary?: string | null
          treatment?: string | null
          user_id?: string
        }
        Relationships: []
      }
      garden_events: {
        Row: {
          id: string
          kind: string
          note: string | null
          occurred_at: string
          plot_id: string
          user_id: string
        }
        Insert: {
          id?: string
          kind: string
          note?: string | null
          occurred_at?: string
          plot_id: string
          user_id: string
        }
        Update: {
          id?: string
          kind?: string
          note?: string | null
          occurred_at?: string
          plot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "garden_events_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "plots"
            referencedColumns: ["id"]
          },
        ]
      }
      gardens: {
        Row: {
          created_at: string
          id: string
          location: string | null
          name: string
          size_sqm: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          name: string
          size_sqm?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          size_sqm?: number | null
          user_id?: string
        }
        Relationships: []
      }
      learning_modules: {
        Row: {
          body: string
          created_at: string
          duration_min: number
          id: string
          summary: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          duration_min?: number
          id?: string
          summary: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          duration_min?: number
          id?: string
          summary?: string
          title?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          qty: number
          title: string
          unit_price_cents: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          qty: number
          title: string
          unit_price_cents: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          qty?: number
          title?: string
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          status: string
          total_cents: number
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          status?: string
          total_cents: number
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          status?: string
          total_cents?: number
        }
        Relationships: []
      }
      plots: {
        Row: {
          area_sqm: number | null
          created_at: string
          crop: string
          garden_id: string
          id: string
          planted_on: string
          status: string
          user_id: string
        }
        Insert: {
          area_sqm?: number | null
          created_at?: string
          crop: string
          garden_id: string
          id?: string
          planted_on?: string
          status?: string
          user_id: string
        }
        Update: {
          area_sqm?: number | null
          created_at?: string
          crop?: string
          garden_id?: string
          id?: string
          planted_on?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plots_garden_id_fkey"
            columns: ["garden_id"]
            isOneToOne: false
            referencedRelation: "gardens"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_seed: boolean
          price_cents: number
          seller_id: string | null
          stock: number
          title: string
          unit: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_seed?: boolean
          price_cents: number
          seller_id?: string | null
          stock?: number
          title: string
          unit?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_seed?: boolean
          price_cents?: number
          seller_id?: string | null
          stock?: number
          title?: string
          unit?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          crops_of_interest: string[] | null
          farm_name: string | null
          full_name: string | null
          goals: string[] | null
          id: string
          land_size_acres: number | null
          onboarded: boolean
          phone: string | null
          updated_at: string
          village: string | null
        }
        Insert: {
          created_at?: string
          crops_of_interest?: string[] | null
          farm_name?: string | null
          full_name?: string | null
          goals?: string[] | null
          id: string
          land_size_acres?: number | null
          onboarded?: boolean
          phone?: string | null
          updated_at?: string
          village?: string | null
        }
        Update: {
          created_at?: string
          crops_of_interest?: string[] | null
          farm_name?: string | null
          full_name?: string | null
          goals?: string[] | null
          id?: string
          land_size_acres?: number | null
          onboarded?: boolean
          phone?: string | null
          updated_at?: string
          village?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          kind: string
          reason: string
          ref_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          kind: string
          reason: string
          ref_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          kind?: string
          reason?: string
          ref_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      wallet_balance: { Args: { _user_id: string }; Returns: number }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
