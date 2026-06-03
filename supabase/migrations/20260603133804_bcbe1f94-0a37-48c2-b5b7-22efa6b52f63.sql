ALTER TABLE public.patrimony_assets
  ADD COLUMN IF NOT EXISTS block_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS plot_number  text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_patrimony_assets_block_plot
  ON public.patrimony_assets (organization_id, block_number, plot_number);