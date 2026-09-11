-- 0001_history.sql
-- Cloud-synced speech generation history with per-user Row Level Security.

create table if not exists public.speech_history (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references auth.users (id) on delete cascade,
    text_preview text not null,
    language     text not null,
    voice        text not null,
    audio_url    text not null,
    created_at   timestamptz not null default now()
);

-- Fast lookups of a user's history, newest first.
create index if not exists speech_history_user_created_idx
    on public.speech_history (user_id, created_at desc);

-- Enable Row Level Security so users only ever see their own rows.
alter table public.speech_history enable row level security;

-- A user can read their own rows.
drop policy if exists "speech_history_select_own" on public.speech_history;
create policy "speech_history_select_own"
    on public.speech_history
    for select
    using (auth.uid() = user_id);

-- A user can insert rows only for themselves.
drop policy if exists "speech_history_insert_own" on public.speech_history;
create policy "speech_history_insert_own"
    on public.speech_history
    for insert
    with check (auth.uid() = user_id);

-- A user can delete only their own rows.
drop policy if exists "speech_history_delete_own" on public.speech_history;
create policy "speech_history_delete_own"
    on public.speech_history
    for delete
    using (auth.uid() = user_id);
