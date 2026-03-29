# Alterações dos Últimos 2 Dias

Período analisado: de 2026-03-18 a 2026-03-19.

## Resumo Executivo

Nos últimos 2 dias, as mudanças concentraram-se em três frentes principais:

- Aperfeiçoamento de filtros e tratamento de datas em telas de dashboard e empréstimos.
- Ajustes de regras de cálculo de parcelas em atraso no dashboard.
- Melhorias de validação e normalização de valores pagos em parcelas.

## Principais Mudanças por Tema

### 1) Datas e filtros (Dashboard e Empréstimos)

- Refinamento do tratamento de datas no componente de empréstimos.
- Simplificação e padronização da lógica de datas.
- Melhoria da funcionalidade de filtro por data no dashboard.
- Ajuste de rótulo (label) para tornar o campo de data mais claro para o usuário.
- Inclusão de tratamento específico de datas para notas promissórias.

### 2) Regras de cálculo de parcelas em atraso

- Evolução incremental da lógica de cálculo no `DashboardHome`.
- Ajustes para maior consistência nos resultados apresentados no dashboard.

### 3) Pagamentos e validação de valores

- Refatoração no `InstallmentsView` para melhorar arredondamento e validação.
- Alteração do tipo de entrada para texto para melhor controle de valores decimais.
- Normalização de input do usuário e validação alinhada ao modelo do empréstimo.

### 4) Modelo de empréstimo e exibição

- Inclusão de filtro por modelo de empréstimo.
- Ajustes de exibição relacionados ao modelo nos componentes `Loans` e `LoanHistory`.

## Commits no Período (ordem decrescente)

| Hash | Data (UTC) | Autor | Mensagem |
|---|---|---|---|
| `9799ab17` | 2026-03-19 07:08:35 | faelsou | feat: add loan model filtering and display in Loans and LoanHistory components |
| `8de4c65a` | 2026-03-19 06:52:27 | faelsou | refactor: standardize date handling in Loans component |
| `c148e9cc` | 2026-03-19 06:39:20 | faelsou | refactor: refine late installment logic in DashboardHome component |
| `af64c77f` | 2026-03-19 06:18:33 | faelsou | refactor: enhance late installment calculations in DashboardHome component |
| `a441136d` | 2026-03-19 06:03:29 | faelsou | refactor: update calculation logic in DashboardHome component |
| `a58cb9ec` | 2026-03-19 05:42:37 | faelsou | Update label in Loans component to clarify date input description |
| `f3190e67` | 2026-03-19 05:42:20 | faelsou | refactor: update date handling and display logic in DashboardHome component |
| `14e2a76c` | 2026-03-19 05:00:38 | faelsou | refactor: improve date handling in Loans component |
| `e9b06312` | 2026-03-19 04:41:03 | faelsou | feat: enhance date filtering functionality in DashboardHome component |
| `c6435512` | 2026-03-18 19:32:33 | faelsou | Refactor payment amount handling in InstallmentsView to ensure proper rounding and validation. Updated input type to text for better decimal handling and added normalization for user input. Improved validation logic for payment amounts based on loan model. |
| `48827869` | 2026-03-18 19:32:23 | faelsou | refactor: simplify date handling in Loans component |
| `2d975a7e` | 2026-03-18 19:30:25 | faelsou | fix: add date handling logic for promissory notes |

## Observações

- Este documento foi gerado com base no histórico de commits (`git log --since="2 days ago"`).
- Se quiser, posso gerar também uma versão "executiva" em formato de release notes para compartilhar com time não técnico.
