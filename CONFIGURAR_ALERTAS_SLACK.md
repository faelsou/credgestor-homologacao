# 🚨 Configuração de Alertas com Slack - CredGestor

Este guia explica como configurar o sistema de alertas do CredGestor para enviar notificações de erros para o Slack.

> **💡 Dica**: Para configurar alertas no Grafana e enviar para Slack, consulte também: [CONFIGURAR_ALERTAS_GRAFANA_SLACK.md](./CONFIGURAR_ALERTAS_GRAFANA_SLACK.md)

## 📋 Visão Geral

O sistema de alertas monitora e notifica sobre:
- **Erros de Login**: Problemas de conexão ou autenticação
- **Erros de CRUD**: Falhas ao salvar/atualizar/deletar dados em:
  - Clientes
  - Empréstimos
  - Parcelas
  - Outras funcionalidades CRUD
- **Erros de Banco de Dados**: Problemas de conexão ou queries

## 🏗️ Arquitetura

```
Backend (FastAPI)
    ↓ (expõe métricas)
Prometheus (coleta métricas)
    ↓ (avalia regras)
Alertmanager (gerencia alertas)
    ↓ (envia notificações)
Slack
```

## 📦 Componentes

1. **Métricas no Backend**: Registram erros de login e CRUD
2. **Prometheus**: Coleta e armazena métricas
3. **Regras de Alerta**: Definem quando disparar alertas
4. **Alertmanager**: Gerencia e envia alertas para Slack

## 🚀 Configuração Passo a Passo

### 1. Criar Webhook no Slack

1. Acesse https://api.slack.com/apps
2. Clique em **"Create New App"** → **"From scratch"**
3. Dê um nome (ex: "CredGestor Alerts") e selecione o workspace
4. Vá em **"Incoming Webhooks"** → Ative **"Activate Incoming Webhooks"**
5. Clique em **"Add New Webhook to Workspace"**
6. Selecione o canal (ex: `#credgestor-alerts`)
7. Copie a **Webhook URL** (formato: `https://hooks.slack.com/services/XXXXX/YYYYY/ZZZZZ`)

### 2. Configurar Webhook no Alertmanager

Você tem duas opções:

#### Opção A: Editar arquivo diretamente (Recomendado)

Edite o arquivo `alertmanager.yml` e substitua todas as ocorrências de `${SLACK_WEBHOOK_URL}` pela URL do seu webhook:

```bash
# Substituir no arquivo
sed -i 's|${SLACK_WEBHOOK_URL}|https://hooks.slack.com/services/XXXXX/YYYYY/ZZZZZ|g' alertmanager.yml
```

Ou edite manualmente o arquivo `alertmanager.yml` e substitua `${SLACK_WEBHOOK_URL}` pela URL do webhook em todas as seções `slack_configs`.

#### Opção B: Usar variável de ambiente (após iniciar container)

1. Configure a variável de ambiente:
```bash
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXXXX/YYYYY/ZZZZZ
```

2. Execute o script dentro do container:
```bash
docker-compose -f docker-compose-alertmanager.yml exec alertmanager /bin/sh -c \
  "SLACK_WEBHOOK_URL=$SLACK_WEBHOOK_URL /scripts/setup-alertmanager.sh"
```

### 3. Iniciar Serviços

```bash
# Iniciar Prometheus e Alertmanager
docker-compose -f docker-compose-alertmanager.yml up -d

# Verificar logs
docker-compose -f docker-compose-alertmanager.yml logs -f alertmanager
```

### 4. Verificar Configuração

#### Prometheus
- Acesse: http://localhost:9090 (ou https://prometheus.credgestor.app.br)
- Vá em **Status** → **Rules** para ver as regras de alerta
- Vá em **Status** → **Targets** para verificar se a API está sendo coletada

#### Alertmanager
- Acesse: http://localhost:9093 (ou https://alertmanager.credgestor.app.br)
- Verifique se está conectado ao Prometheus
- Teste enviando um alerta de teste

### 5. Testar Alertas

#### Teste de Alerta de Login
```bash
# Simular erro de login (fazer requisição com credenciais inválidas)
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "teste@teste.com", "senha": "senha_errada"}'
```

#### Teste de Alerta de CRUD
```bash
# Simular erro de CRUD (fazer requisição sem autenticação)
curl -X POST http://localhost:8000/tenants/test-tenant-id/clients \
  -H "Content-Type: application/json" \
  -d '{"nome": "Teste"}'
```

## 📊 Tipos de Alertas

### 🔐 Alertas de Autenticação

| Alerta | Descrição | Severidade |
|--------|-----------|------------|
| `LoginConnectionError` | Erro de conexão durante login | Critical |
| `LoginErrorsHigh` | Taxa alta de erros de login (>0.1/s) | High |

### 💾 Alertas de CRUD

| Alerta | Descrição | Severidade |
|--------|-----------|------------|
| `ClientCRUDError` | Erro em operação CRUD de clientes | High |
| `ClientCRUDErrorHigh` | Taxa alta de erros (>0.5/s) | Critical |
| `LoanCRUDError` | Erro em operação CRUD de empréstimos | High |
| `LoanCRUDErrorHigh` | Taxa alta de erros (>0.5/s) | Critical |
| `InstallmentCRUDError` | Erro em operação CRUD de parcelas | High |
| `InstallmentCRUDErrorHigh` | Taxa alta de erros (>0.5/s) | Critical |
| `CRUDErrorAny` | Erro em qualquer operação CRUD | Medium |
| `CRUDErrorHigh` | Taxa alta de erros (>1/s) | Critical |

