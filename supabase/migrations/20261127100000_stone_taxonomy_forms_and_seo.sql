-- =============================================================================
-- Migration: Stone Taxonomy, Product Forms, SEO Metadata & Safe Reassignment
-- =============================================================================
-- Non-destructive, idempotent migration:
--  1. Extends public.categories with is_featured and image_alt.
--  2. Creates public.product_forms and public.category_product_forms with RLS.
--  3. Extends public.products with form_id and form_attributes jsonb.
--  4. Upserts the 10 main stone categories, 22 Sandstone varieties, 4 Marble
--     subcategories, and preserves existing varieties for other categories.
--  5. Seeds product form eligibility (Articles enabled ONLY for the 9
--     client-approved Sandstone varieties by default).
--  6. Adds admin_reassign_category_products() RPC for safe product migration
--     prior to category/variety deletion.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend public.categories
-- ---------------------------------------------------------------------------
alter table public.categories
  add column if not exists is_featured boolean not null default false,
  add column if not exists image_alt text;

create index if not exists categories_featured_idx
  on public.categories (is_active, is_featured, display_order);

-- ---------------------------------------------------------------------------
-- 2. Create public.product_forms
-- ---------------------------------------------------------------------------
create table if not exists public.product_forms (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 60),
  name          text not null check (char_length(name) between 2 and 80),
  description   text,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint product_forms_slug_key unique (slug)
);

create index if not exists product_forms_active_order_idx
  on public.product_forms (is_active, display_order);

drop trigger if exists product_forms_set_updated_at on public.product_forms;
create trigger product_forms_set_updated_at
  before update on public.product_forms
  for each row execute function public.set_updated_at();

alter table public.product_forms enable row level security;
revoke all on table public.product_forms from public, anon, authenticated;
grant select on public.product_forms to anon, authenticated;
grant insert, update, delete on public.product_forms to authenticated;

drop policy if exists product_forms_select_active on public.product_forms;
create policy product_forms_select_active on public.product_forms
  for select to anon, authenticated
  using (is_active);

drop policy if exists product_forms_select_admin on public.product_forms;
create policy product_forms_select_admin on public.product_forms
  for select to authenticated
  using (public.is_admin());

drop policy if exists product_forms_admin_insert on public.product_forms;
create policy product_forms_admin_insert on public.product_forms
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists product_forms_admin_update on public.product_forms;
create policy product_forms_admin_update on public.product_forms
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists product_forms_admin_delete on public.product_forms;
create policy product_forms_admin_delete on public.product_forms
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Create public.category_product_forms (configurable form mapping)
-- ---------------------------------------------------------------------------
create table if not exists public.category_product_forms (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.categories (id) on delete cascade,
  form_id       uuid not null references public.product_forms (id) on delete cascade,
  is_enabled    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint category_product_forms_unique unique (category_id, form_id)
);

create index if not exists category_product_forms_cat_idx
  on public.category_product_forms (category_id, is_enabled, display_order);

drop trigger if exists category_product_forms_set_updated_at on public.category_product_forms;
create trigger category_product_forms_set_updated_at
  before update on public.category_product_forms
  for each row execute function public.set_updated_at();

alter table public.category_product_forms enable row level security;
revoke all on table public.category_product_forms from public, anon, authenticated;
grant select on public.category_product_forms to anon, authenticated;
grant insert, update, delete on public.category_product_forms to authenticated;

drop policy if exists category_product_forms_select_enabled on public.category_product_forms;
create policy category_product_forms_select_enabled on public.category_product_forms
  for select to anon, authenticated
  using (is_enabled);

drop policy if exists category_product_forms_select_admin on public.category_product_forms;
create policy category_product_forms_select_admin on public.category_product_forms
  for select to authenticated
  using (public.is_admin());

drop policy if exists category_product_forms_admin_insert on public.category_product_forms;
create policy category_product_forms_admin_insert on public.category_product_forms
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists category_product_forms_admin_update on public.category_product_forms;
create policy category_product_forms_admin_update on public.category_product_forms
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists category_product_forms_admin_delete on public.category_product_forms;
create policy category_product_forms_admin_delete on public.category_product_forms
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Extend public.products with form_id & form_attributes
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists form_id uuid references public.product_forms (id) on delete restrict,
  add column if not exists form_attributes jsonb not null default '{}'::jsonb;

create index if not exists products_form_idx
  on public.products (form_id);

create index if not exists products_form_attrs_idx
  on public.products using gin (form_attributes);

