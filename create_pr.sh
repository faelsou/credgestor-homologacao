#!/bin/bash

# Script para criar Pull Request no GitHub
# Repositório: faelsou/credgestor-homologacao
# Branch: fix/correcao-datas-recebimento

REPO_OWNER="faelsou"
REPO_NAME="credgestor-homologacao"
BRANCH="fix/correcao-datas-recebimento"
BASE_BRANCH="main"

TITLE="🔧 Fix: Correção de Datas de Recebimento no Dashboard e Empréstimos"

BODY=$(cat <<'EOF'
## 📋 Descrição

Este PR corrige problemas relacionados ao cálculo e exibição de datas de recebimento no Dashboard e na lista de Empréstimos. As datas não estavam sendo calculadas e exibidas corretamente devido a problemas de fuso horário e lógica incorreta no cálculo das parcelas.

## 🐛 Problemas Corrigidos

1. **Função `addMonths` com problemas de fuso horário**
   - A função usava `new Date(dateString)` que causava problemas de conversão de fuso horário
   - Agora faz parse manual da data (ano, mês, dia) e formata de volta para YYYY-MM-DD

2. **Cálculo incorreto da primeira parcela**
   - A primeira parcela estava sendo calculada como 1 mês após a data de início
   - Agora a primeira parcela usa a data de início corretamente

3. **Comparações de datas no Dashboard**
   - Comparações usando `new Date()` causavam inconsistências
   - Implementada normalização de datas antes de comparar

4. **Formatação de datas inconsistente**
   - Função `formatDate` melhorada para lidar com diferentes formatos
   - Função `isLate` corrigida para evitar problemas de fuso horário

## 📁 Arquivos Alterados

- `src/components/dashboard/Home.tsx` - Normalização de datas no Dashboard
- `src/components/dashboard/Loans.tsx` - Correção do cálculo de datas das parcelas
- `src/pages/App.tsx` - Correção da função `addMonths`
- `src/utils/index.ts` - Melhorias em `formatDate` e `isLate`

## ✅ Testes Realizados

- ✅ Verificação de linter (sem erros)
- ✅ Cálculo correto da primeira parcela
- ✅ Normalização de datas funcionando
- ✅ Formatação de datas consistente

## 🎯 Resultado Esperado

- Datas de recebimento calculadas corretamente a partir da data de início
- Primeira parcela usando a data de início especificada
- Dashboard exibindo as datas corretas nos filtros e gráficos
- Sem problemas de fuso horário nas comparações e formatações

## 📝 Notas para Revisão

Por favor, verifique:
1. Se as datas estão sendo calculadas corretamente ao criar novos empréstimos
2. Se o Dashboard está filtrando e exibindo as datas corretamente
3. Se não há regressões em outras funcionalidades relacionadas a datas
EOF
)

# Verificar se gh CLI está instalado
if command -v gh &> /dev/null; then
    echo "Criando PR usando GitHub CLI..."
    gh pr create \
        --title "$TITLE" \
        --body "$BODY" \
        --base "$BASE_BRANCH" \
        --head "$BRANCH"
else
    echo "GitHub CLI não encontrado. Use o link abaixo para criar o PR manualmente:"
    echo ""
    echo "🔗 https://github.com/$REPO_OWNER/$REPO_NAME/compare/$BASE_BRANCH...$BRANCH"
    echo ""
    echo "Ou instale o GitHub CLI:"
    echo "  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg"
    echo "  echo \"deb [arch=\$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main\" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null"
    echo "  sudo apt update && sudo apt install gh"
fi
