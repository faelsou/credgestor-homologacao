# 🚀 Como Subir a Nova Versão

## Processo Rápido

### 1. Verificar Mudanças

```bash
cd /var/www/credgestor-homologacao
git status
```

### 2. Adicionar Mudanças ao Stage

```bash
# Adicionar todos os arquivos modificados
git add backend/main.py backend/settings.py backend/supabase_client.py
git add docker-compose.yml
git add src/components/dashboard/Installments.tsx src/pages/App.tsx src/services/api.ts

# Ou adicionar tudo de uma vez
git add .
```

### 3. Fazer Commit

```bash
git commit -m "fix: Ajustar cálculo de recebimento para permitir abatimento de capital

- Remove validação que impedia pagamentos maiores que valor pendente
- Ajusta lógica para abater juros, principal e capital excedente
- Recalcula automaticamente parcelas futuras quando capital é abatido
- Corrige leitura de SUPABASE_ANON_KEY no backend
- Melhora tratamento de erros no frontend"
```

### 4. Fazer Push para o GitHub

```bash
# Verificar branch atual
git branch

# Fazer push (substitua 'main' pela sua branch se diferente)
git push origin main
```

### 5. Deploy Automático

Após o push, o GitHub Actions irá:
1. ✅ Executar lint e testes
2. ✅ Fazer build das imagens Docker
3. ✅ Fazer push para Docker Hub
4. ✅ Fazer deploy automático na VPS

Você pode acompanhar o progresso em:
- **GitHub**: https://github.com/faelsou/credgestor-homologacao/actions

## ⚠️ Se o Git Push Falhar

Se você receber erro de autenticação, siga as instruções em `INSTRUCOES_GIT_PUSH.md`:

```bash
# Opção 1: Usar Personal Access Token
git remote set-url origin https://SEU_TOKEN@github.com/faelsou/credgestor-homologacao.git
git push origin main
```

## 🔍 Verificar Deploy

Após o deploy, verifique se está funcionando:

```bash
# Na VPS, verificar logs
docker service logs -f credgestor_api
docker service logs -f credgestor_site

# Verificar status dos serviços
docker service ps credgestor_api
docker service ps credgestor_site
```

## 📝 Resumo das Mudanças Nesta Versão

### Correções de Login
- ✅ Backend agora lê corretamente SUPABASE_ANON_KEY do .env
- ✅ Tratamento melhorado de strings vazias
- ✅ Melhor tratamento de erros no frontend

### Correções de Recebimento
- ✅ Permite pagamentos maiores que valor pendente
- ✅ Abate juros primeiro, depois principal
- ✅ Excedente abate capital das próximas parcelas
- ✅ Recalcula automaticamente juros das parcelas futuras
