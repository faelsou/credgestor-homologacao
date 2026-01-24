# 🔧 Correção do package-lock.json

## Problema

O GitHub Actions está falhando porque o `package-lock.json` não está atualizado com os novos pacotes do OpenTelemetry.

## Solução

### Opção 1: Atualizar package-lock.json localmente (Recomendado)

Execute localmente para gerar/atualizar o `package-lock.json`:

```bash
# Dentro do container do frontend ou localmente
npm install
```

Isso irá:
1. Instalar todas as dependências
2. Atualizar o `package-lock.json` com as versões corretas
3. Garantir compatibilidade entre pacotes

Depois, faça commit do `package-lock.json` atualizado:

```bash
git add package-lock.json
git commit -m "chore: atualizar package-lock.json com dependências OpenTelemetry"
git push
```

### Opção 2: O workflow foi atualizado para lidar com isso automaticamente

O workflow do GitHub Actions foi atualizado para:
- Verificar se `package-lock.json` existe e está atualizado
- Usar `npm install` se necessário (quando o lock file está desatualizado)
- Usar `npm ci` quando o lock file está atualizado (mais rápido e confiável)

## Verificação

Após atualizar o `package-lock.json`, verifique:

1. **Localmente:**
   ```bash
   npm install
   npm list | grep opentelemetry
   ```

2. **No GitHub Actions:**
   - O workflow deve passar na etapa "Install Node dependencies"
   - Verifique os logs para confirmar que os pacotes foram instalados

## Dependências Adicionadas

As seguintes dependências do OpenTelemetry foram adicionadas:

- `@opentelemetry/api@^1.9.0`
- `@opentelemetry/sdk-trace-web@^1.25.0`
- `@opentelemetry/sdk-trace-base@^1.25.0`
- `@opentelemetry/instrumentation@^0.52.0`
- `@opentelemetry/instrumentation-fetch@^0.52.0`
- `@opentelemetry/instrumentation-xml-http-request@^0.52.0`
- `@opentelemetry/instrumentation-document-load@^0.52.0`
- `@opentelemetry/instrumentation-user-interaction@^0.52.0`
- `@opentelemetry/exporter-trace-otlp-http@^0.52.0`
- `@opentelemetry/exporter-metrics-otlp-http@^0.52.0`
- `@opentelemetry/resources@^1.25.0`
- `@opentelemetry/semantic-conventions@^1.25.0`
- `@opentelemetry/core@^1.25.0` (adicionado para compatibilidade)

## Próximos Passos

1. Execute `npm install` localmente ou no container
2. Faça commit do `package-lock.json` atualizado
3. Push para o repositório
4. O GitHub Actions deve passar na próxima execução

## Nota

O workflow foi atualizado para ser mais resiliente, mas é recomendado manter o `package-lock.json` atualizado no repositório para builds mais rápidos e confiáveis.
