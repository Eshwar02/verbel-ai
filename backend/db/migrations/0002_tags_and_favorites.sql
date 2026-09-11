-- 0002_tags_and_favorites.sql
-- Adds tags to history rows and a per-user favorite-voices table (RLS).

alter table public.speech_history
    add column if not exists tags text[] not null default '{}';

create table if not exists public.favorite_voices (
    user_id    uuid not null references auth.users (id) on delete cascade,
    voice_id   text not null,
    created_at timestamptz not null default now(),
    primary key (user_id, voice_id)
);

alter table public.favorite_voices enable row level security;

drop policy if exists "favorite_voices_select_own" on public.favorite_voices;
create policy "favorite_voices_select_own"
    on public.favorite_voices for select using (auth.uid() = user_id);

drop policy if exists "favorite_voices_insert_own" on public.favorite_voices;
create policy "favorite_voices_insert_own"
    on public.favorite_voices for insert with check (auth.uid() = user_id);

drop policy if exists "favorite_voices_delete_own" on public.favorite_voices;
create policy "favorite_voices_delete_own"
    on public.favorite_voices for delete using (auth.uid() = user_id);
