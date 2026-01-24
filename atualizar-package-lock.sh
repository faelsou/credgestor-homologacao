#!/bin/bash
# Script para atualizar package-lock.json

echo "📦 Atualizando package-lock.json..."

# Verificar se npm está disponível
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Instale Node.js primeiro."
    exit 1
fi

# Verificar se package.json existe
if [ ! -f package.json ]; then
    echo "❌ package.json não encontrado."
    exit 1
fi

# Limpar cache do npm (opcional, mas recomendado)
echo "🧹 Limpando cache do npm..."
npm cache clean --force

# Instalar dependências e atualizar package-lock.json
echo "📥 Instalando dependências..."
npm install

# Verificar se package-lock.json foi criado/atualizado
if [ -f package-lock.json ]; then
    echo "✅ package-lock.json atualizado com sucesso!"
    echo "📝 Faça commit do arquivo:"
    echo "   git add package-lock.json"
    echo "   git commit -m 'chore: atualizar package-lock.json com dependências OpenTelemetry'"
else
    echo "⚠️  package-lock.json não foi criado. Verifique os erros acima."
    exit 1
fi
