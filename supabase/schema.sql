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


  alter table public.characters
add column if not exists role_name text,
add column if not exists expertise text,
add column if not exists consultation_style text,
add column if not exists thinking_style text,
add column if not exists team_position text;


create table if not exists public.character_relationships (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.profiles(id) on delete cascade,
  from_character_id uuid not null references public.characters(id) on delete cascade,
  to_character_id uuid not null references public.characters(id) on delete cascade,

  relationship_label text,
  impression text,
  speaking_style text,
  group_chat_behavior text,
  forbidden_behavior text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint character_relationships_no_self
    check (from_character_id <> to_character_id),

  constraint character_relationships_unique_pair
    unique (user_id, from_character_id, to_character_id)
);

drop trigger if exists set_character_relationships_updated_at
on public.character_relationships;

create trigger set_character_relationships_updated_at
before update on public.character_relationships
for each row execute function public.set_updated_at();

alter table public.character_relationships enable row level security;

drop policy if exists "Users can view own character relationships"
on public.character_relationships;

create policy "Users can view own character relationships"
on public.character_relationships
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own character relationships"
on public.character_relationships;

create policy "Users can insert own character relationships"
on public.character_relationships
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.characters c
    where c.id = from_character_id
      and c.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.characters c
    where c.id = to_character_id
      and c.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update own character relationships"
on public.character_relationships;

create policy "Users can update own character relationships"
on public.character_relationships
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.characters c
    where c.id = from_character_id
      and c.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.characters c
    where c.id = to_character_id
      and c.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete own character relationships"
on public.character_relationships;

create policy "Users can delete own character relationships"
on public.character_relationships
for delete
to authenticated
using ((select auth.uid()) = user_id);




create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.profiles(id) on delete cascade,

  title text,
  chat_type text not null default 'single',
  character_id uuid references public.characters(id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chat_threads_chat_type_check
    check (chat_type in ('single', 'group'))
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.profiles(id) on delete cascade,
  thread_id uuid not null references public.chat_threads(id) on delete cascade,

  character_id uuid references public.characters(id) on delete set null,

  sender_type text not null,
  content text not null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint chat_messages_sender_type_check
    check (sender_type in ('user', 'character', 'system'))
);

drop trigger if exists set_chat_threads_updated_at
on public.chat_threads;

create trigger set_chat_threads_updated_at
before update on public.chat_threads
for each row execute function public.set_updated_at();

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Users can view own chat threads"
on public.chat_threads;

create policy "Users can view own chat threads"
on public.chat_threads
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own chat threads"
on public.chat_threads;

create policy "Users can insert own chat threads"
on public.chat_threads
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own chat threads"
on public.chat_threads;

create policy "Users can update own chat threads"
on public.chat_threads
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own chat threads"
on public.chat_threads;

create policy "Users can delete own chat threads"
on public.chat_threads
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own chat messages"
on public.chat_messages;

create policy "Users can view own chat messages"
on public.chat_messages
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own chat messages"
on public.chat_messages;

create policy "Users can insert own chat messages"
on public.chat_messages
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.chat_threads t
    where t.id = thread_id
      and t.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete own chat messages"
on public.chat_messages;

create policy "Users can delete own chat messages"
on public.chat_messages
for delete
to authenticated
using ((select auth.uid()) = user_id);




create index if not exists usage_events_user_type_created_at_idx
on public.usage_events (user_id, event_type, created_at desc);




create table if not exists public.chat_thread_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,

  summary_text text not null default '',
  important_facts jsonb not null default '[]'::jsonb,
  open_questions jsonb not null default '[]'::jsonb,
  user_preferences jsonb not null default '[]'::jsonb,

  summarized_until_message_id uuid references public.chat_messages(id) on delete set null,
  summarized_until_created_at timestamptz,
  summarized_message_count integer not null default 0,

  summary_version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chat_thread_summaries_thread_unique unique (thread_id),
  constraint chat_thread_summaries_summarized_message_count_check
    check (summarized_message_count >= 0)
);

create index if not exists chat_thread_summaries_user_id_idx
  on public.chat_thread_summaries (user_id);

create index if not exists chat_thread_summaries_thread_id_idx
  on public.chat_thread_summaries (thread_id);

