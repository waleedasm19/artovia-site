-- قاعدة بيانات موقع مؤسسة إرتوفيا الخيرية: الحسابات، الرواق، الملفات المحمية
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  bio text not null default '' check (char_length(bio) <= 600),
  role text not null default 'member' check (role in ('member','admin')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)),
          case when lower(new.email) in ('artoviacentr@gmail.com') then 'admin' else 'member' end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- منع العضو من ترقية نفسه
create or replace function public.protect_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then new.role := old.role; end if;
  return new;
end $$;
create trigger profiles_protect_role before update on public.profiles for each row execute function public.protect_role();

create policy "profiles: read own or admin" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles: update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin update" on public.profiles for update to authenticated using (public.is_admin());

create table public.articles (
  id bigint generated always as identity primary key,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 160),
  field text not null default 'ideas',
  body text not null check (char_length(body) between 300 and 30000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index articles_status_idx on public.articles (status, reviewed_at desc);
create index articles_author_idx on public.articles (author_id);
alter table public.articles enable row level security;

create policy "articles: members read approved, own, or admin" on public.articles for select to authenticated
  using (status = 'approved' or author_id = auth.uid() or public.is_admin());
create policy "articles: members submit own as pending" on public.articles for insert to authenticated
  with check (author_id = auth.uid() and status = 'pending' and review_note is null and reviewed_at is null);
create policy "articles: admin reviews" on public.articles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "articles: admin deletes" on public.articles for delete to authenticated using (public.is_admin());

create view public.articles_public with (security_invoker = true) as
  select a.id, a.title, a.field, a.body, a.created_at, a.reviewed_at, p.display_name as author
  from public.articles a join public.profiles p on p.id = a.author_id where a.status = 'approved';
-- اسم الكاتب يجب أن يظهر للأعضاء: سياسة قراءة أسماء كتّاب المقالات المعتمدة
create policy "profiles: read authors of approved articles" on public.profiles for select to authenticated
  using (exists (select 1 from public.articles a where a.author_id = profiles.id and a.status = 'approved'));

create view public.articles_admin with (security_invoker = true) as
  select a.*, p.display_name as author from public.articles a join public.profiles p on p.id = a.author_id;

revoke all on public.articles_public, public.articles_admin from anon;
grant select on public.articles_public, public.articles_admin to authenticated;

-- ملفات محمية: الكتب والمجلة، للأعضاء فقط
insert into storage.buckets (id, name, public) values ('books','books',false), ('magazine','magazine',false) on conflict (id) do nothing;
create policy "members read protected files" on storage.objects for select to authenticated using (bucket_id in ('books','magazine'));
create policy "admin uploads protected files" on storage.objects for insert to authenticated with check (bucket_id in ('books','magazine') and public.is_admin());
create policy "admin updates protected files" on storage.objects for update to authenticated using (bucket_id in ('books','magazine') and public.is_admin());

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_role() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- لوحة الإدارة (2026-11-25): قائمة الأعضاء مع البريد للمشرف فقط، وتغيير الصلاحية بأمان (لا يغيّر المشرف صلاحيته هو)
create or replace function public.admin_members()
returns table (id uuid, email text, display_name text, role text, created_at timestamptz, last_sign_in_at timestamptz, articles bigint, approved bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
    select p.id, u.email::text, p.display_name, p.role, p.created_at, u.last_sign_in_at,
           (select count(*) from public.articles a where a.author_id = p.id),
           (select count(*) from public.articles a where a.author_id = p.id and a.status = 'approved')
    from public.profiles p join auth.users u on u.id = p.id
    order by p.created_at desc;
end $$;
create or replace function public.admin_set_role(target uuid, new_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  if new_role not in ('member','admin') then raise exception 'bad role'; end if;
  if target = auth.uid() then raise exception 'cannot change own role'; end if;
  update public.profiles set role = new_role where id = target;
end $$;
revoke execute on function public.admin_members() from public, anon;
revoke execute on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_members() to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- الكتّاب (2026-11-25): صورة ودولة لكل عضو، مخزن صور عام القراءة يكتب فيه كل عضو في مجلده فقط، وقائمة عامة بمن نُشر له
alter table public.profiles add column if not exists country text check (country is null or country ~ '^[a-z]{2}(-[a-z]{3})?$');
alter table public.profiles add column if not exists avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500);
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp'];
create policy "avatars: owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: owner updates" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: owner or admin deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create or replace function public.public_writers()
returns table (id uuid, name text, bio text, country text, avatar_url text, articles jsonb, last_published timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.bio, p.country, p.avatar_url,
         jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'field', a.field) order by a.reviewed_at desc),
         max(a.reviewed_at)
  from public.profiles p join public.articles a on a.author_id = p.id and a.status = 'approved'
  group by p.id order by max(a.reviewed_at) desc;
$$;
revoke execute on function public.public_writers() from public;
grant execute on function public.public_writers() to anon, authenticated;
create or replace function public.admin_update_writer(target uuid, new_name text, new_bio text, new_country text, clear_avatar boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.profiles set display_name = left(coalesce(new_name, display_name), 40), bio = left(coalesce(new_bio, ''), 600),
    country = nullif(new_country, ''), avatar_url = case when clear_avatar then null else avatar_url end where id = target;
end $$;
revoke execute on function public.admin_update_writer(uuid, text, text, text, boolean) from public, anon;
grant execute on function public.admin_update_writer(uuid, text, text, text, boolean) to authenticated;
-- الرفع (insert ... returning) والحذف يحتاجان صلاحية قراءة على مجلد العضو نفسه
create policy "avatars: owner reads" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
