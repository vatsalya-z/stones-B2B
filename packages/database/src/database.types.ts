/**
 * Database type definitions mirroring the PostgreSQL schema in supabase/migrations/.
 * Follows the exact shape expected by @supabase/supabase-js (createClient<Database>).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          country: string;
          state: string | null;
          city: string | null;
          address: string | null;
          account_status: "active" | "pending" | "suspended";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          country?: string;
          state?: string | null;
          city?: string | null;
          address?: string | null;
          account_status?: "active" | "pending" | "suspended";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          country?: string;
          state?: string | null;
          city?: string | null;
          address?: string | null;
        };
        Relationships: [];
      };

      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: "buyer" | "seller" | "admin" | "super_admin";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: "buyer" | "seller" | "admin" | "super_admin";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: "buyer" | "seller" | "admin" | "super_admin";
          created_at?: string;
        };
        Relationships: [];
      };

      seller_profiles: {
        Row: {
          id: string;
          user_id: string;
          business_name: string;
          slug: string;
          business_type:
            | "manufacturer"
            | "mine_owner"
            | "stone_supplier"
            | "exporter"
            | "wholesaler"
            | "retailer"
            | "contractor"
            | "architect"
            | "interior_designer"
            | "builder"
            | "importer";
          owner_name: string | null;
          business_email: string | null;
          phone: string | null;
          whatsapp_number: string | null;
          gst_number: string | null;
          business_address: string | null;
          city: string | null;
          state: string | null;
          country: string;
          pincode: string | null;
          website: string | null;
          years_in_business: number | null;
          description: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          verification_status:
            | "draft"
            | "submitted"
            | "under_review"
            | "verified"
            | "rejected"
            | "suspended";
          verification_reason: string | null;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name: string;
          slug: string;
          business_type: string;
          owner_name?: string | null;
          business_email?: string | null;
          phone?: string | null;
          whatsapp_number?: string | null;
          gst_number?: string | null;
          business_address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string;
          pincode?: string | null;
          website?: string | null;
          years_in_business?: number | null;
          description?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
        };
        Update: {
          business_name?: string;
          slug?: string;
          business_type?: string;
          owner_name?: string | null;
          business_email?: string | null;
          phone?: string | null;
          whatsapp_number?: string | null;
          gst_number?: string | null;
          business_address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string;
          pincode?: string | null;
          website?: string | null;
          years_in_business?: number | null;
          description?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
        };
        Relationships: [];
      };

      seller_verification_documents: {
        Row: {
          id: string;
          seller_id: string;
          document_type:
            | "gst_certificate"
            | "pan_card"
            | "business_registration"
            | "trade_license"
            | "address_proof"
            | "other";
          storage_path: string;
          verification_status: "pending" | "approved" | "rejected";
          rejection_reason: string | null;
          uploaded_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          seller_id: string;
          document_type:
            | "gst_certificate"
            | "pan_card"
            | "business_registration"
            | "trade_license"
            | "address_proof"
            | "other";
          storage_path: string;
        };
        Update: {
          verification_status?: "pending" | "approved" | "rejected";
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Relationships: [];
      };

      categories: {
        Row: {
          id: string;
          parent_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          is_active: boolean;
          display_order: number;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          parent_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          display_order?: number;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          parent_id?: string | null;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          display_order?: number;
          seo_title?: string | null;
          seo_description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      products: {
        Row: {
          id: string;
          seller_id: string;
          category_id: string | null;
          name: string;
          slug: string;
          sku: string | null;
          description: string | null;
          material_type: string | null;
          stone_origin: string | null;
          colour: string | null;
          finish: string | null;
          thickness: number | null;
          length: number | null;
          width: number | null;
          minimum_order_quantity: number | null;
          unit:
            | "sq_ft"
            | "sq_m"
            | "piece"
            | "ton"
            | "metric_ton"
            | "slab"
            | "box"
            | "custom";
          price_type: "fixed" | "starting" | "on_request" | "negotiable";
          price: number | null;
          currency: string;
          stock_status: "in_stock" | "limited" | "out_of_stock" | "made_to_order";
          lead_time: number | null;
          moderation_status: "draft" | "pending_review" | "approved" | "rejected" | "archived";
          rejection_reason: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          seller_id: string;
          category_id?: string | null;
          name: string;
          slug: string;
          sku?: string | null;
          description?: string | null;
          material_type?: string | null;
          stone_origin?: string | null;
          colour?: string | null;
          finish?: string | null;
          thickness?: number | null;
          length?: number | null;
          width?: number | null;
          minimum_order_quantity?: number | null;
          unit?: string;
          price_type?: "fixed" | "starting" | "on_request" | "negotiable";
          price?: number | null;
          currency?: string;
          stock_status?: "in_stock" | "limited" | "out_of_stock" | "made_to_order";
          lead_time?: number | null;
          moderation_status?: "draft" | "pending_review";
        };
        Update: {
          category_id?: string | null;
          name?: string;
          slug?: string;
          sku?: string | null;
          description?: string | null;
          material_type?: string | null;
          stone_origin?: string | null;
          colour?: string | null;
          finish?: string | null;
          thickness?: number | null;
          length?: number | null;
          width?: number | null;
          minimum_order_quantity?: number | null;
          unit?: string;
          price_type?: "fixed" | "starting" | "on_request" | "negotiable";
          price?: number | null;
          currency?: string;
          stock_status?: "in_stock" | "limited" | "out_of_stock" | "made_to_order";
          lead_time?: number | null;
          moderation_status?: "draft" | "pending_review" | "approved" | "rejected" | "archived";
        };
        Relationships: [];
      };

      product_images: {
        Row: {
          id: string;
          product_id: string;
          storage_path: string;
          alt_text: string | null;
          is_primary: boolean;
          display_order: number;
          created_at: string;
        };
        Insert: {
          product_id: string;
          storage_path: string;
          alt_text?: string | null;
          is_primary?: boolean;
          display_order?: number;
        };
        Update: {
          alt_text?: string | null;
          is_primary?: boolean;
          display_order?: number;
        };
        Relationships: [];
      };

      product_specifications: {
        Row: {
          id: string;
          product_id: string;
          specification_name: string;
          specification_value: string;
          display_order: number;
        };
        Insert: {
          product_id: string;
          specification_name: string;
          specification_value: string;
          display_order?: number;
        };
        Update: {
          specification_name?: string;
          specification_value?: string;
          display_order?: number;
        };
        Relationships: [];
      };

      product_favourites: {
        Row: {
          id: string;
          buyer_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          buyer_id: string;
          product_id: string;
        };
        Update: {
          buyer_id?: string;
          product_id?: string;
        };
        Relationships: [];
      };

      enquiries: {
        Row: {
          id: string;
          buyer_id: string | null;
          seller_id: string | null;
          product_id: string | null;
          enquiry_title: string;
          description: string;
          quantity: number;
          unit: string;
          expected_budget: number | null;
          currency: string;
          delivery_location: string | null;
          required_delivery_date: string | null;
          status:
            | "submitted"
            | "viewed"
            | "responding"
            | "quoted"
            | "accepted"
            | "rejected"
            | "closed"
            | "cancelled";
          client_request_id: string | null;
          guest_name: string | null;
          guest_email: string | null;
          guest_phone: string | null;
          guest_company: string | null;
          enquiry_type: "direct" | "rfq";
          specifications: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          buyer_id?: string | null;
          seller_id?: string | null;
          product_id?: string | null;
          enquiry_title: string;
          description: string;
          quantity: number;
          unit: string;
          expected_budget?: number | null;
          currency?: string;
          delivery_location?: string | null;
          required_delivery_date?: string | null;
          client_request_id?: string | null;
          guest_name?: string | null;
          guest_email?: string | null;
          guest_phone?: string | null;
          guest_company?: string | null;
          enquiry_type?: "direct" | "rfq";
          specifications?: Json;
          status?:
            | "submitted"
            | "viewed"
            | "responding"
            | "quoted"
            | "accepted"
            | "rejected"
            | "closed"
            | "cancelled";
        };
        Update: Record<string, never>;
        Relationships: [];
      };

      enquiry_status_history: {
        Row: {
          id: string;
          enquiry_id: string;
          previous_status: string | null;
          new_status: string;
          changed_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          enquiry_id: string;
          previous_status?: string | null;
          new_status: string;
          changed_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };

      quotations: {
        Row: {
          id: string;
          enquiry_id: string;
          seller_id: string;
          buyer_id: string;
          quote_number: string;
          subtotal: number;
          tax_amount: number;
          shipping_charges: number;
          discount_amount: number;
          total_amount: number;
          currency: string;
          valid_until: string | null;
          terms: string | null;
          status:
            | "draft"
            | "sent"
            | "viewed"
            | "accepted"
            | "rejected"
            | "expired"
            | "revised"
            | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          enquiry_id: string;
          seller_id: string;
          buyer_id: string;
          subtotal: number;
          tax_amount?: number;
          shipping_charges?: number;
          discount_amount?: number;
          total_amount: number;
          currency?: string;
          valid_until?: string | null;
          terms?: string | null;
        };
        Update: {
          subtotal?: number;
          tax_amount?: number;
          shipping_charges?: number;
          discount_amount?: number;
          total_amount?: number;
          currency?: string;
          valid_until?: string | null;
          terms?: string | null;
          status?:
            | "draft"
            | "sent"
            | "viewed"
            | "accepted"
            | "rejected"
            | "expired"
            | "revised"
            | "cancelled";
        };
        Relationships: [];
      };

      quotation_items: {
        Row: {
          id: string;
          quotation_id: string;
          product_id: string | null;
          description: string;
          quantity: number;
          unit: string;
          unit_price: number;
          total_price: number;
        };
        Insert: {
          id?: string;
          quotation_id: string;
          product_id?: string | null;
          description: string;
          quantity: number;
          unit: string;
          unit_price: number;
          total_price: number;
        };
        Update: {
          product_id?: string | null;
          description?: string;
          quantity?: number;
          unit?: string;
          unit_price?: number;
          total_price?: number;
        };
        Relationships: [];
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          notification_type:
            | "enquiry_received"
            | "enquiry_viewed"
            | "quotation_received"
            | "quotation_accepted"
            | "quotation_rejected"
            | "message_received"
            | "seller_verification"
            | "product_moderation"
            | "account_status"
            | "system";
          reference_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          notification_type:
            | "enquiry_received"
            | "enquiry_viewed"
            | "quotation_received"
            | "quotation_accepted"
            | "quotation_rejected"
            | "message_received"
            | "seller_verification"
            | "product_moderation"
            | "account_status"
            | "system";
          reference_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
        Relationships: [];
      };

      admin_audit_logs: {
        Row: {
          id: string;
          admin_user_id: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_user_id: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };

      platform_settings: {
        Row: {
          key: "marketplace" | "contact" | "homepage" | "seo";
          value: Json;
          is_public: boolean;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };

      conversations: {
        Row: {
          id: string;
          buyer_id: string;
          seller_id: string;
          enquiry_id: string | null;
          product_id: string | null;
          subject: string;
          last_message_id: string | null;
          last_message_preview: string | null;
          last_message_sender_id: string | null;
          last_message_at: string;
          buyer_last_read_at: string | null;
          seller_last_read_at: string | null;
          buyer_unread_count: number;
          seller_unread_count: number;
          buyer_archived_at: string | null;
          seller_archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          seller_id: string;
          enquiry_id?: string | null;
          product_id?: string | null;
          subject: string;
          last_message_id?: string | null;
          last_message_preview?: string | null;
          last_message_sender_id?: string | null;
          last_message_at?: string;
          buyer_last_read_at?: string | null;
          seller_last_read_at?: string | null;
          buyer_unread_count?: number;
          seller_unread_count?: number;
          buyer_archived_at?: string | null;
          seller_archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };

      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          sender_role: "buyer" | "seller";
          message_type: "text" | "attachment" | "system";
          body: string;
          attachment_path: string | null;
          attachment_name: string | null;
          attachment_mime:
            | "application/pdf"
            | "image/jpeg"
            | "image/png"
            | "image/webp"
            | null;
          attachment_size: number | null;
          client_message_id: string | null;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          sender_id: string;
          sender_role: "buyer" | "seller";
          message_type?: "text" | "attachment";
          body?: string;
          attachment_path?: string | null;
          attachment_name?: string | null;
          attachment_mime?:
            | "application/pdf"
            | "image/jpeg"
            | "image/png"
            | "image/webp"
            | null;
          attachment_size?: number | null;
          client_message_id?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };

    Views: {
      public_seller_profiles: {
        Row: {
          id: string;
          business_name: string;
          slug: string;
          business_type: string;
          city: string | null;
          state: string | null;
          country: string;
          website: string | null;
          years_in_business: number | null;
          description: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          verified_at: string | null;
        };
        Relationships: [];
      };

      orders: {
        Row: {
          id: string;
          order_number: string;
          quotation_id: string;
          enquiry_id: string;
          buyer_id: string;
          seller_id: string;
          buyer_snapshot: Json;
          seller_snapshot: Json;
          billing_address: Json;
          shipping_address: Json;
          delivery_location: string;
          subtotal: number;
          tax_amount: number;
          shipping_charges: number;
          discount_amount: number;
          total_amount: number;
          currency: string;
          terms: string | null;
          status:
            | "pending_payment"
            | "confirmed"
            | "processing"
            | "dispatched"
            | "delivered"
            | "completed"
            | "cancelled";
          payment_status: "pending" | "processing" | "paid" | "failed" | "refunded";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number?: string;
          quotation_id: string;
          enquiry_id: string;
          buyer_id: string;
          seller_id: string;
          buyer_snapshot?: Json;
          seller_snapshot?: Json;
          billing_address: Json;
          shipping_address?: Json;
          delivery_location: string;
          subtotal: number;
          tax_amount?: number;
          shipping_charges?: number;
          discount_amount?: number;
          total_amount: number;
          currency?: string;
          terms?: string | null;
          status?:
            | "pending_payment"
            | "confirmed"
            | "processing"
            | "dispatched"
            | "delivered"
            | "completed"
            | "cancelled";
          payment_status?: "pending" | "processing" | "paid" | "failed" | "refunded";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?:
            | "pending_payment"
            | "confirmed"
            | "processing"
            | "dispatched"
            | "delivered"
            | "completed"
            | "cancelled";
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          description: string;
          quantity: number;
          unit: string;
          unit_price: number;
          total_price: number;
          specifications: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          description: string;
          quantity: number;
          unit: string;
          unit_price: number;
          total_price: number;
          specifications?: Json;
          created_at?: string;
        };
        Update: {
          [key: string]: never;
        };
        Relationships: [];
      };

      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          previous_status: string | null;
          new_status: string;
          changed_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          previous_status?: string | null;
          new_status: string;
          changed_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          [key: string]: never;
        };
        Relationships: [];
      };

      buyer_addresses: {
        Row: {
          id: string;
          buyer_id: string;
          address_type: "billing" | "shipping" | "project_site" | "both";
          contact_name: string;
          phone: string;
          company_name: string | null;
          gstin: string | null;
          address_line1: string;
          address_line2: string | null;
          city: string;
          state: string;
          pincode: string;
          country: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          address_type?: "billing" | "shipping" | "project_site" | "both";
          contact_name: string;
          phone: string;
          company_name?: string | null;
          gstin?: string | null;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          state: string;
          pincode: string;
          country?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          address_type?: "billing" | "shipping" | "project_site" | "both";
          contact_name?: string;
          phone?: string;
          company_name?: string | null;
          gstin?: string | null;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          state?: string;
          pincode?: string;
          country?: string;
          is_default?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };

    Functions: {
      current_account_active: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      has_role: {
        Args: { _role: string };
        Returns: boolean;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_super_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      ensure_profile: {
        Args: Record<string, never>;
        Returns: void;
      };
      grant_self_role: {
        Args: { _role: string };
        Returns: void;
      };
      is_seller_owner: {
        Args: { _seller_id: string };
        Returns: boolean;
      };
      is_seller_verified: {
        Args: { _seller_id: string };
        Returns: boolean;
      };
      submit_seller_verification: {
        Args: Record<string, never>;
        Returns: void;
      };
      admin_review_seller: {
        Args: { _seller_id: string; _new_status: string; _reason?: string };
        Returns: void;
      };
      admin_review_document: {
        Args: { _document_id: string; _status: string; _reason?: string };
        Returns: void;
      };
      is_product_public: {
        Args: { _product_id: string };
        Returns: boolean;
      };
      is_product_owner: {
        Args: { _product_id: string };
        Returns: boolean;
      };
      admin_grant_role: {
        Args: { _user_id: string; _role: string };
        Returns: void;
      };
      admin_revoke_role: {
        Args: { _user_id: string; _role: string };
        Returns: void;
      };
      admin_set_account_status: {
        Args: { _user_id: string; _status: string; _reason?: string };
        Returns: void;
      };
      admin_moderate_product: {
        Args: { _product_id: string; _status: string; _reason?: string };
        Returns: void;
      };
      can_access_enquiry: {
        Args: { _enquiry_id: string };
        Returns: boolean;
      };
      transition_enquiry_status: {
        Args: { _enquiry_id: string; _new_status: string; _notes?: string };
        Returns: void;
      };
      can_access_conversation: {
        Args: { _conversation_id: string };
        Returns: boolean;
      };
      get_or_create_conversation: {
        Args: {
          _seller_id: string;
          _enquiry_id?: string | null;
          _product_id?: string | null;
          _subject?: string | null;
        };
        Returns: string;
      };
      mark_conversation_read: {
        Args: { _conversation_id: string };
        Returns: void;
      };
      set_conversation_archived: {
        Args: { _conversation_id: string; _archived: boolean };
        Returns: void;
      };
      admin_set_platform_setting: {
        Args: { _key: string; _value: Json; _is_public?: boolean | null };
        Returns: void;
      };
      admin_restore_product: {
        Args: { _product_id: string; _reason?: string };
        Returns: void;
      };
      admin_request_seller_documents: {
        Args: { _seller_id: string; _message: string };
        Returns: void;
      };
      admin_dashboard_metrics: {
        Args: Record<string, never>;
        Returns: Json;
      };
      admin_time_series: {
        Args: { _metric: string; _days?: number };
        Returns: Array<{ bucket_date: string; bucket_total: number }>;
      };
      admin_distribution: {
        Args: { _kind: string };
        Returns: Array<{ label: string; total: number }>;
      };
      admin_moderation_series: {
        Args: { _kind: string; _days?: number };
        Returns: Array<{ bucket_date: string; outcome: string; total: number }>;
      };
      admin_category_performance: {
        Args: Record<string, never>;
        Returns: Array<{
          category_id: string;
          category_name: string;
          parent_id: string | null;
          is_active: boolean;
          products: number;
          approved_products: number;
          enquiries: number;
        }>;
      };
      accept_quotation_and_create_order: {
        Args: {
          _quotation_id: string;
          _billing_address: Json;
          _shipping_address?: Json | null;
          _same_as_billing?: boolean;
          _notes?: string | null;
        };
        Returns: string;
      };
      transition_order_status: {
        Args: {
          _order_id: string;
          _new_status: string;
          _notes?: string | null;
        };
        Returns: void;
      };
      sanitize_and_validate_order_address: {
        Args: {
          _raw: Json;
          _address_type: string;
        };
        Returns: Json;
      };
    };

    Enums: {
      order_status:
        | "pending_payment"
        | "confirmed"
        | "processing"
        | "dispatched"
        | "delivered"
        | "completed"
        | "cancelled";
      payment_status: "pending" | "processing" | "paid" | "failed" | "refunded";
      account_status: "active" | "pending" | "suspended";
      app_role: "buyer" | "seller" | "admin" | "super_admin";
      verification_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "verified"
        | "rejected"
        | "suspended";
      moderation_status: "draft" | "pending_review" | "approved" | "rejected" | "archived";
      enquiry_status:
        | "submitted"
        | "viewed"
        | "responding"
        | "quoted"
        | "accepted"
        | "rejected"
        | "closed"
        | "cancelled";
      quotation_status:
        | "draft"
        | "sent"
        | "viewed"
        | "accepted"
        | "rejected"
        | "expired"
        | "revised"
        | "cancelled";
    };
  };
}
