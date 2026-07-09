// Hand-written mirror of the Supabase schema (see supabase/migrations).
// Last updated: Phase 1 — Document-Controlled ERP Foundation
// Regenerate with `supabase gen types typescript` once the project is linked.

export type UserRole = "admin" | "operator" | "engineer" | "qa" | "accounts" | "management" | "customer";

/** Internal staff roles (everyone except external portal customers). */
export const INTERNAL_ROLES = ["admin", "operator", "engineer", "qa", "accounts", "management"] as const;
export function isInternalRole(role: string | null | undefined): boolean {
  return !!role && (INTERNAL_ROLES as readonly string[]).includes(role);
}
export type JobCardStatus =
  | "created" | "wps_pending" | "wps_uploaded" | "wps_approved"
  | "process_assigned" | "in_process" | "process_complete"
  | "reports_pending" | "reports_complete"
  | "dispatch_ready" | "dispatched"
  | "accounts_processing" | "closed" | "on_hold";
export type ProcessType = "welding" | "machining" | "cladding" | "overlay";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type GrnStatus = "pending" | "received" | "held";
export type PaymentStatus = "pending" | "partial" | "received";
export type ExecutionStatus = "assigned" | "in_progress" | "completed" | "skipped";
export type PwhtJobStatus = "pending" | "passed" | "failed";
export type PwhtApprovalStatus = "draft" | "submitted" | "approved" | "rejected";

// ── Phase 1 new enums ──────────────────────────────────────────────────────
export type WpsMasterStatus = "draft" | "approved" | "superseded";
export type ConsumableType = "electrode" | "wire" | "flux" | "rod" | "other";
export type ChemicalType = "penetrant" | "developer" | "cleaner" | "remover" | "other";
export type InstrumentType = "pmi" | "dimensional" | "visual" | "hardness" | "nde" | "other";
export type MachineCategory = "welding" | "machining";
export type OperationType =
  | "pre_machining" | "welding" | "final_machining" | "milling" | "slitting" | "deburring";
export type NdeType = "lpt" | "mpi" | "rt" | "ut" | "vt" | "other";
export type NdeResult = "pending" | "accepted" | "rejected";
export type CoolingMethod = "air" | "furnace" | "controlled";
export type DocumentEntityType =
  | "job_card" | "wps_master" | "wps_qualification"
  | "pmi_report" | "dimension_report" | "overlay_report" | "pwht_run"
  | "dispatch" | "instrument_master" | "nde_record" | "other"
  | "dossier";