### 🗄️ Alertas de Banco de Dados

| Alerta | Descrição | Severidade |
|--------|-----------|------------|
| `DatabaseConnectionError` | Erro de conexão com banco | Critical |
| `DatabaseQueryError` | Taxa alta de erros em queries (>0.5/s) | High |

## 📝 Canais do Slack

Os alertas são enviados para diferentes canais conforme a severidade:

- **`#credgestor-alerts`**: Alertas gerais (médios e altos)
- **`#credgestor-alerts-critical`**: Alertas críticos (requer ação imediata)

Você pode personalizar os canais editando `alertmanager.yml`.

## 🔧 Personalização

### Ajustar Thresholds de Alertas

Edite `alert_rules.yml` para modificar os limites:

```yaml
# Exemplo: Aumentar threshold de erros de login
- alert: LoginErrorsHigh
  expr: rate(login_errors_total[5m]) > 0.5  # Era 0.1
  for: 2m
```

### Modificar Intervalos

```yaml
# Em alert_rules.yml
groups:
  - name: credgestor_alerts
    interval: 30s  # Frequência de avaliação
    rules:
      - alert: LoginErrorsHigh
        for: 5m  # Tempo antes de disparar (era 2m)
```

### Personalizar Mensagens

Edite `alertmanager.yml` na seção `receivers`:

```yaml
receivers:
  - name: 'slack-crud'
    slack_configs:
      - channel: '#credgestor-alerts'
        title: '💾 Erro de CRUD - CredGestor'
        text: >-
          # Sua mensagem personalizada aqui
```

## 🐛 Troubleshooting

### Alertas não estão sendo enviados

1. **Verificar webhook do Slack**:
   ```bash
   curl -X POST ${SLACK_WEBHOOK_URL} \
     -H 'Content-Type: application/json' \
     -d '{"text": "Teste de alerta"}'
   ```

2. **Verificar logs do Alertmanager**:
   ```bash
   docker-compose -f docker-compose-alertmanager.yml logs alertmanager
   ```

3. **Verificar se Prometheus está enviando alertas**:
   - Acesse Prometheus → **Alerts**
   - Verifique se os alertas estão em estado "firing"

4. **Verificar configuração do Alertmanager**:
   ```bash
   docker exec alertmanager amtool check-config /etc/alertmanager/alertmanager.yml
   ```

### Métricas não estão sendo coletadas

1. **Verificar se a API está expondo métricas**:
   ```bash
   curl http://localhost:8000/metrics
   ```

2. **Verificar targets no Prometheus**:
   - Acesse Prometheus → **Status** → **Targets**
   - Verifique se `credgestor-api` está "UP"

3. **Verificar configuração do Prometheus**:
   ```bash
   docker exec prometheus promtool check config /etc/prometheus/prometheus.yml
   ```

### Alertas disparando muito frequentemente

1. **Aumentar o tempo `for`** nas regras:
   ```yaml
   - alert: LoginErrorsHigh
     for: 5m  # Aumentar de 2m para 5m
   ```

2. **Aumentar o `repeat_interval`** no Alertmanager:
   ```yaml
   route:
     repeat_interval: 24h  # Era 12h
   ```

## 📚 Métricas Disponíveis

### Métricas de Login
- `login_errors_total`: Total de erros de login
- `login_connection_errors_total`: Total de erros de conexão durante login

### Métricas de CRUD
- `crud_errors_total`: Total de erros em operações CRUD
- `client_crud_errors_total`: Total de erros em CRUD de clientes
- `loan_crud_errors_total`: Total de erros em CRUD de empréstimos
- `installment_crud_errors_total`: Total de erros em CRUD de parcelas

### Métricas de Banco de Dados
- `db_connection_errors_total`: Total de erros de conexão
- `db_query_errors_total`: Total de erros em queries
- `db_timeouts_total`: Total de timeouts

## 🔐 Segurança

1. **Não commitar webhook URL**: Use variáveis de ambiente
2. **Restringir acesso**: Configure firewall para Prometheus/Alertmanager
3. **Usar HTTPS**: Configure certificados SSL para acesso externo
4. **Rotacionar tokens**: Renove webhooks do Slack periodicamente

## 📖 Referências

- [Prometheus Alerting](https://prometheus.io/docs/alerting/latest/overview/)
- [Alertmanager Configuration](https://prometheus.io/docs/alerting/latest/configuration/)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)

## ✅ Checklist de Configuração

- [ ] Webhook do Slack criado e URL copiada
- [ ] Variável `SLACK_WEBHOOK_URL` configurada
- [ ] Prometheus e Alertmanager iniciados
- [ ] Regras de alerta carregadas no Prometheus
- [ ] Alertmanager conectado ao Prometheus
- [ ] Teste de alerta enviado com sucesso para Slack
- [ ] Canais do Slack configurados
- [ ] Documentação atualizada

## 🆘 Suporte

Em caso de problemas:
1. Verifique os logs: `docker-compose logs -f`
2. Consulte a documentação do Prometheus/Alertmanager
3. Verifique a configuração com `promtool` e `amtool`
