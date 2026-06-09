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
      badges: {
        Row: {
          created_at: string
          criteria: Json | null
          description: string | null
          icon_url: string | null
          id: string
          name: string
          points_required: number | null
          slug: string
        }
        Insert: {
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          points_required?: number | null
          slug: string
        }
        Update: {
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          points_required?: number | null
          slug?: string
        }
        Relationships: []
      }
      campaign_participants: {
        Row: {
          campaign_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_redemptions: {
        Row: {
          campaign_id: string
          id: string
          points_awarded: number
          redeemed_at: string
          redemption_code: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          id?: string
          points_awarded?: number
          redeemed_at?: string
          redemption_code?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          id?: string
          points_awarded?: number
          redeemed_at?: string
          redemption_code?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_redemptions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          campaign_type: string
          coffee_shop_id: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          hashtag: string | null
          id: string
          max_participants: number | null
          points_reward: number
          required_check_ins: number
          requirements: string | null
          reward_description: string | null
          starts_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          campaign_type?: string
          coffee_shop_id: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          hashtag?: string | null
          id?: string
          max_participants?: number | null
          points_reward?: number
          required_check_ins?: number
          requirements?: string | null
          reward_description?: string | null
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          campaign_type?: string
          coffee_shop_id?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          hashtag?: string | null
          id?: string
          max_participants?: number | null
          points_reward?: number
          required_check_ins?: number
          requirements?: string | null
          reward_description?: string | null
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "coffee_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          campaign_id: string | null
          coffee_shop_id: string
          created_at: string
          id: string
          notes: string | null
          points_awarded: number
          social_platform: string | null
          social_post_url: string | null
          user_id: string
          verified: boolean
        }
        Insert: {
          campaign_id?: string | null
          coffee_shop_id: string
          created_at?: string
          id?: string
          notes?: string | null
          points_awarded?: number
          social_platform?: string | null
          social_post_url?: string | null
          user_id: string
          verified?: boolean
        }
        Update: {
          campaign_id?: string | null
          coffee_shop_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          points_awarded?: number
          social_platform?: string | null
          social_post_url?: string | null
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "coffee_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      coffee_shops: {
        Row: {
          address: string | null
          amenities: string[]
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          free_coffee_available: boolean
          gallery_urls: string[]
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          partner_id: string | null
          price_level: number
          rating: number
          rating_count: number
          slug: string
          status: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          address?: string | null
          amenities?: string[]
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          free_coffee_available?: boolean
          gallery_urls?: string[]
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          partner_id?: string | null
          price_level?: number
          rating?: number
          rating_count?: number
          slug: string
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          address?: string | null
          amenities?: string[]
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          free_coffee_available?: boolean
          gallery_urls?: string[]
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          partner_id?: string | null
          price_level?: number
          rating?: number
          rating_count?: number
          slug?: string
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      partner_applications: {
        Row: {
          business_name: string
          city: string | null
          contact_email: string
          created_at: string
          id: string
          message: string | null
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          business_name: string
          city?: string | null
          contact_email: string
          created_at?: string
          id?: string
          message?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          business_name?: string
          city?: string | null
          contact_email?: string
          created_at?: string
          id?: string
          message?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string | null
          handle: string | null
          id: string
          instagram_handle: string | null
          total_check_ins: number
          total_points: number
          updated_at: string
          x_handle: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id: string
          instagram_handle?: string | null
          total_check_ins?: number
          total_points?: number
          updated_at?: string
          x_handle?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id?: string
          instagram_handle?: string | null
          total_check_ins?: number
          total_points?: number
          updated_at?: string
          x_handle?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          coffee_shop_id: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          coffee_shop_id: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          coffee_shop_id?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "coffee_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          id: string
          redeemed_at: string
          redemption_code: string
          reward_id: string
          user_id: string
        }
        Insert: {
          id?: string
          redeemed_at?: string
          redemption_code?: string
          reward_id: string
          user_id: string
        }
        Update: {
          id?: string
          redeemed_at?: string
          redemption_code?: string
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          active: boolean
          coffee_shop_id: string
          cost_points: number
          created_at: string
          description: string | null
          id: string
          title: string
        }
        Insert: {
          active?: boolean
          coffee_shop_id: string
          cost_points?: number
          created_at?: string
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          active?: boolean
          coffee_shop_id?: string
          cost_points?: number
          created_at?: string
          description?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "coffee_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_campaign: { Args: { _campaign_id: string }; Returns: Json }
      perform_check_in:
        | { Args: { _shop_id: string }; Returns: Json }
        | { Args: { _campaign_id?: string; _shop_id: string }; Returns: Json }
      redeem_campaign: { Args: { _campaign_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "explorer" | "partner" | "admin"
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
      app_role: ["explorer", "partner", "admin"],
    },
  },
} as const
