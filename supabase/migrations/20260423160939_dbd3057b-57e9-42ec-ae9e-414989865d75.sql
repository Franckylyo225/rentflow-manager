ALTER TABLE public.patrimony_assets 
  ADD COLUMN city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL;

CREATE INDEX idx_patrimony_assets_city_id ON public.patrimony_assets(city_id);