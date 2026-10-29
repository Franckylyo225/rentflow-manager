ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_unit_id_fkey
  FOREIGN KEY (unit_id) REFERENCES public.units(id)
  ON DELETE SET NULL;