# 📦 Instalação do OpenTelemetry

## ⚠️ Importante: Instalação via Docker

**As dependências devem ser instaladas DENTRO dos containers Docker, não no sistema host!**

O projeto usa Docker, então as dependências são instaladas automaticamente quando você:
1. Faz build das imagens Docker
2. Ou executa comandos dentro dos containers

## 🔧 Instalação das Dependências

### Backend (Python)

As dependências do backend são instaladas automaticamente durante o build da imagem Docker através do `Dockerfile.backend`.

**Para instalar manualmente (dentro do container):**

```bash
# Entrar no container do backend
docker exec -it credgestor_api bash

# Instalar dependências (se necessário)
pip install -r backend/requirements.txt
```

**Ou fazer rebuild da imagem:**

```bash
docker-compose build api
docker-compose up -d api
```

### Frontend (Node.js/npm)

As dependências do frontend são instaladas durante o build da imagem Docker através do `Dockerfile.frontend`.

**Para instalar manualmente (dentro do container):**

```bash
# Entrar no container do frontend
docker exec -it credgestor_site bash

# Instalar dependências
npm install
```

**Ou fazer rebuild da imagem:**

```bash
docker-compose build site
docker-compose up -d site
```

## 🐛 Problemas Comuns

### Erro: "externally-managed-environment" (Python)

**Causa:** Tentativa de instalar pacotes Python no sistema host (Debian/Ubuntu moderno).

**Solução:** 
- ✅ Instale dentro do container Docker
- ✅ Ou use `--break-system-packages` (não recomendado)
- ✅ Ou use um ambiente virtual (venv)

### Erro: "404 Not Found" no npm

**Causa:** Nome incorreto do pacote ou problema de autenticação npm.

**Solução:**
- ✅ Verifique se os nomes dos pacotes estão corretos no `package.json`
- ✅ Execute `npm install` dentro do container Docker
- ✅ Se usar npm privado, configure autenticação: `npm login`

### Pacotes OpenTelemetry não encontrados

**Solução:**
- ✅ Verifique se os nomes dos pacotes estão corretos:
  - `@opentelemetry/sdk-trace-web` (não `@opentelemetry/sdk-web`)
  - `@opentelemetry/sdk-trace-base`
- ✅ Verifique a versão do Node.js (recomendado: Node 18+)

## ✅ Verificação

### Verificar se as dependências foram instaladas (Backend)

```bash
docker exec credgestor_api pip list | grep opentelemetry
```

Deve mostrar:
```
opentelemetry-api
opentelemetry-sdk
opentelemetry-instrumentation-fastapi
...
```

### Verificar se as dependências foram instaladas (Frontend)

```bash
docker exec credgestor_site npm list | grep opentelemetry
```

Deve mostrar:
```
@opentelemetry/api@...
@opentelemetry/sdk-trace-web@...
...
```

## 🚀 Próximos Passos

Após instalar as dependências:

1. Configure as variáveis de ambiente (veja `OPENTELEMETRY_SETUP.md`)
2. Reinicie os containers:
   ```bash
   docker-compose restart api site
   ```
3. Verifique os logs:
   ```bash
   docker logs credgestor_api | grep -i opentelemetry
   docker logs credgestor_site | grep -i opentelemetry
   ```

## 📚 Referências

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [OpenTelemetry Python](https://opentelemetry.io/docs/instrumentation/python/)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/instrumentation/js/)
