ALTER TABLE public.patrimony_assets 
  ADD COLUMN receipt_order_number text DEFAULT '',
  ADD COLUMN title_creation_date date DEFAULT NULL;