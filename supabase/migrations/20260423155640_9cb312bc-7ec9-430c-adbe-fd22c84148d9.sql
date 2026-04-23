ALTER TABLE public.properties 
  ADD COLUMN patrimony_asset_id uuid UNIQUE REFERENCES public.patrimony_assets(id) ON DELETE SET NULL;

CREATE INDEX idx_properties_patrimony_asset ON public.properties(patrimony_asset_id);