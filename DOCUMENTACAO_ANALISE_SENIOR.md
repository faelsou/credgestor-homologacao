# Análise Técnica Sênior - CredGestor

## Objetivo desta documentação
Esta análise resume como o código está organizado hoje, quais riscos técnicos já são visíveis e quais melhorias trazem maior retorno em segurança, manutenção e escalabilidade.

## Visão geral da arquitetura

- Frontend em React + Vite + TypeScript (`src/`)
- Backend em FastAPI + Supabase (`backend/`)
- Modelo multi-tenant por `tenant_id` nas tabelas
- Observabilidade já iniciada com OpenTelemetry e Prometheus
- Autenticação centralizada no Supabase com sessão e refresh token

## Como o código funciona (resumo prático)

### Frontend

- O bootstrap ocorre em `src/index.tsx` e inicializa OpenTelemetry antes de renderizar o app.
- O estado principal da aplicação está concentrado em `src/pages/App.tsx` (arquivo muito grande, centralizando regras de sessão, dados e UI).
- Comunicação HTTP fica em serviços como `src/services/api.ts` e `src/services/backendApi.ts`.
- Há fallback para modo local/localStorage quando backend não está configurado.

### Backend

- API principal em `backend/main.py`.
- Segurança por bearer token + validações de acesso por tenant (`_enforce_tenant_access`).
- Camada de acesso Supabase em `backend/supabase_client.py`.
- Endpoints genéricos por recurso (`/tenants/{tenant_id}/{resource}`) e endpoints específicos de domínio (clientes, empréstimos, parcelas, auth).

## Pontos positivos observados

- Multi-tenant está explicitamente presente em grande parte das rotas.
- Há preocupação real com observabilidade (métricas de DB, Prometheus e OTEL).
- Fluxo de login/refresh/forgot-password/reset já implementado.
- Sanitização de token no frontend e mensagens de erro mais amigáveis em várias rotas.

## Erros e riscos encontrados (prioridade alta)

## 1) Filtro incorreto em consulta com múltiplos critérios

**Arquivo:** `backend/main.py`

Na função `_apply_filters`, o `query.eq(...)` está fora do loop de filtros. Resultado: apenas o **último** filtro é aplicado.

Impacto:
- risco de retorno de dados indevidos;
- risco de quebra de isolamento multi-tenant em cenários com múltiplos filtros;
- comportamento inconsistente e difícil de rastrear.

## 2) CORS com configuração insegura/inválida para credenciais

**Arquivo:** `backend/main.py`

Configuração atual usa `ALLOWED_ORIGINS="*"` com `allow_credentials=True`.

Impacto:
- combinação inválida segundo especificação CORS para credenciais;
- browsers podem bloquear requisições de forma inconsistente;
- risco de configuração permissiva em produção.

## 3) Logs de debug excessivos e com dados sensíveis de contexto

**Arquivos:** `backend/main.py`, `src/services/api.ts`, `src/services/backendApi.ts`, `src/pages/App.tsx`

Há muitos `print`/`console.log` com email, tenant, status de autenticação e detalhes internos.

Impacto:
- vazamento de contexto sensível em logs;
- ruído operacional em produção;
- custo de troubleshooting aumenta por excesso de log não estruturado.

## 4) Tratamento de exceções genérico demais

**Arquivo:** `backend/main.py`

Há diversos `except Exception` e alguns blocos amplos suprimindo erro real.

Impacto:
- dificulta diagnóstico preciso;
- pode mascarar falhas de segurança ou dados;
- respostas inconsistentes entre endpoints.

## 5) Endpoint Slack com flexibilização perigosa de assinatura

**Arquivo:** `backend/main.py`

No fluxo de `url_verification` há permissões mesmo sem assinatura válida em alguns cenários de teste.

Impacto:
- se essa lógica escapar para produção, abre superfície de spoofing/replay;
- comportamento de segurança muda por ambiente sem forte controle central.

## 6) Arquivo App.tsx monolítico

**Arquivo:** `src/pages/App.tsx` (~3.5k linhas)

Muita responsabilidade em um único componente: autenticação, sessão, persistência, carregamento de dados, regras de negócio e UI.

Impacto:
- manutenção cara;
- alto risco de regressão;
- onboarding lento para novos devs.

## 7) Tipagem fraca (`any`) em pontos críticos

**Arquivos principais:** `src/services/backendApi.ts`, `src/services/api.ts`, `src/pages/App.tsx`

Uso frequente de `any` em payloads e mapeamentos.

Impacto:
- erros só aparecem em runtime;
- reduz ganho do TypeScript;
- aumenta bugs em integração frontend-backend.

## 8) Duplicação de lógica entre serviços de API

**Arquivos:** `src/services/api.ts` e `src/services/backendApi.ts`

Ambos repetem base URL, parse/erro, normalizações e chamadas similares.

Impacto:
- divergência de comportamento ao longo do tempo;
- correções precisam ser feitas em dois lugares;
- aumenta débito técnico de integração.

## 9) Indício de código morto/configuração inconsistente

**Arquivo:** `src/services/api.ts`

