# Documentação do Dashboard — Cards de Empréstimos

Este guia explica o significado de cada informação exibida nos cards do **Dashboard**, para que você possa acompanhar seus empréstimos de forma clara.

---

## Visão geral

O Dashboard é dividido em **dois cards principais**:

1. **Empréstimos Parcelados** — empréstimos com várias parcelas (modelo Price).
2. **Empréstimos Somente Juros** — empréstimos em que o cliente paga juros periodicamente e o capital no final.

Cada card tem **filtro por período**, **totais do período**, **detalhamento** e **ações** (gráfico e exportar). Abaixo, o que cada parte significa.

---

## 1. Empréstimos Parcelados

**O que é:** Empréstimos com várias parcelas fixas (sistema Price). O valor da parcela inclui amortização do capital + juros.

### Cabeçalho do card

- **Empréstimos Parcelados** — Título do card.
- **Empréstimos com várias parcelas** — Descrição: são os contratos parcelados no modelo Price.

### Total do Período

- **Total do Período** — Soma do **valor de todas as parcelas** cujo vencimento está no período selecionado (ou de todas, se não houver filtro).
- **+R$ X recebido** — Valor já **efetivamente recebido** (pago) no período, em verde.

### Filtro por Período

- **Data Inicial** e **até Data Final** — Define o intervalo de **datas de vencimento** das parcelas que entram nos números do card.
- **Limpar filtro** — Remove as datas e volta a considerar **todas** as parcelas (desde o primeiro empréstimo).

**Exemplo:** Se você escolher 01/01/2025 a 31/03/2025, todos os totais e gráficos do card consideram apenas parcelas com vencimento nesse intervalo.

### Informações do Empréstimo Price

| Campo | Significado |
|-------|-------------|
| **Valor dinheiro emprestado** | Soma do **capital emprestado** (valor que saiu do seu caixa) dos empréstimos parcelados **ativos** no período. |
| **Valor das parcelas** | Soma do **valor total** de todas as parcelas consideradas no período (cada parcela = capital + juros). |
| **Valor de lucro referente às parcelas** | Parte das parcelas que corresponde aos **juros** (lucro sobre o empréstimo). |
| **Total do período (valor das parcelas)** | Mesmo conceito do “Total do Período” no topo: soma do valor das parcelas no período. Destacado em verde. |

### Estatísticas (Recebido, A Receber, Em Atraso, Ativos)

| Campo | Significado |
|-------|-------------|
| **Recebido** | Valor já **pago** pelos clientes (parcelas quitadas). Ao clicar, você pode ir para a tela de parcelas pagas (com o mesmo filtro de período, se estiver aplicado). |
| **A Receber** | Valor que **ainda falta receber** (parcelas pendentes ou em aberto). Ao clicar, abre a lista de parcelas a receber. |
| **Em Atraso** | Valor em **atraso** (parcelas vencidas e não pagas). Mostra também a quantidade de parcelas em atraso. Ao clicar, abre a lista de parcelas em atraso. |
| **Ativos** | Número de **contratos parcelados ativos** (empréstimos ainda em vigor). |

### Evolução do Período

- **Gráfico de linhas** — Mostra a evolução de **Recebido** (verde) e **A Receber** (azul) ao longo do tempo (últimos 30 pontos/datas do período).

### Exportar para Excel

- Gera um arquivo (CSV/Excel) com as parcelas do período: data, cliente, CPF, número da parcela, capital, juros, total e status (Pago, Atrasado, A Vencer).

---

## 2. Empréstimos Somente Juros

**O que é:** Empréstimos em que o cliente paga **apenas juros** em parcelas periódicas e o **capital** (valor emprestado) é pago em uma única vez, geralmente no final.

### Cabeçalho do card

- **Empréstimos Somente Juros** — Título do card.
- **Empréstimos com pagamento de juros** — Descrição: contratos em que as parcelas são de juros (e no final o capital).

### Total do Período

- **Total do Período** — Soma de **Juros + Capital** no período (valor total dos juros das parcelas no período + capital dos empréstimos somente juros ativos).
- **+R$ X recebido** — Valor já **recebido** (juros e/ou capital pagos) no período, em verde.

### Filtro por Período

- Funciona como no card de Parcelados: **Data Inicial** e **Data Final** pelo **vencimento** das parcelas.
- **Limpar filtro** — Volta a considerar todos os dados.

### Informações do Empréstimo Somente Juros

| Campo | Significado |
|-------|-------------|
| **Capital (dinheiro emprestado)** | Soma do **valor emprestado** (capital) dos empréstimos somente juros **ativos**. |
| **Valor do Juros** | Soma do **valor dos juros** das parcelas consideradas no período. |
| **Valor do Juros + Capital** | Soma de **juros + capital** no período (destaque em verde no card). |

### Estatísticas (Recebido, A Receber, Em Atraso, Ativos)

- **Recebido** — Valor já pago (juros e capital) no período. Clique leva às parcelas pagas.
- **A Receber** — Valor ainda a receber (juros e capital pendentes). Clique leva às parcelas a receber.
- **Em Atraso** — Valor em atraso e quantidade de parcelas em atraso. Clique leva às parcelas em atraso.
- **Ativos** — Número de contratos somente juros ativos.

### Evolução do Período

- Gráfico de **Recebido** e **A Receber** ao longo do tempo (mesmo conceito do card Parcelados).

### Exportar para Excel

- Exporta as parcelas do período: data, cliente, CPF, juros, capital em aberto, total e status.

---

## Resumo rápido

| Card | Foco |
|------|------|
| **Parcelados** | Parcelas fixas (Price): capital + juros em cada parcela. Métricas: valor emprestado, valor das parcelas, lucro (juros), recebido e a receber. |
| **Somente Juros** | Parcelas de juros; capital pago no final. Métricas: capital emprestado, valor dos juros, juros + capital, recebido e a receber. |

Em ambos os cards, **verde** indica valores recebidos e **azul** indica valores a receber. Use o **Filtro por Período** para analisar um intervalo específico e **Limpar filtro** para ver todos os dados.
