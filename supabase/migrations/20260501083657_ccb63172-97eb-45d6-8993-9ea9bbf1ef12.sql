ALTER TABLE public.finances
  ADD COLUMN IF NOT EXISTS frequency_value integer,
  ADD COLUMN IF NOT EXISTS frequency_unit text NOT NULL DEFAULT 'days',
  ADD COLUMN IF NOT EXISTS last_paid_date date;

ALTER TABLE public.finances
  DROP CONSTRAINT IF EXISTS finances_frequency_unit_check;

ALTER TABLE public.finances
  ADD CONSTRAINT finances_frequency_unit_check
  CHECK (frequency_unit IN ('days', 'months'));