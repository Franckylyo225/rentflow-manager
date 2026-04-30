ALTER TABLE public.expenses ADD COLUMN unit_id UUID;
CREATE INDEX IF NOT EXISTS idx_expenses_unit_id ON public.expenses(unit_id);