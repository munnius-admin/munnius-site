-- Prepara o modelo normalizado para a etapa de pré-qualificação do mini CRM.
-- Este arquivo é idempotente no sentido operacional: aplique uma única vez,
-- depois da fundação, quando as tabelas normalizadas começarem a ser usadas.

alter type public.lead_status add value if not exists 'qualified' after 'follow_up';

alter table public.leads
  add column if not exists interest text,
  add column if not exists location text,
  add column if not exists temperature text
    check (temperature is null or temperature in ('cold', 'warm', 'hot'));

comment on column public.leads.interest is
  'Procedimento ou principal interesse, em texto curto.';

comment on column public.leads.location is
  'Cidade ou região informada durante a pré-qualificação.';

comment on column public.leads.temperature is
  'Sinal simples de intenção: cold, warm ou hot.';
