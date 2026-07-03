// AUTO-GENERATED from the live Supabase schema on 2026-07-02 via supabase gen types.
// Reference only — the app imports from ./database.ts (hand-written contract).
// Use this as source of truth when migrating off the hand-written file.
// Includes unrelated oes_* tables (shared project) — ignore those for ValveTrack.
/* eslint-disable */

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
      accounts: {
        Row: {
          due_date: string | null
          grn_date: string | null
          grn_status: string
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoice_value: number | null
          job_card_id: string
          notes: string | null
          payment_amount: number | null
          payment_date: string | null
          payment_status: string
          po_number: string | null
          po_value: number | null
          tally_reference: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          due_date?: string | null
          grn_date?: string | null
          grn_status?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_value?: number | null
          job_card_id: string
          notes?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_status?: string
          po_number?: string | null
          po_value?: number | null
          tally_reference?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          due_date?: string | null
          grn_date?: string | null
          grn_status?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_value?: number | null
          job_card_id?: string
          notes?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_status?: string
          po_number?: string | null
          po_value?: number | null
          tally_reference?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_job_card_id_fkey"
            columns: ["job_card_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          hours_overdue: number | null
          id: string
          job_card_id: string
          sent_at: string | null
          stage: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          hours_overdue?: number | null
          id?: string
          job_card_id: string
          sent_at?: string | null
          stage: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          hours_overdue?: number | null
          id?: string
          job_card_id?: string
          sent_at?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_job_card_id_fkey"
            columns: ["job_card_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          entity_id: string
          entity_type: string
          id: number
          new_value: Json | null
          old_value: Json | null
          performed_at: string
          performed_by: string | null
        }
        Insert: {
          action: string
          entity_id: string
          entity_type: string
          id?: number
          new_value?: Json | null
          old_value?: Json | null
          performed_at?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          entity_id?: string
          entity_type?: string
          id?: number
          new_value?: Json | null
          old_value?: Json | null
          performed_at?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chemical_master: {
        Row: {
          chemical_name: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          manufacturer: string | null
          notes: string | null
          type: string
          updated_at: string
        }
        Insert: {
          chemical_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          notes?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          chemical_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          notes?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chemical_master_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      consumable_master: {
        Row: {
          aws_class: string | null
          brand: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          manufacturer: string | null
          notes: string | null
          product_name: string
          size: string | null
          type: string
          updated_at: string
        }
        Insert: {
          aws_class?: string | null
          brand: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          notes?: string | null
          product_name: string
          size?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          aws_class?: string | null
          brand?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          notes?: string | null
          product_name?: string
          size?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumable_master_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_dossier_documents: {
        Row: {
          created_at: string
          document_id: string
          document_name: string | null
          document_type: string | null
          dossier_id: string
          id: string
          included: boolean
          sort_order: number
          version: number | null
        }
        Insert: {
          created_at?: string
          document_id: string
          document_name?: string | null
          document_type?: string | null
          dossier_id: string
          id?: string
          included?: boolean
          sort_order?: number
          version?: number | null
        }
        Update: {
          created_at?: string
          document_id?: string
          document_name?: string | null
          document_type?: string | null
          dossier_id?: string
          id?: string
          included?: boolean
          sort_order?: number
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_dossier_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_dossier_documents_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "customer_dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_dossiers: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          dossier_date: string
          dossier_number: string
          drawing_number: string | null
          email_sent_at: string | null
          email_sent_by: string | null
          email_sent_to: string | null
          generated_index_pdf_path: string | null
          generated_zip_path: string | null
          heat_number: string | null
          id: string
          job_card_id: string
          nbdn_number: string | null
          po_number: string | null
          prepared_by: string | null
          remarks: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          submitted_to_customer: boolean
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          dossier_date: string
          dossier_number: string
          drawing_number?: string | null
          email_sent_at?: string | null
          email_sent_by?: string | null
          email_sent_to?: string | null
          generated_index_pdf_path?: string | null
          generated_zip_path?: string | null
          heat_number?: string | null
          id?: string
          job_card_id: string
          nbdn_number?: string | null
          po_number?: string | null
          prepared_by?: string | null
          remarks?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          submitted_to_customer?: boolean
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          dossier_date?: string
          dossier_number?: string
          drawing_number?: string | null
          email_sent_at?: string | null
          email_sent_by?: string | null
          email_sent_to?: string | null
          generated_index_pdf_path?: string | null
          generated_zip_path?: string | null
          heat_number?: string | null
          id?: string
          job_card_id?: string
          nbdn_number?: string | null
          po_number?: string | null
          prepared_by?: string | null
          remarks?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          submitted_to_customer?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_dossiers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_dossiers_email_sent_by_fkey"
            columns: ["email_sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_dossiers_job_card_id_fkey"
            columns: ["job_card_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      dimension_reports: {
        Row: {
          approved_by_name: string | null
          created_at: string
          created_by: string | null
          dimension_status: string
          doc_url: string | null
          id: string
          inspected_by: string | null
          instrument_master_id: string | null
          instrument_used: string | null
          job_card_id: string
          overall_result: string
          rejection_reason: string | null
          required_dimensions: Json
          sample_readings: Json
          storage_path: string | null
          tolerances: Json | null
          updated_at: string
          visual_result: string | null
        }
        Insert: {
          approved_by_name?: string | null
          created_at?: string
          created_by?: string | null
          dimension_status?: string
          doc_url?: string | null
          id?: string
          inspected_by?: string | null
          instrument_master_id?: string | null
          instrument_used?: string | null
          job_card_id: string
          overall_result: string
          rejection_reason?: string | null
          required_dimensions: Json
          sample_readings: Json
          storage_path?: string | null
          tolerances?: Json | null
          updated_at?: string
          visual_result?: string | null
        }
        Update: {
          approved_by_name?: string | null
          created_at?: string
          created_by?: string | null
          dimension_status?: string
          doc_url?: string | null
          id?: string
          inspected_by?: string | null
          instrument_master_id?: string | null
          instrument_used?: string | null
          job_card_id?: string
          overall_result?: string
          rejection_reason?: string | null
          required_dimensions?: Json
          sample_readings?: Json
          storage_path?: string | null
          tolerances?: Json | null
          updated_at?: string
          visual_result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dimension_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dimension_reports_instrument_master_id_fkey"
            columns: ["instrument_master_id"]
            isOneToOne: false
            referencedRelation: "instrument_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dimension_reports_job_card_id_fkey"
            columns: ["job_card_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatches: {
        Row: {
          created_at: string
          created_by: string | null
          dc_number: string
          dispatch_date: string
          doc_url: string | null
          id: string
          job_card_id: string
          remarks: string | null
          storage_path: string | null
          updated_at: string
          vehicle_details: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dc_number: string
          dispatch_date: string
          doc_url?: string | null
          id?: string
          job_card_id: string
          remarks?: string | null
          storage_path?: string | null
          updated_at?: string
          vehicle_details?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dc_number?: string
          dispatch_date?: string
          doc_url?: string | null
          id?: string
          job_card_id?: string
          remarks?: string | null
          storage_path?: string | null
          updated_at?: string
          vehicle_details?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_job_card_id_fkey"
            columns: ["job_card_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          approval_status: string
          document_category: string
          document_name: string | null
          document_type: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number | null
          id: string
          is_active: boolean
          is_latest: boolean
          job_card_id: string | null
          metadata_json: Json | null
          mime_type: string | null
          notes: string | null
          source_module: string | null
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          approval_status?: string
          document_category?: string
          document_name?: string | null
          document_type: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size?: number | null
          id?: string
          is_active?: boolean
          is_latest?: boolean
          job_card_id?: string | null
          metadata_json?: Json | null
          mime_type?: string | null
          notes?: string | null
          source_module?: string | null
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          approval_status?: string
          document_category?: string
          document_name?: string | null
          document_type?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number | null
          id?: string
          is_active?: boolean
          is_latest?: boolean
          job_card_id?: string | null
          metadata_json?: Json | null
          mime_type?: string | null
          notes?: string | null
          source_module?: string | null
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_job_card_id_fkey"
            columns: ["job_card_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instrument_master: {
        Row: {
          calibration_cert_url: string | null
          calibration_due: string | null
          calibration_storage_path: string | null
          created_at: string
          created_by: string | null
          id: string
          instrument_name: string
          instrument_type: string
          is_active: boolean
          manufacturer: string | null
          serial_number: string | null
          updated_at: string
        }
        Insert: {
          calibration_cert_url?: string | null
          calibration_due?: string | null
          calibration_storage_path?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          instrument_name: string
          instrument_type: string
          is_active?: boolean
          manufacturer?: string | null
          serial_number?: string | null
          updated_at?: string
        }
        Update: {
          calibration_cert_url?: string | null
          calibration_due?: string | null
          calibration_storage_path?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          instrument_name?: string
          instrument_type?: string
          is_active?: boolean
          manufacturer?: string | null
          serial_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instrument_master_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_cards: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          description: string
          drawing_number: string | null
          heat_number: string | null
          id: string
          jc_number: string
          nbdn_number: string
          part_number: string | null
          po_number: string | null
          previous_status: string | null
          process_type: string[]
          quantity: number
          received_date: string
          stage_entered_at: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          description: string
          drawing_number?: string | null
          heat_number?: string | null
          id?: string
          jc_number: string
          nbdn_number: string
          part_number?: string | null
          po_number?: string | null
          previous_status?: string | null
          process_type: string[]
          quantity?: number
          received_date?: string
          stage_entered_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          drawing_number?: string | null
          heat_number?: string | null
          id?: string
          jc_number?: string
          nbdn_number?: string
          part_number?: string | null
          po_number?: string | null
          previous_status?: string | null
          process_type?: string[]
          quantity?: number
          received_date?: string
          stage_entered_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_cards_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_cards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nde_records: {
        Row: {
          chemical_1_id: string | null
          chemical_2_id: string | null
          chemical_3_id: string | null
          created_at: string
          created_by: string | null
          developer_application: string | null
          developer_dwell_time: number | null
          evaluation: string | null
          id: string
          inspected_by: string | null
          inspection_date: string | null
          job_card_id: string
          nde_type: string
          notes: string | null
          penetrant_application: string | null
          penetrant_dwell_time: number | null
          penetrant_removal: string | null
          post_cleaning: string | null
          procedure_ref: string | null
          report_number: string | null
          result: string
          stage_of_test: string | null
          surface_condition: string | null
          temperature_of_part: number | null
          type_of_penetrant: string | null
        }
        Insert: {
          chemical_1_id?: string | null
          chemical_2_id?: string | null
          chemical_3_id?: string | null
          created_at?: string
          created_by?: string | null
          developer_application?: string | null
          developer_dwell_time?: number | null
          evaluation?: string | null
          id?: string
          inspected_by?: string | null
          inspection_date?: string | null
          job_card_id: string
          nde_type: string
          notes?: string | null
          penetrant_application?: string | null
          penetrant_dwell_time?: number | null
          penetrant_removal?: string | null
          post_cleaning?: string | null
          procedure_ref?: string | null
          report_number?: string | null
          result?: string
          stage_of_test?: string | null
          surface_condition?: string | null
          temperature_of_part?: number | null
          type_of_penetrant?: string | null
        }
        Update: {
          chemical_1_id?: string | null
          chemical_2_id?: string | null
          chemical_3_id?: string | null
          created_at?: string
          created_by?: string | null
          developer_application?: string | null
          developer_dwell_time?: number | null
          evaluation?: string | null
          id?: string
          inspected_by?: string | null
          inspection_date?: string | null
          job_card_id?: string
          nde_type?: string
          notes?: string | null
          penetrant_application?: string | null
          penetrant_dwell_time?: number | null
          penetrant_removal?: string | null
          post_cleaning?: string | null
          procedure_ref?: string | null
          report_number?: string | null
          result?: string
          stage_of_test?: string | null
          surface_condition?: string | null
          temperature_of_part?: number | null
          type_of_penetrant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nde_records_chemical_1_id_fkey"
            columns: ["chemical_1_id"]
            isOneToOne: false
            referencedRelation: "chemical_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_records_chemical_2_id_fkey"
            columns: ["chemical_2_id"]
            isOneToOne: false
            referencedRelation: "chemical_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_records_chemical_3_id_fkey"
            columns: ["chemical_3_id"]
            isOneToOne: false
            referencedRelation: "chemical_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_records_job_card_id_fkey"
            columns: ["job_card_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      oes_admin_remarks: {
        Row: {
          application_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          remark: string
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          remark: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          remark?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oes_admin_remarks_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "oes_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      oes_application_status_history: {
        Row: {
          application_id: string
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["oes_app_status"] | null
          id: string
          note: string | null
          to_status: Database["public"]["Enums"]["oes_app_status"]
        }
        Insert: {
          application_id: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["oes_app_status"] | null
          id?: string
          note?: string | null
          to_status: Database["public"]["Enums"]["oes_app_status"]
        }
        Update: {
          application_id?: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["oes_app_status"] | null
          id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["oes_app_status"]
        }
        Relationships: [
          {
            foreignKeyName: "oes_application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "oes_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      oes_applications: {
        Row: {
          applicant_name: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          primary_phone: string
          reference_number: string
          status: Database["public"]["Enums"]["oes_app_status"]
          submitted_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          applicant_name: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          primary_phone: string
          reference_number?: string
          status?: Database["public"]["Enums"]["oes_app_status"]
          submitted_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          applicant_name?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          primary_phone?: string
          reference_number?: string
          status?: Database["public"]["Enums"]["oes_app_status"]
          submitted_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      oes_audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      oes_documents: {
        Row: {
          application_id: string
          bucket: string
          created_at: string
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["oes_document_type"]
          file_name: string | null
          id: string
          mime_type: string | null
          path: string
          size_bytes: number | null
          updated_at: string
        }
        Insert: {
          application_id: string
          bucket: string
          created_at?: string
          deleted_at?: string | null
          document_type: Database["public"]["Enums"]["oes_document_type"]
          file_name?: string | null
          id?: string
          mime_type?: string | null
          path: string
          size_bytes?: number | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          bucket?: string
          created_at?: string
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["oes_document_type"]
          file_name?: string | null
          id?: string
          mime_type?: string | null
          path?: string
          size_bytes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oes_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "oes_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      oes_education_details: {
        Row: {
          application_id: string
          course_duration: number | null
          course_name: string | null
          created_at: string
          current_semester: number | null
          current_year: number | null
          has_scholarship: boolean
          id: string
          institution_name: string | null
          institution_type:
            | Database["public"]["Enums"]["oes_school_type"]
            | null
          scholarship_details: string | null
          school_name: string | null
          school_type: Database["public"]["Enums"]["oes_school_type"] | null
          updated_at: string
        }
        Insert: {
          application_id: string
          course_duration?: number | null
          course_name?: string | null
          created_at?: string
          current_semester?: number | null
          current_year?: number | null
          has_scholarship?: boolean
          id?: string
          institution_name?: string | null
          institution_type?:
            | Database["public"]["Enums"]["oes_school_type"]
            | null
          scholarship_details?: string | null
          school_name?: string | null
          school_type?: Database["public"]["Enums"]["oes_school_type"] | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          course_duration?: number | null
          course_name?: string | null
          created_at?: string
          current_semester?: number | null
          current_year?: number | null
          has_scholarship?: boolean
          id?: string
          institution_name?: string | null
          institution_type?:
            | Database["public"]["Enums"]["oes_school_type"]
            | null
          scholarship_details?: string | null
          school_name?: string | null
          school_type?: Database["public"]["Enums"]["oes_school_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oes_education_details_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "oes_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      oes_family_details: {
        Row: {
          annual_income: number | null
          application_id: string
          created_at: string
          father_name: string | null
          guardian_contact: string | null
          guardian_name: string | null
          guardian_occupation: string | null
          id: string
          mother_name: string | null
          parent_status: Database["public"]["Enums"]["oes_parent_status"] | null
          single_parent_reason:
            | Database["public"]["Enums"]["oes_single_reason"]
            | null
          updated_at: string
        }
        Insert: {
          annual_income?: number | null
          application_id: string
          created_at?: string
          father_name?: string | null
          guardian_contact?: string | null
          guardian_name?: string | null
          guardian_occupation?: string | null
          id?: string
          mother_name?: string | null
          parent_status?:
            | Database["public"]["Enums"]["oes_parent_status"]
            | null
          single_parent_reason?:
            | Database["public"]["Enums"]["oes_single_reason"]
            | null
          updated_at?: string
        }
        Update: {
          annual_income?: number | null
          application_id?: string
          created_at?: string
          father_name?: string | null
          guardian_contact?: string | null
          guardian_name?: string | null
          guardian_occupation?: string | null
          id?: string
          mother_name?: string | null
          parent_status?:
            | Database["public"]["Enums"]["oes_parent_status"]
            | null
          single_parent_reason?:
            | Database["public"]["Enums"]["oes_single_reason"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oes_family_details_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "oes_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      oes_impairment_details: {
        Row: {
          application_id: string
          belongs_to: Database["public"]["Enums"]["oes_impairment_owner"] | null
          created_at: string
          description: string | null
          has_impairment: boolean
          id: string
          impairment_type: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          belongs_to?:
            | Database["public"]["Enums"]["oes_impairment_owner"]
            | null
          created_at?: string
          description?: string | null
          has_impairment?: boolean
          id?: string
          impairment_type?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          belongs_to?:
            | Database["public"]["Enums"]["oes_impairment_owner"]
            | null
          created_at?: string
          description?: string | null
          has_impairment?: boolean
          id?: string
          impairment_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oes_impairment_details_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "oes_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      oes_personal_details: {
        Row: {
          alt_contact_number: string | null
          application_id: string
          contact_number: string
          created_at: string
          district: string | null
          dob: string | null
          email: string | null
          full_name: string
          gender: Database["public"]["Enums"]["oes_gender"] | null
          id: string
          name_tamil: string | null
          pincode: string | null
          state: string | null
          town: string | null
          updated_at: string
        }
        Insert: {
          alt_contact_number?: string | null
          application_id: string
          contact_number: string
          created_at?: string
          district?: string | null
          dob?: string | null
          email?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["oes_gender"] | null
          id?: string
          name_tamil?: string | null
          pincode?: string | null
          state?: string | null
          town?: string | null
          updated_at?: string
        }
        Update: {
          alt_contact_number?: string | null
          application_id?: string
          contact_number?: string
          created_at?: string
          district?: string | null
          dob?: string | null
          email?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["oes_gender"] | null
          id?: string
          name_tamil?: string | null
          pincode?: string | null
          state?: string | null
          town?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oes_personal_details_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "oes_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      oes_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          must_change_password: boolean
          role: Database["public"]["Enums"]["oes_user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          must_change_password?: boolean
          role?: Database["public"]["Enums"]["oes_user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          must_change_password?: boolean
          role?: Database["public"]["Enums"]["oes_user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      oes_residence_details: {
        Row: {
          application_id: string
          created_at: string
          district: string | null
          door_street: string | null
          id: string
          ownership_source:
            | Database["public"]["Enums"]["oes_ownership_source"]
            | null
          pincode: string | null
          residence_type:
            | Database["public"]["Enums"]["oes_residence_type"]
            | null
          roof_type: Database["public"]["Enums"]["oes_roof_type"] | null
          state: string | null
          town: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          district?: string | null
          door_street?: string | null
          id?: string
          ownership_source?:
            | Database["public"]["Enums"]["oes_ownership_source"]
            | null
          pincode?: string | null
          residence_type?:
            | Database["public"]["Enums"]["oes_residence_type"]
            | null
          roof_type?: Database["public"]["Enums"]["oes_roof_type"] | null
          state?: string | null
          town?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          district?: string | null
          door_street?: string | null
          id?: string
          ownership_source?:
            | Database["public"]["Enums"]["oes_ownership_source"]
            | null
          pincode?: string | null
          residence_type?:
            | Database["public"]["Enums"]["oes_residence_type"]
            | null
          roof_type?: Database["public"]["Enums"]["oes_roof_type"] | null
          state?: string | null
          town?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oes_residence_details_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "oes_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      oes_siblings: {
        Row: {
          application_id: string
          birth_order: Database["public"]["Enums"]["oes_sibling_order"] | null
          created_at: string
          details: string | null
          id: string
          name: string | null
          occupation: Database["public"]["Enums"]["oes_sibling_status"] | null
          updated_at: string
        }
        Insert: {
          application_id: string
          birth_order?: Database["public"]["Enums"]["oes_sibling_order"] | null
          created_at?: string
          details?: string | null
          id?: string
          name?: string | null
          occupation?: Database["public"]["Enums"]["oes_sibling_status"] | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          birth_order?: Database["public"]["Enums"]["oes_sibling_order"] | null
          created_at?: string
          details?: string | null
          id?: string
          name?: string | null
          occupation?: Database["public"]["Enums"]["oes_sibling_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oes_siblings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "oes_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      overlay_welding_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          aws_class_number: string | null
          base_material_grade: string | null
          chemicals_used_json: Json | null
          consumable_batch_number: string | null
          consumable_make: string | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          date_of_welding: string | null
          deposit_material: string | null
          deposit_thickness_actual: string | null
          deposit_thickness_condition: string | null
          deposit_thickness_required: string | null
          developer_application: string | null
          developer_dwell_time: string | null
          dimension_report_number: string | null
          drawing_number: string | null
          evaluation_of_dp_test: string | null
          generated_pdf_path: string | null
          hardness_actual: string | null
          hardness_required: string | null
          heat_number: string | null
          heat_treatment_chart_number: string | null
          id: string
          inspected_by: string | null
          item_description: string | null
          job_card_date: string | null
          job_card_id: string
          job_card_number: string | null
          lpt_procedure_ref: string | null
          material_code: string | null
          nbdn_number: string | null
          penetrant_application: string | null
          penetrant_dwell_time: string | null
          penetrant_removal: string | null
          po_number: string | null
          post_cleaning: string | null
          process: string | null
          quantity: string | null
          rejection_reason: string | null
          remarks: string | null
          report_date: string | null
          report_number: string | null
          report_status: string
          result_status: string | null
          stage_of_test: string | null
          submitted_at: string | null
          submitted_to_customer: boolean
          surface_condition: string | null
          temperature_of_part: string | null
          test_coupon_number: string | null
          type_of_penetrant: string | null
          updated_at: string
          vendor_name: string | null
          vendor_number: string | null
          visual_examination: string | null
          welder_name: string | null
          wps_number: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          aws_class_number?: string | null
          base_material_grade?: string | null
          chemicals_used_json?: Json | null
          consumable_batch_number?: string | null
          consumable_make?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          date_of_welding?: string | null
          deposit_material?: string | null
          deposit_thickness_actual?: string | null
          deposit_thickness_condition?: string | null
          deposit_thickness_required?: string | null
          developer_application?: string | null
          developer_dwell_time?: string | null
          dimension_report_number?: string | null
          drawing_number?: string | null
          evaluation_of_dp_test?: string | null
          generated_pdf_path?: string | null
          hardness_actual?: string | null
          hardness_required?: string | null
          heat_number?: string | null
          heat_treatment_chart_number?: string | null
          id?: string
          inspected_by?: string | null
          item_description?: string | null
          job_card_date?: string | null
          job_card_id: string
          job_card_number?: string | null
          lpt_procedure_ref?: string | null
          material_code?: string | null
          nbdn_number?: string | null
          penetrant_application?: string | null
          penetrant_dwell_time?: string | null
          penetrant_removal?: string | null
          po_number?: string | null
          post_cleaning?: string | null
          process?: string | null
          quantity?: string | null
          rejection_reason?: string | null
          remarks?: string | null
          report_date?: string | null
          report_number?: string | null
          report_status?: string
          result_status?: string | null
          stage_of_test?: string | null
          submitted_at?: string | null
          submitted_to_customer?: boolean
          surface_condition?: string | null
          temperature_of_part?: string | null
          test_coupon_number?: string | null
          type_of_penetrant?: string | null
          updated_at?: string
          vendor_name?: string | null
          vendor_number?: string | null
          visual_examination?: string | null
          welder_name?: string | null
          wps_number?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          aws_class_number?: string | null
          base_material_grade?: string | null
          chemicals_used_json?: Json | null
          consumable_batch_number?: string | null
          consumable_make?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          date_of_welding?: string | null
          deposit_material?: string | null
          deposit_thickness_actual?: string | null
          deposit_thickness_condition?: string | null
          deposit_thickness_required?: string | null
          developer_application?: string | null
          developer_dwell_time?: string | null
          dimension_report_number?: string | null
          drawing_number?: string | null
          evaluation_of_dp_test?: string | null
          generated_pdf_path?: string | null
          hardness_actual?: string | null
          hardness_required?: string | null
          heat_number?: string | null
          heat_treatment_chart_number?: string | null
          id?: string
          inspected_by?: string | null
          item_description?: string | null
          job_card_date?: string | null
          job_card_id?: string
          job_card_number?: string | null
          lpt_procedure_ref?: string | null
          material_code?: string | null
          nbdn_number?: string | null
          penetrant_application?: string | null
          penetrant_dwell_time?: string | null
          penetrant_removal?: string | null
          po_number?: string | null
          post_cleaning?: string | null
          process?: string | null
          quantity?: string | null
          rejection_reason?: string | null
          remarks?: string | null
          report_date?: string | null
          report_number?: string | null
          report_status?: string
          result_status?: string | null
          stage_of_test?: string | null
          submitted_at?: string | null
          submitted_to_customer?: boolean
          surface_condition?: string | null
          temperature_of_part?: string | null
          test_coupon_number?: string | null
          type_of_penetrant?: string | null
          updated_at?: string
          vendor_name?: string | null
          vendor_number?: string | null
          visual_examination?: string | null
          welder_name?: string | null
          wps_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "overlay_welding_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overlay_welding_reports_job_card_id_fkey"
            columns: ["job_card_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      pmi_reports: {
        Row: {
          calibration_due: string | null
          created_at: string
          doc_url: string | null
          id: string
          instrument_master_id: string | null
          instrument_name: string | null
          instrument_serial: string | null
          job_card_id: string
          pmi_status: string
          readings: Json
          rejection_reason: string | null
          result: string | null
          storage_path: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          calibration_due?: string | null
          created_at?: string
          doc_url?: string | null
          id?: string
          instrument_master_id?: string | null
          instrument_name?: string | null
          instrument_serial?: string | null
          job_card_id: string
          pmi_status?: string
          readings: Json
          rejection_reason?: string | null
          result?: string | null
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          calibration_due?: string | null
          created_at?: string
          doc_url?: string | null
          id?: string
          instrument_master_id?: string | null
          instrument_name?: string | null
          instrument_serial?: string | null
          job_card_id?: string
          pmi_status?: string
          readings?: Json
          rejection_reason?: string | null
          result?: string | null
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pmi_reports_instrument_master_id_fkey"
            columns: ["instrument_master_id"]
            isOneToOne: false
            referencedRelation: "instrument_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pmi_reports_job_card_id_fkey"
            columns: ["job_card_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pmi_reports_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      process_executions: {
        Row: {
          amps_actual: number | null
          amps_required: string | null
          assigned_to: string | null
          completed_at: string | null
          consumable_batch: string | null
          consumable_feed_rate: number | null
          consumable_master_id: string | null
          gas_flow_rate: number | null
          id: string
          inter_pass_temp: number | null
          job_card_id: string
          notes: string | null
          polarity: string | null
          post_heat_temp: number | null
          pre_heat_temp: number | null
          process_type: string
          started_at: string | null
          status: string
          travel_speed: number | null
          volts_actual: number | null
          volts_required: string | null
          weld_date: string | null
          weld_height: number | null
          welder_name: string | null
        }
        Insert: {
          amps_actual?: number | null
          amps_required?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          consumable_batch?: string | null
          consumable_feed_rate?: number | null
          consumable_master_id?: string | null
          gas_flow_rate?: number | null
          id?: string
          inter_pass_temp?: number | null
          job_card_id: string
          notes?: string | null
          polarity?: string | null
          post_heat_temp?: number | null
          pre_heat_temp?: number | null
          process_type: string
          started_at?: string | null
          status?: string
          travel_speed?: number | null
          volts_actual?: number | null
          volts_required?: string | null
          weld_date?: string | null
          weld_height?: number | null
          welder_name?: string | null
        }
        Update: {
          amps_actual?: number | null
          amps_required?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          consumable_batch?: string | null
          consumable_feed_rate?: number | null
          consumable_master_id?: string | null
          gas_flow_rate?: number | null
          id?: string
          inter_pass_temp?: number | null
          job_card_id?: string
          notes?: string | null
          polarity?: string | null
          post_heat_temp?: number | null
          pre_heat_temp?: number | null
          process_type?: string
          started_at?: string | null
          status?: string
          travel_speed?: number | null
          volts_actual?: number | null
          volts_required?: string | null
          weld_date?: string | null
          weld_height?: number | null
          welder_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_executions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_executions_consumable_master_id_fkey"
            columns: ["consumable_master_id"]
            isOneToOne: false
            referencedRelation: "consumable_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_executions_job_card_id_fkey"
            columns: ["job_card_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          client_id: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      pwht_chart_readings: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          id: string
          pwht_run_id: string
          recorded_at: string
          source: string
          temperature_c: number
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          pwht_run_id: string
          recorded_at: string
          source?: string
          temperature_c: number
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          pwht_run_id?: string
          recorded_at?: string
          source?: string
          temperature_c?: number
        }
        Relationships: [
          {
            foreignKeyName: "pwht_chart_readings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwht_chart_readings_pwht_run_id_fkey"
            columns: ["pwht_run_id"]
            isOneToOne: false
            referencedRelation: "pwht_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pwht_run_jobs: {
        Row: {
          id: string
          is_final: boolean
          job_card_id: string
          pwht_run_id: string
          status: string
        }
        Insert: {
          id?: string
          is_final?: boolean
          job_card_id: string
          pwht_run_id: string
          status?: string
        }
        Update: {
          id?: string
          is_final?: boolean
          job_card_id?: string
          pwht_run_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pwht_run_jobs_job_card_id_fkey"
            columns: ["job_card_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwht_run_jobs_pwht_run_id_fkey"
            columns: ["pwht_run_id"]
            isOneToOne: false
            referencedRelation: "pwht_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pwht_runs: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          chart_number: string
          component_identification: string | null
          cooling_method: string | null
          created_at: string
          created_by: string | null
          cycle_end: string | null
          cycle_start: string | null
          date_of_cycle: string | null
          doc_url: string | null
          furnace_id: string
          id: string
          loading_temp: number | null
          notes: string | null
          operator_name: string | null
          pwht_result: string | null
          rate_of_cooling: number | null
          rate_of_heating: number | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          soaking_temp: number | null
          soaking_time: number | null
          storage_path: string | null
          submitted_at: string | null
          submitted_by: string | null
          submitted_to_customer: boolean
          submitted_to_customer_at: string | null
          unloading_temp: number | null
          wps_number: string | null
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          chart_number: string
          component_identification?: string | null
          cooling_method?: string | null
          created_at?: string
          created_by?: string | null
          cycle_end?: string | null
          cycle_start?: string | null
          date_of_cycle?: string | null
          doc_url?: string | null
          furnace_id: string
          id?: string
          loading_temp?: number | null
          notes?: string | null
          operator_name?: string | null
          pwht_result?: string | null
          rate_of_cooling?: number | null
          rate_of_heating?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          soaking_temp?: number | null
          soaking_time?: number | null
          storage_path?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          submitted_to_customer?: boolean
          submitted_to_customer_at?: string | null
          unloading_temp?: number | null
          wps_number?: string | null
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          chart_number?: string
          component_identification?: string | null
          cooling_method?: string | null
          created_at?: string
          created_by?: string | null
          cycle_end?: string | null
          cycle_start?: string | null
          date_of_cycle?: string | null
          doc_url?: string | null
          furnace_id?: string
          id?: string
          loading_temp?: number | null
          notes?: string | null
          operator_name?: string | null
          pwht_result?: string | null
          rate_of_cooling?: number | null
          rate_of_heating?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          soaking_temp?: number | null
          soaking_time?: number | null
          storage_path?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          submitted_to_customer?: boolean
          submitted_to_customer_at?: string | null
          unloading_temp?: number | null
          wps_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pwht_runs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwht_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwht_runs_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwht_runs_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wps_master: {
        Row: {
          approved_by: string | null
          base_material: string | null
          created_at: string
          created_by: string | null
          effective_date: string | null
          electrical_params_json: Json | null
          filler_aws_class: string | null
          filler_material: string | null
          filler_size: string | null
          gas_json: Json | null
          id: string
          interpass_max: number | null
          joint_design: string | null
          notes: string | null
          position: string | null
          pqr_no: string | null
          preheat_min: number | null
          pwht_required: boolean
          pwht_temp_max: number | null
          pwht_temp_min: number | null
          pwht_time_range: string | null
          reviewed_by: string | null
          revision: string
          scope: string | null
          status: string
          technique_json: Json | null
          type: string | null
          updated_at: string
          welding_process: string | null
          wps_no: string
        }
        Insert: {
          approved_by?: string | null
          base_material?: string | null
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          electrical_params_json?: Json | null
          filler_aws_class?: string | null
          filler_material?: string | null
          filler_size?: string | null
          gas_json?: Json | null
          id?: string
          interpass_max?: number | null
          joint_design?: string | null
          notes?: string | null
          position?: string | null
          pqr_no?: string | null
          preheat_min?: number | null
          pwht_required?: boolean
          pwht_temp_max?: number | null
          pwht_temp_min?: number | null
          pwht_time_range?: string | null
          reviewed_by?: string | null
          revision?: string
          scope?: string | null
          status?: string
          technique_json?: Json | null
          type?: string | null
          updated_at?: string
          welding_process?: string | null
          wps_no: string
        }
        Update: {
          approved_by?: string | null
          base_material?: string | null
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          electrical_params_json?: Json | null
          filler_aws_class?: string | null
          filler_material?: string | null
          filler_size?: string | null
          gas_json?: Json | null
          id?: string
          interpass_max?: number | null
          joint_design?: string | null
          notes?: string | null
          position?: string | null
          pqr_no?: string | null
          preheat_min?: number | null
          pwht_required?: boolean
          pwht_temp_max?: number | null
          pwht_temp_min?: number | null
          pwht_time_range?: string | null
          reviewed_by?: string | null
          revision?: string
          scope?: string | null
          status?: string
          technique_json?: Json | null
          type?: string | null
          updated_at?: string
          welding_process?: string | null
          wps_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "wps_master_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wps_qualifications: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          doc_url: string | null
          id: string
          job_card_id: string
          rejection_reason: string | null
          revision: string | null
          storage_path: string | null
          uploaded_at: string
          uploaded_by: string | null
          wps_master_id: string | null
          wps_number: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          doc_url?: string | null
          id?: string
          job_card_id: string
          rejection_reason?: string | null
          revision?: string | null
          storage_path?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          wps_master_id?: string | null
          wps_number: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          doc_url?: string | null
          id?: string
          job_card_id?: string
          rejection_reason?: string | null
          revision?: string | null
          storage_path?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          wps_master_id?: string | null
          wps_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "wps_qualifications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wps_qualifications_job_card_id_fkey"
            columns: ["job_card_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wps_qualifications_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wps_qualifications_wps_master_id_fkey"
            columns: ["wps_master_id"]
            isOneToOne: false
            referencedRelation: "wps_master"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_client_id: { Args: never; Returns: string }
      current_role_name: { Args: never; Returns: string }
      generate_jc_number: { Args: never; Returns: string }
      instruments_expiring_soon: {
        Args: { days_ahead?: number }
        Returns: {
          calibration_cert_url: string | null
          calibration_due: string | null
          calibration_storage_path: string | null
          created_at: string
          created_by: string | null
          id: string
          instrument_name: string
          instrument_type: string
          is_active: boolean
          manufacturer: string | null
          serial_number: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "instrument_master"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_internal_staff: { Args: never; Returns: boolean }
      job_card_gate_blockers: {
        Args: { p_job_card_id: string; p_new_status: string }
        Returns: string[]
      }
      job_card_payment_blocker: {
        Args: { p_job_card_id: string }
        Returns: string
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_payload?: Json
        }
        Returns: undefined
      }
      log_document_dispatch: {
        Args: { p_entity_id: string; p_entity_type: string; p_payload?: Json }
        Returns: undefined
      }
      oes_current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["oes_user_role"]
      }
      oes_generate_reference: { Args: never; Returns: string }
      oes_is_admin: { Args: never; Returns: boolean }
      oes_is_staff: { Args: never; Returns: boolean }
      oes_track_application: {
        Args: { p_phone: string; p_reference: string }
        Returns: {
          applicant_name: string
          latest_remark: string
          reference_number: string
          status: Database["public"]["Enums"]["oes_app_status"]
          submitted_at: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      oes_app_status:
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "needs_correction"
      oes_document_type:
        | "student_photo"
        | "aadhaar"
        | "income"
        | "community"
        | "scholarship"
        | "impairment"
        | "other"
      oes_gender: "male" | "female" | "other"
      oes_impairment_owner: "self" | "parent"
      oes_ownership_source: "inheritance" | "built" | "other"
      oes_parent_status: "both" | "single" | "parentless"
      oes_residence_type: "own" | "rental"
      oes_roof_type: "concrete" | "thatched" | "tiled"
      oes_school_type: "government" | "private"
      oes_sibling_order: "elder" | "younger"
      oes_sibling_status: "studying" | "working"
      oes_single_reason: "divorced" | "separated" | "deceased" | "other"
      oes_user_role: "super_admin" | "admin" | "viewer"
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
      oes_app_status: [
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "needs_correction",
      ],
      oes_document_type: [
        "student_photo",
        "aadhaar",
        "income",
        "community",
        "scholarship",
        "impairment",
        "other",
      ],
      oes_gender: ["male", "female", "other"],
      oes_impairment_owner: ["self", "parent"],
      oes_ownership_source: ["inheritance", "built", "other"],
      oes_parent_status: ["both", "single", "parentless"],
      oes_residence_type: ["own", "rental"],
      oes_roof_type: ["concrete", "thatched", "tiled"],
      oes_school_type: ["government", "private"],
      oes_sibling_order: ["elder", "younger"],
      oes_sibling_status: ["studying", "working"],
      oes_single_reason: ["divorced", "separated", "deceased", "other"],
      oes_user_role: ["super_admin", "admin", "viewer"],
    },
  },
} as const
