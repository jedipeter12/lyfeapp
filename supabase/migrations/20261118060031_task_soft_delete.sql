-- Proposed ADR-001: task-only soft deletion for the MVP.
-- L-6 is already applied; this is an additive migration. Rows remain owned by
-- their user, readable for restoration, and physically undeletable by app roles.
alter table public.tasks add column deleted_at timestamptz;
grant update (deleted_at) on public.tasks to authenticated;