export type DocumentType =
  | "wps_pdf" | "pqr_pdf" | "pmi_report" | "dimension_report"
  | "pwht_chart" | "dispatch_doc" | "invoice" | "calibration_cert"
  | "customer_po" | "customer_drawing" | "job_card_pdf"
  | "overlay_welding_report" | "annotated_drawing" | "other"
  | "dossier_index" | "dossier_zip"
  // Expanded in migration 0015 for the client manufacturing workflow
  | "welding_report" | "electrode_test_certificate" | "consumable_certificate"
  | "material_test_certificate" | "nde_report" | "lpt_report" | "hardness_report"
  | "incoming_delivery_challan" | "outgoing_delivery_challan"
  | "final_acceptance_document" | "contract_review" | "process_layout";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string; role: UserRole; phone: string | null; is_active: boolean; created_at: string; client_id: string | null };
        Insert: { id: string; full_name: string; role: UserRole; phone?: string | null; is_active?: boolean; created_at?: string; client_id?: string | null };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "profiles_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] }
        ];
      };
      clients: {
        Row: { id: string; name: string; contact_name: string | null; contact_email: string | null; contact_phone: string | null; address: string | null; created_at: string };
        Insert: { id?: string; name: string; contact_name?: string | null; contact_email?: string | null; contact_phone?: string | null; address?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
        Relationships: [];
      };
      job_cards: {
        Row: {
          id: string; jc_number: string; client_id: string; nbdn_number: string;
          po_number: string | null; description: string;
          drawing_number: string | null; heat_number: string | null; part_number: string | null;
          quantity: number; process_type: ProcessType[]; received_date: string;
          due_date: string | null;
          status: JobCardStatus; previous_status: JobCardStatus | null;
          stage_entered_at: string; created_by: string | null; created_at: string; updated_at: string;
          // Phase 6 — advanced details
          product_group: string | null; buyer: string | null; material_code: string | null;
          valve_size_class: string | null; valve_type_component: string | null;
          base_material: string | null; overlay_material: string | null; base_material_grade: string | null;
          regularization: string | null; ring_heat_no: string | null; mpi_rt_no: string | null;
          // Phase 6 — sign-off
          production_checked_by: string | null; production_checked_date: string | null;
          qc_checked_by: string | null; qc_checked_date: string | null;
          stores_checked_by: string | null; stores_checked_date: string | null;
          punching_details: string | null;
          welding_process: string | null; ring: string | null; other_details: string | null;
        };
        Insert: {
          id?: string; jc_number: string; client_id: string; nbdn_number: string;
          po_number?: string | null; description: string;
          drawing_number?: string | null; heat_number?: string | null; part_number?: string | null;
          quantity?: number; process_type: ProcessType[]; received_date?: string;
          due_date?: string | null;
          status?: JobCardStatus; previous_status?: JobCardStatus | null;
          stage_entered_at?: string; created_by?: string | null; created_at?: string; updated_at?: string;
          product_group?: string | null; buyer?: string | null; material_code?: string | null;
          valve_size_class?: string | null; valve_type_component?: string | null;
          base_material?: string | null; overlay_material?: string | null; base_material_grade?: string | null;
          regularization?: string | null; ring_heat_no?: string | null; mpi_rt_no?: string | null;
          production_checked_by?: string | null; production_checked_date?: string | null;
          qc_checked_by?: string | null; qc_checked_date?: string | null;
          stores_checked_by?: string | null; stores_checked_date?: string | null;
          punching_details?: string | null;
          welding_process?: string | null; ring?: string | null; other_details?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["job_cards"]["Insert"]>;
        Relationships: [{ foreignKeyName: "job_cards_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] }];
      };
      wps_qualifications: {
        Row: { id: string; job_card_id: string; wps_number: string; revision: string | null; doc_url: string | null; approval_status: ApprovalStatus; approved_by: string | null; approved_at: string | null; rejection_reason: string | null; uploaded_by: string | null; uploaded_at: string; wps_master_id: string | null; storage_path: string | null };
        Insert: { id?: string; job_card_id: string; wps_number: string; revision?: string | null; doc_url?: string | null; approval_status?: ApprovalStatus; approved_by?: string | null; approved_at?: string | null; rejection_reason?: string | null; uploaded_by?: string | null; uploaded_at?: string; wps_master_id?: string | null; storage_path?: string | null };
        Update: Partial<Database["public"]["Tables"]["wps_qualifications"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "wps_qualifications_job_card_id_fkey"; columns: ["job_card_id"]; isOneToOne: false; referencedRelation: "job_cards"; referencedColumns: ["id"] },
          { foreignKeyName: "wps_qualifications_wps_master_id_fkey"; columns: ["wps_master_id"]; isOneToOne: false; referencedRelation: "wps_master"; referencedColumns: ["id"] }
        ];
      };
      pmi_reports: {
        Row: {
          id: string; job_card_id: string;
          readings: Record<string, unknown>;    // structured as PmiReadings (see below)
          instrument_name: string; instrument_serial: string; calibration_due: string;
          result: "acceptable" | "not_acceptable";
          doc_url: string | null; uploaded_by: string | null; created_at: string;
          instrument_master_id: string | null; storage_path: string | null;
          // Phase 5 header fields
          report_number: string | null; report_date: string | null;
          customer: string | null; quantity: string | null;
          order_number: string | null; item_no: string | null;
          valve_size_class: string | null; valve_type_component: string | null;
          base_material: string | null; overlay_material: string | null;
          drawing_number: string | null; procedure_ref: string | null; heat_no: string | null;
          annotated_drawing_path: string | null;
          pmi_status: "draft" | "approved" | "rejected" | "submitted";
          approved_by_name: string | null; approved_at: string | null;
          rejection_reason: string | null;
          submitted_to_customer: boolean; submitted_at: string | null;
          generated_pdf_path: string | null; inspected_by: string | null;
        };
        Insert: {
          id?: string; job_card_id: string;
          readings?: Record<string, unknown>;
          instrument_name?: string; instrument_serial?: string; calibration_due?: string;
          result?: "acceptable" | "not_acceptable";
          doc_url?: string | null; uploaded_by?: string | null; created_at?: string;
          instrument_master_id?: string | null; storage_path?: string | null;
          report_number?: string | null; report_date?: string | null;
          customer?: string | null; quantity?: string | null;
          order_number?: string | null; item_no?: string | null;
          valve_size_class?: string | null; valve_type_component?: string | null;
          base_material?: string | null; overlay_material?: string | null;
          drawing_number?: string | null; procedure_ref?: string | null; heat_no?: string | null;
          annotated_drawing_path?: string | null;
          pmi_status?: "draft" | "approved" | "rejected" | "submitted";
          approved_by_name?: string | null; approved_at?: string | null;
          rejection_reason?: string | null;
          submitted_to_customer?: boolean; submitted_at?: string | null;
          generated_pdf_path?: string | null; inspected_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["pmi_reports"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "pmi_reports_job_card_id_fkey"; columns: ["job_card_id"]; isOneToOne: false; referencedRelation: "job_cards"; referencedColumns: ["id"] }
        ];
      };
      dimension_reports: {
        Row: {
          id: string; job_card_id: string;
          // Legacy JSONB fields (kept for backward compat — do not remove)
          required_dimensions: Record<string, unknown>; tolerances: Record<string, unknown>; sample_readings: Record<string, unknown>; overall_result: "pass" | "fail" | null; instrument_used: string | null; visual_result: string | null; inspected_by: string | null; approved_by_name: string | null; doc_url: string | null; created_by: string | null; created_at: string; instrument_master_id: string | null; storage_path: string | null;
          // Phase 7 header fields
          report_number: string | null; report_date: string | null; vendor_name: string | null; description: string | null; drawing_number: string | null; drawing_revision: string | null; po_number: string | null; material_code: string | null; sample_number: string | null; heat_number: string | null; mp_dp_number: string | null;
          // Phase 7 inspection fields
          visual_satisfactory: boolean | null; gauge_used: string | null; approved_by: string | null;
          // Phase 7 lifecycle
          dimension_status: "draft" | "approved" | "rejected" | "submitted"; result_status: "accepted" | "rejected" | "hold" | null; generated_pdf_path: string | null; submitted_to_customer: boolean; submitted_at: string | null; approved_at: string | null; rejection_reason: string | null;
          // Phase 7 canonical dimension rows
          dimensions: Record<string, unknown>[] | null;
          // Machining details
          machine_name: string | null; operator: string | null; drawing_size: string | null;
          weld_deposit_thickness_before: string | null; weld_deposit_thickness_after: string | null;
        };
        Insert: {
          id?: string; job_card_id: string;
          required_dimensions?: Record<string, unknown>; tolerances?: Record<string, unknown>; sample_readings?: Record<string, unknown>; overall_result?: "pass" | "fail"; instrument_used?: string | null; visual_result?: string | null; inspected_by?: string | null; approved_by_name?: string | null; doc_url?: string | null; created_by?: string | null; created_at?: string; instrument_master_id?: string | null; storage_path?: string | null;
          report_number?: string | null; report_date?: string | null; vendor_name?: string | null; description?: string | null; drawing_number?: string | null; drawing_revision?: string | null; po_number?: string | null; material_code?: string | null; sample_number?: string | null; heat_number?: string | null; mp_dp_number?: string | null;
          visual_satisfactory?: boolean | null; gauge_used?: string | null; approved_by?: string | null;
          dimension_status?: "draft" | "approved" | "rejected" | "submitted"; result_status?: "accepted" | "rejected" | "hold" | null; generated_pdf_path?: string | null; submitted_to_customer?: boolean; submitted_at?: string | null; approved_at?: string | null; rejection_reason?: string | null;
          dimensions?: Record<string, unknown>[] | null;
          machine_name?: string | null; operator?: string | null; drawing_size?: string | null;
          weld_deposit_thickness_before?: string | null; weld_deposit_thickness_after?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["dimension_reports"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "dimension_reports_job_card_id_fkey"; columns: ["job_card_id"]; isOneToOne: false; referencedRelation: "job_cards"; referencedColumns: ["id"] }
        ];
      };
      process_executions: {
        Row: { id: string; job_card_id: string; process_type: ProcessType; welder_name: string | null; amps_required: string | null; volts_required: string | null; amps_actual: number | null; volts_actual: number | null; travel_speed: number | null; gas_flow_rate: number | null; pre_heat_temp: number | null; inter_pass_temp: number | null; weld_height: number | null; polarity: string | null; consumable_batch: string | null; notes: string | null; assigned_to: string | null; started_at: string | null; completed_at: string | null; status: ExecutionStatus; consumable_master_id: string | null; weld_date: string | null; post_heat_temp: number | null; consumable_feed_rate: number | null; weld_metal: string | null; weld_qty_actual: number | null; welder_id: string | null; weld_qty_planned: number | null; pre_heat_temp_planned: number | null; inter_pass_temp_planned: number | null; post_heat_temp_planned: number | null; travel_speed_planned: number | null; gas_flow_rate_planned: number | null; consumable_feed_rate_planned: number | null; polarity_planned: string | null; operation_type: OperationType | null; sequence_no: number | null; machine_id: string | null; planned_qty: number | null; completed_qty: number | null; rejected_qty: number | null; override_by: string | null; override_reason: string | null };
        Insert: { id?: string; job_card_id: string; process_type: ProcessType; welder_name?: string | null; amps_required?: string | null; volts_required?: string | null; amps_actual?: number | null; volts_actual?: number | null; travel_speed?: number | null; gas_flow_rate?: number | null; pre_heat_temp?: number | null; inter_pass_temp?: number | null; weld_height?: number | null; polarity?: string | null; consumable_batch?: string | null; notes?: string | null; assigned_to?: string | null; started_at?: string | null; completed_at?: string | null; status?: ExecutionStatus; consumable_master_id?: string | null; weld_date?: string | null; post_heat_temp?: number | null; consumable_feed_rate?: number | null; weld_metal?: string | null; weld_qty_actual?: number | null; welder_id?: string | null; weld_qty_planned?: number | null; pre_heat_temp_planned?: number | null; inter_pass_temp_planned?: number | null; post_heat_temp_planned?: number | null; travel_speed_planned?: number | null; gas_flow_rate_planned?: number | null; consumable_feed_rate_planned?: number | null; polarity_planned?: string | null; operation_type?: OperationType | null; sequence_no?: number | null; machine_id?: string | null; planned_qty?: number | null; completed_qty?: number | null; rejected_qty?: number | null; override_by?: string | null; override_reason?: string | null };
        Update: Partial<Database["public"]["Tables"]["process_executions"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "process_executions_consumable_master_id_fkey"; columns: ["consumable_master_id"]; isOneToOne: false; referencedRelation: "consumable_master"; referencedColumns: ["id"] },
          { foreignKeyName: "process_executions_machine_id_fkey"; columns: ["machine_id"]; isOneToOne: false; referencedRelation: "machines"; referencedColumns: ["id"] }
        ];
      };
      pwht_runs: {
        Row: { id: string; chart_number: string; furnace_id: string; operator_name: string; loading_temp: number; soaking_temp: number; soaking_time: number; rate_of_heating: number; date_of_cycle: string; doc_url: string | null; created_by: string | null; created_at: string; unloading_temp: number | null; cooling_method: CoolingMethod | null; pwht_result: "pass" | "fail" | null; storage_path: string | null; approval_status: PwhtApprovalStatus; approved_by: string | null; approved_at: string | null; rejected_by: string | null; rejected_at: string | null; rejection_reason: string | null; submitted_by: string | null; submitted_at: string | null; submitted_to_customer: boolean; submitted_to_customer_at: string | null; component_identification: string | null; wps_number: string | null; cycle_start: string | null; cycle_end: string | null; rate_of_cooling: number | null; notes: string | null; process_name: string | null; loading_time: number | null; unloading_time: number | null };
        Insert: { id?: string; chart_number: string; furnace_id: string; operator_name: string; loading_temp: number; soaking_temp: number; soaking_time: number; rate_of_heating: number; date_of_cycle: string; doc_url?: string | null; created_by?: string | null; created_at?: string; unloading_temp?: number | null; cooling_method?: CoolingMethod | null; pwht_result?: "pass" | "fail" | null; storage_path?: string | null; approval_status?: PwhtApprovalStatus; approved_by?: string | null; approved_at?: string | null; rejected_by?: string | null; rejected_at?: string | null; rejection_reason?: string | null; submitted_by?: string | null; submitted_at?: string | null; submitted_to_customer?: boolean; submitted_to_customer_at?: string | null; component_identification?: string | null; wps_number?: string | null; cycle_start?: string | null; cycle_end?: string | null; rate_of_cooling?: number | null; notes?: string | null; process_name?: string | null; loading_time?: number | null; unloading_time?: number | null };
        Update: Partial<Database["public"]["Tables"]["pwht_runs"]["Insert"]>;
        Relationships: [];
      };
      pwht_chart_readings: {
        Row: { id: string; pwht_run_id: string; channel: string; recorded_at: string; temperature_c: number; source: "manual" | "import"; created_by: string | null; created_at: string };
        Insert: { id?: string; pwht_run_id: string; channel?: string; recorded_at: string; temperature_c: number; source?: "manual" | "import"; created_by?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["pwht_chart_readings"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "pwht_chart_readings_pwht_run_id_fkey"; columns: ["pwht_run_id"]; isOneToOne: false; referencedRelation: "pwht_runs"; referencedColumns: ["id"] }
        ];
      };
      pwht_run_jobs: {
        Row: { id: string; pwht_run_id: string; job_card_id: string; status: PwhtJobStatus; is_final: boolean };
        Insert: { id?: string; pwht_run_id: string; job_card_id: string; status?: PwhtJobStatus; is_final?: boolean };
        Update: Partial<Database["public"]["Tables"]["pwht_run_jobs"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "pwht_run_jobs_pwht_run_id_fkey"; columns: ["pwht_run_id"]; isOneToOne: false; referencedRelation: "pwht_runs"; referencedColumns: ["id"] },
          { foreignKeyName: "pwht_run_jobs_job_card_id_fkey"; columns: ["job_card_id"]; isOneToOne: false; referencedRelation: "job_cards"; referencedColumns: ["id"] }
        ];
      };
      dispatches: {
        Row: { id: string; job_card_id: string; dc_number: string; dispatch_date: string; vehicle_details: string | null; remarks: string | null; doc_url: string | null; created_by: string | null; created_at: string; storage_path: string | null };
        Insert: { id?: string; job_card_id: string; dc_number: string; dispatch_date: string; vehicle_details?: string | null; remarks?: string | null; doc_url?: string | null; created_by?: string | null; created_at?: string; storage_path?: string | null };
        Update: Partial<Database["public"]["Tables"]["dispatches"]["Insert"]>;
        Relationships: [];
      };
      accounts: {
        Row: { id: string; job_card_id: string; po_number: string | null; po_value: number | null; invoice_number: string | null; invoice_date: string | null; invoice_value: number | null; grn_status: GrnStatus; grn_date: string | null; payment_status: PaymentStatus; payment_date: string | null; payment_amount: number | null; due_date: string | null; tally_reference: string | null; notes: string | null; updated_by: string | null; updated_at: string };
        Insert: { id?: string; job_card_id: string; po_number?: string | null; po_value?: number | null; invoice_number?: string | null; invoice_date?: string | null; invoice_value?: number | null; grn_status?: GrnStatus; grn_date?: string | null; payment_status?: PaymentStatus; payment_date?: string | null; payment_amount?: number | null; due_date?: string | null; tally_reference?: string | null; notes?: string | null; updated_by?: string | null; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["accounts"]["Insert"]>;
        Relationships: [];
      };
      alerts: {
        Row: { id: string; job_card_id: string; alert_type: string; stage: string; hours_overdue: number; sent_at: string; acknowledged_at: string | null; acknowledged_by: string | null };
        Insert: { id?: string; job_card_id: string; alert_type: string; stage: string; hours_overdue: number; sent_at?: string; acknowledged_at?: string | null; acknowledged_by?: string | null };
        Update: Partial<Database["public"]["Tables"]["alerts"]["Insert"]>;
        Relationships: [];
      };
      audit_log: {
        Row: { id: number; entity_type: string; entity_id: string; action: string; old_value: Record<string, unknown> | null; new_value: Record<string, unknown> | null; performed_by: string | null; performed_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };

      // ── Phase 1 — new master tables ──────────────────────────────────────
      wps_master: {
        Row: {
          id: string; wps_no: string; pqr_no: string | null;
          welding_process: string | null; type: string | null; scope: string | null;
          joint_design: string | null; base_material: string | null;
          filler_material: string | null; filler_aws_class: string | null; filler_size: string | null;
          position: string | null; preheat_min: number | null; interpass_max: number | null;
          pwht_required: boolean;
          pwht_temp_min: number | null; pwht_temp_max: number | null; pwht_time_range: string | null;
          gas_json: Record<string, unknown> | null;
          electrical_params_json: Record<string, unknown> | null;
          technique_json: Record<string, unknown> | null;
          approved_by: string | null; reviewed_by: string | null;
          revision: string; effective_date: string | null;
          status: WpsMasterStatus; notes: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; wps_no: string; pqr_no?: string | null;
          welding_process?: string | null; type?: string | null; scope?: string | null;
          joint_design?: string | null; base_material?: string | null;
          filler_material?: string | null; filler_aws_class?: string | null; filler_size?: string | null;
          position?: string | null; preheat_min?: number | null; interpass_max?: number | null;
          pwht_required?: boolean;
          pwht_temp_min?: number | null; pwht_temp_max?: number | null; pwht_time_range?: string | null;
          gas_json?: Record<string, unknown> | null;
          electrical_params_json?: Record<string, unknown> | null;
          technique_json?: Record<string, unknown> | null;
          approved_by?: string | null; reviewed_by?: string | null;
          revision?: string; effective_date?: string | null;
          status?: WpsMasterStatus; notes?: string | null;
          created_by?: string | null; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["wps_master"]["Insert"]>;
        Relationships: [];
      };
      consumable_master: {
        Row: {
          id: string; brand: string; product_name: string;
          aws_class: string | null; size: string | null; type: ConsumableType;
          manufacturer: string | null; notes: string | null;
          batch_no: string | null; manufacturing_date: string | null; expiry_date: string | null;
          is_active: boolean; created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; brand: string; product_name: string;
          aws_class?: string | null; size?: string | null; type: ConsumableType;
          manufacturer?: string | null; notes?: string | null;
          batch_no?: string | null; manufacturing_date?: string | null; expiry_date?: string | null;
          is_active?: boolean; created_by?: string | null; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["consumable_master"]["Insert"]>;
        Relationships: [];
      };
      machines: {
        Row: {
          id: string; machine_code: string; name: string; category: MachineCategory;
          location: string | null; is_active: boolean; notes: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; machine_code: string; name: string; category: MachineCategory;
          location?: string | null; is_active?: boolean; notes?: string | null;
          created_by?: string | null; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["machines"]["Insert"]>;
        Relationships: [];
      };
      chemical_master: {
        Row: {
          id: string; chemical_name: string; manufacturer: string | null;
          type: ChemicalType; notes: string | null;
          batch_no: string | null; expiry_date: string | null;
          is_active: boolean; created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; chemical_name: string; manufacturer?: string | null;
          type: ChemicalType; notes?: string | null;
          batch_no?: string | null; expiry_date?: string | null;
          is_active?: boolean; created_by?: string | null; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chemical_master"]["Insert"]>;
        Relationships: [];
      };
      instrument_master: {
        Row: {
          id: string; instrument_name: string; instrument_type: InstrumentType;
          serial_number: string | null; manufacturer: string | null;
          calibration_due: string | null;
          calibration_cert_url: string | null; calibration_storage_path: string | null;
          is_active: boolean; created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; instrument_name: string; instrument_type: InstrumentType;
          serial_number?: string | null; manufacturer?: string | null;
          calibration_due?: string | null;
          calibration_cert_url?: string | null; calibration_storage_path?: string | null;
          is_active?: boolean; created_by?: string | null; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["instrument_master"]["Insert"]>;
        Relationships: [];
      };
      nde_records: {
        Row: {
          id: string; job_card_id: string; nde_type: NdeType;
          procedure_ref: string | null;
          type_of_penetrant: string | null; stage_of_test: string | null;
          penetrant_application: string | null; penetrant_removal: string | null;
          penetrant_dwell_time: number | null;
          developer_application: string | null; developer_dwell_time: number | null;
          post_cleaning: string | null; surface_condition: string | null;
          temperature_of_part: number | null;
          evaluation: string | null; result: NdeResult;
          chemical_1_id: string | null; chemical_2_id: string | null;
          chemical_3_id: string | null; chemical_4_id: string | null;
          report_number: string | null; inspected_by: string | null; inspection_date: string | null;
          notes: string | null; created_by: string | null; created_at: string;
          test_coupon_number: string | null; deposit_thickness: string | null;
          hardness_requirement: string | null; nde_number: string | null;
          duration: string | null; observer: string | null;
          chemicals_used_json: Record<string, unknown>[] | null;
        };
        Insert: {
          id?: string; job_card_id: string; nde_type: NdeType;
          procedure_ref?: string | null;
          type_of_penetrant?: string | null; stage_of_test?: string | null;
          penetrant_application?: string | null; penetrant_removal?: string | null;
          penetrant_dwell_time?: number | null;
          developer_application?: string | null; developer_dwell_time?: number | null;
          post_cleaning?: string | null; surface_condition?: string | null;
          temperature_of_part?: number | null;
          evaluation?: string | null; result?: NdeResult;
          chemical_1_id?: string | null; chemical_2_id?: string | null;
          chemical_3_id?: string | null; chemical_4_id?: string | null;
          report_number?: string | null; inspected_by?: string | null; inspection_date?: string | null;
          notes?: string | null; created_by?: string | null; created_at?: string;
          test_coupon_number?: string | null; deposit_thickness?: string | null;
          hardness_requirement?: string | null; nde_number?: string | null;
          duration?: string | null; observer?: string | null;
          chemicals_used_json?: Record<string, unknown>[] | null;
        };
        Update: Partial<Database["public"]["Tables"]["nde_records"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "nde_records_job_card_id_fkey"; columns: ["job_card_id"]; isOneToOne: false; referencedRelation: "job_cards"; referencedColumns: ["id"] }
        ];
      };
      air_test_records: {
        Row: {
          id: string; job_card_id: string;
          tester_name: string | null; pressure: string | null; duration: string | null;
          result: "pending" | "pass" | "fail";
          notes: string | null; created_by: string | null; created_at: string;
        };
        Insert: {
          id?: string; job_card_id: string;
          tester_name?: string | null; pressure?: string | null; duration?: string | null;
          result?: "pending" | "pass" | "fail";
          notes?: string | null; created_by?: string | null; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["air_test_records"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "air_test_records_job_card_id_fkey"; columns: ["job_card_id"]; isOneToOne: false; referencedRelation: "job_cards"; referencedColumns: ["id"] }
        ];
      };
      overlay_welding_reports: {
        Row: {
          id: string; job_card_id: string;
          report_number: string | null; report_date: string | null;
          vendor_name: string | null; vendor_number: string | null; customer_name: string | null;
          po_number: string | null; nbdn_number: string | null; material_code: string | null;
          drawing_number: string | null; wps_number: string | null; item_description: string | null;
          quantity: string | null; base_material_grade: string | null; heat_number: string | null;
          test_coupon_number: string | null; dimension_report_number: string | null;
          welder_name: string | null; visual_examination: string | null; process: string | null;
          job_card_number: string | null; job_card_date: string | null;
          deposit_material: string | null; aws_class_number: string | null;
          consumable_make: string | null; consumable_batch_number: string | null;
          date_of_welding: string | null; heat_treatment_chart_number: string | null;
          hardness_required: string | null; hardness_actual: string | null;
          deposit_thickness_condition: string | null; deposit_thickness_required: string | null; deposit_thickness_actual: string | null;
          lpt_procedure_ref: string | null; type_of_penetrant: string | null; stage_of_test: string | null;
          penetrant_application: string | null; penetrant_removal: string | null; evaluation_of_dp_test: string | null;
          temperature_of_part: string | null; penetrant_dwell_time: string | null; surface_condition: string | null;
          developer_application: string | null; post_cleaning: string | null; developer_dwell_time: string | null;
          chemicals_used_json: Record<string, unknown>[] | null; result_status: "accepted" | "rejected" | "hold" | null;
          remarks: string | null; inspected_by: string | null; approved_by: string | null; rejection_reason: string | null;
          report_status: "draft" | "approved" | "rejected" | "submitted";
          generated_pdf_path: string | null; submitted_to_customer: boolean; submitted_at: string | null; approved_at: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; job_card_id: string;
          report_number?: string | null; report_date?: string | null;
          vendor_name?: string | null; vendor_number?: string | null; customer_name?: string | null;
          po_number?: string | null; nbdn_number?: string | null; material_code?: string | null;
          drawing_number?: string | null; wps_number?: string | null; item_description?: string | null;
          quantity?: string | null; base_material_grade?: string | null; heat_number?: string | null;
          test_coupon_number?: string | null; dimension_report_number?: string | null;
          welder_name?: string | null; visual_examination?: string | null; process?: string | null;
          job_card_number?: string | null; job_card_date?: string | null;
          deposit_material?: string | null; aws_class_number?: string | null;
          consumable_make?: string | null; consumable_batch_number?: string | null;
          date_of_welding?: string | null; heat_treatment_chart_number?: string | null;
          hardness_required?: string | null; hardness_actual?: string | null;
          deposit_thickness_condition?: string | null; deposit_thickness_required?: string | null; deposit_thickness_actual?: string | null;
          lpt_procedure_ref?: string | null; type_of_penetrant?: string | null; stage_of_test?: string | null;
          penetrant_application?: string | null; penetrant_removal?: string | null; evaluation_of_dp_test?: string | null;
          temperature_of_part?: string | null; penetrant_dwell_time?: string | null; surface_condition?: string | null;
          developer_application?: string | null; post_cleaning?: string | null; developer_dwell_time?: string | null;
          chemicals_used_json?: Record<string, unknown>[] | null; result_status?: "accepted" | "rejected" | "hold" | null;
          remarks?: string | null; inspected_by?: string | null; approved_by?: string | null; rejection_reason?: string | null;
          report_status?: "draft" | "approved" | "rejected" | "submitted";
          generated_pdf_path?: string | null; submitted_to_customer?: boolean; submitted_at?: string | null; approved_at?: string | null;
          created_by?: string | null; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["overlay_welding_reports"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "overlay_welding_reports_job_card_id_fkey"; columns: ["job_card_id"]; isOneToOne: false; referencedRelation: "job_cards"; referencedColumns: ["id"] }
        ];
      };
      documents: {
        Row: {
          id: string; entity_type: DocumentEntityType; entity_id: string;
          document_type: DocumentType; storage_path: string;
          file_name: string; file_size: number | null; mime_type: string | null;
          version: number; is_active: boolean; is_latest: boolean;
          job_card_id: string | null;
          document_category: "uploaded" | "generated";
          document_name: string | null;
          source_module: string | null;
          metadata_json: Record<string, unknown> | null;
          approval_status: "none" | "pending" | "approved" | "rejected";
          notes: string | null;
          uploaded_by: string | null; uploaded_at: string;
        };
        Insert: {
          id?: string; entity_type: DocumentEntityType; entity_id: string;
          document_type: DocumentType; storage_path: string;
          file_name: string; file_size?: number | null; mime_type?: string | null;
          version?: number; is_active?: boolean; is_latest?: boolean;
          job_card_id?: string | null;
          document_category?: "uploaded" | "generated";
          document_name?: string | null;
          source_module?: string | null;
          metadata_json?: Record<string, unknown> | null;
          approval_status?: "none" | "pending" | "approved" | "rejected";
          notes?: string | null;
          uploaded_by?: string | null; uploaded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "documents_job_card_id_fkey"; columns: ["job_card_id"]; isOneToOne: false; referencedRelation: "job_cards"; referencedColumns: ["id"] }
        ];
      };
      customer_dossiers: {
        Row: {
          id: string; job_card_id: string;
          dossier_number: string; dossier_date: string;
          customer_name: string | null; po_number: string | null; nbdn_number: string | null;
          drawing_number: string | null; heat_number: string | null;
          prepared_by: string | null; approved_by: string | null; remarks: string | null;
          status: "draft" | "generated" | "submitted" | "archived";
          generated_index_pdf_path: string | null; generated_zip_path: string | null;
          submitted_to_customer: boolean; submitted_at: string | null; submitted_by: string | null;
          email_sent_to: string | null; email_sent_at: string | null; email_sent_by: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; job_card_id: string;
          dossier_number: string; dossier_date: string;
          customer_name?: string | null; po_number?: string | null; nbdn_number?: string | null;
          drawing_number?: string | null; heat_number?: string | null;
          prepared_by?: string | null; approved_by?: string | null; remarks?: string | null;
          status?: "draft" | "generated" | "submitted" | "archived";
          generated_index_pdf_path?: string | null; generated_zip_path?: string | null;
          submitted_to_customer?: boolean; submitted_at?: string | null; submitted_by?: string | null;
          email_sent_to?: string | null; email_sent_at?: string | null; email_sent_by?: string | null;
          created_by?: string | null; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customer_dossiers"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "customer_dossiers_job_card_id_fkey"; columns: ["job_card_id"]; isOneToOne: false; referencedRelation: "job_cards"; referencedColumns: ["id"] }
        ];
      };
      customer_dossier_documents: {
        Row: {
          id: string; dossier_id: string; document_id: string;
          document_type: string | null; document_name: string | null;
          version: number | null; sort_order: number; included: boolean;
          created_at: string;
        };
        Insert: {
          id?: string; dossier_id: string; document_id: string;
          document_type?: string | null; document_name?: string | null;
          version?: number | null; sort_order?: number; included?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customer_dossier_documents"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "customer_dossier_documents_dossier_id_fkey"; columns: ["dossier_id"]; isOneToOne: false; referencedRelation: "customer_dossiers"; referencedColumns: ["id"] },
          { foreignKeyName: "customer_dossier_documents_document_id_fkey"; columns: ["document_id"]; isOneToOne: false; referencedRelation: "documents"; referencedColumns: ["id"] }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      generate_jc_number: { Args: Record<string, never>; Returns: string };
      seed_process_operations: { Args: { p_job_card_id: string }; Returns: number };
      job_card_gate_blockers: {
        Args: { p_job_card_id: string; p_new_status: string };
        Returns: string[];
      };
      job_card_payment_blocker: {
        Args: { p_job_card_id: string };
        Returns: string | null;
      };
      log_admin_action: {
        Args: {
          p_entity_type: string;
          p_entity_id: string;
          p_action: string;
          p_payload?: Record<string, unknown>;
        };
        Returns: undefined;
      };
      log_document_dispatch: {
        Args: {
          p_entity_type: string;
          p_entity_id: string;
          p_payload?: Record<string, unknown>;
        };
        Returns: undefined;
      };
      instruments_expiring_soon: {
        Args: { days_ahead?: number };
        Returns: unknown[];
      };
    };
    Enums: {
      user_role: UserRole;
      job_card_status: JobCardStatus;
      process_type: ProcessType;
      approval_status: ApprovalStatus;
    };
  };
}

// ── Convenience row types — existing ──────────────────────────────────────
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type JobCard = Database["public"]["Tables"]["job_cards"]["Row"];
export type WpsQualification = Database["public"]["Tables"]["wps_qualifications"]["Row"];
export type ProcessExecution = Database["public"]["Tables"]["process_executions"]["Row"];
export type PwhtRun = Database["public"]["Tables"]["pwht_runs"]["Row"];
export type PwhtChartReading = Database["public"]["Tables"]["pwht_chart_readings"]["Row"];
export type Dispatch = Database["public"]["Tables"]["dispatches"]["Row"];
export type Accounts = Database["public"]["Tables"]["accounts"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_log"]["Row"];

// ── PMI readings structured type (stored as JSONB in pmi_reports.readings) ──
export type PmiReadingRow = {
  reading_no: number
  ni: number | null
  cr: number | null
  mo: number | null
  fe: number | null
  nb: number | null
  ti: number | null
}

export type PmiLocation = {
  location_name: string
  heat_no: string | null
  items: PmiReadingRow[]
}

export type PmiReadings = PmiLocation[]

// ── Convenience row types — Phase 1 new ──────────────────────────────────
export type WpsMaster = Database["public"]["Tables"]["wps_master"]["Row"];
export type ConsumableMaster = Database["public"]["Tables"]["consumable_master"]["Row"];
export type ChemicalMaster = Database["public"]["Tables"]["chemical_master"]["Row"];
export type InstrumentMaster = Database["public"]["Tables"]["instrument_master"]["Row"];
export type Machine = Database["public"]["Tables"]["machines"]["Row"];
export type NdeRecord = Database["public"]["Tables"]["nde_records"]["Row"];
export type AirTestRecord = Database["public"]["Tables"]["air_test_records"]["Row"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type PmiReport = Database["public"]["Tables"]["pmi_reports"]["Row"];

// ── Composite types for views ─────────────────────────────────────────────
export type JobCardWithRelations = JobCard & {
  client: Pick<Client, "id" | "name">;
  creator: Pick<Profile, "id" | "full_name"> | null;
};

export type JobCardDetail = JobCard & {
  client: Client;
  creator: Pick<Profile, "id" | "full_name"> | null;
  wps_qualifications: WpsQualification[];
  process_executions: ProcessExecution[];
  dispatches: Dispatch[];
  accounts: Accounts | null;
  previous_status: JobCardStatus | null;
};

export type WpsQualificationWithMaster = WpsQualification & {
  wps_master: Pick<WpsMaster, "id" | "wps_no" | "revision" | "status"> | null;
};

export type NdeRecordWithChemicals = NdeRecord & {
  chemical_1: Pick<ChemicalMaster, "id" | "chemical_name" | "type"> | null;
  chemical_2: Pick<ChemicalMaster, "id" | "chemical_name" | "type"> | null;
  chemical_3: Pick<ChemicalMaster, "id" | "chemical_name" | "type"> | null;
  chemical_4: Pick<ChemicalMaster, "id" | "chemical_name" | "type"> | null;
};

export type ProcessExecutionWithConsumable = ProcessExecution & {
  consumable: Pick<ConsumableMaster, "id" | "brand" | "product_name" | "aws_class" | "size" | "batch_no" | "manufacturing_date" | "expiry_date"> | null;
};

export type PwhtRunJob = Database["public"]["Tables"]["pwht_run_jobs"]["Row"];
export type PwhtRunJobWithRun = PwhtRunJob & { pwht_run: PwhtRun };

export type WpsMasterSummary = Pick<
  WpsMaster,
  "id" | "wps_no" | "pqr_no" | "welding_process" | "filler_material" | "filler_aws_class" |
  "filler_size" | "preheat_min" | "interpass_max" | "pwht_required" |
  "pwht_temp_min" | "pwht_temp_max" | "electrical_params_json" | "revision" | "status"
>;

// ── Phase 7 — Dimension Report ───────────────────────────────────────────────
export type DimensionReport = Database["public"]["Tables"]["dimension_reports"]["Row"];

export type DimensionStatus = "draft" | "approved" | "rejected" | "submitted";
export type DimensionResultStatus = "accepted" | "rejected" | "hold";

// Canonical dimension row stored as JSONB array in dimension_reports.dimensions
export type DimensionRow = {
  dimension_name:     string
  required_dimension: string
  tolerance:          string
  actual_value_1:     string
  actual_value_2:     string
  actual_value_3:     string
  pass_fail:          "pass" | "fail" | "na"
  remarks:            string
}

// ── Phase 8 — Overlay Welding Report ────────────────────────────────────────
export type OverlayReport = Database["public"]["Tables"]["overlay_welding_reports"]["Row"];
export type OverlayReportStatus = "draft" | "approved" | "rejected" | "submitted";

// Chemical entry stored as JSONB array in overlay_welding_reports.chemicals_used_json
export type OverlayChemicalEntry = {
  chemical_type: string   // e.g. "cleaner" | "penetrant" | "developer" | "remover"
  chemical_name: string
  manufacturer:  string
  batch_no:      string
  expiry_date:   string
}

// ── Phase 10 — Customer Submission Dossier ───────────────────────────────────
export type CustomerDossier = Database["public"]["Tables"]["customer_dossiers"]["Row"];
export type DossierStatus = "draft" | "generated" | "submitted" | "archived";
export type DossierDocument = Database["public"]["Tables"]["customer_dossier_documents"]["Row"];
export type DossierWithDocuments = CustomerDossier & {
  customer_dossier_documents: (DossierDocument & { document: Document })[];
};
