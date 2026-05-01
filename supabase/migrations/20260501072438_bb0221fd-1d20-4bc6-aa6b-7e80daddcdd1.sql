
ALTER TABLE public.maintenance
  ADD COLUMN IF NOT EXISTS task_type text NOT NULL DEFAULT 'recurring',
  ADD COLUMN IF NOT EXISTS frequency_unit text NOT NULL DEFAULT 'days',
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;