Existe `DEFAULT_TENANT_ID` hardcoded, apesar da regra atual declarar tenant obrigatório e sem fallback.

Impacto:
- ambiguidade de regra de negócio;
- chance de fallback indevido no futuro;
- dificulta entendimento da política de tenancy.

## 10) Imports duplicados

**Arquivo:** `backend/main.py`

`hmac`, `hashlib` e `time` aparecem duplicados no topo.

Impacto:
- baixa gravidade, mas sinaliza falta de revisão automatizada/lint.

## Melhorias recomendadas (roadmap)

### Fase 1 - Segurança e correção funcional (imediato)

1. Corrigir `_apply_filters` para aplicar **todos** os filtros.
2. Revisar CORS por ambiente (produção sem `*`, lista explícita de origens).
3. Endurecer endpoint Slack (assinatura obrigatória em produção).
4. Reduzir logs sensíveis e migrar para logger estruturado com níveis (`debug/info/warn/error`).

### Fase 2 - Qualidade de código

1. Quebrar `App.tsx` em módulos (estado de sessão, carregamento de dados, ações de domínio, layout).
2. Criar camada HTTP única no frontend (ex: `httpClient.ts`) e remover duplicações.
3. Substituir `any` por tipos de DTO (request/response) para clientes, empréstimos, parcelas e usuários.

### Fase 3 - Resiliência e governança

1. Adicionar testes automatizados:
   - backend: testes de autorização por tenant e regressão de filtros;
   - frontend: testes de mapeamento/normalização e fluxos de sessão.
2. Padronizar erros de API com contrato único.
3. Definir política de observabilidade (campos permitidos em log + correlação de request).

## Quick wins (baixo esforço, alto impacto)

- Corrigir imports duplicados no backend.
- Remover `console.log` de produção e usar flag de ambiente.
- Eliminar constantes/fallbacks obsoletos (`DEFAULT_TENANT_ID` não usado).
- Criar checklist de PR com itens de segurança multi-tenant.

## Checklist de revisão contínua

- [ ] Toda query que acessa tabela tenant-scoped filtra por `tenant_id`.
- [ ] Nenhum endpoint de escrita aceita `tenant_id` sem validação de contexto.
- [ ] Sem `any` em payloads críticos de autenticação e financeiro.
- [ ] Sem logs com token, senha, email completo em produção.
- [ ] CORS estrito em produção.

## Conclusão executiva

O projeto já possui base sólida e boa direção arquitetural (multi-tenant + observabilidade). O principal risco atual não é falta de funcionalidade, e sim **consistência de segurança/qualidade em pontos críticos**. Corrigindo os itens da Fase 1 e iniciando a modularização do frontend, a plataforma ganha previsibilidade, reduz risco de vazamento entre tenants e acelera evolução do produto.

## Correção aplicada: Datas sem fuso e cronograma determinístico

### Problema
- Divergência entre “data do empréstimo” e “datas de pagamento/parcelas” causada por:
  - Interpretação de `YYYY-MM-DD` via `new Date(...)` (aplicando fuso/UTC).
  - Cálculo da 1ª parcela não ancorado corretamente na `firstDueDate`.
  - Ordenações e comparações usando `new Date(string)` em vez de comparação determinística.

### Solução implementada
- Padronização de datas como strings `YYYY-MM-DD` e normalização em utilitários centrais:
  - `normalizeYmd(value)`: garante `YYYY-MM-DD`.
  - `compareYmd(a, b)`: comparação determinística sem fuso.
  - `addMonthsYmd(dateYmd, months)`: soma de meses preservando o dia (com tratamento de fim de mês).
- Refatorações de ordenação/comparação:
  - `Loans.tsx`, `LoanHistory.tsx`, `Installments.tsx`, `backendApi.ts`: remoção de `new Date(yyyy-mm-dd)` em sort/filters e uso de parsing manual para `Date(y,m-1,d)` ou utilitários.
- Garantias de regra de negócio:
  - 1ª parcela ancorada na `startDate/firstDueDate`.
  - Próximas parcelas derivadas do último `dueDate` conhecido (+1 mês).

### Arquivos impactados
- `src/utils/index.ts`: adicionados `normalizeYmd`, `compareYmd`, `addMonthsYmd`; reforços em `formatDate`/`isLate`.
- `src/pages/App.tsx`: ordenação por data de forma determinística e soma de meses segura.
- `src/components/dashboard/Loans.tsx`: ordenação de parcelas sem fuso.
- `src/components/dashboard/LoanHistory.tsx`: filtros/sorts sem `new Date(YYYY-MM-DD)`.
- `src/components/dashboard/Installments.tsx`: ordenação de parcelas corrigida.
- `src/services/backendApi.ts`: ordenação de datas retornadas padronizada.

### Resultados esperados
- Eliminação de “andar” de datas por timezone/UTC no frontend.
- Cronograma de parcelas previsível e determinístico.
- Dashboard e relatórios com filtros/ordenações consistentes.

## Passo a passo de implementação dos 10 pontos

### Sprint 1 - Segurança e correção crítica

