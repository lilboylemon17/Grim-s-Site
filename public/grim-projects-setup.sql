-- GRIM Projects: run once in the existing GRIM Supabase project's SQL Editor.
-- Adds project metadata; existing rows, RLS policies and storage permissions remain in place.
begin;
alter table public.content drop constraint if exists content_type_check;
alter table public.content add constraint content_type_check check(type in ('game','film','project'));
alter table public.content add column if not exists downloads jsonb not null default '[]'::jsonb;
alter table public.content add column if not exists screenshots jsonb not null default '[]'::jsonb;
alter table public.content drop constraint if exists content_project_downloads_check;
alter table public.content add constraint content_project_downloads_check check(jsonb_typeof(downloads)='array' and jsonb_array_length(downloads)<=20);
alter table public.content drop constraint if exists content_project_screenshots_check;
alter table public.content add constraint content_project_screenshots_check check(jsonb_typeof(screenshots)='array' and jsonb_array_length(screenshots)<=12);
notify pgrst, 'reload schema';
commit;
select 'GRIM Projects are ready' as setup_status;