-- ---------------------------------------------------------------------------
-- 5. Safe product reassignment RPC for Admin before category/variety deletion
-- ---------------------------------------------------------------------------
create or replace function public.admin_reassign_category_products(
  _from_category_id uuid,
  _to_category_id   uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_moved integer := 0;
begin
  if not public.is_admin() then
    raise exception 'admin authorization required' using errcode = '42501';
  end if;

  if _from_category_id is null or _to_category_id is null or _from_category_id = _to_category_id then
    raise exception 'distinct source and target category IDs are required' using errcode = '22023';
  end if;

  if not exists (select 1 from public.categories where id = _to_category_id) then
    raise exception 'target category not found' using errcode = '22023';
  end if;

  update public.products
  set category_id = _to_category_id
  where category_id = _from_category_id;

  get diagnostics v_moved = row_count;

  perform public._write_audit_log(
    'category.products_reassigned',
    'category',
    _from_category_id,
    jsonb_build_object('to_category_id', _to_category_id, 'moved_count', v_moved)
  );

  return v_moved;
end;
$$;

revoke all on function public.admin_reassign_category_products(uuid, uuid) from public, anon;
grant execute on function public.admin_reassign_category_products(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Seed Product Forms (Slabs, Tiles, Blocks, Articles)
-- ---------------------------------------------------------------------------
insert into public.product_forms (slug, name, description, display_order, is_active) values
  ('slabs',    'Slabs',    'Gangsaw, cutter, and project-size natural stone slabs', 10, true),
  ('tiles',    'Tiles',    'Calibrated and uncalibrated flooring, wall cladding, and paving tiles', 20, true),
  ('blocks',   'Blocks',   'Quarry-extracted rough and dressed natural stone blocks', 30, true),
  ('articles', 'Articles', 'Carved stone artifacts, jaali, pillars, fountains, and architectural articles', 40, true)
on conflict (slug) do update set
  name          = excluded.name,
  description   = excluded.description,
  display_order = excluded.display_order,
  is_active     = true;

-- ---------------------------------------------------------------------------
-- 7. Upsert 10 Main Stone Categories (preserving existing IDs & relationships)
-- ---------------------------------------------------------------------------
insert into public.categories (
  parent_id, name, slug, description, image_url, image_alt, is_active, is_featured, display_order, seo_title, seo_description
) values
  (null, 'Sandstone',           'sandstone',           'Indian sandstone slabs, tiles, blocks, and carved architectural articles across 22 quarry varieties.', '/images/categories/sandstone.jpg',           'Natural Indian sandstone slabs and quarry stone surfaces', true, true, 10, 'Sandstone Suppliers & Exporters in India — 22 Varieties | StonesDekho', 'Source Agra Red, Dholpur Beige, Mint, Kandla Grey, Raj Green & 22 Indian sandstone varieties in slabs, tiles, blocks and carved articles.'),
  (null, 'Marble',              'marble',              'Indian White, Indian Colored, Englo Indian, and Imported Marble slabs, tiles, and blocks.',          '/images/categories/marble.jpg',              'Polished natural marble slabs from Indian and imported quarries', true, true, 20, 'Marble Suppliers & Exporters — Indian & Imported Marble | StonesDekho', 'Explore Indian White Marble, Indian Colored Marble, Englo Indian Marble and Imported Marble slabs, tiles and blocks from verified quarries.'),
  (null, 'Granite',             'granite',             'North India, South India, and Imported Granite slabs, tiles, and quarry blocks.',                 '/images/categories/granite.jpg',             'Natural granite slabs and quarry stone blocks', true, true, 30, 'Granite Suppliers & Exporters — Slabs, Tiles & Blocks | StonesDekho', 'Source Black Galaxy, Absolute Black, Tan Brown and North/South Indian granite directly from verified stone processors.'),
  (null, 'Onyx',                'onyx',                'Translucent Indian Onyx and Imported Onyx slabs, backlit panels, tiles, and blocks.',            '/images/categories/onyx.jpg',                'Translucent natural onyx stone slabs', true, true, 40, 'Onyx Stone Suppliers — Translucent Slabs & Tiles | StonesDekho', 'Discover Indian and Imported Onyx slabs, tiles and blocks for backlit architectural interiors.'),
  (null, 'Semi Precious Stone', 'semi-precious-stone', 'Agate, Carnelian, Jasper, Lapis Lazuli, Quartz, Amethyst, Petrified Wood and Pyrite surfaces.', '/images/categories/semi-precious-stones.jpg','Natural semi-precious gemstone slabs and surfaces', true, true, 50, 'Semi Precious Stone Suppliers — Agate, Quartz & Gemstone Slabs | StonesDekho', 'Source luxury Semi Precious Stone slabs, tiles and blocks including Agate, Lapis Lazuli, Amethyst and Rose Quartz.'),
  (null, 'Travertine',          'travertine',          'Classic Cream, Walnut, Silver, and Imported Travertine slabs, tiles, and blocks.',              '/images/categories/travertine.jpg',          'Natural architectural travertine stone slabs and tiles', true, true, 60, 'Travertine Stone Suppliers — Slabs, Tiles & Blocks | StonesDekho', 'Explore vein-cut and cross-cut Travertine slabs, tiles and blocks for luxury facades and pool decks.'),
  (null, 'Slate Stone',         'slate',               'Natural cleft Slate Stone for roofing, wall cladding, and flooring across Indian quarries.',    '/images/categories/slate.jpg',               'Natural cleft slate stone tiles and cladding', true, true, 70, 'Slate Stone Suppliers & Exporters | StonesDekho', 'Source Kund Black, Peacock, Copper, Multi and Silver Shine Slate Stone in slabs, tiles and blocks.'),
  (null, 'Limestone',           'limestone',           'Kota Blue, Kota Brown, Tandur, and Kadapa natural limestone slabs, tiles, and blocks.',          '/images/categories/limestone.jpg',           'Natural Indian limestone paving and flooring slabs', true, true, 80, 'Limestone Suppliers — Kota, Tandur & Kadapa Limestone | StonesDekho', 'Direct B2B sourcing of Kota Blue, Kota Brown, Tandur and Kadapa Limestone slabs, tiles and blocks.'),
  (null, 'Basalt',              'basalt',              'Dense volcanic Basalt slabs, cobbles, tiles, and quarry blocks for heavy-duty architecture.',    '/images/categories/stone-blocks.jpg',        'Dense dark volcanic basalt stone blocks and paving', true, true, 90, 'Basalt Stone Suppliers — Slabs, Tiles & Blocks | StonesDekho', 'Source high-density natural Basalt stone slabs, tiles and blocks for facades, paving and landscape projects.'),
  (null, 'Pebbles & Cobbles',   'pebbles-and-cobbles', 'River pebbles, tumbled marble pebbles, and natural stone cobbles for landscaping.',            '/images/categories/decorative-stone.jpg',    'Natural landscaping stone pebbles and cobbles', true, true, 100,'Pebbles & Cobbles Suppliers — Landscape & Garden Stone | StonesDekho', 'Bulk B2B supply of natural river pebbles, white pebbles, black pebbles and stone cobbles.')
on conflict (slug) do update set
  parent_id       = null,
  name            = excluded.name,
  description     = coalesce(public.categories.description, excluded.description),
  image_url       = coalesce(public.categories.image_url, excluded.image_url),
  image_alt       = coalesce(public.categories.image_alt, excluded.image_alt),
  is_active       = true,
  is_featured     = true,
  display_order   = excluded.display_order,
  seo_title       = coalesce(public.categories.seo_title, excluded.seo_title),
  seo_description = coalesce(public.categories.seo_description, excluded.seo_description);

-- ---------------------------------------------------------------------------
-- 8. Upsert 22 Sandstone Varieties (parent = sandstone)
-- ---------------------------------------------------------------------------
with parent as (
  select id from public.categories where slug = 'sandstone'
)
insert into public.categories (
  parent_id, name, slug, description, image_url, image_alt, is_active, is_featured, display_order, seo_title, seo_description
)
select
  parent.id,
  v.name,
  v.slug,
  v.description,
  v.image_url,
  v.image_alt,
  true,
  v.is_featured,
  v.display_order,
  v.seo_title,
  v.seo_description
from parent
cross join (values
  ('Agra Red',         'agra-red',         'Rich iron-red natural sandstone for heritage monuments, facades, slabs, tiles, blocks and carved articles.', '/images/products/agra-red-sandstone.jpg',      'Agra Red natural sandstone slab texture', true,  101, 'Agra Red Sandstone — Slabs, Tiles, Blocks & Articles | StonesDekho',       'Source verified Agra Red Sandstone slabs, tiles, blocks and carved architectural articles directly from Indian quarries.'),
  ('Dholpur Beige',    'dholpur-beige',    'Warm buff-cream fine-grain sandstone ideal for architectural paving, cladding, slabs, tiles and articles.',  '/images/products/dholpur-beige-sandstone.jpg', 'Dholpur Beige natural sandstone texture', true,  102, 'Dholpur Beige Sandstone — Slabs, Tiles, Blocks & Articles | StonesDekho',  'B2B sourcing of Dholpur Beige Sandstone slabs, calibrated tiles, blocks and custom carved articles.'),
  ('Dholpur Pink',     'dholpur-pink',     'Subtle rose-pink fine-grain Dholpur sandstone with high weather resistance for facades and carvings.',        '/images/categories/sandstone.jpg',             'Dholpur Pink natural sandstone texture', true,  103, 'Dholpur Pink Sandstone — Slabs, Tiles, Blocks & Articles | StonesDekho',   'Source authentic Dholpur Pink Sandstone in slabs, tiles, blocks and architectural articles.'),
  ('Chocolate',        'chocolate',        'Deep chocolate-brown uniform sandstone for outdoor pavers, steps, coping, slabs, tiles and blocks.',         '/images/categories/sandstone-macro.jpg',       'Chocolate brown natural sandstone texture', false, 104, 'Chocolate Sandstone — Slabs, Tiles & Blocks | StonesDekho',                'Buy bulk Chocolate Sandstone slabs, paving tiles and quarry blocks from verified Indian suppliers.'),
  ('Bansi Pink',       'bansi-pink',       'Historic Bansi Paharpur pink sandstone celebrated for monumental temple architecture and carved articles.',    '/images/categories/sandstone.jpg',             'Bansi Pink Paharpur natural sandstone', true,  105, 'Bansi Pink Sandstone — Slabs, Tiles, Blocks & Articles | StonesDekho',     'Source Bansi Pink Paharpur Sandstone slabs, tiles, blocks and hand-carved articles.'),
  ('Mint',             'mint',             'Creamy pale-greenish mint sandstone with clean cleft surface for export paving, slabs, tiles and articles.', '/images/categories/sandstone-macro.jpg',       'Mint Indian sandstone slabs and tiles', true,  106, 'Mint Sandstone — Slabs, Tiles, Blocks & Articles | StonesDekho',           'Verified Mint Sandstone suppliers offering slabs, tiles, blocks and carved stone articles.'),
  ('Mint Fossil',      'mint-fossil',      'Natural mint sandstone featuring organic fern and mineral fossil impressions for paving and cladding.',       '/images/categories/sandstone.jpg',             'Mint Fossil natural patterned sandstone', false, 107, 'Mint Fossil Sandstone — Slabs, Tiles & Blocks | StonesDekho',              'Source Mint Fossil Sandstone slabs, calibrated tiles and blocks from Rajasthan quarries.'),
  ('Lalitpur Yellow',  'lalitpur-yellow',  'Bright sun-kissed golden yellow sandstone with high silica density for exterior flooring and facades.',      '/images/categories/sandstone-macro.jpg',       'Lalitpur Yellow natural sandstone', false, 108, 'Lalitpur Yellow Sandstone — Slabs, Tiles & Blocks | StonesDekho',          'Bulk B2B supply of Lalitpur Yellow Sandstone slabs, tiles and blocks.'),
  ('Lalitpur Grey',    'lalitpur-grey',    'Uniform light dove-grey sandstone suited for contemporary facades, steps, and landscape paving.',           '/images/categories/sandstone.jpg',             'Lalitpur Grey architectural sandstone', false, 109, 'Lalitpur Grey Sandstone — Slabs, Tiles & Blocks | StonesDekho',            'Source Lalitpur Grey Sandstone slabs, tiles and blocks from verified processors.'),
  ('Sagar Black',      'sagar-black',      'Dense charcoal-black sandstone with natural non-slip cleft face for paving and wall cladding.',             '/images/products/kund-black-slate.jpg',        'Sagar Black dark charcoal sandstone', false, 110, 'Sagar Black Sandstone — Slabs, Tiles & Blocks | StonesDekho',              'Verified Sagar Black Sandstone slabs, paving tiles and blocks for commercial projects.'),
  ('Kandla Grey',      'kandla-grey',      'World-renowned quartzitic silver-grey sandstone for export paving flags, cobbles, slabs and tiles.',        '/images/categories/sandstone.jpg',             'Kandla Grey export sandstone paving', true,  111, 'Kandla Grey Sandstone — Slabs, Tiles & Blocks | StonesDekho',              'Export-grade Kandla Grey Sandstone slabs, calibrated tiles and quarry blocks.'),
  ('Autumn Brown',     'autumn-brown',     'Earthy dark brown, hazelnut, and olive tones with rugged natural cleft surface for exterior paving.',        '/images/categories/sandstone-macro.jpg',       'Autumn Brown natural cleft sandstone', false, 112, 'Autumn Brown Sandstone — Slabs, Tiles & Blocks | StonesDekho',             'Source Autumn Brown Sandstone slabs, tiles and blocks directly from Rajasthan quarries.'),
  ('Raj Green',        'raj-green',        'Traditional Raj Green sandstone blending subtle sage-green, grey, and khaki tones for landscape paving.',   '/images/categories/sandstone.jpg',             'Raj Green natural sandstone paving', true,  113, 'Raj Green Sandstone — Slabs, Tiles & Blocks | StonesDekho',                'Buy export-quality Raj Green Sandstone slabs, tiles and quarry blocks.'),
  ('Slate Grey',       'slate-grey',       'Fine-textured slate-grey sandstone for contemporary wall cladding and interior/exterior flooring.',          '/images/categories/slate.jpg',                 'Slate Grey fine-grain sandstone', false, 114, 'Slate Grey Sandstone — Slabs, Tiles & Blocks | StonesDekho',               'Source Slate Grey Sandstone slabs, tiles and blocks for architectural projects.'),
  ('Teak',             'teak',             'Striking natural woodgrain yellow-brown veins resembling teak wood; ideal for slabs, tiles and articles.',   '/images/categories/sandstone.jpg',             'Teakwood veined natural sandstone', true,  115, 'Teak Sandstone — Slabs, Tiles, Blocks & Articles | StonesDekho',           'Source Teakwood Sandstone slabs, tiles, blocks and carved articles from India.'),
  ('Rainbow',          'rainbow',          'Vibrant swirled bands of purple, violet, red and gold quartz sandstone for feature slabs and articles.',     '/images/categories/sandstone-macro.jpg',       'Rainbow swirled natural sandstone', true,  116, 'Rainbow Sandstone — Slabs, Tiles, Blocks & Articles | StonesDekho',        'Explore Rainbow Sandstone slabs, tiles, blocks and decorative carved articles.'),
  ('Jodhpur Pink',     'jodhpur-pink',     'Authentic Jodhpur pink sandstone from Mandore quarries for heritage facades, jaali and carved articles.',    '/images/categories/sandstone.jpg',             'Jodhpur Pink architectural sandstone', true,  117, 'Jodhpur Pink Sandstone — Slabs, Tiles, Blocks & Articles | StonesDekho',   'Source authentic Jodhpur Pink Sandstone slabs, tiles, blocks and carved architectural articles.'),
  ('Jaisalmer Yellow', 'jaisalmer-yellow', 'Warm ochre-golden Thar desert sandstone celebrated for palaces, tiles, slabs and carved articles.',       '/images/products/dholpur-beige-sandstone.jpg', 'Jaisalmer Yellow golden sandstone', true,  118, 'Jaisalmer Yellow Sandstone — Slabs, Tiles, Blocks & Articles | StonesDekho','Buy Jaisalmer Yellow Sandstone slabs, tiles, blocks and carved articles from verified suppliers.'),
  ('Camel Dust',       'camel-dust',       'Warm sandy buff sandstone with subtle golden-brown mineral flecks for paving and exterior cladding.',       '/images/categories/sandstone.jpg',             'Camel Dust warm buff sandstone', false, 119, 'Camel Dust Sandstone — Slabs, Tiles & Blocks | StonesDekho',               'Source Camel Dust Sandstone slabs, tiles and blocks for commercial and landscape paving.'),
  ('Ravina',           'ravina',           'Rich warm terracotta and rose-tinted sandstone with fine natural grain for cladding and paving.',          '/images/categories/sandstone-macro.jpg',       'Ravina warm terracotta sandstone', false, 120, 'Ravina Sandstone — Slabs, Tiles & Blocks | StonesDekho',                   'Source Ravina Sandstone slabs, calibrated tiles and quarry blocks.'),
  ('Mandana Red',      'mandana-red',      'Deep maroon-red dense quartzitic sandstone from Mandana quarries for heavy-duty paving and walling.',     '/images/products/agra-red-sandstone.jpg',      'Mandana Red dense sandstone', false, 121, 'Mandana Red Sandstone — Slabs, Tiles & Blocks | StonesDekho',              'Verified Mandana Red Sandstone slabs, tiles and blocks for architectural flooring.'),
  ('Red Multy',        'red-multy',        'Multi-tonal red, plum, and warm ochre banded sandstone ideal for exterior paving and feature walls.',       '/images/products/agra-red-sandstone.jpg',      'Red Multy multi-toned sandstone', false, 122, 'Red Multy Sandstone — Slabs, Tiles & Blocks | StonesDekho',                'Source Red Multy Sandstone slabs, tiles and blocks directly from Indian quarries.')
) as v(name, slug, description, image_url, image_alt, is_featured, display_order, seo_title, seo_description)
on conflict (slug) do update set
  parent_id       = excluded.parent_id,
  name            = excluded.name,
  description     = coalesce(public.categories.description, excluded.description),
  image_url       = coalesce(public.categories.image_url, excluded.image_url),
  image_alt       = coalesce(public.categories.image_alt, excluded.image_alt),
  is_active       = true,
  display_order   = excluded.display_order,
  seo_title       = coalesce(public.categories.seo_title, excluded.seo_title),
  seo_description = coalesce(public.categories.seo_description, excluded.seo_description);

-- ---------------------------------------------------------------------------
-- 9. Upsert 4 Marble Subcategories (parent = marble)
-- ---------------------------------------------------------------------------
with parent as (
  select id from public.categories where slug = 'marble'
)
insert into public.categories (
  parent_id, name, slug, description, image_url, image_alt, is_active, is_featured, display_order, seo_title, seo_description
)
select
  parent.id,
  v.name,
  v.slug,
  v.description,
  v.image_url,
  v.image_alt,
  true,
  true,
  v.display_order,
  v.seo_title,
  v.seo_description
from parent
cross join (values
  ('Indian White Marble',   'indian-white-marble',   'Makrana, Ambaji, Morwad, and Banswara pure white calcite marble in slabs, tiles and blocks.',     '/images/products/makrana-white-marble.jpg',   'Indian White Marble polished slabs', 201, 'Indian White Marble — Slabs, Tiles & Blocks | StonesDekho',   'Source Makrana and Indian White Marble slabs, tiles and quarry blocks directly from verified suppliers.'),
  ('Indian Colored Marble', 'indian-colored-marble', 'Rajasthan Forest Green, Rainforest Brown, Onyx-veined and Pink Indian colored marble slabs & tiles.', '/images/products/rajasthan-green-marble.jpg', 'Indian Colored Marble slabs',        202, 'Indian Colored Marble — Slabs, Tiles & Blocks | StonesDekho', 'Explore Indian Colored Marble varieties in gangsaw slabs, tiles and blocks.'),
  ('Englo Indian Marble',   'englo-indian-marble',   'Englo Indian Marble slabs, calibrated tiles, and quarry blocks for commercial and residential interiors.', '/images/categories/marble-macro.jpg',     'Englo Indian Marble stone surface',  203, 'Englo Indian Marble — Slabs, Tiles & Blocks | StonesDekho',   'Source Englo Indian Marble slabs, tiles and blocks from verified stone processors.'),
  ('Imported Marble',       'imported-marble',       'Italian Statuario, Calacatta, Botticino, Carrara, and Turkish imported marble slabs, tiles and blocks.', '/images/categories/marble.jpg',          'Imported Italian Marble gangsaw slabs', 204, 'Imported Marble — Slabs, Tiles & Blocks | StonesDekho',       'Buy Imported Marble gangsaw slabs, tiles and blocks from verified B2B importers.')
) as v(name, slug, description, image_url, image_alt, display_order, seo_title, seo_description)
on conflict (slug) do update set
  parent_id       = excluded.parent_id,
  name            = excluded.name,
  description     = coalesce(public.categories.description, excluded.description),
  image_url       = coalesce(public.categories.image_url, excluded.image_url),
  image_alt       = coalesce(public.categories.image_alt, excluded.image_alt),
  is_active       = true,
  is_featured     = true,
  display_order   = excluded.display_order,
  seo_title       = coalesce(public.categories.seo_title, excluded.seo_title),
  seo_description = coalesce(public.categories.seo_description, excluded.seo_description);

-- ---------------------------------------------------------------------------
-- 10. Preserve/Seed Existing Varieties for Other Stone Categories
-- ---------------------------------------------------------------------------
insert into public.categories (
  parent_id, name, slug, description, image_url, image_alt, is_active, display_order, seo_title
)
select p.id, v.name, v.slug, v.description, v.image_url, v.image_alt, true, v.display_order, v.seo_title
from (values
  ('granite',             'North India Granite',      'north-india-granite',      'Crystal Yellow, Chima Pink, Tiger Black, and Jalore granite slabs and tiles.',              '/images/categories/granite-macro.jpg',        'North India Granite slab',          301, 'North India Granite Slabs & Tiles | StonesDekho'),
  ('granite',             'South India Granite',      'south-india-granite',      'Black Galaxy, Tan Brown, Steel Grey, Absolute Black, and Kashmir White granite.',           '/images/products/black-galaxy-granite.jpg',   'South India Black Galaxy Granite',  302, 'South India Granite Exports | StonesDekho'),
  ('granite',             'Imported Granite',         'imported-granite',         'Blue Pearl, Emerald Pearl, Volga Blue, and Brazilian exotic granite slabs.',                '/images/categories/granite.jpg',              'Imported exotic granite slab',      303, 'Imported Granite Slabs | StonesDekho'),
  ('onyx',                'Indian Onyx',              'indian-onyx',              'Translucent caramel honey onyx and green banded onyx from Indian quarries.',                '/images/products/honey-onyx-translucent.jpg', 'Indian Honey Onyx translucent slab',401, 'Indian Onyx Slabs & Tiles | StonesDekho'),
  ('onyx',                'Imported Onyx',            'imported-onyx',            'Pink Onyx, White Onyx, Orange Onyx, and backlit luxury translucent stone.',                 '/images/categories/onyx.jpg',                 'Imported translucent onyx slab',    402, 'Imported Onyx Slabs | StonesDekho'),
  ('semi-precious-stone', 'Agate',                    'agate',                    'Wild agate, black agate, blue agate, and gold agate luxury composite slabs.',               '/images/categories/semi-precious-stones.jpg', 'Agate semi-precious stone slab',    501, 'Agate Semi Precious Slabs | StonesDekho'),
  ('semi-precious-stone', 'Carnelian',                'carnelian',                'Translucent orange-red microcrystalline chalcedony gemstone slabs.',                        '/images/categories/semi-precious-stones.jpg', 'Carnelian gemstone slab',           502, 'Carnelian Gemstone Slabs | StonesDekho'),
  ('semi-precious-stone', 'Jasper',                   'jasper',                   'Red jasper, zebra jasper, and multi-colored gemstone stone surfaces.',                      '/images/categories/semi-precious-stones.jpg', 'Jasper semi-precious slab',         503, 'Jasper Stone Slabs | StonesDekho'),
  ('semi-precious-stone', 'Lapis Lazuli',             'lapis-lazuli',             'Royal ultramarine blue metamorphic gemstone laced with golden pyrite.',                     '/images/categories/semi-precious-stones.jpg', 'Lapis Lazuli gemstone slab',        504, 'Lapis Lazuli Luxury Slabs | StonesDekho'),
  ('semi-precious-stone', 'Quartz',                   'quartz',                   'Rose quartz, smoky quartz, and crystal white semi-precious quartz slabs.',                  '/images/products/silver-white-quartzite.jpg', 'Natural Quartz crystal slab',       505, 'Natural Quartz Slabs | StonesDekho'),
  ('semi-precious-stone', 'Amethyst',                 'amethyst',                 'Royal violet-purple crystalline amethyst gemstone slabs for feature walls.',                '/images/categories/semi-precious-stones.jpg', 'Amethyst gemstone slab',            506, 'Amethyst Gemstone Slabs | StonesDekho'),
  ('semi-precious-stone', 'Petrified Wood',           'petrified-wood',           'Fossilized timber crystallized into chalcedony and agate mineral slabs.',                   '/images/categories/semi-precious-stones.jpg', 'Petrified Wood stone slab',         507, 'Petrified Wood Slabs | StonesDekho'),
  ('semi-precious-stone', 'Pyrite',                   'pyrite',                   'Golden metallic lustered iron sulfide mineral composite luxury slabs.',                      '/images/categories/semi-precious-stones.jpg', 'Golden Pyrite stone slab',          508, 'Golden Pyrite Slabs | StonesDekho'),
  ('travertine',          'Classic Cream Travertine', 'classic-cream-travertine', 'Warm beige-cream vein-cut and cross-cut natural architectural travertine.',                 '/images/products/classic-travertine-slab.jpg','Classic Cream Travertine slab',     601, 'Classic Cream Travertine | StonesDekho'),
  ('travertine',          'Walnut Travertine',        'walnut-travertine',        'Rich chocolate walnut and caramel textured sedimentary travertine.',                        '/images/categories/travertine.jpg',           'Walnut Travertine slab',            602, 'Walnut Travertine Slabs | StonesDekho'),
  ('travertine',          'Silver Travertine',        'silver-travertine',        'Silver-grey and pewter vein-cut architectural travertine slabs and tiles.',                 '/images/categories/travertine.jpg',           'Silver Travertine slab',            603, 'Silver Travertine Slabs | StonesDekho'),
  ('travertine',          'Imported Travertine',      'imported-travertine',      'Roman Italian and Turkish travertine slabs for luxury pool decks and facades.',             '/images/products/classic-travertine-slab.jpg','Imported Travertine slab',          604, 'Imported Travertine Slabs | StonesDekho'),
  ('slate',               'Kund Black Slate',         'kund-black-slate',         'Uniform charcoal black natural cleft slate from Kund mining belt.',                         '/images/products/kund-black-slate.jpg',       'Kund Black Slate tile',             701, 'Kund Black Slate Tiles & Slabs | StonesDekho'),
  ('slate',               'Peacock Slate',            'peacock-slate',            'Multi-tonal iridescent rustic cleft slate for cladding and flooring.',                      '/images/categories/slate-macro.jpg',          'Peacock Multi Slate',               702, 'Peacock Slate Stone | StonesDekho'),
  ('slate',               'Copper Slate',             'copper-slate',             'Warm rust and copper metallic sheen split-face slate for feature walls.',                   '/images/categories/slate.jpg',                'Copper Slate tile',                 703, 'Copper Slate Tiles | StonesDekho'),
  ('slate',               'Multi Slate',              'multi-slate',              'Natural blend of charcoal, plum, gold and earthy cleft slate.',                             '/images/categories/slate-macro.jpg',          'Multi Color Slate',                 704, 'Multi Slate Tiles | StonesDekho'),
  ('slate',               'Silver Shine Slate',       'silver-shine-slate',       'Mica-rich silver reflective cleft slate for interior and exterior accents.',                '/images/categories/slate.jpg',                'Silver Shine Slate',                705, 'Silver Shine Slate | StonesDekho'),
  ('limestone',           'Kota Blue',                'kota-blue',                'Dense, non-slip fine-grain blue-green limestone from Kota.',                                '/images/products/kota-blue-limestone.jpg',    'Kota Blue Limestone',               801, 'Kota Blue Limestone Tiles | StonesDekho'),
  ('limestone',           'Kota Brown',               'kota-brown',               'Chocolate-brown dense limestone complementing Kota Blue flooring.',                         '/images/categories/limestone.jpg',            'Kota Brown Limestone',              802, 'Kota Brown Limestone | StonesDekho'),
  ('limestone',           'Jaisalmer Yellow',         'jaisalmer-yellow-limestone','Warm yellow fossiliferous natural limestone from Rajasthan.',                              '/images/categories/limestone-macro.jpg',      'Jaisalmer Yellow Limestone',        803, 'Jaisalmer Yellow Limestone | StonesDekho'),
  ('limestone',           'Tandur Yellow',            'tandur-yellow',            'Dense butter-yellow South Indian limestone for paving and flooring.',                       '/images/categories/limestone.jpg',            'Tandur Yellow Limestone',           804, 'Tandur Yellow Limestone | StonesDekho'),
  ('limestone',           'Tandur Blue',              'tandur-blue',              'Uniform greenish-blue natural cleft South Indian paving limestone.',                        '/images/products/kota-blue-limestone.jpg',    'Tandur Blue Limestone',             805, 'Tandur Blue Limestone | StonesDekho'),
  ('limestone',           'Kadapa Black',             'kadapa-black',             'Deep black dense limestone from Andhra Pradesh for heavy-duty paving.',                     '/images/categories/limestone-macro.jpg',      'Kadapa Black Limestone',            806, 'Kadapa Black Limestone | StonesDekho'),
  ('pebbles-and-cobbles', 'River Pebbles',            'river-pebbles',            'Smooth water-worn river gravel pebbles for landscaping and gardens.',                       '/images/categories/decorative-stone.jpg',     'Natural River Pebbles',             901, 'Natural River Pebbles | StonesDekho'),
  ('pebbles-and-cobbles', 'White Pebbles',            'white-pebbles',            'Tumbled brilliant white marble pebbles for modern planters and pathways.',                  '/images/categories/decorative-stone.jpg',     'Pure White Pebbles',                902, 'White Decorative Pebbles | StonesDekho'),
  ('pebbles-and-cobbles', 'Black Pebbles',            'black-pebbles',            'Polished obsidian and matte basalt black river pebbles.',                                   '/images/categories/decorative-stone.jpg',     'Black River Pebbles',               903, 'Black River Pebbles | StonesDekho'),
  ('pebbles-and-cobbles', 'Coloured Pebbles',         'coloured-pebbles',         'Curated mixed spectrum natural stone tumbled pebbles for landscape accents.',               '/images/categories/decorative-stone.jpg',     'Coloured Mixed Pebbles',            904, 'Coloured Mixed Pebbles | StonesDekho')
) as v(parent_slug, name, slug, description, image_url, image_alt, display_order, seo_title)
join public.categories p on p.slug = v.parent_slug
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- 11. Seed Category/Variety <-> Product Form Configuration
-- ---------------------------------------------------------------------------
-- Enable Slabs, Tiles, and Blocks for every active category/variety
insert into public.category_product_forms (category_id, form_id, is_enabled, display_order)
select
  c.id,
  f.id,
  true,
  f.display_order
from public.categories c
join public.product_forms f on f.slug in ('slabs', 'tiles', 'blocks')
where c.is_active = true
on conflict (category_id, form_id) do update set
  is_enabled    = true,
  display_order = excluded.display_order;

-- Enable Articles ONLY for the 9 specified Sandstone varieties by default
insert into public.category_product_forms (category_id, form_id, is_enabled, display_order)
select
  c.id,
  f.id,
  (c.slug in (
    'agra-red',
    'dholpur-beige',
    'dholpur-pink',
    'bansi-pink',
    'mint',
    'teak',
    'rainbow',
    'jodhpur-pink',
    'jaisalmer-yellow'
  )),
  f.display_order
from public.categories c
join public.product_forms f on f.slug = 'articles'
where c.is_active = true
on conflict (category_id, form_id) do update set
  is_enabled    = excluded.is_enabled,
  display_order = excluded.display_order;
