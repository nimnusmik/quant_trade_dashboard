-- Allow the deployed Vercel dashboard to read the imported data with the Supabase anon key.
-- Paste this into Supabase SQL Editor and run it once after creating/importing the tables.

begin;

grant usage on schema public to anon;
grant select on table public.trades to anon;
grant select on table public.strategy_metrics to anon;
grant select on table public.monitor_universe to anon;

alter table public.trades enable row level security;
alter table public.strategy_metrics enable row level security;
alter table public.monitor_universe enable row level security;

drop policy if exists "dashboard can read trades" on public.trades;
create policy "dashboard can read trades"
  on public.trades
  for select
  to anon
  using (true);

drop policy if exists "dashboard can read strategy metrics" on public.strategy_metrics;
create policy "dashboard can read strategy metrics"
  on public.strategy_metrics
  for select
  to anon
  using (true);

drop policy if exists "dashboard can read monitor universe" on public.monitor_universe;
create policy "dashboard can read monitor universe"
  on public.monitor_universe
  for select
  to anon
  using (true);

commit;

select 'trades' as table_name, count(*) from public.trades
union all select 'strategy_metrics', count(*) from public.strategy_metrics
union all select 'monitor_universe', count(*) from public.monitor_universe;
