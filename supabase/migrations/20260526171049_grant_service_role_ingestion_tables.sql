-- Edge Functions authenticate as service_role. service_role bypasses RLS but
-- still needs GRANT privileges on tables. New tables created via SQL editor
-- or migrations don't automatically receive these unless default privileges
-- are configured at the schema level.

grant select, insert, update, delete on public.documents         to service_role;
grant select, insert, update, delete on public.ingestion_jobs    to service_role;
grant select, insert, update, delete on public.chunks            to service_role;
grant select, insert, update, delete on public.chunk_embeddings  to service_role;

-- Ensure any future tables in public also inherit these grants.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
