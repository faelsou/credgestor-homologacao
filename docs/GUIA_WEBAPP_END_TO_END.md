# Guia End-to-End — CredGestor (como usar o app)

Guia do usuário final: do primeiro login à operação diária de cobrança.  
Última atualização: **2026-08-02**.

> Para instruções bem detalhadas com checklists e exemplos de erros comuns, veja também  
> [`GUIA_OPERACIONAL_PASSO_A_PASSO.md`](./GUIA_OPERACIONAL_PASSO_A_PASSO.md).

---

## 1) O que é o CredGestor

Sistema web para gestão de crédito: cadastrar clientes, criar empréstimos (Price e Somente Juros), controlar parcelas, baixar pagamentos, acompanhar atrasos e gerar promissórias — sem planilhas.

| Ambiente | URL |
|---|---|
| Produção | https://credgestor.app.br |
| Staging / Homologação | https://staging.credgestor.app.br |

---

## 2) Perfis de acesso

| Perfil | Label no app | Pode fazer | Não pode |
|---|---|---|---|
| **Administrador** | Acesso Total | Tudo: clientes, empréstimos, baixas, agendamentos, promissórias, equipe | — |
| **Cobrador** | Somente Leitura | Ver Dashboard, Clientes, Empréstimos, Parcelas, Histórico; abrir WhatsApp | Baixar pagamento, criar/editar empréstimos, gerenciar equipe |

---

## 3) Primeiro acesso (login)

1. Abra a URL do sistema.
2. Clique em **Entrar agora**.
3. Informe **email** e **senha**.
4. Clique em **Entrar no Sistema**.
5. Você cai no **Dashboard**.

### Esqueci a senha

1. Em login, clique em **Esqueci senha**.
2. Informe o email → **Enviar link**.
3. Abra o email, clique no link e defina a nova senha.
4. Volte e faça login.

> A sessão expira por inatividade (~15 minutos). Se isso acontecer, entre novamente.

---

## 4) Menu principal

Após o login, o menu lateral mostra:

| Menu | Para que serve |
|---|---|
| **Dashboard** | Visão do dia/período: a receber, recebido, atraso (Price e Somente Juros) |
| **Clientes** | Cadastro dos tomadores |
| **Empréstimos** | Criar/editar contratos, promissória, reabrir |
| **Parcelas** | Cobrança diária: receber, atrasos, WhatsApp, agendar |
| **Histórico de empréstimo** | Consulta e acompanhamento do contrato |
| **Equipe / Acessos** | Só Administrador — cadastrar cobrador/admin |

No topo: troca de tema (Claro / Dark Esmeralda / Dark Grafite).  
No rodapé: perfil e **Sair**.

---

## 5) Fluxo completo recomendado (fim a fim)

Ordem certa para começar a operar:

```
Login
  → Cadastrar cliente
    → Criar empréstimo
      → Cobrar / baixar parcelas (do dia e em atraso)
        → Agendar promessa (se o cliente não pagar hoje)
          → Consultar histórico / Dashboard
            → (Admin) Cadastrar cobrador na equipe
```

Operação diária sugerida:

1. Entrar no sistema  
2. Abrir **Dashboard** e conferir **A Receber** e **Em Atraso**  
3. Ir em **Parcelas** (ou clicar nos cards do Dashboard)  
4. Cobrar (WhatsApp) e dar baixa nos recebimentos  
5. Registrar promessas quando houver  
6. Exportar Excel se precisar fechar o dia  

---

## 6) Cadastrar cliente

1. Menu **Clientes** → **Novo Cliente** (só Admin).
2. Preencha:
   - **Nome completo** (obrigatório)
   - **CPF** (obrigatório)
   - **WhatsApp** com DDD (obrigatório — usado na cobrança)
   - **CEP**, endereço, complemento, bairro, cidade, estado
   - Email e data de nascimento (opcionais)
3. Clique em **Salvar**.

Dicas:
- O CEP tenta preencher o endereço automaticamente — confira antes de salvar.
- Use busca por nome/CPF na lista.
- Admin pode **editar** ou **excluir** (se houver empréstimos, o sistema alerta).

---

## 7) Criar empréstimo

1. Menu **Empréstimos** → **Novo Empréstimo** (só Admin).
2. No modal **Simular Empréstimo**, preencha:
   - **Cliente** (apenas ativos)
   - **Valor (R$)**
   - **Juros (%)** ao mês
   - **Modelo**: **Price** ou **Somente Juros**
   - **Parcelas**
   - **1ª Parcela** (data)
3. Revise o resumo (valor a liberar, total a receber, simulação).
4. Preencha a **Nota promissória** (indicação, hash, datas, observações).
5. Clique em **Confirmar Empréstimo**.

### 7.1 Diferença dos modelos (importante)

| | **Price (parcelado)** | **Somente Juros** |
|---|---|---|
| Na criação | Gera **todas** as parcelas de uma vez | Cria **só a 1ª parcela** (= juros do mês) |
| O que a parcela cobra | Prestação (juros + amortização) | Cobrança do mês (juros); capital fica no empréstimo |
| Na baixa | Valor normalmente = valor da parcela | Mínimo = juros; pode amortizar capital a mais; ou quitar tudo |
| Depois de pagar os juros | As próximas parcelas já existem | Sistema cria a **próxima parcela** (+1 mês) se ainda houver capital |
| Quando finaliza | Última parcela paga | Capital quitado + cobranças do mês em dia |

#### Somente Juros — o que acontece na baixa

| Cliente paga… | Status da parcela | Empréstimo | Próxima parcela |
|---|---|---|---|
| Menos que os juros do mês | **Parcial** | Em Aberto | Não cria |
| Só os juros do mês | **Pago** | Em Aberto | Cria (+1 mês) |
| Juros + amortização parcial | **Pago** | Em Aberto (capital menor) | Cria com juros sobre o capital restante |
| Juros + capital total | **Pago** | **Finalizado** | Não cria |

