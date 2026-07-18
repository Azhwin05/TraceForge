-- 0033 — stock_balances must enforce the querying user's RLS, not the view
-- owner's (Postgres views default to definer semantics unless told otherwise).
alter view public.stock_balances set (security_invoker = true);
