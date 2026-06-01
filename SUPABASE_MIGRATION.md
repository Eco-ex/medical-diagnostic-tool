# Supabase Setup & Migrations

This app uses **Supabase** for everything stateful:

- **Postgres** — patient data, chat, and the AI audit log (required for the app to run).
- **Storage** — uploaded PDFs and parsed markdown (only for the knowledge ingestion pipeline).
- **Edge Functions** — the knowledge ingestion pipeline (Deno) — *in development; not required for the patient-management app*.

The Next.js server connects with the **secret key**, which bypasses Row Level Security — every query runs inside a trusted API route ([lib/server/supabase.ts](lib/server/supabase.ts)).

---

## Prerequisites

- A [Supabase](https://supabase.com/) account and a project.
- The [Supabase CLI](https://supabase.com/docs/guides/cli) — needed to apply migrations and deploy Edge Functions. (The CLI bundles Deno 2 for the functions.)

---

## 1. Create a project

In the [Supabase dashboard](https://supabase.com/dashboard): **New project** → pick a name, a strong **database password**, and a region close to your users. Wait for it to finish provisioning.

## 2. Get credentials → `.env.local`

In **Project Settings → API**:

- **Project URL** → `SUPABASE_URL`
- **API Keys → Secret key** (`sb_secret_...`) → `SUPABASE_SECRET_KEY`

Copy [.env.example](.env.example) to `.env.local` and fill them in:

```env
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SECRET_KEY=<your-supabase-secret-key>
```

> ⚠️ The secret key bypasses Row Level Security. Keep it **server-only** — never put it in client code or a `NEXT_PUBLIC_*` variable.

## 3. Apply the database schema

The schema lives in [supabase/migrations/](supabase/migrations/). Apply it one of two ways.

### Option A — Supabase CLI (recommended)

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

`db push` applies any migrations the remote database hasn't run yet, in timestamp order.

### Option B — SQL editor (manual)

Open the dashboard **SQL Editor** and run each file in [supabase/migrations/](supabase/migrations/) **in timestamp order**, oldest first.

### The migrations

| File | What it does |
| --- | --- |
| `20260525173719_remote_schema.sql` | Baseline schema: all tables, enums, functions, triggers, RLS policies, and grants. |
| `20260526163726_add_vector_schema.sql` | The pgvector knowledge tables (`chunks`, `chunk_embeddings`), the `match_chunks()` search function, and the HNSW index. Authoritative at `vector(1024)`; it drops the baseline's stub versions first so it is reset-safe. |
| `20260526171049_grant_service_role_ingestion_tables.sql` | Grants `service_role` DML on the ingestion tables and sets default privileges for future tables. |

---

## Schema overview

**Enums:** `ai_kind`, `ai_status`, `app_role`, `chat_role`, `patient_sex`.

**Clinical app tables**

| Table | Purpose |
| --- | --- |
| `patients` | Patient demographics; keyed internally by UUID, addressed externally by `mrn`. |
| `vitals` | Append-only vitals readings (current = most recent). |
| `medical_records` | Per-patient history entries. |
| `treatments` | Treatments; deleting one cascade-deletes its outcomes. |
| `outcomes` | Outcomes linked to a treatment. |
| `conversations` | Chat sessions; one active (non-archived) conversation per patient. |
| `chat_messages` | Messages within a conversation. |
| `ai_interactions` | AI audit log — full prompt, response, tokens, latency for every analysis call. |
| `profiles` | User profiles + `app_role` (forward-looking; the app currently needs no login). |

**Knowledge pipeline tables**

| Table | Purpose |
| --- | --- |
| `documents` | One row per uploaded source PDF + its pipeline status. |
| `ingestion_jobs` | Work queue (`parse_document`, `chunk_document`, `embed_batch`, `finalize_document`). |
| `chunks` | Section-aware text chunks of a parsed document. |
| `chunk_embeddings` | 1024-dim `voyage-4-large` vectors, one per chunk; HNSW cosine index. |

**Functions:** `match_chunks(query_embedding vector(1024), match_count int, filter jsonb)` — cosine similarity search over `chunk_embeddings`.

**Row Level Security:** RLS is enabled on the tables, with `authenticated full access` policies (for any future direct-from-browser access) and an `own profile` policy on `profiles`. The app's server uses the **secret key**, which bypasses RLS entirely, so these policies don't affect normal operation today.

---

## Knowledge ingestion pipeline (optional, in development)

Skip this section if you only need the patient-management app. These steps wire up the PDF → embeddings pipeline.

### 4. Create the Storage bucket

The pipeline reads/writes a **private** bucket named `knowledge` (PDFs under `pdf/`, markdown under `markdown/`). It is **not** created by a migration.

- **Dashboard:** Storage → **New bucket** → name `knowledge`, keep it **private**.
- **Or SQL:**
  ```sql
  insert into storage.buckets (id, name, public)
  values ('knowledge', 'knowledge', false)
  on conflict (id) do nothing;
  ```

(The Edge Functions access Storage with the service role, which bypasses Storage RLS, so no bucket policies are required.)

### 5. Set Edge Function secrets

```bash
supabase secrets set LLAMA_CLOUD_API_KEY=<your-llamacloud-key>
supabase secrets set VOYAGE_API_KEY=<your-voyage-key>
```

| Secret | Used by | Purpose |
| --- | --- | --- |
| `LLAMA_CLOUD_API_KEY` | `parse-document` | LlamaParse — PDF → markdown. |
| `VOYAGE_API_KEY` | `embed-batch` | Voyage AI — chunk embeddings. |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into functions automatically by the platform. See [supabase/functions/.env.example](supabase/functions/.env.example) for the local equivalents.

### 6. Deploy the Edge Functions

```bash
supabase functions deploy parse-document
supabase functions deploy chunk-document
supabase functions deploy embed-batch
supabase functions deploy finalize-document
```

All four are registered in [supabase/config.toml](supabase/config.toml) with `verify_jwt = false` (they are invoked server-to-server). `finalize-document` is still a stub — the pipeline is not yet end-to-end.

---

## Local development (optional)

To run the whole stack locally with Docker:

```bash
supabase start        # boots local Postgres, Storage, etc.
supabase db reset     # drops, recreates, and re-applies all migrations
```

`supabase status` prints the local URL and keys to put in `.env.local`. Stop with `supabase stop`.

---

## Verifying the setup

Run these in the SQL editor:

```sql
-- Core tables exist
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

-- Embeddings column is 1024-dim (matches voyage-4-large)
select format_type(a.atttypid, a.atttypmod) as embedding_type
from pg_attribute a
where a.attrelid = 'public.chunk_embeddings'::regclass
  and a.attname = 'embedding';   -- expect: vector(1024)
```

Then start the app (`npm run dev`) and add a patient — if it persists across a restart, Postgres is wired up correctly.

---

## Troubleshooting

- **`Missing SUPABASE_URL or SUPABASE_SECRET_KEY`** on startup — the server throws if either is unset. Check `.env.local`.
- **Auth/permission errors from the app** — make sure you used the **secret** key (`sb_secret_...`), not the publishable/anon key.
- **`embedding_type` shows `vector(1536)`** — an old schema is deployed. Re-apply `20260526163726_add_vector_schema.sql` (it drops and recreates the table at 1024). Safe while ingestion is greenfield.
- **`db push` reports a conflict on `chunks`/`chunk_embeddings`** — you're on an older copy of the migrations; pull the latest (the vector migration now drops the baseline stubs before recreating them).

---

For app usage see [README.md](README.md); for production deployment see [DEPLOYMENT.md](DEPLOYMENT.md).