create index if not exists chat_thread_summaries_character_id_idx
  on public.chat_thread_summaries (character_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_chat_thread_summaries_updated_at
  on public.chat_thread_summaries;

create trigger set_chat_thread_summaries_updated_at
before update on public.chat_thread_summaries
for each row
execute function public.set_updated_at();

alter table public.chat_thread_summaries enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'chat_thread_summaries'
      and policyname = 'Users can read their own chat thread summaries'
  ) then
    create policy "Users can read their own chat thread summaries"
      on public.chat_thread_summaries
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'chat_thread_summaries'
      and policyname = 'Users can insert their own chat thread summaries'
  ) then
    create policy "Users can insert their own chat thread summaries"
      on public.chat_thread_summaries
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'chat_thread_summaries'
      and policyname = 'Users can update their own chat thread summaries'
  ) then
    create policy "Users can update their own chat thread summaries"
      on public.chat_thread_summaries
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'chat_thread_summaries'
      and policyname = 'Users can delete their own chat thread summaries'
  ) then
    create policy "Users can delete their own chat thread summaries"
      on public.chat_thread_summaries
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;





alter table public.profiles
add column if not exists active_character_id uuid
references public.characters(id)
on delete set null;

alter table public.profiles
add column if not exists character_limit_choice_locked boolean
not null default false;

create index if not exists profiles_active_character_id_idx
on public.profiles(active_character_id);




alter table public.characters
add column if not exists image_url text;

alter table public.characters
add column if not exists image_storage_path text;

alter table public.characters
add column if not exists image_prompt text;

alter table public.characters
add column if not exists image_generated_at timestamptz;