1. Corrigir `_apply_filters` e criar teste de regressão para múltiplos filtros.
2. Ajustar CORS por ambiente (`ALLOWED_ORIGINS` explícito em produção).
3. Endurecer validação de assinatura do Slack em produção.
4. Remover imports duplicados e rodar lint.

### Sprint 2 - Qualidade operacional

1. Reduzir logs sensíveis (`print` e `console.log`) e adotar logger estruturado.
2. Padronizar tratamento de erros para reduzir `except Exception` genérico.

### Sprint 3 - Arquitetura frontend

1. Quebrar `App.tsx` em módulos menores (sessão, carregamento de dados, ações de domínio).
2. Criar `httpClient.ts` para unificar chamadas e remover duplicidade entre `api.ts` e `backendApi.ts`.
3. Substituir `any` por tipos DTO em endpoints críticos.
4. Remover fallback/constante obsoleta (`DEFAULT_TENANT_ID`).

### Sprint 4 - Garantia de qualidade

1. Adicionar testes automatizados backend (isolamento tenant, auth, filtros).
2. Adicionar testes frontend (mapeamento e fluxos de sessão).
3. Incluir checklist obrigatório de segurança/tenancy em PR.

## Risco de indisponibilidade (e como mitigar)

### Mudanças com maior risco

- CORS incorreto pode bloquear frontend no browser.
- Hardening do Slack pode interromper interação se segredo estiver inconsistente.
- Refatoração de `App.tsx` e camada de API pode gerar regressão funcional.

### Mitigações

- Deploy por fases (não fazer big-bang).
- Homologação obrigatória com smoke tests de login/CRUD.
- Feature flags para mudanças sensíveis.
- Janela de deploy fora do horário de pico.
- Rollback rápido via pipeline.

## Estratégia de rollback recomendada

### Princípios

- Rollback por **tag imutável** (nunca `latest`).
- Separar rollback de aplicação e de configuração.
- Banco com estratégia compatível (expand/contract) para evitar rollback destrutivo.

### Procedimento operacional

1. Detectar incidente por healthcheck/erros/monitoramento.
2. Congelar novos deploys.
3. Reverter para última versão estável.
4. Rodar smoke tests (API + frontend + login).
5. Monitorar 15-30 minutos.
6. Registrar análise de causa raiz antes de novo deploy.

## Rollback via pipeline GitHub Actions (com botão e janela de 48h)

### Implementação realizada

- Workflow manual criado em `/.github/workflows/rollback.yml`.
- Script operacional criado em `/scripts/rollback.sh`.

### Como o botão funciona

1. Ir em **Actions**.
2. Abrir workflow **Rollback CredGestor**.
3. Clicar em **Run workflow**.
4. Selecionar modo:
   - `release`: monta tags via timestamp (`YYYYMMDD-HHMMSS`) e SHA curto opcional.
   - `custom`: usa tags informadas manualmente.

### Janela de 48h

- Em `mode=release`, o workflow valida automaticamente se a versão está dentro de 48 horas.
- Se estiver fora da janela, bloqueia rollback (a não ser que `force=true`).

### Fluxo técnico

1. Resolve tags de backend/frontend.
2. Valida regra de 48h (quando aplicável).
3. Valida secrets SSH.
4. Copia `scripts/rollback.sh` para VPS.
5. Executa rollback remoto em Docker Swarm:
   - atualiza serviço `${STACK_NAME}_api` para a imagem backend da tag alvo.
   - atualiza serviço `${STACK_NAME}_site` para a imagem frontend da tag alvo.
6. Executa healthcheck pós-rollback (opcional desativar com `skip_healthcheck=true`).

## Formatos de versão para rollback

### Modo release

- Timestamp: `20260326-153000`
- SHA curto opcional: `abc1234`
- Tags resultantes:
  - `backend-20260326-153000-abc1234`
  - `frontend-20260326-153000-abc1234`

### Modo custom

- Backend tag: valor manual (qualquer tag existente no Docker Hub).
- Frontend tag: valor manual (qualquer tag existente no Docker Hub).

## Segredos e pré-requisitos

- `VPS_USER` (obrigatório)
- `VPS_SSH_KEY` (obrigatório)
- `VPS_HOST` (opcional, fallback no workflow)
- `VPS_PORT` (opcional)

Recomendado:

- Usar `environment: production` com aprovação manual para executar rollback.
- Alertar time via Slack quando rollback for executado.

## Comandos para branch e PR (execução local)

Devido a restrição do ambiente de automação (filesystem read-only no `.git`), branch/commit/PR devem ser executados localmente:

```bash
cd /var/www/credgestor-homologacao
git checkout -b feat/rollback-workflow-48h
git add .github/workflows/rollback.yml scripts/rollback.sh DOCUMENTACAO_ANALISE_SENIOR.md
git commit -m "feat(ci): add manual rollback workflow with 48h window"
git push -u origin feat/rollback-workflow-48h
```

Opcional com GitHub CLI:

```bash
gh pr create \
  --base main \
  --head feat/rollback-workflow-48h \
  --title "feat(ci): workflow de rollback manual com janela de 48h" \
  --body "Adiciona rollback manual via GitHub Actions com validacao de 48h, modo release/custom e execucao remota no Docker Swarm."
```
