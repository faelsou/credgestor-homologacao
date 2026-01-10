# 🐳 Comandos para Build das Imagens Docker

## ⚠️ Problema Identificado

Você construiu a imagem do frontend, mas:
1. **Nome da imagem incorreto**: Na linha 151, você usou `credgestor-homologacao-backend` em vez de `credgestor-homologacao-frontend`
2. **Código desatualizado**: O HTML servido ainda mostra Tailwind via CDN, indicando que o build foi feito com código antigo

## ✅ Comandos Corretos

### Build do Frontend

```bash
# 1. Garantir que está no diretório correto
cd /var/www/credgestor-homologacao

# 2. Fazer pull das mudanças mais recentes (se usar Git)
git pull origin main

# 3. Construir a imagem do FRONTEND (nome correto!)
docker build -f Dockerfile.frontend \
  --build-arg VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-}" \
  --build-arg VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:-}" \
  --build-arg VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://credgestor.app.br/api}" \
  -t faelsouz/credgestor-homologacao-frontend:v1.0.2 .

# 4. Fazer push para Docker Hub
docker push faelsouz/credgestor-homologacao-frontend:v1.0.2
docker tag faelsouz/credgestor-homologacao-frontend:v1.0.2 faelsouz/credgestor-homologacao-frontend:latest
docker push faelsouz/credgestor-homologacao-frontend:latest
```

### Build do Backend

```bash
# 1. Garantir que está no diretório correto
cd /var/www/credgestor-homologacao

# 2. Construir a imagem do BACKEND
docker build -f Dockerfile.backend \
  -t faelsouz/credgestor-homologacao-backend:v1.0.2 .

# 3. Fazer push para Docker Hub
docker push faelsouz/credgestor-homologacao-backend:v1.0.2
docker tag faelsouz/credgestor-homologacao-backend:v1.0.2 faelsouz/credgestor-homologacao-backend:latest
docker push faelsouz/credgestor-homologacao-backend:latest
```

## 🔄 Atualizar o Stack após Build

```bash
# 1. Fazer pull das imagens mais recentes
docker pull faelsouz/credgestor-homologacao-frontend:v1.0.2
docker pull faelsouz/credgestor-homologacao-backend:v1.0.2

# 2. Atualizar o docker-compose.yml para usar a nova tag (ou usar latest)
# Edite o arquivo e altere as tags para v1.0.2 ou latest

# 3. Fazer deploy
cd /var/www/credgestor-homologacao
source .env  # Carregar variáveis de ambiente
docker stack deploy -c docker-compose.yml credgestor

# 4. Verificar status
docker stack services credgestor
docker service logs --tail 50 credgestor_site
```

## 📝 Notas Importantes

1. **Warnings sobre BUILD_DATE, GIT_SHA, GIT_REF**: São normais quando construindo localmente. Essas variáveis são usadas apenas para metadata e não afetam o funcionamento.

2. **Warnings sobre VITE_SUPABASE_ANON_KEY**: São avisos de segurança do Docker. Como essa é uma chave pública (anon key), é seguro usá-la como build arg.

3. **Código desatualizado**: Se o HTML ainda mostra Tailwind via CDN, significa que:
   - O código na VPS não foi atualizado
   - Ou o build foi feito antes das mudanças
   - **Solução**: Faça push das mudanças para o GitHub e deixe o GitHub Actions fazer o build, ou atualize o código na VPS antes de fazer o build

## 🚀 Recomendação

**Melhor prática**: Deixe o GitHub Actions fazer o build automaticamente:

1. Faça commit e push das mudanças:
   ```bash
   git add .
   git commit -m "fix: remove Tailwind CDN e configura build correto"
   git push origin main
   ```

2. O GitHub Actions fará:
   - Build das imagens com código atualizado
   - Push para Docker Hub
   - Deploy automático na VPS

3. Isso garante que:
   - O código está sempre atualizado
   - As variáveis de ambiente são passadas corretamente
   - As imagens são construídas de forma consistente

---

**Última atualização**: 2026-01-10