alter table public.characters
add column if not exists image_generation_error text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'character-images',
  'character-images',
  true,
  10485760,
  array['image/png', 'image/webp', 'image/jpeg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Character images are publicly readable"
on storage.objects;

create policy "Character images are publicly readable"
on storage.objects
for select
using (
  bucket_id = 'character-images'
);

drop policy if exists "Users can upload own character images"
on storage.objects;

create policy "Users can upload own character images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'character-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own character images"
on storage.objects;

create policy "Users can update own character images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'character-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'character-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own character images"
on storage.objects;

create policy "Users can delete own character images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'character-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);



create extension if not exists pgcrypto;

alter table public.characters
add column if not exists background_image_id uuid;

alter table public.characters
add column if not exists icon_image_id uuid;

alter table public.characters
add column if not exists icon_image_url text;

alter table public.characters
add column if not exists icon_image_storage_path text;

create table if not exists public.character_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  art_style_preset_id uuid references public.art_style_presets(id) on delete set null,
  image_url text not null,
  storage_path text not null,
  image_prompt text,
  image_quality text not null default 'medium',
  credit_cost integer not null default 1,
  is_background_selected boolean not null default false,
  is_icon_selected boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists character_images_user_id_idx
on public.character_images(user_id);

create index if not exists character_images_character_id_idx
on public.character_images(character_id);

create table if not exists public.image_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free',
  source text not null,
  amount integer not null,
  expires_at timestamptz,
  related_character_id uuid references public.characters(id) on delete set null,
  related_image_id uuid references public.character_images(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists image_credit_transactions_user_id_idx
on public.image_credit_transactions(user_id);

create index if not exists image_credit_transactions_expires_at_idx
on public.image_credit_transactions(expires_at);

alter table public.character_images enable row level security;
alter table public.image_credit_transactions enable row level security;

drop policy if exists "Users can read own character images"
on public.character_images;

create policy "Users can read own character images"
on public.character_images
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own character images"
on public.character_images;

create policy "Users can insert own character images"
on public.character_images
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own character images"
on public.character_images;

create policy "Users can update own character images"
on public.character_images
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own character images"
on public.character_images;

create policy "Users can delete own character images"
on public.character_images
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own image credit transactions"
on public.image_credit_transactions;

create policy "Users can read own image credit transactions"
on public.image_credit_transactions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own image credit transactions"
on public.image_credit_transactions;

create policy "Users can insert own image credit transactions"
on public.image_credit_transactions
for insert
to authenticated
with check (auth.uid() = user_id);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'character-images',
  'character-images',
  true,
  10485760,
  array['image/png', 'image/webp', 'image/jpeg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Character images are publicly readable"
on storage.objects;

create policy "Character images are publicly readable"
on storage.objects
for select
using (
  bucket_id = 'character-images'
);

drop policy if exists "Users can upload own character images"
on storage.objects;

create policy "Users can upload own character images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'character-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own character images"
on storage.objects;

create policy "Users can update own character images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'character-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'character-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own character images"
on storage.objects;

create policy "Users can delete own character images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'character-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);



update public.art_style_presets
set
  name = '乙女ゲーム風',
  description = '繊細な線、華やかな瞳、やわらかい光で描く、乙女ゲーム寄りの美麗イラストスタイル。',
  prompt_template = 'otome game inspired original character illustration, elegant and delicate linework, beautiful expressive eyes, soft romantic lighting, polished Japanese visual novel style, refined colors, clean white background, non-photorealistic anime illustration',
  safety_note = 'オリジナルキャラクター専用。実在人物、既存キャラクター、特定作品風、特定作家風、写真風、フォトリアルは禁止。',
  sort_order = 10,
  is_active = true
where slug = 'midnight_anime';

insert into public.art_style_presets (
  slug,
  name,
  description,
  prompt_template,
  safety_note,
  is_active,
  sort_order
)
values
  (
    'shonen_manga',
    '少年漫画風',
    '力強い輪郭、はっきりした表情、アクション感のある少年漫画寄りのスタイル。',
    'shonen manga inspired original character illustration, bold linework, energetic expression, clear silhouette, dynamic but clean character design, strong contrast, clean white background, non-photorealistic anime illustration',
    'オリジナルキャラクター専用。実在人物、既存キャラクター、特定作品風、特定作家風、写真風、フォトリアルは禁止。',
    true,
    20
  ),
  (
    'light_novel',
    'ライトノベル風',
    '透明感のある塗りと現代的なキャラクターデザインで、物語性を出しやすいスタイル。',
    'light novel style original character illustration, soft transparent coloring, modern anime character design, delicate shading, emotional atmosphere, clean white background, polished non-photorealistic illustration',
    'オリジナルキャラクター専用。実在人物、既存キャラクター、特定作品風、特定作家風、写真風、フォトリアルは禁止。',
    true,
    30
  ),
  (
    'cel_anime',
    'アニメ風（セル画調）',
    'くっきりした影と色面で見やすく仕上げる、定番アニメ風のスタイル。',
    'cel anime style original character illustration, clean flat colors, crisp shadows, clear outlines, classic animation look, readable expression, clean white background, non-photorealistic anime illustration',
    'オリジナルキャラクター専用。実在人物、既存キャラクター、特定作品風、特定作家風、写真風、フォトリアルは禁止。',
    true,
    40
  ),
  (
    'webtoon',
    'Webtoon風',
    'スマホ画面で映える、輪郭と色がはっきりした縦読み漫画風のスタイル。',
    'webtoon style original character illustration, clean bold outlines, vivid colors, modern mobile-friendly character art, bright polished finish, clean white background, non-photorealistic illustration',
    'オリジナルキャラクター専用。実在人物、既存キャラクター、特定作品風、特定作家風、写真風、フォトリアルは禁止。',
    true,
    50
  ),
  (
    'chibi',
    'ミニキャラ',
    '二頭身にデフォルメした、かわいく親しみやすいミニキャラスタイル。',
    'chibi style original character illustration, super deformed two-head-tall proportions, large expressive head, tiny cute body, full body visible, adorable simplified design, clean white background, non-photorealistic anime illustration',
    'オリジナルキャラクター専用。実在人物、既存キャラクター、特定作品風、特定作家風、写真風、フォトリアルは禁止。',
    true,
    60
  ),
  (
    'fantasy',
    'ファンタジー風',
    '魔法、騎士、精霊、異世界風の衣装や雰囲気に合う幻想的なスタイル。',
    'fantasy style original character illustration, magical atmosphere, elegant fantasy costume details, refined accessories, soft luminous lighting, beautiful character portrait, clean white background, non-photorealistic anime illustration',
    'オリジナルキャラクター専用。実在人物、既存キャラクター、特定作品風、特定作家風、写真風、フォトリアルは禁止。',
    true,
    70
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  prompt_template = excluded.prompt_template,
  safety_note = excluded.safety_note,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;




  create table if not exists public.group_chat_members (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  display_order integer not null default 0,
  joined_at timestamp with time zone not null default now(),

  constraint group_chat_members_unique_character unique (thread_id, character_id)
);

create index if not exists group_chat_members_thread_id_idx
  on public.group_chat_members(thread_id);

create index if not exists group_chat_members_user_id_idx
  on public.group_chat_members(user_id);

create index if not exists group_chat_members_character_id_idx
  on public.group_chat_members(character_id);

alter table public.group_chat_members enable row level security;

drop policy if exists "Users can read own group chat members"
  on public.group_chat_members;

create policy "Users can read own group chat members"
  on public.group_chat_members
  for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert own group chat members"
  on public.group_chat_members;

create policy "Users can insert own group chat members"
  on public.group_chat_members
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.chat_threads t
      where t.id = thread_id
        and t.user_id = auth.uid()
        and t.chat_type = 'group'
    )
    and exists (
      select 1
      from public.characters c
      where c.id = character_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own group chat members"
  on public.group_chat_members;

create policy "Users can update own group chat members"
  on public.group_chat_members
  for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.chat_threads t
      where t.id = thread_id
        and t.user_id = auth.uid()
        and t.chat_type = 'group'
    )
    and exists (
      select 1
      from public.characters c
      where c.id = character_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own group chat members"
  on public.group_chat_members;

create policy "Users can delete own group chat members"
  on public.group_chat_members
  for delete
  using (user_id = auth.uid());