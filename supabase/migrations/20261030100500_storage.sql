-- =============================================================================
-- Migration 6: storage buckets + policies
--
-- Path conventions (first folder is the ownership key):
--   product-images                <seller_id>/<product_id>/<file>
--   seller-logos / -cover-images  <seller_id>/<file>
--   category-images               <file>                (admin only)
--   seller-verification-documents <seller_id>/<file>    (private)
--   enquiry-attachments           <enquiry_id>/<file>   (private)
--
-- Bucket MIME/size limits are enforced by the Storage service from the declared
-- Content-Type; policies additionally restrict file extensions. Server upload
-- code (Phase 4) must also sniff real file signatures (see @stone/utils).
-- Existing buckets are never overwritten (ON CONFLICT DO NOTHING).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images',               'product-images',               true,  5242880,  array['image/jpeg', 'image/png', 'image/webp']),
  ('seller-logos',                 'seller-logos',                 true,  2097152,  array['image/jpeg', 'image/png', 'image/webp']),
  ('seller-cover-images',          'seller-cover-images',          true,  5242880,  array['image/jpeg', 'image/png', 'image/webp']),
  ('category-images',              'category-images',              true,  2097152,  array['image/jpeg', 'image/png', 'image/webp']),
  ('seller-verification-documents','seller-verification-documents',false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']),
  ('enquiry-attachments',          'enquiry-attachments',          false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- UUID of the first path segment, or NULL when it is not a UUID (never raises).
create or replace function public.storage_first_folder_uuid(_name text)
returns uuid language sql immutable set search_path = '' as $$
  select case
    when split_part(_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(_name, '/', 1)::uuid
  end;
$$;
revoke all on function public.storage_first_folder_uuid(text) from public, anon, authenticated;
grant execute on function public.storage_first_folder_uuid(text) to authenticated;

-- ---------------------------------------------------- seller-owned public buckets ---
-- product-images, seller-logos, seller-cover-images: the owning seller manages
-- objects under their own seller_id folder. Reads of public buckets go through
-- the CDN URL and need no policy.
create policy "seller media: owner select" on storage.objects
  for select to authenticated
  using (bucket_id in ('product-images', 'seller-logos', 'seller-cover-images')
         and public.is_seller_owner(public.storage_first_folder_uuid(name)));

create policy "seller media: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('product-images', 'seller-logos', 'seller-cover-images')
              and public.is_seller_owner(public.storage_first_folder_uuid(name))
              and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp'));

create policy "seller media: owner update" on storage.objects
  for update to authenticated
  using (bucket_id in ('product-images', 'seller-logos', 'seller-cover-images')
         and public.is_seller_owner(public.storage_first_folder_uuid(name)))
  with check (bucket_id in ('product-images', 'seller-logos', 'seller-cover-images')
              and public.is_seller_owner(public.storage_first_folder_uuid(name))
              and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp'));

create policy "seller media: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('product-images', 'seller-logos', 'seller-cover-images')
         and public.is_seller_owner(public.storage_first_folder_uuid(name)));

-- ------------------------------------------------------------- category-images ---
create policy "category images: admin all" on storage.objects
  for all to authenticated
  using (bucket_id = 'category-images' and public.is_admin())
  with check (bucket_id = 'category-images' and public.is_admin()
              and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp'));

-- ------------------------------------------------- seller-verification-documents ---
create policy "verification docs: owner or admin select" on storage.objects
  for select to authenticated
  using (bucket_id = 'seller-verification-documents'
         and (public.is_seller_owner(public.storage_first_folder_uuid(name)) or public.is_admin()));

create policy "verification docs: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'seller-verification-documents'
              and public.is_seller_owner(public.storage_first_folder_uuid(name))
              and lower(storage.extension(name)) in ('pdf', 'jpg', 'jpeg', 'png'));

create policy "verification docs: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'seller-verification-documents'
         and public.is_seller_owner(public.storage_first_folder_uuid(name)));
-- No UPDATE policy: verification documents cannot be replaced in place.

-- ------------------------------------------------------------ enquiry-attachments ---
create policy "enquiry attachments: participants select" on storage.objects
  for select to authenticated
  using (bucket_id = 'enquiry-attachments'
         and public.can_access_enquiry(public.storage_first_folder_uuid(name)));

create policy "enquiry attachments: participants insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'enquiry-attachments'
              and public.can_access_enquiry(public.storage_first_folder_uuid(name))
              and lower(storage.extension(name)) in ('pdf', 'jpg', 'jpeg', 'png', 'webp'));
-- No UPDATE/DELETE policy for participants: attachments are immutable evidence.

