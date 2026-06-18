-- FevCara MVP schema
-- profiles / characters / celebration_days / usage_events / art_style_presets

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.art_style_presets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  prompt_template text not null,
  safety_note text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  temporary_name text,
  final_name text,

  gender_feel text,
  age_feel text,
  hair_color text,
  eye_color text,
  hairstyle text,
  outfit text,
  appearance_detail text,

  personality text,
  first_person text,
  user_nickname text,
  speech_style text,
  forbidden_speech text,

  likes text,
  dislikes text,

  art_style_preset_id uuid references public.art_style_presets(id),
  status text not null default 'draft',

  system_prompt text,
  image_prompt text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.celebration_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,

  month integer not null check (month >= 1 and month <= 12),
  day integer not null check (day >= 1 and day <= 31),
  title text not null,
  message_hint text,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  event_type text not null,
  amount integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_characters_updated_at on public.characters;
create trigger set_characters_updated_at
before update on public.characters
for each row execute function public.set_updated_at();

drop trigger if exists set_celebration_days_updated_at on public.celebration_days;
create trigger set_celebration_days_updated_at
before update on public.celebration_days
for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.celebration_days enable row level security;
alter table public.usage_events enable row level security;
alter table public.art_style_presets enable row level security;

-- profiles policies
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

-- characters policies
drop policy if exists "Users can view own characters" on public.characters;
create policy "Users can view own characters"
on public.characters
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own characters" on public.characters;
create policy "Users can insert own characters"
on public.characters
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own characters" on public.characters;
create policy "Users can update own characters"
on public.characters
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own characters" on public.characters;
create policy "Users can delete own characters"
on public.characters
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- celebration_days policies
drop policy if exists "Users can view own celebration days" on public.celebration_days;
create policy "Users can view own celebration days"
on public.celebration_days
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own celebration days" on public.celebration_days;
create policy "Users can insert own celebration days"
on public.celebration_days
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own celebration days" on public.celebration_days;
create policy "Users can update own celebration days"
on public.celebration_days
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own celebration days" on public.celebration_days;
create policy "Users can delete own celebration days"
on public.celebration_days
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- usage_events policies
drop policy if exists "Users can view own usage events" on public.usage_events;
create policy "Users can view own usage events"
on public.usage_events
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own usage events" on public.usage_events;
create policy "Users can insert own usage events"
on public.usage_events
for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- art_style_presets: authenticated users can read active presets
drop policy if exists "Authenticated users can view active art styles" on public.art_style_presets;
create policy "Authenticated users can view active art styles"
on public.art_style_presets
for select
to authenticated
using (is_active = true);

-- Initial art style presets
insert into public.art_style_presets
  (slug, name, description, prompt_template, safety_note, sort_order)
values
  (
    'midnight_anime',
    'Midnight Anime',
    '夜にも映える、落ち着いたアニメ調の標準スタイル。',
    'original fictional character, non-photorealistic anime-style illustration, calm midnight color palette, soft clean linework, upper body portrait, no real person resemblance, no copyrighted character resemblance, no specific artist style',
    '実在人物・既存キャラクター・写真風・特定作家風は禁止。',
    10
  ),
  (
    'soft_novel',
    'Soft Novel',
    'やわらかい線と淡い陰影の、物語向けイラスト調。',
    'original fictional character, non-photorealistic light novel style illustration, soft linework, gentle shading, expressive eyes, upper body portrait, no real person resemblance, no copyrighted character resemblance, no specific artist style',
    '実在人物・既存キャラクター・写真風・特定作家風は禁止。',
    20
  ),
  (
    'clean_webtoon',
    'Clean Webtoon',
    'スマホで見やすい、輪郭がはっきりした現代的スタイル。',
    'original fictional character, non-photorealistic clean webtoon-inspired illustration, crisp outlines, modern flat shading, upper body portrait, no real person resemblance, no copyrighted character resemblance, no specific artist style',
    '実在人物・既存キャラクター・写真風・特定作家風は禁止。',
    30
  ),
  (
    'dark_fantasy',
    'Dark Fantasy',
    '影と幻想感を強めた、クールなキャラクター向けスタイル。',
    'original fictional character, non-photorealistic dark fantasy illustration, dramatic shadows, mystical atmosphere, upper body portrait, no real person resemblance, no copyrighted character resemblance, no specific artist style',
    '実在人物・既存キャラクター・写真風・特定作家風は禁止。',
    40
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  prompt_template = excluded.prompt_template,
  safety_note = excluded.safety_note,
  sort_order = excluded.sort_order,
  is_active = true;


  alter table public.characters
add column if not exists default_expression text,
add column if not exists expression_detail text,
add column if not exists absolute_settings text;


create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, plan)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', null),
    'free'
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


insert into public.profiles (id, email, plan)
select
  id,
  email,
  'free'
from auth.users
on conflict (id) do update set
  email = excluded.email,
  updated_at = now();