create table public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admin_users enable row level security;
create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.admin_users where user_id=auth.uid()); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
create table public.content (
 id uuid primary key, type text not null check(type in ('game','film')), title text not null check(length(title) between 1 and 150), description text not null default '' check(length(description)<=5000),
 thumbnail_url text not null default '', file_url text not null default '', entry_path text not null default '', subtitle_url text not null default '', duration text not null default '',
 status text not null default 'draft' check(status in ('draft','published')), display_order integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.content enable row level security;
create policy "Published titles are public" on public.content for select using(status='published' or public.is_admin());
create policy "Administrators manage content" on public.content for all to authenticated using(public.is_admin()) with check(public.is_admin());
create function public.touch_content() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
create trigger content_updated before update on public.content for each row execute function public.touch_content();
create index content_public_order on public.content(status,type,display_order);
insert into storage.buckets(id,name,public,file_size_limit) values('media','media',true,1073741824);
create policy "Admin uploads" on storage.objects for insert to authenticated with check(bucket_id='media' and public.is_admin() and name ~ '^[0-9a-f-]{36}/' and name !~ '(^|/)\.\.(/|$)');
create policy "Admin reads storage metadata" on storage.objects for select to authenticated using(bucket_id='media' and public.is_admin());
create policy "Admin removes storage" on storage.objects for delete to authenticated using(bucket_id='media' and public.is_admin());
