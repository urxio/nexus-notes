-- ─── Locus Notes — Supabase Schema ───────────────────────────────────────────
-- Run this in your Supabase project → SQL Editor → New query

-- ── Notes ─────────────────────────────────────────────────────────────────────
create table if not exists notes (
    id          text        primary key,
    user_id     uuid        references auth.users(id) on delete cascade not null,
    title       text        not null default '',
    emoji       text        not null default 'FileText',
    color       text        not null default '',
    blocks      jsonb       not null default '[]'::jsonb,
    tags        text[]      not null default '{}',
    properties  jsonb       not null default '[]'::jsonb,
    created_at  bigint      not null default 0,
    updated_at  bigint      not null default 0,
    person_id   text,
    folder_id   text,
    trashed_at  bigint,
    note_type   text,
    due_date    text,
    last_viewed text
);

-- ── People ─────────────────────────────────────────────────────────────────────
create table if not exists people (
    id      text    primary key,
    user_id uuid    references auth.users(id) on delete cascade not null,
    name    text    not null default '',
    emoji   text    not null default '👤',
    note_id text,
    type_id text
);

-- ── Folders ────────────────────────────────────────────────────────────────────
create table if not exists folders (
    id         text    primary key,
    user_id    uuid    references auth.users(id) on delete cascade not null,
    name       text    not null default '',
    emoji      text    not null default 'Folder',
    parent_id  text,
    created_at bigint  not null default 0
);

-- ── Custom Object Types ────────────────────────────────────────────────────────
create table if not exists object_types (
    id         text    primary key,
    user_id    uuid    references auth.users(id) on delete cascade not null,
    name       text    not null,
    emoji      text    not null,
    is_builtin boolean default false
);

-- ── Deleted Object Type IDs (user-deleted built-ins) ──────────────────────────
create table if not exists deleted_object_types (
    user_id uuid    references auth.users(id) on delete cascade not null,
    type_id text    not null,
    primary key (user_id, type_id)
);

-- ── Inbox Items ────────────────────────────────────────────────────────────────
create table if not exists inbox (
    id        text    primary key,
    user_id   uuid    references auth.users(id) on delete cascade not null,
    note_id   text    not null,
    type      text    not null,
    subject   text    not null,
    sender    text    not null,
    preview   text    not null,
    timestamp text    not null,
    read      boolean not null default false
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table notes                enable row level security;
alter table people               enable row level security;
alter table folders              enable row level security;
alter table object_types         enable row level security;
alter table deleted_object_types enable row level security;
alter table inbox                enable row level security;

-- Notes policies
create policy "notes: users manage their own"
    on notes for all
    using  (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- People policies
create policy "people: users manage their own"
    on people for all
    using  (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Folders policies
create policy "folders: users manage their own"
    on folders for all
    using  (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Object types policies
create policy "object_types: users manage their own"
    on object_types for all
    using  (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Deleted object types policies
create policy "deleted_object_types: users manage their own"
    on deleted_object_types for all
    using  (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Inbox policies
create policy "inbox: users manage their own"
    on inbox for all
    using  (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- ─── Performance Indexes ──────────────────────────────────────────────────────
create index if not exists notes_user_id_idx        on notes        (user_id);
create index if not exists notes_updated_at_idx     on notes        (updated_at desc);
create index if not exists people_user_id_idx       on people       (user_id);
create index if not exists folders_user_id_idx      on folders      (user_id);
create index if not exists object_types_user_id_idx on object_types (user_id);
create index if not exists inbox_user_id_idx        on inbox        (user_id);
