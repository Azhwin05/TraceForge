-- 0040 — Tighten EXECUTE grants on the functions added in 0038/0039
--
-- Supabase's schema default privileges auto-grant EXECUTE on new public
-- functions to anon+authenticated, so `revoke from public` alone leaves them
-- callable via /rest/v1/rpc (flagged by the security advisor). We lock ours down:
--
--   * after_material_issue_consumption — a TRIGGER function; nobody should call
--     it directly. Trigger functions fire as the owner regardless of EXECUTE
--     grants, so revoking is safe and correct.
--   * generate_material_inward_number — the app calls it as `authenticated`
--     only; anon has no reason to reach it.

revoke execute on function public.after_material_issue_consumption() from public, anon, authenticated;
revoke execute on function public.generate_material_inward_number() from anon;
