create extension if not exists vector;

create table public.chunks (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references public.documents(id) on delete cascade,
  chunk_index     integer not null,
  section_path    text,
  section_heading text,
  content         text not null,
  token_count     integer,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index chunks_document_idx on public.chunks (document_id);
create index chunks_metadata_idx on public.chunks using gin (metadata);

alter table public.chunks add column content_tsv tsvector
  generated always as (to_tsvector('english', content)) stored;
create index chunks_content_tsv_idx on public.chunks using gin (content_tsv);

create table public.chunk_embeddings (
  chunk_id   uuid primary key references public.chunks(id) on delete cascade,
  model      text not null default 'voyage-4-large',          -- update if voyage-3-large
  embedding  vector(1024) not null,                            -- update if voyage-4 is different
  created_at timestamptz not null default now()
);

create index chunk_embeddings_hnsw_idx
  on public.chunk_embeddings
  using hnsw (embedding vector_cosine_ops);

create or replace function public.match_chunks(
  query_embedding vector(1024),
  match_count int default 10,
  filter jsonb default '{}'::jsonb
)
returns table (
  chunk_id     uuid,
  document_id  uuid,
  content      text,
  metadata     jsonb,
  similarity   float
)
language sql stable
as $$
  select c.id, c.document_id, c.content, c.metadata,
         1 - (ce.embedding <=> query_embedding) as similarity
  from public.chunk_embeddings ce
  join public.chunks c on c.id = ce.chunk_id
  where c.metadata @> filter
  order by ce.embedding <=> query_embedding
  limit match_count;
$$;

alter table public.chunks            enable row level security;
alter table public.chunk_embeddings  enable row level security;
