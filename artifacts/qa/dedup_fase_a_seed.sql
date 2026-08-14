-- Schema mínimo + casos reais para validar limpar_parcelas_duplicadas_fase_a.sql
DROP TABLE IF EXISTS public.installments CASCADE;
DROP TABLE IF EXISTS public.loans CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.installments_backup_dedup_fase_a CASCADE;

CREATE TABLE public.clients (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    nome text NOT NULL,
    nome_completo text
);

CREATE TABLE public.loans (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    client_id uuid NOT NULL REFERENCES public.clients(id),
    amount numeric(15,2) NOT NULL,
    interest_rate numeric(5,2) NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    outstanding_amount numeric(15,2),
    start_date date NOT NULL,
    installments_count integer NOT NULL,
    model text NOT NULL DEFAULT 'PRICE',
    status text NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE public.installments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES public.clients(id),
    number integer NOT NULL,
    due_date date NOT NULL,
    amount numeric(15,2) NOT NULL,
    amount_paid numeric(15,2) DEFAULT 0,
    interest_amount numeric(15,2),
    principal_amount numeric(15,2),
    promised_payment_reason text,
    promised_payment_amount numeric(15,2),
    promised_payment_date date,
    promised_payment_history jsonb DEFAULT '[]'::jsonb,
    payment_history jsonb NOT NULL DEFAULT '[]'::jsonb,
    status text NOT NULL DEFAULT 'PENDING',
    paid_date date,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

\set tenant '00000000-0000-0000-0000-000000000003'

-- ---------------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------------
INSERT INTO public.clients (id, tenant_id, nome, nome_completo) VALUES
  ('647fd874-3ddb-4972-ba53-03914c6a1e2a', :'tenant', 'JOELMA', 'JOELMA TAVARES DA SILVA'),
  ('61ba29f3-bea2-415f-8432-0de53f4018c0', :'tenant', 'SOLANGE', 'SOLANGE VAZ DE CAMARGO'),
  ('c3fc6a16-654d-4f1a-9e85-7b1e084a3169', :'tenant', 'CLAUDINEI', 'CLAUDINEI EVANGELISTA'),
  ('b13d1ff3-6305-434a-a85b-c844e5ccef17', :'tenant', 'ANDRESSA', 'ANDRESSA LUIZ'),
  ('baab66ef-ce02-4bbd-be9d-9be7bb3bd696', :'tenant', 'FABIO', 'FABIO BARBOSA SILVA');

-- ---------------------------------------------------------------------------
-- CASO 1 (Joelma): PRICE 12 parcelas, 2 pagas + 10 pendentes CLONADAS
--   esperado: apaga os 10 clones pendentes, preserva as 2 pagas
-- ---------------------------------------------------------------------------
INSERT INTO public.loans VALUES
  ('8257041b-c6a4-4acb-8552-c71f0ca3755e', :'tenant', '647fd874-3ddb-4972-ba53-03914c6a1e2a',
   4040, 10, 4848, 9999, '2026-06-09', 12, 'PRICE', 'ACTIVE');

-- 2 pagas (uma linha cada, sem clone)
INSERT INTO public.installments
  (tenant_id, loan_id, client_id, number, due_date, amount, amount_paid, payment_history, status, paid_date, created_at)
SELECT :'tenant', '8257041b-c6a4-4acb-8552-c71f0ca3755e', '647fd874-3ddb-4972-ba53-03914c6a1e2a',
       n, (DATE '2026-07-09' + ((n - 1) || ' month')::interval)::date, 404, 404,
       '[{"amount":404,"interestPaid":404,"principalPaid":0,"paymentDate":"2026-08-10","createdAt":"2026-08-10T00:00:00Z"}]'::jsonb,
       'PAID', DATE '2026-08-10', TIMESTAMPTZ '2026-06-09 20:27:03+00'
FROM generate_series(1, 2) n;

-- 10 pendentes DUPLICADAS (mesma data/valor, sem dinheiro) → 20 linhas
INSERT INTO public.installments
  (tenant_id, loan_id, client_id, number, due_date, amount, amount_paid, status, created_at)
SELECT :'tenant', '8257041b-c6a4-4acb-8552-c71f0ca3755e', '647fd874-3ddb-4972-ba53-03914c6a1e2a',
       n, (DATE '2026-07-09' + ((n - 1) || ' month')::interval)::date, 404, 0, 'PENDING',
       origem.criada_em
FROM generate_series(3, 12) n
CROSS JOIN (VALUES
    (TIMESTAMPTZ '2026-06-09 20:27:03+00'),
    (TIMESTAMPTZ '2026-07-07 17:11:06+00')
) AS origem(criada_em);

-- ---------------------------------------------------------------------------
-- CASO 2 (Solange): clone com dinheiro em UMA das linhas (PAID + PENDING)
--   esperado: Fase A NÃO toca (grupo tem dinheiro) → aparece no PASSO 5
-- ---------------------------------------------------------------------------
INSERT INTO public.loans VALUES
  ('2d8738c8-1cf8-4411-a2ca-7744f6c1f209', :'tenant', '61ba29f3-bea2-415f-8432-0de53f4018c0',
   1000, 10, 1100, 500, '2026-06-09', 1, 'INTEREST_ONLY', 'ACTIVE');

INSERT INTO public.installments
  (tenant_id, loan_id, client_id, number, due_date, amount, amount_paid, payment_history, status, paid_date, created_at)
VALUES
  (:'tenant', '2d8738c8-1cf8-4411-a2ca-7744f6c1f209', '61ba29f3-bea2-415f-8432-0de53f4018c0',
   4, '2026-08-16', 100, 100,
   '[{"amount":100,"interestPaid":100,"principalPaid":0,"paymentDate":"2026-08-10","createdAt":"2026-08-10T00:00:00Z"}]'::jsonb,
   'PAID', '2026-08-10', TIMESTAMPTZ '2026-06-09 22:07:17+00'),
  (:'tenant', '2d8738c8-1cf8-4411-a2ca-7744f6c1f209', '61ba29f3-bea2-415f-8432-0de53f4018c0',
   4, '2026-08-16', 100, 0, '[]'::jsonb, 'PENDING', NULL, TIMESTAMPTZ '2026-07-20 20:43:39+00');

-- ---------------------------------------------------------------------------
-- CASO 3 (Claudinei): clone com dinheiro nas DUAS linhas (PAID + PAID)
--   esperado: Fase A NÃO toca → aparece no PASSO 5
-- ---------------------------------------------------------------------------
INSERT INTO public.loans VALUES
  ('898906ce-f149-4d3c-80d4-cb0faeeb18c9', :'tenant', 'c3fc6a16-654d-4f1a-9e85-7b1e084a3169',
   1000, 10, 1100, 200, '2026-06-02', 1, 'INTEREST_ONLY', 'ACTIVE');

INSERT INTO public.installments
  (tenant_id, loan_id, client_id, number, due_date, amount, amount_paid, payment_history, status, paid_date, created_at)
VALUES
  (:'tenant', '898906ce-f149-4d3c-80d4-cb0faeeb18c9', 'c3fc6a16-654d-4f1a-9e85-7b1e084a3169',
   3, '2026-07-01', 100, 100,
   '[{"amount":100,"interestPaid":100,"principalPaid":0,"paymentDate":"2026-08-05","createdAt":"2026-08-05T00:00:00Z"}]'::jsonb,
   'PAID', '2026-08-05', TIMESTAMPTZ '2026-06-02 13:32:47+00'),
  (:'tenant', '898906ce-f149-4d3c-80d4-cb0faeeb18c9', 'c3fc6a16-654d-4f1a-9e85-7b1e084a3169',
   3, '2026-07-01', 100, 100,
   '[{"amount":100,"interestPaid":100,"principalPaid":0,"paymentDate":"2026-08-05","createdAt":"2026-08-05T00:00:00Z"}]'::jsonb,
   'PAID', '2026-08-05', TIMESTAMPTZ '2026-07-28 17:27:09+00');

-- ---------------------------------------------------------------------------
-- CASO 4 (Andressa): mesmo number, datas DIFERENTES → não é clone
--   esperado: Fase A NÃO toca
-- ---------------------------------------------------------------------------
INSERT INTO public.loans VALUES
  ('79271393-7adf-40bb-84a2-c6c7b26ef743', :'tenant', 'b13d1ff3-6305-434a-a85b-c844e5ccef17',
   1850, 10, 2220, 1000, '2026-05-21', 6, 'PRICE', 'ACTIVE');

INSERT INTO public.installments
  (tenant_id, loan_id, client_id, number, due_date, amount, amount_paid, status, created_at)
VALUES
  (:'tenant', '79271393-7adf-40bb-84a2-c6c7b26ef743', 'b13d1ff3-6305-434a-a85b-c844e5ccef17',
   4, '2026-08-29', 370, 0, 'PENDING', TIMESTAMPTZ '2026-05-21 13:23:09+00'),
  (:'tenant', '79271393-7adf-40bb-84a2-c6c7b26ef743', 'b13d1ff3-6305-434a-a85b-c844e5ccef17',
   4, '2026-10-29', 370, 0, 'PENDING', TIMESTAMPTZ '2026-07-07 17:27:05+00');

-- ---------------------------------------------------------------------------
-- CASO 5 (Fabio): clone PENDING/PENDING sem dinheiro (1 grupo)
--   esperado: apaga 1 linha
-- ---------------------------------------------------------------------------
INSERT INTO public.loans VALUES
  ('1ab53b3b-3d9b-49f8-a871-525856558724', :'tenant', 'baab66ef-ce02-4bbd-be9d-9be7bb3bd696',
   20000, 10, 22000, 30000, '2026-07-16', 1, 'INTEREST_ONLY', 'ACTIVE');

INSERT INTO public.installments
  (tenant_id, loan_id, client_id, number, due_date, amount, amount_paid, status, created_at)
VALUES
  (:'tenant', '1ab53b3b-3d9b-49f8-a871-525856558724', 'baab66ef-ce02-4bbd-be9d-9be7bb3bd696',
   3, '2026-08-10', 2000, 0, 'PENDING', TIMESTAMPTZ '2026-07-16 15:29:24+00'),
  (:'tenant', '1ab53b3b-3d9b-49f8-a871-525856558724', 'baab66ef-ce02-4bbd-be9d-9be7bb3bd696',
   3, '2026-08-10', 2000, 0, 'PENDING', TIMESTAMPTZ '2026-07-20 20:48:54+00');

-- ---------------------------------------------------------------------------
-- CASO 6: clone PENDING/PENDING sem dinheiro, mas com PROMESSA de pagamento
--   esperado: Fase A NÃO toca (acordo com o cliente na linha mais nova)
-- ---------------------------------------------------------------------------
INSERT INTO public.clients (id, tenant_id, nome, nome_completo) VALUES
  ('107dca74-358b-4d32-8ba1-9143ad493dc2', :'tenant', 'ILIDIO', 'ILIDIO FRANCISCO ANACLETO');

INSERT INTO public.loans VALUES
  ('cb684cad-96cf-422a-99a9-db7e12de6ad2', :'tenant', '107dca74-358b-4d32-8ba1-9143ad493dc2',
   1800, 10, 2010, 2010, '2026-06-26', 1, 'INTEREST_ONLY', 'ACTIVE');

INSERT INTO public.installments
  (tenant_id, loan_id, client_id, number, due_date, amount, amount_paid, status,
   promised_payment_reason, promised_payment_amount, promised_payment_date,
   promised_payment_history, created_at)
VALUES
  (:'tenant', 'cb684cad-96cf-422a-99a9-db7e12de6ad2', '107dca74-358b-4d32-8ba1-9143ad493dc2',
   4, '2026-08-21', 215.28, 0, 'PENDING',
   NULL, NULL, NULL, '[]'::jsonb, TIMESTAMPTZ '2026-06-26 16:19:34+00'),
  (:'tenant', 'cb684cad-96cf-422a-99a9-db7e12de6ad2', '107dca74-358b-4d32-8ba1-9143ad493dc2',
   4, '2026-08-21', 215.28, 0, 'PENDING',
   'Cliente pediu prazo até dia 25', 215.28, '2026-08-25',
   '[{"reason":"Cliente pediu prazo","amount":215.28,"date":"2026-08-25","createdAt":"2026-08-11T00:00:00Z"}]'::jsonb,
   TIMESTAMPTZ '2026-06-26 16:19:37+00');

SELECT 'seed pronto' AS status, COUNT(*) AS total_parcelas FROM public.installments;
