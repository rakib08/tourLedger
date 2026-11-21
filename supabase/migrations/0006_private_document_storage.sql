-- TourLedger Phase 5.1: private receipt and payment-proof storage.
-- Apply after migrations 0001-0005.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tourledger-private',
  'tourledger-private',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

-- Object paths: {group_id}/{uploader_user_id}/{expense|contribution}/{uuid}.{ext}

drop policy if exists "tourledger_documents_insert" on storage.objects;
create policy "tourledger_documents_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'tourledger-private'
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and (
    (
      (storage.foldername(name))[3] = 'contribution'
      and public.is_group_member(((storage.foldername(name))[1])::uuid)
    )
    or
    (
      (storage.foldername(name))[3] = 'expense'
      and public.can_manage_group(((storage.foldername(name))[1])::uuid)
    )
  )
);

drop policy if exists "tourledger_documents_read" on storage.objects;
create policy "tourledger_documents_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'tourledger-private'
  and array_length(storage.foldername(name), 1) = 3
  and (
    (
      (storage.foldername(name))[3] = 'expense'
      and public.is_group_member(((storage.foldername(name))[1])::uuid)
    )
    or
    (
      (storage.foldername(name))[3] = 'contribution'
      and (
        (storage.foldername(name))[2] = (select auth.uid())::text
        or public.can_manage_group(((storage.foldername(name))[1])::uuid)
      )
    )
  )
);

-- No client-side UPDATE or DELETE policy is intentionally provided.