> A dívida de capital não “fica” eternamente na parcela antiga.  
> A cobrança do mês quitada fica **Paga**; o que ainda é devido aparece na **próxima parcela** e no valor em aberto do empréstimo.

### 7.2 Ações na lista de empréstimos

- Gerar **PDF** / **Nota Promissória Oficial**
- **Agendar recebimento**
- **Editar** / **Excluir**
- **Reabrir** (quando Finalizado — só Admin)

Filtros: modelo (Todos / Price / Somente Juros) e status (Em Aberto / Finalizado).

---

## 8) Parcelas — cobrança do dia a dia

Este é o módulo principal de operação.

### 8.1 Ver parcelas do dia e em atraso

Não existe aba chamada “Hoje”. Use:

**Opção A — Dashboard**
1. Abra **Dashboard**.
2. Aplique **Data Inicial** e **Data Final** (ex.: ambos = hoje).
3. Clique no card **A Receber** ou **Em Atraso**  
   → abre **Parcelas** já filtradas.

**Opção B — Parcelas direto**
1. Menu **Parcelas**.
2. Abas: **Todas** | **A Vencer** | **Em Atraso** | **Parcial** | **Pagas**.
3. Filtro de datas + busca por nome / nº da parcela.

### 8.2 Cobrar no WhatsApp

Na linha da parcela → **WhatsApp** / **Abrir WhatsApp Web**.  
Abre conversa com mensagem pronta (compromisso do dia + valor), usando o WhatsApp cadastrado no cliente.

### 8.3 Dar baixa (receber pagamento)

1. Clique em **Receber** (desktop) ou **Baixar Pagamento** (mobile) — só Admin.
2. No modal **Receber parcela**:
   - Confira valor da parcela / pendente
   - Informe **Valor a receber**
   - Informe **Data do pagamento** (pode ser retroativa)
3. Clique em **Confirmar Recebimento**.

Regras práticas:
- **Price:** o valor cobrado costuma ser o da parcela (ou o valor da promessa, se houver).
- **Somente Juros:** mínimo = juros do mês; excedente amortiza capital; valor ≥ saldo total quita o empréstimo.
- Se a gravação no servidor falhar, o sistema **alerta na tela** — não ignore; a baixa pode ser desfeita no próximo reload.

### 8.4 Agendar recebimento (promessa)

Quando o cliente não paga hoje, mas promete uma data:

1. Clique em **Agendar recebimento**.
2. Informe: motivo, valor a cobrar, multa/atraso (opcional), data prometida.
3. **Salvar promessa**.

A promessa aparece na parcela e passa a ser considerada na data de cobrança/exibição.

### 8.5 Editar parcela

Admin → ícone de lápis → altera vencimento, valor, juros, capital → **Salvar Alterações**.

### 8.6 Exportar

**Exportar Excel** exporta o que está na tela (respeitando filtros).

---

## 9) Dashboard

Duas colunas:

- **Empréstimos Parcelados** (Price)
- **Empréstimos Somente Juros**

Em cada uma:
- filtro por período (Data Inicial / Data Final)
- cards: total, recebido, a receber, em atraso, ativos
- clique no card → abre Parcelas filtradas
- exportar Excel da visão

---

## 10) Histórico de empréstimo

Use para consultar contratos:

- filtrar por cliente, período e status
- ver capital, total, valor em aberto e modelo
- editar / reabrir / agendar recebimento da próxima parcela

---

## 11) Cadastrar cobrador / administrador

1. Menu **Equipe / Acessos** (só Admin) → **Novo Usuário**.
2. Preencha: Nome, Email, Senha.
3. Tipo: **Cobrador** ou **Administrador**.
4. (Opcional) WhatsApp do admin para notificações.
5. **Cadastrar**.

Para remover: ícone de exclusão no card (não é possível remover a si mesmo).

---

## 12) Checklist do dia (operador)

- [ ] Login ok  
- [ ] Dashboard conferido (a receber + atraso)  
- [ ] Parcelas do dia cobradas (WhatsApp)  
- [ ] Baixas registradas com valor e data corretos  
- [ ] Promessas agendadas para quem não pagou  
- [ ] Excel exportado (se precisar fechar o caixa)  

---

## 13) Problemas comuns

| Situação | O que fazer |
|---|---|
| Não consigo logar | Confira email/senha; use **Esqueci senha**; teste a conexão |
| Cliente volta como devedor após baixa | Confirme se apareceu alerta de falha ao salvar; recarregue e verifique status da parcela. Ver [`CORRECAO_BAIXA_PAGAMENTO_VOLTANDO.md`](../CORRECAO_BAIXA_PAGAMENTO_VOLTANDO.md) |
| Cobrador não vê botão Receber | Esperado — só Admin baixa pagamento |
| Empréstimo Somente Juros “sumiu” da cobrança | Confira se a parcela do mês está **Paga** e se a **próxima** foi criada (vencimento +1 mês) |
| Sessão caiu sozinha | Inatividade; faça login de novo |

---

## 14) Documentos relacionados

| Documento | Conteúdo |
|---|---|
| [`GUIA_OPERACIONAL_PASSO_A_PASSO.md`](./GUIA_OPERACIONAL_PASSO_A_PASSO.md) | Passo a passo bem detalhado com checklists |
| [`CORRECAO_BAIXA_PAGAMENTO_VOLTANDO.md`](../CORRECAO_BAIXA_PAGAMENTO_VOLTANDO.md) | Correção técnica: baixa que voltava no dia seguinte |
| [`../README.md`](../README.md) | Arquitetura, multi-tenancy, links técnicos |
