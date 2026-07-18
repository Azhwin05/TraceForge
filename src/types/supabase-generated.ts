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
      air_test_records: {
        Row: {
          created_at: string
          created_by: string | null
          duration: string | null
          id: string
          job_card_id: string
          notes: string | null
          pressure: string | null
          result: string
          tester_name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration?: string | null
          id?: string
          job_card_id: string
          notes?: string | null
          pressure?: string | null
          result?: string
          tester_name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration?: string | null
          id?: string
          job_card_id?: string
          notes?: string | null
          pressure?: string | null
          result?: string
          tester_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "air_test_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "air_test_records_job_card_id_fkey"
            columns: ["job_card_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
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
          batch_no: string | null
          chemical_name: string
          created_at: string
          created_by: string | null
          expiry_date: string | null
          id: string
          is_active: boolean
          manufacturer: string | null
          notes: string | null
          type: string
          updated_at: string
        }
        Insert: {
          batch_no?: string | null
          chemical_name: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          notes?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          batch_no?: string | null
          chemical_name?: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
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
          batch_no: string | null
          brand: string
          created_at: string
          created_by: string | null
          expiry_date: string | null
          id: string
          is_active: boolean
          manufacturer: string | null
          manufacturing_date: string | null
          notes: string | null
          product_name: string
          size: string | null
          type: string
          updated_at: string
        }
        Insert: {
          aws_class?: string | null
          batch_no?: string | null
          brand: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          manufacturing_date?: string | null
          notes?: string | null
          product_name: string
          size?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          aws_class?: string | null
          batch_no?: string | null
          brand?: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          manufacturing_date?: string | null
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
          approved_at: string | null
          approved_by: string | null
          approved_by_name: string | null
          created_at: string
          created_by: string | null
          description: string | null
          dimension_status: string
          dimensions: Json | null
          doc_url: string | null
          drawing_number: string | null
          drawing_revision: string | null
          drawing_size: string | null
          gauge_used: string | null
          generated_pdf_path: string | null
          heat_number: string | null
          id: string
          inspected_by: string | null
          instrument_master_id: string | null
          instrument_used: string | null
          job_card_id: string
          machine_name: string | null
          material_code: string | null
          mp_dp_number: string | null
          operator: string | null
          overall_result: string
          po_number: string | null
          rejection_reason: string | null
          report_date: string | null
          report_number: string | null
          required_dimensions: Json
          result_status: string | null
          sample_number: string | null
          sample_readings: Json
          storage_path: string | null
          submitted_at: string | null
          submitted_to_customer: boolean
          tolerances: Json | null
          updated_at: string
          vendor_name: string | null
          visual_result: string | null
          visual_satisfactory: boolean | null
          weld_deposit_thickness_after: string | null
          weld_deposit_thickness_before: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dimension_status?: string
          dimensions?: Json | null
          doc_url?: string | null
          drawing_number?: string | null
          drawing_revision?: string | null
          drawing_size?: string | null
          gauge_used?: string | null
          generated_pdf_path?: string | null
          heat_number?: string | null
          id?: string
          inspected_by?: string | null
          instrument_master_id?: string | null
          instrument_used?: string | null
          job_card_id: string
          machine_name?: string | null
          material_code?: string | null
          mp_dp_number?: string | null
          operator?: string | null
          overall_result: string
          po_number?: string | null
          rejection_reason?: string | null
          report_date?: string | null
          report_number?: string | null
          required_dimensions: Json
          result_status?: string | null
          sample_number?: string | null
          sample_readings: Json
          storage_path?: string | null
          submitted_at?: string | null
          submitted_to_customer?: boolean
          tolerances?: Json | null
          updated_at?: string
          vendor_name?: string | null
          visual_result?: string | null
          visual_satisfactory?: boolean | null
          weld_deposit_thickness_after?: string | null
          weld_deposit_thickness_before?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dimension_status?: string
          dimensions?: Json | null
          doc_url?: string | null
          drawing_number?: string | null
          drawing_revision?: string | null
          drawing_size?: string | null
          gauge_used?: string | null
          generated_pdf_path?: string | null
          heat_number?: string | null
          id?: string
          inspected_by?: string | null
          instrument_master_id?: string | null
          instrument_used?: string | null
          job_card_id?: string
          machine_name?: string | null
          material_code?: string | null
          mp_dp_number?: string | null
          operator?: string | null
          overall_result?: string
          po_number?: string | null
          rejection_reason?: string | null
          report_date?: string | null
          report_number?: string | null
          required_dimensions?: Json
          result_status?: string | null
          sample_number?: string | null
          sample_readings?: Json
          storage_path?: string | null
          submitted_at?: string | null
          submitted_to_customer?: boolean
          tolerances?: Json | null
          updated_at?: string
          vendor_name?: string | null
          visual_result?: string | null
          visual_satisfactory?: boolean | null
          weld_deposit_thickness_after?: string | null
          weld_deposit_thickness_before?: string | null
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
      grn: {
        Row: {
          generated_at: string
          generated_by: string | null
          grn_number: string
          id: string
          material_inward_id: string
          remarks: string | null
          status: string
        }
        Insert: {
          generated_at?: string
          generated_by?: string | null
          grn_number: string
          id?: string
          material_inward_id: string
          remarks?: string | null
          status?: string
        }
        Update: {
          generated_at?: string
          generated_by?: string | null
          grn_number?: string
          id?: string
          material_inward_id?: string
          remarks?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "grn_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_material_inward_id_fkey"
            columns: ["material_inward_id"]
            isOneToOne: true
            referencedRelation: "material_inward"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_items: {
        Row: {
          accepted_qty: number
          grn_id: string
          id: string
          item_id: string
          quality_inspection_id: string
          remarks: string | null
          storage_location_id: string
          unit_rate: number | null
          uom: string
        }
        Insert: {
          accepted_qty: number
          grn_id: string
          id?: string
          item_id: string
          quality_inspection_id: string
          remarks?: string | null
          storage_location_id: string
          unit_rate?: number | null
          uom: string
        }
        Update: {
          accepted_qty?: number
          grn_id?: string
          id?: string
          item_id?: string
          quality_inspection_id?: string
          remarks?: string | null
          storage_location_id?: string
          unit_rate?: number | null
          uom?: string
        }
        Relationships: [
          {
            foreignKeyName: "grn_items_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "grn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_items_quality_inspection_id_fkey"
            columns: ["quality_inspection_id"]
            isOneToOne: false
            referencedRelation: "quality_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_items_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      incoming_inspections: {
        Row: {
          documents_ok: boolean
          id: string
          inspected_by: string | null
          inspection_date: string
          material_inward_id: string
          packaging_ok: boolean
          quantity_ok: boolean
          remarks: string | null
        }
        Insert: {
          documents_ok: boolean
          id?: string
          inspected_by?: string | null
          inspection_date?: string
          material_inward_id: string
          packaging_ok: boolean
          quantity_ok: boolean
          remarks?: string | null
        }
        Update: {
          documents_ok?: boolean
          id?: string
          inspected_by?: string | null
          inspection_date?: string
          material_inward_id?: string
          packaging_ok?: boolean
          quantity_ok?: boolean
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incoming_inspections_inspected_by_fkey"
            columns: ["inspected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_inspections_material_inward_id_fkey"
            columns: ["material_inward_id"]
            isOneToOne: true
            referencedRelation: "material_inward"
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
      item_master: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          hsn_code: string | null
          id: string
          is_active: boolean
          item_code: string
          item_name: string
          min_stock_level: number
          uom: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          item_code: string
          item_name: string
          min_stock_level?: number
          uom: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          item_code?: string
          item_name?: string
          min_stock_level?: number
          uom?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_master_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_cards: {
        Row: {
          base_material: string | null
          base_material_grade: string | null
          buyer: string | null
          client_id: string
          consumable_aws_class: string | null
          consumable_batch_no: string | null
          consumable_brand: string | null
          consumable_mfg_date: string | null
          consumable_size: string | null
          created_at: string
          created_by: string | null
          description: string
          despatch_date: string | null
          despatch_dc_no: string | null
          dispatch_validated_at: string | null
          dispatch_validated_by: string | null
          drawing_number: string | null
          due_date: string | null
          heat_number: string | null
          id: string
          jc_number: string
          material_code: string | null
          mpi_rt_no: string | null
          nbdn_number: string
          other_details: string | null
          overlay_material: string | null
          part_number: string | null
          po_number: string | null
          previous_status: string | null
          process_type: string[]
          product_group: string | null
          production_checked_by: string | null
          production_checked_date: string | null
          punching_details: string | null
          qc_checked_by: string | null
          qc_checked_date: string | null
          quantity: number
          received_date: string
          regularization: string | null
          ring: string | null
          ring_heat_no: string | null
          stage_entered_at: string
          status: string
          stores_checked_by: string | null
          stores_checked_date: string | null
          updated_at: string
          valve_size_class: string | null
          valve_type_component: string | null
          weld_deposit_thickness_after: string | null
          weld_deposit_thickness_before: string | null
          welding_process: string | null
          wps_no: string | null
        }
        Insert: {
          base_material?: string | null
          base_material_grade?: string | null
          buyer?: string | null
          client_id: string
          consumable_aws_class?: string | null
          consumable_batch_no?: string | null
          consumable_brand?: string | null
          consumable_mfg_date?: string | null
          consumable_size?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          despatch_date?: string | null
          despatch_dc_no?: string | null
          dispatch_validated_at?: string | null
          dispatch_validated_by?: string | null
          drawing_number?: string | null
          due_date?: string | null
          heat_number?: string | null
          id?: string
          jc_number: string
          material_code?: string | null
          mpi_rt_no?: string | null
          nbdn_number: string
          other_details?: string | null
          overlay_material?: string | null
          part_number?: string | null
          po_number?: string | null
          previous_status?: string | null
          process_type: string[]
          product_group?: string | null
          production_checked_by?: string | null
          production_checked_date?: string | null
          punching_details?: string | null
          qc_checked_by?: string | null
          qc_checked_date?: string | null
          quantity?: number
          received_date?: string
          regularization?: string | null
          ring?: string | null
          ring_heat_no?: string | null
          stage_entered_at?: string
          status?: string
          stores_checked_by?: string | null
          stores_checked_date?: string | null
          updated_at?: string
          valve_size_class?: string | null
          valve_type_component?: string | null
          weld_deposit_thickness_after?: string | null
          weld_deposit_thickness_before?: string | null
          welding_process?: string | null
          wps_no?: string | null
        }
        Update: {
          base_material?: string | null
          base_material_grade?: string | null
          buyer?: string | null
          client_id?: string
          consumable_aws_class?: string | null
          consumable_batch_no?: string | null
          consumable_brand?: string | null
          consumable_mfg_date?: string | null
          consumable_size?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          despatch_date?: string | null
          despatch_dc_no?: string | null
          dispatch_validated_at?: string | null
          dispatch_validated_by?: string | null
          drawing_number?: string | null
          due_date?: string | null
          heat_number?: string | null
          id?: string
          jc_number?: string
          material_code?: string | null
          mpi_rt_no?: string | null
          nbdn_number?: string
          other_details?: string | null
          overlay_material?: string | null
          part_number?: string | null
          po_number?: string | null
          previous_status?: string | null
          process_type?: string[]
          product_group?: string | null
          production_checked_by?: string | null
          production_checked_date?: string | null
          punching_details?: string | null
          qc_checked_by?: string | null
          qc_checked_date?: string | null
          quantity?: number
          received_date?: string
          regularization?: string | null
          ring?: string | null
          ring_heat_no?: string | null
          stage_entered_at?: string
          status?: string
          stores_checked_by?: string | null
          stores_checked_date?: string | null
          updated_at?: string
          valve_size_class?: string | null
          valve_type_component?: string | null
          weld_deposit_thickness_after?: string | null
          weld_deposit_thickness_before?: string | null
          welding_process?: string | null
          wps_no?: string | null
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
          {
            foreignKeyName: "job_cards_dispatch_validated_by_fkey"
            columns: ["dispatch_validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          location: string | null
          machine_code: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          machine_code: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          machine_code?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      material_inward: {
        Row: {
          created_at: string
          dc_date: string
          dc_number: string
          id: string
          po_number: string | null
          received_by: string | null
          remarks: string | null
          status: string
          supplier_id: string
          updated_at: string
          vehicle_no: string | null
        }
        Insert: {
          created_at?: string
          dc_date?: string
          dc_number: string
          id?: string
          po_number?: string | null
          received_by?: string | null
          remarks?: string | null
          status?: string
          supplier_id: string
          updated_at?: string
          vehicle_no?: string | null
        }
        Update: {
          created_at?: string
          dc_date?: string
          dc_number?: string
          id?: string
          po_number?: string | null
          received_by?: string | null
          remarks?: string | null
          status?: string
          supplier_id?: string
          updated_at?: string
          vehicle_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_inward_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_inward_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      material_inward_items: {
        Row: {
          dc_quantity: number
          id: string
          item_id: string
          material_inward_id: string
          remarks: string | null
          uom: string
        }
        Insert: {
          dc_quantity: number
          id?: string
          item_id: string
          material_inward_id: string
          remarks?: string | null
          uom: string
        }
        Update: {
          dc_quantity?: number
          id?: string
          item_id?: string
          material_inward_id?: string
          remarks?: string | null
          uom?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_inward_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_inward_items_material_inward_id_fkey"
            columns: ["material_inward_id"]
            isOneToOne: false
            referencedRelation: "material_inward"
            referencedColumns: ["id"]
          },
        ]
      }
      material_issue_items: {
        Row: {
          id: string
          issued_qty: number
          item_id: string
          material_issue_id: string
          remarks: string | null
          storage_location_id: string
          uom: string
        }
        Insert: {
          id?: string
          issued_qty: number
          item_id: string
          material_issue_id: string
          remarks?: string | null
          storage_location_id: string
          uom: string
        }
        Update: {
          id?: string
          issued_qty?: number
          item_id?: string
          material_issue_id?: string
          remarks?: string | null
          storage_location_id?: string
          uom?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_issue_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_issue_items_material_issue_id_fkey"
            columns: ["material_issue_id"]
            isOneToOne: false
            referencedRelation: "material_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_issue_items_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      material_issues: {
        Row: {
          id: string
          issue_date: string
          issue_number: string
          issued_by: string | null
          job_card_id: string | null
          remarks: string | null
          status: string
        }
        Insert: {
          id?: string
          issue_date?: string
          issue_number: string
          issued_by?: string | null
          job_card_id?: string | null
          remarks?: string | null
          status?: string
        }
        Update: {
          id?: string
          issue_date?: string
          issue_number?: string
          issued_by?: string | null
          job_card_id?: string | null
          remarks?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_issues_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_issues_job_card_id_fkey"
            columns: ["job_card_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      nde_records: {
        Row: {
          chemical_1_id: string | null
          chemical_2_id: string | null
          chemical_3_id: string | null
          chemical_4_id: string | null
          chemicals_used_json: Json | null
          created_at: string
          created_by: string | null
          deposit_thickness: string | null
          developer_application: string | null
          developer_dwell_time: number | null
          duration: string | null
          evaluation: string | null
          hardness_requirement: string | null
          id: string
          inspected_by: string | null
          inspection_date: string | null
          job_card_id: string
          nde_number: string | null
          nde_type: string
          notes: string | null
          observer: string | null
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
          test_coupon_number: string | null
          type_of_penetrant: string | null
        }
        Insert: {
          chemical_1_id?: string | null
          chemical_2_id?: string | null
          chemical_3_id?: string | null
          chemical_4_id?: string | null
          chemicals_used_json?: Json | null
          created_at?: string
          created_by?: string | null
          deposit_thickness?: string | null
          developer_application?: string | null
          developer_dwell_time?: number | null
          duration?: string | null
          evaluation?: string | null
          hardness_requirement?: string | null
          id?: string
          inspected_by?: string | null
          inspection_date?: string | null
          job_card_id: string
          nde_number?: string | null
          nde_type: string
          notes?: string | null
          observer?: string | null
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
          test_coupon_number?: string | null
          type_of_penetrant?: string | null
        }
        Update: {
          chemical_1_id?: string | null
          chemical_2_id?: string | null
          chemical_3_id?: string | null
          chemical_4_id?: string | null
          chemicals_used_json?: Json | null
          created_at?: string
          created_by?: string | null
          deposit_thickness?: string | null
          developer_application?: string | null
          developer_dwell_time?: number | null
          duration?: string | null
          evaluation?: string | null
          hardness_requirement?: string | null
          id?: string
          inspected_by?: string | null
          inspection_date?: string | null
          job_card_id?: string
          nde_number?: string | null
          nde_type?: string
          notes?: string | null
          observer?: string | null
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
          test_coupon_number?: string | null
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
            foreignKeyName: "nde_records_chemical_4_id_fkey"
            columns: ["chemical_4_id"]
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
          annotated_drawing_path: string | null
          approved_at: string | null
          approved_by_name: string | null
          base_material: string | null
          calibration_due: string | null
          created_at: string
          customer: string | null
          doc_url: string | null
          drawing_number: string | null
          generated_pdf_path: string | null
          heat_no: string | null
          id: string
          inspected_by: string | null
          instrument_master_id: string | null
          instrument_name: string | null
          instrument_serial: string | null
          item_no: string | null
          job_card_id: string
          order_number: string | null
          overlay_material: string | null
          pmi_status: string
          procedure_ref: string | null
          quantity: string | null
          readings: Json
          rejection_reason: string | null
          report_date: string | null
          report_number: string | null
          result: string | null
          storage_path: string | null
          submitted_at: string | null
          submitted_to_customer: boolean
          updated_at: string
          uploaded_by: string | null
          valve_size_class: string | null
          valve_type_component: string | null
        }
        Insert: {
          annotated_drawing_path?: string | null
          approved_at?: string | null
          approved_by_name?: string | null
          base_material?: string | null
          calibration_due?: string | null
          created_at?: string
          customer?: string | null
          doc_url?: string | null
          drawing_number?: string | null
          generated_pdf_path?: string | null
          heat_no?: string | null
          id?: string
          inspected_by?: string | null
          instrument_master_id?: string | null
          instrument_name?: string | null
          instrument_serial?: string | null
          item_no?: string | null
          job_card_id: string
          order_number?: string | null
          overlay_material?: string | null
          pmi_status?: string
          procedure_ref?: string | null
          quantity?: string | null
          readings: Json
          rejection_reason?: string | null
          report_date?: string | null
          report_number?: string | null
          result?: string | null
          storage_path?: string | null
          submitted_at?: string | null
          submitted_to_customer?: boolean
          updated_at?: string
          uploaded_by?: string | null
          valve_size_class?: string | null
          valve_type_component?: string | null
        }
        Update: {
          annotated_drawing_path?: string | null
          approved_at?: string | null
          approved_by_name?: string | null
          base_material?: string | null
          calibration_due?: string | null
          created_at?: string
          customer?: string | null
          doc_url?: string | null
          drawing_number?: string | null
          generated_pdf_path?: string | null
          heat_no?: string | null
          id?: string
          inspected_by?: string | null
          instrument_master_id?: string | null
          instrument_name?: string | null
          instrument_serial?: string | null
          item_no?: string | null
          job_card_id?: string
          order_number?: string | null
          overlay_material?: string | null
          pmi_status?: string
          procedure_ref?: string | null
          quantity?: string | null
          readings?: Json
          rejection_reason?: string | null
          report_date?: string | null
          report_number?: string | null
          result?: string | null
          storage_path?: string | null
          submitted_at?: string | null
          submitted_to_customer?: boolean
          updated_at?: string
          uploaded_by?: string | null
          valve_size_class?: string | null
          valve_type_component?: string | null
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
          completed_qty: number | null
          consumable_batch: string | null
          consumable_feed_rate: number | null
          consumable_feed_rate_planned: number | null
          consumable_master_id: string | null
          gas_flow_rate: number | null
          gas_flow_rate_planned: number | null
          id: string
          inter_pass_temp: number | null
          inter_pass_temp_planned: number | null
          job_card_id: string
          machine_id: string | null
          notes: string | null
          operation_type: string | null
          override_by: string | null
          override_reason: string | null
          planned_qty: number | null
          polarity: string | null
          polarity_planned: string | null
          post_heat_temp: number | null
          post_heat_temp_planned: number | null
          pre_heat_temp: number | null
          pre_heat_temp_planned: number | null
          process_type: string
          rejected_qty: number | null
          sequence_no: number | null
          started_at: string | null
          status: string
          travel_speed: number | null
          travel_speed_planned: number | null
          volts_actual: number | null
          volts_required: string | null
          weld_date: string | null
          weld_height: number | null
          weld_metal: string | null
          weld_qty_actual: number | null
          weld_qty_planned: number | null
          welder_id: string | null
          welder_name: string | null
        }
        Insert: {
          amps_actual?: number | null
          amps_required?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completed_qty?: number | null
          consumable_batch?: string | null
          consumable_feed_rate?: number | null
          consumable_feed_rate_planned?: number | null
          consumable_master_id?: string | null
          gas_flow_rate?: number | null
          gas_flow_rate_planned?: number | null
          id?: string
          inter_pass_temp?: number | null
          inter_pass_temp_planned?: number | null
          job_card_id: string
          machine_id?: string | null
          notes?: string | null
          operation_type?: string | null
          override_by?: string | null
          override_reason?: string | null
          planned_qty?: number | null
          polarity?: string | null
          polarity_planned?: string | null
          post_heat_temp?: number | null
          post_heat_temp_planned?: number | null
          pre_heat_temp?: number | null
          pre_heat_temp_planned?: number | null
          process_type: string
          rejected_qty?: number | null
          sequence_no?: number | null
          started_at?: string | null
          status?: string
          travel_speed?: number | null
          travel_speed_planned?: number | null
          volts_actual?: number | null
          volts_required?: string | null
          weld_date?: string | null
          weld_height?: number | null
          weld_metal?: string | null
          weld_qty_actual?: number | null
          weld_qty_planned?: number | null
          welder_id?: string | null
          welder_name?: string | null
        }
        Update: {
          amps_actual?: number | null
          amps_required?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completed_qty?: number | null
          consumable_batch?: string | null
          consumable_feed_rate?: number | null
          consumable_feed_rate_planned?: number | null
          consumable_master_id?: string | null
          gas_flow_rate?: number | null
          gas_flow_rate_planned?: number | null
          id?: string
          inter_pass_temp?: number | null
          inter_pass_temp_planned?: number | null
          job_card_id?: string
          machine_id?: string | null
          notes?: string | null
          operation_type?: string | null
          override_by?: string | null
          override_reason?: string | null
          planned_qty?: number | null
          polarity?: string | null
          polarity_planned?: string | null
          post_heat_temp?: number | null
          post_heat_temp_planned?: number | null
          pre_heat_temp?: number | null
          pre_heat_temp_planned?: number | null
          process_type?: string
          rejected_qty?: number | null
          sequence_no?: number | null
          started_at?: string | null
          status?: string
          travel_speed?: number | null
          travel_speed_planned?: number | null
          volts_actual?: number | null
          volts_required?: string | null
          weld_date?: string | null
          weld_height?: number | null
          weld_metal?: string | null
          weld_qty_actual?: number | null
          weld_qty_planned?: number | null
          welder_id?: string | null
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
          {
            foreignKeyName: "process_executions_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_executions_override_by_fkey"
            columns: ["override_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          loading_time: number | null
          notes: string | null
          operator_name: string | null
          process_name: string | null
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
          unloading_time: number | null
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
          loading_time?: number | null
          notes?: string | null
          operator_name?: string | null
          process_name?: string | null
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
          unloading_time?: number | null
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
          loading_time?: number | null
          notes?: string | null
          operator_name?: string | null
          process_name?: string | null
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
          unloading_time?: number | null
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
      quality_inspections: {
        Row: {
          accepted_qty: number
          id: string
          inspected_by: string | null
          inspection_date: string
          material_inward_id: string
          material_inward_item_id: string
          rejected_qty: number
          rejection_reason: string | null
          remarks: string | null
          result: string
        }
        Insert: {
          accepted_qty?: number
          id?: string
          inspected_by?: string | null
          inspection_date?: string
          material_inward_id: string
          material_inward_item_id: string
          rejected_qty?: number
          rejection_reason?: string | null
          remarks?: string | null
          result: string
        }
        Update: {
          accepted_qty?: number
          id?: string
          inspected_by?: string | null
          inspection_date?: string
          material_inward_id?: string
          material_inward_item_id?: string
          rejected_qty?: number
          rejection_reason?: string | null
          remarks?: string | null
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_inspections_inspected_by_fkey"
            columns: ["inspected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_inspections_material_inward_id_fkey"
            columns: ["material_inward_id"]
            isOneToOne: false
            referencedRelation: "material_inward"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_inspections_material_inward_item_id_fkey"
            columns: ["material_inward_item_id"]
            isOneToOne: true
            referencedRelation: "material_inward_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_ledger: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          qty: number
          reference_id: string
          reference_type: string
          storage_location_id: string
          transaction_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          qty: number
          reference_id: string
          reference_type: string
          storage_location_id: string
          transaction_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          qty?: number
          reference_id?: string
          reference_type?: string
          storage_location_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_locations: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          gst_no: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          gst_no?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          gst_no?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      wps_master: {
        Row: {
          approved_by: string | null
          base_material: string | null
          base_metal_json: Json | null
          created_at: string
          created_by: string | null
          date_of_welding: string | null
          effective_date: string | null
          electrical_params_json: Json | null
          filler_aws_class: string | null
          filler_material: string | null
          filler_metal_json: Json | null
          filler_size: string | null
          gas_json: Json | null
          id: string
          interpass_max: number | null
          joint_design: string | null
          joint_json: Json | null
          notes: string | null
          position: string | null
          pqr_no: string | null
          preheat_min: number | null
          preheat_other: string | null
          pwht_cooling_method: string | null
          pwht_loading_temp: string | null
          pwht_rate_of_heating: string | null
          pwht_required: boolean
          pwht_temp_max: number | null
          pwht_temp_min: number | null
          pwht_time_range: string | null
          pwht_unloading_temp: string | null
          reviewed_by: string | null
          revision: string
          scope: string | null
          status: string
          technique_json: Json | null
          tensile_tests_json: Json | null
          type: string | null
          updated_at: string
          weld_passes_json: Json | null
          weld_progression: string | null
          welding_process: string | null
          wps_no: string
        }
        Insert: {
          approved_by?: string | null
          base_material?: string | null
          base_metal_json?: Json | null
          created_at?: string
          created_by?: string | null
          date_of_welding?: string | null
          effective_date?: string | null
          electrical_params_json?: Json | null
          filler_aws_class?: string | null
          filler_material?: string | null
          filler_metal_json?: Json | null
          filler_size?: string | null
          gas_json?: Json | null
          id?: string
          interpass_max?: number | null
          joint_design?: string | null
          joint_json?: Json | null
          notes?: string | null
          position?: string | null
          pqr_no?: string | null
          preheat_min?: number | null
          preheat_other?: string | null
          pwht_cooling_method?: string | null
          pwht_loading_temp?: string | null
          pwht_rate_of_heating?: string | null
          pwht_required?: boolean
          pwht_temp_max?: number | null
          pwht_temp_min?: number | null
          pwht_time_range?: string | null
          pwht_unloading_temp?: string | null
          reviewed_by?: string | null
          revision?: string
          scope?: string | null
          status?: string
          technique_json?: Json | null
          tensile_tests_json?: Json | null
          type?: string | null
          updated_at?: string
          weld_passes_json?: Json | null
          weld_progression?: string | null
          welding_process?: string | null
          wps_no: string
        }
        Update: {
          approved_by?: string | null
          base_material?: string | null
          base_metal_json?: Json | null
          created_at?: string
          created_by?: string | null
          date_of_welding?: string | null
          effective_date?: string | null
          electrical_params_json?: Json | null
          filler_aws_class?: string | null
          filler_material?: string | null
          filler_metal_json?: Json | null
          filler_size?: string | null
          gas_json?: Json | null
          id?: string
          interpass_max?: number | null
          joint_design?: string | null
          joint_json?: Json | null
          notes?: string | null
          position?: string | null
          pqr_no?: string | null
          preheat_min?: number | null
          preheat_other?: string | null
          pwht_cooling_method?: string | null
          pwht_loading_temp?: string | null
          pwht_rate_of_heating?: string | null
          pwht_required?: boolean
          pwht_temp_max?: number | null
          pwht_temp_min?: number | null
          pwht_time_range?: string | null
          pwht_unloading_temp?: string | null
          reviewed_by?: string | null
          revision?: string
          scope?: string | null
          status?: string
          technique_json?: Json | null
          tensile_tests_json?: Json | null
          type?: string | null
          updated_at?: string
          weld_passes_json?: Json | null
          weld_progression?: string | null
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
      stock_balances: {
        Row: {
          balance_qty: number | null
          item_id: string | null
          storage_location_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_ledger_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      seed_process_operations: {
        Args: { p_job_card_id: string }
        Returns: number
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
