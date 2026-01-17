# 📦 Instalação de Dependências para Scripts

## Dependências Necessárias

Os scripts de teste e correção precisam apenas de:

1. **requests** - Para fazer requisições HTTP
2. **python-dotenv** (opcional) - Para carregar variáveis do arquivo .env

## Instalação Rápida

```bash
# Instalar requests (obrigatório)
pip3 install requests

# Instalar python-dotenv (opcional, mas recomendado)
pip3 install python-dotenv
```

Ou instalar ambos de uma vez:

```bash
pip3 install requests python-dotenv
```

## Verificar Instalação

```bash
python3 -c "import requests; print('✅ requests instalado')"
python3 -c "import dotenv; print('✅ python-dotenv instalado')"
```

## Executar Scripts

Após instalar as dependências:

```bash
cd /var/www/credgestor-homologacao/scripts

# Testar login
python3 test_login.py

# Corrigir problemas de login
python3 fix_user_login.py
```

## Nota sobre Supabase

O script `test_login.py` foi atualizado para usar apenas `requests` e não requer mais o módulo `supabase`. Isso torna a instalação mais simples e rápida.
