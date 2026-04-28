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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      asset_holders: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          organization_id: string
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          organization_id: string
          phone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          organization_id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_holders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bail_terminations: {
        Row: {
          balance: number
          closed_at: string | null
          created_at: string
          deposit_amount: number
          deposit_retained: number
          effective_date: string
          id: string
          inspection_notes: string | null
          inspection_status: string | null
          notice_duration: number
          notification_date: string
          penalties: number
          pending_charges: number
          prorata_adjustment: number
          reason: string
          remaining_rent_due: number
          status: string
          tenant_id: string
          total_due: number
          updated_at: string
        }
        Insert: {
          balance?: number
          closed_at?: string | null
          created_at?: string
          deposit_amount?: number
          deposit_retained?: number
          effective_date: string
          id?: string
          inspection_notes?: string | null
          inspection_status?: string | null
          notice_duration?: number
          notification_date: string
          penalties?: number
          pending_charges?: number
          prorata_adjustment?: number
          reason: string
          remaining_rent_due?: number
          status?: string
          tenant_id: string
          total_due?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          closed_at?: string | null
          created_at?: string
          deposit_amount?: number
          deposit_retained?: number
          effective_date?: string
          id?: string
          inspection_notes?: string | null
          inspection_status?: string | null
          notice_duration?: number
          notification_date?: string
          penalties?: number
          pending_charges?: number
          prorata_adjustment?: number
          reason?: string
          remaining_rent_due?: number
          status?: string
          tenant_id?: string
          total_due?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bail_terminations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          country_id: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          country_id?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          code?: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "countries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          base_role: Database["public"]["Enums"]["app_role"]
          city_ids: string[]
          created_at: string
          id: string
          is_system: boolean
          name: string
          organization_id: string
          permissions: string[]
          updated_at: string
        }
        Insert: {
          base_role?: Database["public"]["Enums"]["app_role"]
          city_ids?: string[]
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          organization_id: string
          permissions?: string[]
          updated_at?: string
        }
        Update: {
          base_role?: Database["public"]["Enums"]["app_role"]
          city_ids?: string[]
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string
          permissions?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          city_id: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          monthly_salary: number
          organization_id: string
          position: string
          property_id: string | null
          updated_at: string
        }
        Insert: {
          city_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          monthly_salary?: number
          organization_id: string
          position?: string
          property_id?: string | null
          updated_at?: string
        }
        Update: {
          city_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          monthly_salary?: number
          organization_id?: string
          position?: string
          property_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          escalation_level: number
          id: string
          rent_payment_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          escalation_level?: number
          id?: string
          rent_payment_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          escalation_level?: number
          id?: string
          rent_payment_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_tasks_rent_payment_id_fkey"
            columns: ["rent_payment_id"]
            isOneToOne: false
            referencedRelation: "rent_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string
          city_id: string | null
          country_id: string | null
          created_at: string
          description: string | null
          employee_id: string | null
          expense_date: string
          expense_type: string
          frequency: string
          id: string
          organization_id: string
          property_id: string | null
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category_id: string
          city_id?: string | null
          country_id?: string | null
          created_at?: string
          description?: string | null
          employee_id?: string | null
          expense_date?: string
          expense_type?: string
          frequency?: string
          id?: string
          organization_id: string
          property_id?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string
          city_id?: string | null
          country_id?: string | null
          created_at?: string
          description?: string | null
          employee_id?: string | null
          expense_date?: string
          expense_type?: string
          frequency?: string
          id?: string
          organization_id?: string
          property_id?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          created_at: string
          email_content: string
          email_enabled: boolean
          id: string
          label: string
          organization_id: string
          sms_content: string
          sms_enabled: boolean
          template_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_content?: string
          email_enabled?: boolean
          id?: string
          label: string
          organization_id: string
          sms_content?: string
          sms_enabled?: boolean
          template_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_content?: string
          email_enabled?: boolean
          id?: string
          label?: string
          organization_id?: string
          sms_content?: string
          sms_enabled?: boolean
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          description: string
          id: string
          is_read: boolean
          organization_id: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_read?: boolean
          organization_id: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_read?: boolean
          organization_id?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          accepted_payment_methods: string[]
          address: string | null
          auto_sms_enabled: boolean
          auto_sms_hour: number
          created_at: string
          currency: string
          date_format: string
          deposit_months: number
          email: string | null
          fiscal_year_start: number
          id: string
          invite_token: string
          late_fee_enabled: boolean
          late_fee_grace_days: number
          late_fee_type: string
          late_fee_value: number
          legal_address: string | null
          legal_id: string | null
          legal_name: string | null
          logo_url: string | null
          monsms_api_key: string | null
          monsms_company_id: string | null
          monsms_sender_id: string | null
          name: string
          phone: string | null
          rent_due_day: number
          salaries_enabled: boolean
          sms_sender_name: string | null
          sms_sender_number: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          accepted_payment_methods?: string[]
          address?: string | null
          auto_sms_enabled?: boolean
          auto_sms_hour?: number
          created_at?: string
          currency?: string
          date_format?: string
          deposit_months?: number
          email?: string | null
          fiscal_year_start?: number
          id?: string
          invite_token?: string
          late_fee_enabled?: boolean
          late_fee_grace_days?: number
          late_fee_type?: string
          late_fee_value?: number
          legal_address?: string | null
          legal_id?: string | null
          legal_name?: string | null
          logo_url?: string | null
          monsms_api_key?: string | null
          monsms_company_id?: string | null
          monsms_sender_id?: string | null
          name: string
          phone?: string | null
          rent_due_day?: number
          salaries_enabled?: boolean
          sms_sender_name?: string | null
          sms_sender_number?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          accepted_payment_methods?: string[]
          address?: string | null
          auto_sms_enabled?: boolean
          auto_sms_hour?: number
          created_at?: string
          currency?: string
          date_format?: string
          deposit_months?: number
          email?: string | null
          fiscal_year_start?: number
          id?: string
          invite_token?: string
          late_fee_enabled?: boolean
          late_fee_grace_days?: number
          late_fee_type?: string
          late_fee_value?: number
          legal_address?: string | null
          legal_id?: string | null
          legal_name?: string | null
          logo_url?: string | null
          monsms_api_key?: string | null
          monsms_company_id?: string | null
          monsms_sender_id?: string | null
          name?: string
          phone?: string | null
          rent_due_day?: number
          salaries_enabled?: boolean
          sms_sender_name?: string | null
          sms_sender_number?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      patrimony_assets: {
        Row: {
          asset_type: string
          buyer_name: string | null
          city_id: string | null
          created_at: string
          description: string | null
          handling_firm: string | null
          holder_id: string | null
          id: string
          land_title: string
          latitude: number | null
          locality: string
          longitude: number | null
          map_link: string | null
          notary_name: string | null
          organization_id: string
          receipt_order_number: string | null
          sale_commission: number | null
          sale_date: string | null
          sale_deed_url: string | null
          sale_payment_method: string | null
          sale_price: number | null
          status: string
          subdivision_name: string
          title: string
          title_creation_date: string | null
          updated_at: string
        }
        Insert: {
          asset_type?: string
          buyer_name?: string | null
          city_id?: string | null
          created_at?: string
          description?: string | null
          handling_firm?: string | null
          holder_id?: string | null
          id?: string
          land_title?: string
          latitude?: number | null
          locality?: string
          longitude?: number | null
          map_link?: string | null
          notary_name?: string | null
          organization_id: string
          receipt_order_number?: string | null
          sale_commission?: number | null
          sale_date?: string | null
          sale_deed_url?: string | null
          sale_payment_method?: string | null
          sale_price?: number | null
          status?: string
          subdivision_name?: string
          title: string
          title_creation_date?: string | null
          updated_at?: string
        }
        Update: {
          asset_type?: string
          buyer_name?: string | null
          city_id?: string | null
          created_at?: string
          description?: string | null
          handling_firm?: string | null
          holder_id?: string | null
          id?: string
          land_title?: string
          latitude?: number | null
          locality?: string
          longitude?: number | null
          map_link?: string | null
          notary_name?: string | null
          organization_id?: string
          receipt_order_number?: string | null
          sale_commission?: number | null
          sale_date?: string | null
          sale_deed_url?: string | null
          sale_payment_method?: string | null
          sale_price?: number | null
          status?: string
          subdivision_name?: string
          title?: string
          title_creation_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patrimony_assets_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrimony_assets_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "asset_holders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrimony_assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      patrimony_contacts: {
        Row: {
          asset_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string
          role: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string
          role?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patrimony_contacts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "patrimony_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      patrimony_documents: {
        Row: {
          asset_id: string
          document_type: string
          file_size: number | null
          file_url: string
          id: string
          name: string
          uploaded_at: string
        }
        Insert: {
          asset_id: string
          document_type?: string
          file_size?: number | null
          file_url: string
          id?: string
          name: string
          uploaded_at?: string
        }
        Update: {
          asset_id?: string
          document_type?: string
          file_size?: number | null
          file_url?: string
          id?: string
          name?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patrimony_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "patrimony_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_records: {
        Row: {
          amount: number
          comment: string | null
          created_at: string
          id: string
          method: string
          payment_date: string
          rent_payment_id: string
        }
        Insert: {
          amount: number
          comment?: string | null
          created_at?: string
          id?: string
          method?: string
          payment_date?: string
          rent_payment_id: string
        }
        Update: {
          amount?: number
          comment?: string | null
          created_at?: string
          id?: string
          method?: string
          payment_date?: string
          rent_payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_rent_payment_id_fkey"
            columns: ["rent_payment_id"]
            isOneToOne: false
            referencedRelation: "rent_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          is_approved: boolean
          organization_id: string
          phone: string | null
          sms_2fa_enabled: boolean
          sms_2fa_phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          is_approved?: boolean
          organization_id: string
          phone?: string | null
          sms_2fa_enabled?: boolean
          sms_2fa_phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          is_approved?: boolean
          organization_id?: string
          phone?: string | null
          sms_2fa_enabled?: boolean
          sms_2fa_phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          city_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          patrimony_asset_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address?: string
          city_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          patrimony_asset_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          address?: string
          city_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          patrimony_asset_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_patrimony_asset_id_fkey"
            columns: ["patrimony_asset_id"]
            isOneToOne: true
            referencedRelation: "patrimony_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          month: string
          paid_amount: number
          status: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date: string
          id?: string
          month: string
          paid_amount?: number
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          month?: string
          paid_amount?: number
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_logs: {
        Row: {
          action: string
          changed_by_email: string | null
          changed_by_name: string | null
          changed_by_user_id: string | null
          created_at: string
          id: string
          new_custom_role_id: string | null
          new_role: string | null
          old_custom_role_id: string | null
          old_role: string | null
          organization_id: string | null
          target_user_email: string | null
          target_user_id: string
          target_user_name: string | null
        }
        Insert: {
          action: string
          changed_by_email?: string | null
          changed_by_name?: string | null
          changed_by_user_id?: string | null
          created_at?: string
          id?: string
          new_custom_role_id?: string | null
          new_role?: string | null
          old_custom_role_id?: string | null
          old_role?: string | null
          organization_id?: string | null
          target_user_email?: string | null
          target_user_id: string
          target_user_name?: string | null
        }
        Update: {
          action?: string
          changed_by_email?: string | null
          changed_by_name?: string | null
          changed_by_user_id?: string | null
          created_at?: string
          id?: string
          new_custom_role_id?: string | null
          new_role?: string | null
          old_custom_role_id?: string | null
          old_role?: string | null
          organization_id?: string | null
          target_user_email?: string | null
          target_user_id?: string
          target_user_name?: string | null
        }
        Relationships: []
      }
      sms_2fa_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_history: {
        Row: {
          created_at: string
          error_message: string | null
          event_key: string | null
          id: string
          message: string
          orange_message_id: string | null
          organization_id: string
          recipient_name: string | null
          recipient_phone: string
          rent_payment_id: string | null
          sender_name: string | null
          status: string
          template_key: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_key?: string | null
          id?: string
          message: string
          orange_message_id?: string | null
          organization_id: string
          recipient_name?: string | null
          recipient_phone: string
          rent_payment_id?: string | null
          sender_name?: string | null
          status?: string
          template_key?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_key?: string | null
          id?: string
          message?: string
          orange_message_id?: string | null
          organization_id?: string
          recipient_name?: string | null
          recipient_phone?: string
          rent_payment_id?: string | null
          sender_name?: string | null
          status?: string
          template_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          company_name: string | null
          contact_person: string | null
          created_at: string
          deposit: number
          email: string | null
          full_name: string
          id: string
          id_number: string | null
          is_active: boolean
          lease_duration: number
          lease_start: string
          phone: string
          rccm: string | null
          rent: number
          tenant_type: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          deposit?: number
          email?: string | null
          full_name: string
          id?: string
          id_number?: string | null
          is_active?: boolean
          lease_duration?: number
          lease_start?: string
          phone?: string
          rccm?: string | null
          rent?: number
          tenant_type?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          deposit?: number
          email?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          is_active?: boolean
          lease_duration?: number
          lease_start?: string
          phone?: string
          rccm?: string | null
          rent?: number
          tenant_type?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          charges: number
          created_at: string
          floor: number | null
          id: string
          name: string
          property_id: string
          rent: number
          rooms: number
          status: Database["public"]["Enums"]["unit_status"]
          updated_at: string
        }
        Insert: {
          charges?: number
          created_at?: string
          floor?: number | null
          id?: string
          name: string
          property_id: string
          rent?: number
          rooms?: number
          status?: Database["public"]["Enums"]["unit_status"]
          updated_at?: string
        }
        Update: {
          charges?: number
          created_at?: string
          floor?: number | null
          id?: string
          name?: string
          property_id?: string
          rent?: number
          rooms?: number
          status?: Database["public"]["Enums"]["unit_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          city_ids: string[]
          created_at: string
          custom_role_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          city_ids?: string[]
          created_at?: string
          custom_role_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          city_ids?: string[]
          created_at?: string
          custom_role_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_payments: { Args: { _user_id: string }; Returns: boolean }
      get_org_sensitive_settings: {
        Args: never
        Returns: {
          invite_token: string
          monsms_api_key: string
          monsms_company_id: string
          monsms_sender_id: string
        }[]
      }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_gestionnaire_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_org_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "gestionnaire" | "comptable" | "super_admin"
      payment_status: "pending" | "paid" | "partial" | "late"
      unit_status: "occupied" | "vacant"
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
      app_role: ["admin", "gestionnaire", "comptable", "super_admin"],
      payment_status: ["pending", "paid", "partial", "late"],
      unit_status: ["occupied", "vacant"],
    },
  },
} as const
