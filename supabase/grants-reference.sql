-- ============================================================================
-- B.L.I.N.K. — Supabase Data API Grants Reference
-- ============================================================================
-- Project ref: wdprtbmhekougwnkpcdu   (https://wdprtbmhekougwnkpcdu.supabase.co)
--
-- WHY THIS FILE EXISTS
-- Supabase is changing the Data API default: tables created in the "public"
-- schema are NO LONGER auto-exposed to supabase-js / PostgREST / GraphQL. After
-- the cutoff, every NEW public table needs an explicit GRANT before the app can
-- read or write it. If a grant is missing, PostgREST returns error 42501 with
-- the exact GRANT statement to run.
--   - New projects:                       enforced 2026-05-30
--   - Existing projects (this one):       enforced 2026-10-30
--
-- IMPORTANT — EXISTING TABLES ARE SAFE
-- The 6 tables documented at the bottom already exist and already have grants;
-- existing tables KEEP their grants, so nothing here is required to keep the app
-- working today. The per-table blocks are REFERENCE ONLY (the project's intended
-- security model, useful for re-creation/migration). Do NOT blindly re-run them
-- against the live DB — Postgres has no `CREATE POLICY IF NOT EXISTS`, so a
-- second run errors on duplicate policy names.
--
-- WHEN TO USE THIS FILE
-- Whenever you create a NEW public table after 2026-10-30, copy the TEMPLATE
-- block below, rename the table/columns, keep only the grants/policies the table
-- needs, and run it in the Supabase SQL editor.
--
-- ROLES
--   anon          = logged-out visitors (the app's public, pre-login reads)
--   authenticated = signed-in users
--   service_role  = server-side, bypasses RLS. The BLINK client app does NOT use
--                   it (there is no server). Included per Supabase's standard
--                   template; optional for a client-only table.
-- ============================================================================


-- ============================================================================
-- TEMPLATE — run this whenever you create a NEW public table after 2026-10-30
-- ============================================================================
-- 1) Expose the table to the Data API roles (this is the part the change is about)
grant select                         on public.your_table to anon;
grant select, insert, update, delete on public.your_table to authenticated;
grant select, insert, update, delete on public.your_table to service_role;

-- 2) Enable Row Level Security. Grants expose the table; RLS restricts the rows.
--    Without RLS, a grant exposes EVERY row to that role.
alter table public.your_table enable row level security;

-- 3) Add policies. Example below = "each user can only touch their own rows".
--    drop-then-create keeps this re-runnable (no CREATE POLICY IF NOT EXISTS).
drop policy if exists "your_table - select own" on public.your_table;
create policy "your_table - select own" on public.your_table
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "your_table - write own" on public.your_table;
create policy "your_table - write own" on public.your_table
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
-- ============================================================================


-- ============================================================================
-- REFERENCE — the 6 current tables (already applied; do NOT re-run as-is)
-- ============================================================================
-- Documents the intended grant + RLS model so it can be reproduced if the
-- project is ever migrated/recreated. Mirrors the access seen in core/supabase.js
-- and config/save-load.js.

-- ----------------------------------------------------------------------------
-- community_panels  /  community_processors   (public, crowd-sourced libraries)
-- ----------------------------------------------------------------------------
-- Access:
--   anon          SELECT  — approved rows only; also the startup keep-alive ping
--   authenticated SELECT  — browse approved + own submissions
--                 INSERT  — submit a new panel/processor (status = 'pending')
--                 UPDATE  — own rows (edit/own download_count) + admin approve/reject
grant select                 on public.community_panels     to anon;
grant select, insert, update on public.community_panels     to authenticated;
grant select, insert, update on public.community_panels     to service_role;

grant select                 on public.community_processors to anon;
grant select, insert, update on public.community_processors to authenticated;
grant select, insert, update on public.community_processors to service_role;

-- RLS intent (both community_* tables):
--   read:   using (status = 'approved')                       -- public, approved only
--           OR submitted_by = auth.uid()                      -- see your own pending/rejected
--           OR <admin>                                        -- admins see all pending
--   insert: with check (submitted_by = auth.uid())
--   update: using (submitted_by = auth.uid())                 -- original submitter edits own
--           plus a separate admin approve/reject policy.
--   NOTE: the admin check (approve/reject) is enforced by the LIVE dashboard
--   policies — it keys off the user's identity (JWT email / an admin table), not
--   the client-side ADMIN_EMAILS list in core/supabase.js. Reproduce it from the
--   dashboard's existing policy definition; it is not duplicated here to avoid
--   documenting a mechanism that may differ from what is live.

-- ----------------------------------------------------------------------------
-- user_custom_panels  /  user_custom_processors  /  user_downloads  /  user_projects
-- ----------------------------------------------------------------------------
-- Access (all four): authenticated only, every row scoped to user_id. No anon.
--   user_custom_panels / user_custom_processors : SELECT, upsert (INSERT/UPDATE),
--                                                  soft delete via is_deleted flag
--   user_downloads                               : upsert (INSERT/UPDATE)
--   user_projects                                : SELECT, INSERT, UPDATE,
--                                                  soft delete via is_deleted flag
grant select, insert, update, delete on public.user_custom_panels     to authenticated;
grant select, insert, update, delete on public.user_custom_panels     to service_role;

grant select, insert, update, delete on public.user_custom_processors to authenticated;
grant select, insert, update, delete on public.user_custom_processors to service_role;

grant select, insert, update, delete on public.user_downloads         to authenticated;
grant select, insert, update, delete on public.user_downloads         to service_role;

grant select, insert, update, delete on public.user_projects          to authenticated;
grant select, insert, update, delete on public.user_projects          to service_role;

-- RLS intent (all four user_* tables):
--   for all to authenticated
--   using (auth.uid() = user_id)
--   with check (auth.uid() = user_id)
-- Soft deletes (is_deleted = true) are filtered by the app's SELECT queries, not
-- by RLS.
-- ============================================================================
