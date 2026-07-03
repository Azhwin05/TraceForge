-- ⚠️ DO NOT RUN — SUPERSEDED / NEVER APPLIED. See supabase/MIGRATION_STATE.md.
-- This file contains invalid SQL: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS (...)`
-- (the multi-column parenthesised form is not valid Postgres) and an index on a
-- non-existent `pwht_runs.job_card_id`. The PWHT approval workflow it intended was
-- applied correctly, idempotently, by the live 2026-07-02
-- `enterprise_gates_pwht_chart_recorder` migration instead.
--
-- Phase 1: PWHT Approval Workflow
-- Adds formal approval workflow to heat treatment records

-- 1. Add approval workflow fields to pwht_runs
ALTER TABLE pwht_runs ADD COLUMN IF NOT EXISTS (
  approval_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (approval_status IN ('draft', 'submitted', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  submitted_to_customer BOOLEAN NOT NULL DEFAULT false,
  submitted_to_customer_at TIMESTAMPTZ
);

-- 2. Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pwht_runs_status ON public.pwht_runs(approval_status);
CREATE INDEX IF NOT EXISTS idx_pwht_runs_job_status ON public.pwht_runs(job_card_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_pwht_runs_submitted_to_customer ON public.pwht_runs(submitted_to_customer);

-- 3. Update RLS to allow QA to approve PWHT records
-- Note: Adjust these based on existing RLS strategy
DO $$
BEGIN
  -- Drop existing policies if any (idempotent)
  DROP POLICY IF EXISTS pwht_runs_qa_approve ON public.pwht_runs;
  DROP POLICY IF EXISTS pwht_runs_qa_update ON public.pwht_runs;
EXCEPTION WHEN UNDEFINED_OBJECT THEN
  NULL;
END $$;

-- Create new policies
CREATE POLICY pwht_runs_qa_approve ON public.pwht_runs
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('qa', 'admin')
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('qa', 'admin')
  );

CREATE POLICY pwht_runs_engineer_submit ON public.pwht_runs
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('engineer', 'admin')
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('engineer', 'admin')
  );

-- 4. Add trigger to prevent editing submitted-to-customer records
CREATE OR REPLACE FUNCTION prevent_modify_submitted_pwht()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.submitted_to_customer AND
     (NEW.approval_status IS DISTINCT FROM OLD.approval_status OR
      NEW.chart_number IS DISTINCT FROM OLD.chart_number OR
      NEW.furnace_id IS DISTINCT FROM OLD.furnace_id) THEN
    RAISE EXCEPTION 'Cannot modify heat treatment record after customer submission';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_modify_submitted_pwht ON public.pwht_runs;
CREATE TRIGGER trg_prevent_modify_submitted_pwht
  BEFORE UPDATE ON public.pwht_runs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_modify_submitted_pwht();

-- 5. Add trigger to set approval timestamps
CREATE OR REPLACE FUNCTION set_pwht_approval_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- When approved
  IF NEW.approval_status = 'approved' AND OLD.approval_status != 'approved' THEN
    NEW.approved_at = CURRENT_TIMESTAMP;
    NEW.approved_by = auth.uid();
  END IF;

  -- When rejected
  IF NEW.approval_status = 'rejected' AND OLD.approval_status != 'rejected' THEN
    NEW.rejected_at = CURRENT_TIMESTAMP;
    NEW.rejected_by = auth.uid();
  END IF;

  -- When submitted
  IF NEW.approval_status = 'submitted' AND OLD.approval_status != 'submitted' THEN
    NEW.submitted_at = CURRENT_TIMESTAMP;
    NEW.submitted_by = auth.uid();
  END IF;

  -- When submitted to customer
  IF NEW.submitted_to_customer AND NOT OLD.submitted_to_customer THEN
    NEW.submitted_to_customer_at = CURRENT_TIMESTAMP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_pwht_approval_timestamps ON public.pwht_runs;
CREATE TRIGGER trg_set_pwht_approval_timestamps
  BEFORE UPDATE ON public.pwht_runs
  FOR EACH ROW
  EXECUTE FUNCTION set_pwht_approval_timestamps();

-- 6. Add audit logging for PWHT approval
CREATE OR REPLACE FUNCTION log_pwht_approval_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status OR
     NEW.submitted_to_customer IS DISTINCT FROM OLD.submitted_to_customer THEN
    INSERT INTO public.audit_log (
      entity_type,
      entity_id,
      action,
      old_value,
      new_value,
      performed_by,
      performed_at
    ) VALUES (
      'pwht_run',
      NEW.id,
      'status_change',
      jsonb_build_object(
        'approval_status', OLD.approval_status,
        'submitted_to_customer', OLD.submitted_to_customer
      ),
      jsonb_build_object(
        'approval_status', NEW.approval_status,
        'submitted_to_customer', NEW.submitted_to_customer,
        'approved_by', NEW.approved_by,
        'rejection_reason', NEW.rejection_reason
      ),
      auth.uid(),
      CURRENT_TIMESTAMP
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_pwht_approval_change ON public.pwht_runs;
CREATE TRIGGER trg_log_pwht_approval_change
  AFTER UPDATE ON public.pwht_runs
  FOR EACH ROW
  EXECUTE FUNCTION log_pwht_approval_change();

-- Add comment
COMMENT ON COLUMN public.pwht_runs.approval_status IS 'Workflow state: draft (initial), submitted (ready for QA), approved (passed QA), rejected (needs revision)';
COMMENT ON COLUMN public.pwht_runs.submitted_to_customer IS 'Flag indicating PWHT record has been included in customer dossier and is locked from editing';
