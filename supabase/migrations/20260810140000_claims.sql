-- ─────────────────────────────────────────────────────────────────────────────
-- Noli — Table claims (sinistres déclarés sur un contrat) + RLS.
-- ─────────────────────────────────────────────────────────────────────────────
-- Le client déclare un sinistre lié à l'un de ses contrats. L'assureur en suit
-- et met à jour le statut (en cours d'examen, approuvé, rejeté, clôturé).
-- ─────────────────────────────────────────────────────────────────────────────
create table public.claims (
  id bigint generated always as identity primary key,
  reference text not null unique, -- NOLI-SIN-XXXXXX
  contract_id bigint not null references public.contracts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  insurer_id bigint not null references public.insurers (id) on delete cascade,
  type text not null, -- ACCIDENT | VOL | BRIS_GLACE | INCENDIE | AUTRE
  description text not null,
  incident_date date,
  status text not null default 'SUBMITTED', -- SUBMITTED | IN_REVIEW | APPROVED | REJECTED | CLOSED
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint claims_status_check check (status in ('SUBMITTED','IN_REVIEW','APPROVED','REJECTED','CLOSED'))
);

comment on table public.claims is
  'Sinistres déclarés par les clients sur leurs contrats, suivis par l''assureur.';

create trigger claims_set_updated_at
  before update on public.claims
  for each row execute function public.set_updated_at();

create index claims_profile_id_idx on public.claims (profile_id);
create index claims_insurer_id_idx on public.claims (insurer_id);
create index claims_contract_id_idx on public.claims (contract_id);
create index claims_status_idx on public.claims (status);

alter table public.claims enable row level security;

-- RLS : le client voit et crée ses propres sinistres.
create policy "Users can view their own claims"
on public.claims
for select
to authenticated
using ((select auth.uid()) = profile_id);

-- Défense en profondeur : non seulement le sinistre doit porter son propre
-- profile_id, mais le contrat référencé doit lui appartenir ET son insurer_id
-- doit correspondre à celui du contrat (empêche un contract_id/insurer_id forgé
-- si un jour une écriture via clé anon est ajoutée).
create policy "Users can create their own claims"
on public.claims
for insert
to authenticated
with check (
  (select auth.uid()) = profile_id
  and exists (
    select 1
    from public.contracts
    where contracts.id = claims.contract_id
      and contracts.profile_id = (select auth.uid())
      and contracts.insurer_id = claims.insurer_id
  )
);

-- RLS : l'assureur voit les sinistres liés à ses contrats.
create policy "Insurers can view claims on their contracts"
on public.claims
for select
to authenticated
using (
  exists (
    select 1
    from public.insurer_accounts
    where insurer_accounts.profile_id = (select auth.uid())
      and insurer_accounts.insurer_id = claims.insurer_id
  )
);

-- RLS : l'assureur met à jour le statut des sinistres de ses contrats.
create policy "Insurers can update claims on their contracts"
on public.claims
for update
to authenticated
using (
  exists (
    select 1
    from public.insurer_accounts
    where insurer_accounts.profile_id = (select auth.uid())
      and insurer_accounts.insurer_id = claims.insurer_id
  )
);

-- RLS : les admins gèrent tous les sinistres.
create policy "Admins manage all claims"
on public.claims
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
