-- Development seed: initial category tree. Safe to re-run (ON CONFLICT DO NOTHING).
insert into public.categories (name, slug, description, display_order, seo_title) values
  ('Marble', 'marble', 'Natural marble slabs, tiles and blocks', 10, 'Marble Suppliers & Exporters'),
  ('Granite', 'granite', 'Granite slabs, tiles and countertops', 20, 'Granite Suppliers & Exporters'),
  ('Sandstone', 'sandstone', 'Sandstone paving, cladding and carvings', 30, 'Sandstone Suppliers'),
  ('Limestone', 'limestone', 'Limestone tiles, slabs and blocks', 40, 'Limestone Suppliers'),
  ('Quartzite', 'quartzite', 'Quartzite slabs and surfaces', 50, 'Quartzite Suppliers'),
  ('Slate', 'slate', 'Slate roofing, flooring and cladding', 60, 'Slate Suppliers'),
  ('Travertine', 'travertine', 'Travertine tiles and slabs', 70, 'Travertine Suppliers'),
  ('Onyx', 'onyx', 'Onyx slabs and decorative panels', 80, 'Onyx Suppliers'),
  ('Semi-Precious Stones', 'semi-precious-stones', 'Semi-precious stone products and inlay', 90, 'Semi-Precious Stone Suppliers'),
  ('Natural Stone Slabs', 'natural-stone-slabs', 'Polished and honed natural stone slabs', 100, 'Natural Stone Slabs'),
  ('Stone Tiles', 'stone-tiles', 'Natural stone tiles for floors and walls', 110, 'Stone Tiles'),
  ('Stone Blocks', 'stone-blocks', 'Raw stone blocks from quarries', 120, 'Stone Blocks'),
  ('Decorative Stone', 'decorative-stone', 'Decorative and landscaping stone', 130, 'Decorative Stone'),
  ('Custom Stone Products', 'custom-stone-products', 'Made-to-order stone products', 140, 'Custom Stone Products')
on conflict (slug) do nothing;
