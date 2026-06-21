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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          partner_id: string
          rate_limit_per_minute: number
          revoked_at: string | null
          scopes: string[]
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          partner_id: string
          rate_limit_per_minute?: number
          revoked_at?: string | null
          scopes?: string[]
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          partner_id?: string
          rate_limit_per_minute?: number
          revoked_at?: string | null
          scopes?: string[]
        }
        Relationships: []
      }
      api_request_log: {
        Row: {
          api_key_id: string | null
          created_at: string
          id: number
          ip: string | null
          method: string
          partner_id: string | null
          path: string
          response_ms: number | null
          status: number
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          id?: number
          ip?: string | null
          method: string
          partner_id?: string | null
          path: string
          response_ms?: number | null
          status: number
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          id?: number
          ip?: string | null
          method?: string
          partner_id?: string | null
          path?: string
          response_ms?: number | null
          status?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_log_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          category: string
          created_at: string
          criteria: Json | null
          description: string | null
          icon_url: string | null
          id: string
          name: string
          points_required: number | null
          rarity: string
          slug: string
        }
        Insert: {
          category?: string
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          points_required?: number | null
          rarity?: string
          slug: string
        }
        Update: {
          category?: string
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          points_required?: number | null
          rarity?: string
          slug?: string
        }
        Relationships: []
      }
      billing_invoices: {
        Row: {
          amount_eur_cents: number
          created_at: string
          currency: string
          hosted_invoice_url: string | null
          id: string
          issued_at: string
          paid_at: string | null
          partner_id: string
          pdf_url: string | null
          status: string
          stripe_invoice_id: string | null
          subscription_id: string | null
        }
        Insert: {
          amount_eur_cents: number
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          issued_at?: string
          paid_at?: string | null
          partner_id: string
          pdf_url?: string | null
          status: string
          stripe_invoice_id?: string | null
          subscription_id?: string | null
        }
        Update: {
          amount_eur_cents?: number
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          issued_at?: string
          paid_at?: string | null
          partner_id?: string
          pdf_url?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_participants: {
        Row: {
          campaign_id: string
          id: string
          joined_at: string
          joined_source: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          id?: string
          joined_at?: string
          joined_source?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          id?: string
          joined_at?: string
          joined_source?: string | null
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
          expires_at: string | null
          id: string
          points_awarded: number
          redeemed_at: string
          redemption_code: string
          reward_status: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          expires_at?: string | null
          id?: string
          points_awarded?: number
          redeemed_at?: string
          redemption_code?: string
          reward_status?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          expires_at?: string | null
          id?: string
          points_awarded?: number
          redeemed_at?: string
          redemption_code?: string
          reward_status?: string
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
          auto_approve_social: boolean
          available_quantity: number | null
          campaign_type: string
          coffee_shop_id: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          fulfillment_mode: string
          hashtag: string | null
          hashtags: string[]
          id: string
          max_participants: number | null
          participation_token: string | null
          points_reward: number
          required_check_ins: number
          requirements: string | null
          reward_description: string | null
          reward_quantity: number
          reward_type: string
          slogan: string
          social_requirements: Json
          starts_at: string | null
          status: string
          terms_and_conditions: string | null
          title: string
          updated_at: string
        }
        Insert: {
          auto_approve_social?: boolean
          available_quantity?: number | null
          campaign_type?: string
          coffee_shop_id: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          fulfillment_mode?: string
          hashtag?: string | null
          hashtags?: string[]
          id?: string
          max_participants?: number | null
          participation_token?: string | null
          points_reward?: number
          required_check_ins?: number
          requirements?: string | null
          reward_description?: string | null
          reward_quantity?: number
          reward_type?: string
          slogan?: string
          social_requirements?: Json
          starts_at?: string | null
          status?: string
          terms_and_conditions?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          auto_approve_social?: boolean
          available_quantity?: number | null
          campaign_type?: string
          coffee_shop_id?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          fulfillment_mode?: string
          hashtag?: string | null
          hashtags?: string[]
          id?: string
          max_participants?: number | null
          participation_token?: string | null
          points_reward?: number
          required_check_ins?: number
          requirements?: string | null
          reward_description?: string | null
          reward_quantity?: number
          reward_type?: string
          slogan?: string
          social_requirements?: Json
          starts_at?: string | null
          status?: string
          terms_and_conditions?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "cafe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "coffee_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_redemptions: {
        Row: {
          catalog_id: string
          created_at: string
          expires_at: string | null
          id: string
          points_spent: number
          redemption_code: string
          reward_status: string
          used_at: string | null
          used_by: string | null
          user_id: string
        }
        Insert: {
          catalog_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          points_spent: number
          redemption_code?: string
          reward_status?: string
          used_at?: string | null
          used_by?: string | null
          user_id: string
        }
        Update: {
          catalog_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          points_spent?: number
          redemption_code?: string
          reward_status?: string
          used_at?: string | null
          used_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_redemptions_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "reward_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          beverage_tag: string | null
          campaign_id: string | null
          check_in_status: string
          coffee_shop_id: string
          created_at: string
          id: string
          latitude: number | null
          location_confirmed: boolean
          longitude: number | null
          notes: string | null
          points_awarded: number
          qr_code_used: string | null
          social_platform: string | null
          social_post_url: string | null
          user_id: string
          verified: boolean
        }
        Insert: {
          beverage_tag?: string | null
          campaign_id?: string | null
          check_in_status?: string
          coffee_shop_id: string
          created_at?: string
          id?: string
          latitude?: number | null
          location_confirmed?: boolean
          longitude?: number | null
          notes?: string | null
          points_awarded?: number
          qr_code_used?: string | null
          social_platform?: string | null
          social_post_url?: string | null
          user_id: string
          verified?: boolean
        }
        Update: {
          beverage_tag?: string | null
          campaign_id?: string | null
          check_in_status?: string
          coffee_shop_id?: string
          created_at?: string
          id?: string
          latitude?: number | null
          location_confirmed?: boolean
          longitude?: number | null
          notes?: string | null
          points_awarded?: number
          qr_code_used?: string | null
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
            referencedRelation: "cafe_listings"
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
      cities: {
        Row: {
          active: boolean
          country_code: string
          created_at: string
          featured: boolean
          id: string
          lat: number | null
          lng: number | null
          name: string
          population: number | null
          region_id: string | null
          slug: string
          timezone: string | null
        }
        Insert: {
          active?: boolean
          country_code: string
          created_at?: string
          featured?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          population?: number | null
          region_id?: string | null
          slug: string
          timezone?: string | null
        }
        Update: {
          active?: boolean
          country_code?: string
          created_at?: string
          featured?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          population?: number | null
          region_id?: string | null
          slug?: string
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "cities_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      city_collection_milestones: {
        Row: {
          badge_slug: string | null
          city_name: string
          city_slug: string
          country: string | null
          shops_target: number
          sort_order: number
        }
        Insert: {
          badge_slug?: string | null
          city_name: string
          city_slug: string
          country?: string | null
          shops_target?: number
          sort_order?: number
        }
        Update: {
          badge_slug?: string | null
          city_name?: string
          city_slug?: string
          country?: string | null
          shops_target?: number
          sort_order?: number
        }
        Relationships: []
      }
      coffee_crawls: {
        Row: {
          active: boolean
          city_slug: string
          created_at: string
          description: string | null
          id: string
          reward_points: number
          slug: string
          title: string
        }
        Insert: {
          active?: boolean
          city_slug: string
          created_at?: string
          description?: string | null
          id?: string
          reward_points?: number
          slug: string
          title: string
        }
        Update: {
          active?: boolean
          city_slug?: string
          created_at?: string
          description?: string | null
          id?: string
          reward_points?: number
          slug?: string
          title?: string
        }
        Relationships: []
      }
      coffee_shops: {
        Row: {
          address: string | null
          amenities: string[]
          city: string | null
          city_id: string | null
          co2_note: string | null
          country: string | null
          country_code: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          fair_trade: boolean
          free_coffee_available: boolean
          gallery_urls: string[]
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          opening_hours: Json
          origin_region: string | null
          partner_id: string | null
          price_level: number
          rating: number
          rating_count: number
          roaster_name: string | null
          slug: string
          social_links: Json
          soundscape_url: string | null
          status: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          address?: string | null
          amenities?: string[]
          city?: string | null
          city_id?: string | null
          co2_note?: string | null
          country?: string | null
          country_code?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          fair_trade?: boolean
          free_coffee_available?: boolean
          gallery_urls?: string[]
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          opening_hours?: Json
          origin_region?: string | null
          partner_id?: string | null
          price_level?: number
          rating?: number
          rating_count?: number
          roaster_name?: string | null
          slug: string
          social_links?: Json
          soundscape_url?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          address?: string | null
          amenities?: string[]
          city?: string | null
          city_id?: string | null
          co2_note?: string | null
          country?: string | null
          country_code?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          fair_trade?: boolean
          free_coffee_available?: boolean
          gallery_urls?: string[]
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          opening_hours?: Json
          origin_region?: string | null
          partner_id?: string | null
          price_level?: number
          rating?: number
          rating_count?: number
          roaster_name?: string | null
          slug?: string
          social_links?: Json
          soundscape_url?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coffee_shops_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coffee_shops_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      countries: {
        Row: {
          active: boolean
          code: string
          created_at: string
          currency: string
          default_timezone: string
          flag_emoji: string | null
          locale: string
          name: string
          vat_rate: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          currency?: string
          default_timezone?: string
          flag_emoji?: string | null
          locale?: string
          name: string
          vat_rate?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          currency?: string
          default_timezone?: string
          flag_emoji?: string | null
          locale?: string
          name?: string
          vat_rate?: number
        }
        Relationships: []
      }
      crawl_stops: {
        Row: {
          coffee_shop_id: string
          crawl_id: string
          hint: string | null
          id: string
          stop_order: number
        }
        Insert: {
          coffee_shop_id: string
          crawl_id: string
          hint?: string | null
          id?: string
          stop_order: number
        }
        Update: {
          coffee_shop_id?: string
          crawl_id?: string
          hint?: string | null
          id?: string
          stop_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "crawl_stops_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "cafe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crawl_stops_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "coffee_shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crawl_stops_crawl_id_fkey"
            columns: ["crawl_id"]
            isOneToOne: false
            referencedRelation: "coffee_crawls"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_members: {
        Row: {
          crew_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          crew_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          crew_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_members_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      crews: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      explorer_challenge_defs: {
        Row: {
          campaign_tag: string | null
          ends_at: string | null
          id: string
          period_type: string
          reward: number
          sort_order: number
          starts_at: string | null
          stat_key: string
          subtitle: string
          target: number
          title: string
        }
        Insert: {
          campaign_tag?: string | null
          ends_at?: string | null
          id: string
          period_type: string
          reward: number
          sort_order?: number
          starts_at?: string | null
          stat_key: string
          subtitle: string
          target: number
          title: string
        }
        Update: {
          campaign_tag?: string | null
          ends_at?: string | null
          id?: string
          period_type?: string
          reward?: number
          sort_order?: number
          starts_at?: string | null
          stat_key?: string
          subtitle?: string
          target?: number
          title?: string
        }
        Relationships: []
      }
      explorer_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          props: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          props?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          props?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      explorer_health_logs: {
        Row: {
          caffeine_mg: number | null
          created_at: string
          id: string
          log_date: string
          steps: number | null
          user_id: string
        }
        Insert: {
          caffeine_mg?: number | null
          created_at?: string
          id?: string
          log_date?: string
          steps?: number | null
          user_id: string
        }
        Update: {
          caffeine_mg?: number | null
          created_at?: string
          id?: string
          log_date?: string
          steps?: number | null
          user_id?: string
        }
        Relationships: []
      }
      gift_credits: {
        Row: {
          created_at: string
          id: string
          message: string | null
          points_value: number
          recipient_id: string
          redeemed_at: string | null
          redemption_code: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          points_value?: number
          recipient_id: string
          redeemed_at?: string | null
          redemption_code?: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          points_value?: number
          recipient_id?: string
          redeemed_at?: string | null
          redemption_code?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          payload: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          payload?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          payload?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
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
      partner_daily_stats: {
        Row: {
          api_calls: number
          check_ins: number
          day: string
          new_customers: number
          partner_id: string
          redemptions: number
          revenue_eur_cents: number
          reviews: number
          social_reach: number
        }
        Insert: {
          api_calls?: number
          check_ins?: number
          day: string
          new_customers?: number
          partner_id: string
          redemptions?: number
          revenue_eur_cents?: number
          reviews?: number
          social_reach?: number
        }
        Update: {
          api_calls?: number
          check_ins?: number
          day?: string
          new_customers?: number
          partner_id?: string
          redemptions?: number
          revenue_eur_cents?: number
          reviews?: number
          social_reach?: number
        }
        Relationships: []
      }
      partner_referrals: {
        Row: {
          created_at: string
          id: string
          paid_at: string | null
          qualified_at: string | null
          referred_partner_id: string
          referrer_partner_id: string
          reward_eur_cents: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          paid_at?: string | null
          qualified_at?: string | null
          referred_partner_id: string
          referrer_partner_id: string
          reward_eur_cents?: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          paid_at?: string | null
          qualified_at?: string | null
          referred_partner_id?: string
          referrer_partner_id?: string
          reward_eur_cents?: number
          status?: string
        }
        Relationships: []
      }
      photo_challenge_defs: {
        Row: {
          active: boolean
          ends_at: string
          id: string
          reward_points: number
          starts_at: string
          theme: string
        }
        Insert: {
          active?: boolean
          ends_at: string
          id: string
          reward_points?: number
          starts_at: string
          theme: string
        }
        Update: {
          active?: boolean
          ends_at?: string
          id?: string
          reward_points?: number
          starts_at?: string
          theme?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          features: Json
          id: string
          interval: string
          max_campaigns_per_month: number | null
          max_shops: number | null
          name: string
          price_eur_cents: number
          sort_order: number
          stripe_price_id: string | null
          trial_days: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          interval?: string
          max_campaigns_per_month?: number | null
          max_shops?: number | null
          name: string
          price_eur_cents?: number
          sort_order?: number
          stripe_price_id?: string | null
          trial_days?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          interval?: string
          max_campaigns_per_month?: number | null
          max_shops?: number | null
          name?: string
          price_eur_cents?: number
          sort_order?: number
          stripe_price_id?: string | null
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_daily_stats: {
        Row: {
          active_users: number
          campaigns_created: number
          country_code: string
          day: string
          new_shops: number
          new_users: number
          redemptions: number
          revenue_eur_cents: number
        }
        Insert: {
          active_users?: number
          campaigns_created?: number
          country_code: string
          day: string
          new_shops?: number
          new_users?: number
          redemptions?: number
          revenue_eur_cents?: number
        }
        Update: {
          active_users?: number
          campaigns_created?: number
          country_code?: string
          day?: string
          new_shops?: number
          new_users?: number
          redemptions?: number
          revenue_eur_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_daily_stats_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      points_ledger: {
        Row: {
          balance_after: number
          created_at: string
          delta: number
          expires_at: string | null
          id: string
          metadata: Json | null
          ref_id: string | null
          ref_table: string | null
          source: string
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          delta: number
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          ref_id?: string | null
          ref_table?: string | null
          source: string
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          delta?: number
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          ref_id?: string | null
          ref_table?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          beans_balance: number
          bio: string | null
          city: string | null
          created_at: string
          display_name: string | null
          explorer_level: string
          handle: string | null
          id: string
          instagram_handle: string | null
          map_theme: string
          onboarding_completed_at: string | null
          points_expire_days: number | null
          preferences: Json
          preferred_drink_categories: string[]
          privacy_preferences: Json
          push_subscription: Json | null
          referral_code: string | null
          referred_by: string | null
          total_check_ins: number
          total_points: number
          total_rewards_redeemed: number
          updated_at: string
          x_handle: string | null
        }
        Insert: {
          avatar_url?: string | null
          beans_balance?: number
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          explorer_level?: string
          handle?: string | null
          id: string
          instagram_handle?: string | null
          map_theme?: string
          onboarding_completed_at?: string | null
          points_expire_days?: number | null
          preferences?: Json
          preferred_drink_categories?: string[]
          privacy_preferences?: Json
          push_subscription?: Json | null
          referral_code?: string | null
          referred_by?: string | null
          total_check_ins?: number
          total_points?: number
          total_rewards_redeemed?: number
          updated_at?: string
          x_handle?: string | null
        }
        Update: {
          avatar_url?: string | null
          beans_balance?: number
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          explorer_level?: string
          handle?: string | null
          id?: string
          instagram_handle?: string | null
          map_theme?: string
          onboarding_completed_at?: string | null
          points_expire_days?: number | null
          preferences?: Json
          preferred_drink_categories?: string[]
          privacy_preferences?: Json
          push_subscription?: Json | null
          referral_code?: string | null
          referred_by?: string | null
          total_check_ins?: number
          total_points?: number
          total_rewards_redeemed?: number
          updated_at?: string
          x_handle?: string | null
        }
        Relationships: []
      }
      redemption_verifications: {
        Row: {
          campaign_id: string | null
          code: string
          id: string
          ip: string | null
          partner_id: string
          redemption_id: string | null
          result: string
          verified_at: string
        }
        Insert: {
          campaign_id?: string | null
          code: string
          id?: string
          ip?: string | null
          partner_id: string
          redemption_id?: string | null
          result: string
          verified_at?: string
        }
        Update: {
          campaign_id?: string | null
          code?: string
          id?: string
          ip?: string | null
          partner_id?: string
          redemption_id?: string | null
          result?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemption_verifications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemption_verifications_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "campaign_redemptions"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          country_code: string
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          country_code: string
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "regions_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          coffee_shop_id: string
          created_at: string
          id: string
          media_urls: string[]
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          coffee_shop_id: string
          created_at?: string
          id?: string
          media_urls?: string[]
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          coffee_shop_id?: string
          created_at?: string
          id?: string
          media_urls?: string[]
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "cafe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "coffee_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_catalog: {
        Row: {
          active: boolean
          cost_points: number
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          name: string
          sort_order: number | null
          tier: string | null
        }
        Insert: {
          active?: boolean
          cost_points: number
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          name: string
          sort_order?: number | null
          tier?: string | null
        }
        Update: {
          active?: boolean
          cost_points?: number
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          tier?: string | null
        }
        Relationships: []
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
            referencedRelation: "cafe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "coffee_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_arrivals: {
        Row: {
          coffee_shop_id: string
          created_at: string
          eta_minutes: number
          id: string
          message: string | null
          status: string
          user_id: string
        }
        Insert: {
          coffee_shop_id: string
          created_at?: string
          eta_minutes?: number
          id?: string
          message?: string | null
          status?: string
          user_id: string
        }
        Update: {
          coffee_shop_id?: string
          created_at?: string
          eta_minutes?: number
          id?: string
          message?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_arrivals_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "cafe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_arrivals_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "coffee_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_daily_stats: {
        Row: {
          avg_rating: number | null
          check_ins: number
          day: string
          redemptions: number
          reviews: number
          shop_id: string
          social_reach: number
          social_submissions: number
          unique_users: number
        }
        Insert: {
          avg_rating?: number | null
          check_ins?: number
          day: string
          redemptions?: number
          reviews?: number
          shop_id: string
          social_reach?: number
          social_submissions?: number
          unique_users?: number
        }
        Update: {
          avg_rating?: number | null
          check_ins?: number
          day?: string
          redemptions?: number
          reviews?: number
          shop_id?: string
          social_reach?: number
          social_submissions?: number
          unique_users?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_daily_stats_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "cafe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_daily_stats_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "coffee_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_stories: {
        Row: {
          caption: string | null
          coffee_shop_id: string
          created_at: string
          expires_at: string
          id: string
          media_url: string
        }
        Insert: {
          caption?: string | null
          coffee_shop_id: string
          created_at?: string
          expires_at?: string
          id?: string
          media_url: string
        }
        Update: {
          caption?: string | null
          coffee_shop_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          media_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_stories_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "cafe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_stories_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "coffee_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_subscriptions: {
        Row: {
          coffee_shop_id: string
          created_at: string
          current_period_end: string | null
          id: string
          partner_subscription_id: string | null
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          coffee_shop_id: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          partner_subscription_id?: string | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          coffee_shop_id?: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          partner_subscription_id?: string | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_subscriptions_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: true
            referencedRelation: "cafe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_subscriptions_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: true
            referencedRelation: "coffee_shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_subscriptions_partner_subscription_id_fkey"
            columns: ["partner_subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      social_submissions: {
        Row: {
          campaign_id: string
          caption: string | null
          coffee_shop_id: string
          created_at: string
          id: string
          platform: string
          points_awarded: number | null
          redemption_code: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_path: string | null
          status: string
          submission_type: string
          url: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          caption?: string | null
          coffee_shop_id: string
          created_at?: string
          id?: string
          platform: string
          points_awarded?: number | null
          redemption_code?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_path?: string | null
          status?: string
          submission_type: string
          url?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          caption?: string | null
          coffee_shop_id?: string
          created_at?: string
          id?: string
          platform?: string
          points_awarded?: number | null
          redemption_code?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_path?: string | null
          status?: string
          submission_type?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_submissions_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "cafe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_submissions_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "coffee_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      spawn_events: {
        Row: {
          active: boolean
          bonus_points: number
          coffee_shop_id: string
          created_at: string
          ends_at: string
          id: string
          rarity: string
          starts_at: string
          title: string | null
        }
        Insert: {
          active?: boolean
          bonus_points?: number
          coffee_shop_id: string
          created_at?: string
          ends_at: string
          id?: string
          rarity?: string
          starts_at?: string
          title?: string | null
        }
        Update: {
          active?: boolean
          bonus_points?: number
          coffee_shop_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          rarity?: string
          starts_at?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spawn_events_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "cafe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spawn_events_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "coffee_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          partner_id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          partner_id: string
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          partner_id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
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
      user_challenge_claims: {
        Row: {
          challenge_id: string
          claimed_at: string
          id: string
          period_key: string
          points_awarded: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          claimed_at?: string
          id?: string
          period_key: string
          points_awarded: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          claimed_at?: string
          id?: string
          period_key?: string
          points_awarded?: number
          user_id?: string
        }
        Relationships: []
      }
      user_crawl_completions: {
        Row: {
          completed_at: string
          crawl_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          crawl_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          crawl_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_crawl_completions_crawl_id_fkey"
            columns: ["crawl_id"]
            isOneToOne: false
            referencedRelation: "coffee_crawls"
            referencedColumns: ["id"]
          },
        ]
      }
      user_crawl_stops: {
        Row: {
          checked_in_at: string
          coffee_shop_id: string
          crawl_id: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string
          coffee_shop_id: string
          crawl_id: string
          user_id: string
        }
        Update: {
          checked_in_at?: string
          coffee_shop_id?: string
          crawl_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_crawl_stops_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "cafe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_crawl_stops_coffee_shop_id_fkey"
            columns: ["coffee_shop_id"]
            isOneToOne: false
            referencedRelation: "coffee_shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_crawl_stops_crawl_id_fkey"
            columns: ["crawl_id"]
            isOneToOne: false
            referencedRelation: "coffee_crawls"
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
      cafe_listings: {
        Row: {
          active_campaign_count: number | null
          address: string | null
          amenities: string[] | null
          city: string | null
          city_id: string | null
          co2_note: string | null
          country: string | null
          country_code: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          fair_trade: boolean | null
          free_coffee_available: boolean | null
          gallery_urls: string[] | null
          has_active_campaign: boolean | null
          id: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string | null
          opening_hours: Json | null
          origin_region: string | null
          partner_id: string | null
          price_level: number | null
          rating: number | null
          rating_count: number | null
          roaster_name: string | null
          slug: string | null
          social_links: Json | null
          soundscape_url: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          active_campaign_count?: never
          address?: string | null
          amenities?: string[] | null
          city?: string | null
          city_id?: string | null
          co2_note?: string | null
          country?: string | null
          country_code?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          fair_trade?: boolean | null
          free_coffee_available?: boolean | null
          gallery_urls?: string[] | null
          has_active_campaign?: never
          id?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string | null
          opening_hours?: Json | null
          origin_region?: string | null
          partner_id?: string | null
          price_level?: number | null
          rating?: number | null
          rating_count?: number | null
          roaster_name?: string | null
          slug?: string | null
          social_links?: Json | null
          soundscape_url?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          active_campaign_count?: never
          address?: string | null
          amenities?: string[] | null
          city?: string | null
          city_id?: string | null
          co2_note?: string | null
          country?: string | null
          country_code?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          fair_trade?: boolean | null
          free_coffee_available?: boolean | null
          gallery_urls?: string[] | null
          has_active_campaign?: never
          id?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string | null
          opening_hours?: Json | null
          origin_region?: string | null
          partner_id?: string | null
          price_level?: number | null
          rating?: number | null
          rating_count?: number | null
          roaster_name?: string | null
          slug?: string | null
          social_links?: Json | null
          soundscape_url?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coffee_shops_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coffee_shops_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      explorer_rewards: {
        Row: {
          cafe_id: string | null
          campaign_id: string | null
          catalog_id: string | null
          expires_at: string | null
          explorer_id: string | null
          id: string | null
          label: string | null
          points_awarded: number | null
          qr_value: string | null
          redeemed_at: string | null
          reward_code: string | null
          source: string | null
          status: string | null
          unlocked_at: string | null
        }
        Relationships: []
      }
      social_proofs: {
        Row: {
          cafe_id: string | null
          campaign_id: string | null
          explorer_id: string | null
          id: string | null
          platform: string | null
          points_awarded: number | null
          post_url: string | null
          proof_image: string | null
          redemption_code: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          submission_type: string | null
          submitted_at: string | null
          verification_status: string | null
        }
        Insert: {
          cafe_id?: string | null
          campaign_id?: string | null
          explorer_id?: string | null
          id?: string | null
          platform?: string | null
          points_awarded?: number | null
          post_url?: string | null
          proof_image?: string | null
          redemption_code?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submission_type?: string | null
          submitted_at?: string | null
          verification_status?: string | null
        }
        Update: {
          cafe_id?: string | null
          campaign_id?: string | null
          explorer_id?: string | null
          id?: string | null
          platform?: string | null
          points_awarded?: number | null
          post_url?: string | null
          proof_image?: string | null
          redemption_code?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submission_type?: string | null
          submitted_at?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_submissions_coffee_shop_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_submissions_coffee_shop_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "coffee_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_events: {
        Row: {
          action_type: string | null
          event_at: string | null
          id: string | null
          metadata: Json | null
          related_id: string | null
          related_type: string | null
          user_id: string | null
          xp_value: number | null
        }
        Insert: {
          action_type?: string | null
          event_at?: string | null
          id?: string | null
          metadata?: Json | null
          related_id?: string | null
          related_type?: string | null
          user_id?: string | null
          xp_value?: number | null
        }
        Update: {
          action_type?: string | null
          event_at?: string | null
          id?: string | null
          metadata?: Json | null
          related_id?: string | null
          related_type?: string | null
          user_id?: string | null
          xp_value?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _approve_social_submission_internal: {
        Args: { _notes?: string; _submission_id: string }
        Returns: Json
      }
      admin_set_campaign_status: {
        Args: { _campaign_id: string; _status: string }
        Returns: Json
      }
      admin_set_shop_status: {
        Args: { _shop_id: string; _status: string }
        Returns: Json
      }
      announce_shop_arrival: {
        Args: { _eta_minutes?: number; _message?: string; _shop_id: string }
        Returns: Json
      }
      award_beans: {
        Args: { _delta: number; _reason?: string; _user: string }
        Returns: number
      }
      award_points: {
        Args: {
          _delta: number
          _metadata?: Json
          _ref_id?: string
          _ref_table?: string
          _source: string
          _user: string
        }
        Returns: number
      }
      check_in_time_multiplier: { Args: { _at?: string }; Returns: number }
      claim_explorer_challenge: {
        Args: { _challenge_id: string }
        Returns: Json
      }
      claim_referral: { Args: { _code: string }; Returns: Json }
      consume_api_quota: { Args: { _api_key_id: string }; Returns: Json }
      create_crew: { Args: { _name: string }; Returns: Json }
      effective_shop_plan: { Args: { _shop_id: string }; Returns: string }
      get_active_shop_stories: { Args: { _shop_id: string }; Returns: Json }
      get_active_spawns: {
        Args: { _lat?: number; _lng?: number; _radius_km?: number }
        Returns: Json
      }
      get_admin_engagement: { Args: never; Returns: Json }
      get_beverage_passport: { Args: { _user?: string }; Returns: Json }
      get_campaign_by_token: { Args: { _token: string }; Returns: Json }
      get_challenge_week_period_key: { Args: never; Returns: string }
      get_city_collection_progress: {
        Args: { _city_slug: string }
        Returns: Json
      }
      get_coffee_crawls: { Args: { _city_slug?: string }; Returns: Json }
      get_coffee_radar: {
        Args: { _lat?: number; _lng?: number; _radius_km?: number }
        Returns: Json
      }
      get_expiring_points_buckets: {
        Args: never
        Returns: {
          amount: number
          bucket: string
          expires_at: string
        }[]
      }
      get_explorer_challenge_stats: { Args: { _user: string }; Returns: Json }
      get_explorer_funnel_kpis: { Args: { _days?: number }; Returns: Json }
      get_leaderboard: {
        Args: { _city_slug?: string; _limit?: number; _metric?: string }
        Returns: {
          avatar_url: string
          cafes_visited: number
          campaigns_completed: number
          city: string
          display_name: string
          rank: number
          reviews_written: number
          social_posts: number
          total_points: number
          user_id: string
        }[]
      }
      get_my_leaderboard_rank: {
        Args: { _city_slug?: string; _metric?: string }
        Returns: Json
      }
      get_partner_arrivals: { Args: { _shop_id?: string }; Returns: Json }
      get_rotating_verify_token: { Args: { _code: string }; Returns: string }
      get_shop_mayor: { Args: { _shop_id: string }; Returns: Json }
      get_today_health_log: { Args: never; Returns: Json }
      get_user_city_collections: { Args: never; Returns: Json }
      get_user_crawl_progress: { Args: { _user?: string }; Returns: Json }
      has_plan_feature: {
        Args: { _feature: string; _partner: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      haversine_metres: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      issue_api_key: {
        Args: { _name: string; _scopes?: string[] }
        Returns: Json
      }
      join_campaign:
        | { Args: { _campaign_id: string }; Returns: Json }
        | {
            Args: { _campaign_id: string; _join_source?: string }
            Returns: Json
          }
      join_crew: { Args: { _invite_code: string }; Returns: Json }
      log_explorer_event: {
        Args: { _event_name: string; _props?: Json }
        Returns: undefined
      }
      partner_can: {
        Args: { _action: string; _partner: string }
        Returns: boolean
      }
      partner_delete_shop: { Args: { _shop_id: string }; Returns: Json }
      partner_has_shop_stripe_pro: {
        Args: { _partner: string }
        Returns: boolean
      }
      partner_mark_catalog_code_used: { Args: { _code: string }; Returns: Json }
      partner_plan_row: {
        Args: { _partner: string }
        Returns: {
          max_campaigns_per_month: number
          max_shops: number
          plan_code: string
        }[]
      }
      partner_set_campaign_status: {
        Args: { _campaign_id: string; _status: string }
        Returns: Json
      }
      partner_update_campaign: {
        Args: { _campaign_id: string; _patch: Json }
        Returns: Json
      }
      perform_check_in:
        | { Args: { _shop_id: string }; Returns: Json }
        | { Args: { _campaign_id?: string; _shop_id: string }; Returns: Json }
        | {
            Args: {
              _campaign_id?: string
              _latitude?: number
              _longitude?: number
              _shop_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              _beverage_tag?: string
              _campaign_id?: string
              _latitude?: number
              _longitude?: number
              _shop_id: string
            }
            Returns: Json
          }
      record_crawl_stop: {
        Args: { _shop_id: string; _user: string }
        Returns: undefined
      }
      redeem_campaign: { Args: { _campaign_id: string }; Returns: Json }
      redeem_catalog_item: { Args: { _item_id: string }; Returns: Json }
      review_partner_application: {
        Args: { _application_id: string; _decision: string }
        Returns: Json
      }
      review_social_submission: {
        Args: { _decision: string; _notes?: string; _submission_id: string }
        Returns: Json
      }
      revoke_api_key: { Args: { _id: string }; Returns: boolean }
      save_push_subscription: { Args: { _subscription: Json }; Returns: Json }
      send_gift_credit: {
        Args: { _message?: string; _recipient_id: string }
        Returns: Json
      }
      set_map_theme: { Args: { _theme: string }; Returns: Json }
      set_points_expiration_policy: { Args: { _days: number }; Returns: Json }
      submit_social_proof: {
        Args: {
          _campaign_id: string
          _caption?: string
          _platform: string
          _screenshot_path?: string
          _submission_type: string
          _url?: string
        }
        Returns: Json
      }
      sync_partner_subscription_from_shop: {
        Args: {
          _shop_id: string
          _shop_plan: string
          _status?: string
          _stripe_customer_id?: string
          _stripe_subscription_id?: string
        }
        Returns: undefined
      }
      upsert_health_log: {
        Args: { _caffeine_mg?: number; _steps?: number }
        Returns: Json
      }
      verify_api_key: {
        Args: { _raw: string }
        Returns: {
          api_key_id: string
          partner_id: string
          rate_limit_per_minute: number
          scopes: string[]
        }[]
      }
      verify_redemption_code: {
        Args: { _code: string; _ip?: string }
        Returns: Json
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["explorer", "partner", "admin"],
    },
  },
} as const
