# 🚀 Guia Rápido: Criar Alertas no Grafana (Interface Moderna) e Enviar para Slack

Este guia é para a versão moderna do Grafana (9+ ou 10+) com a interface atualizada.

## 📋 Passo 1: Configurar Contact Point (Notificação do Slack)

1. No menu lateral, vá em **Alerting** → **Contact points**
2. Clique em **"+ New contact point"**
3. Configure:
   - **Name**: `Slack - CredGestor`
   - **Integration**: Selecione **"Slack"**
   - **Webhook URL**: Cole a URL do webhook do Slack
     ```
     YOUR_SLACK_WEBHOOK_URL_HERE
     ```
     > **Nota:** Substitua `YOUR_SLACK_WEBHOOK_URL_HERE` pela URL real do seu webhook do Slack
   - **Channel** (opcional): `#credgestor-alerts`
   - **Title**: `🚨 Alerta CredGestor - {{ .GroupLabels.alertname }}`
   - **Text**: 
     ```
     *{{ .CommonAnnotations.summary }}*
     
     {{ .CommonAnnotations.description }}
     
     *Severidade:* {{ .CommonLabels.severity }}
     *Componente:* {{ .CommonLabels.component }}
     ```
4. Clique em **"Test"** para verificar
5. Clique em **"Save contact point"**

## 📋 Passo 2: Criar Alert Rule (Interface Moderna)

### 2.1. Acessar Criação de Alerta

1. Vá em **Alerting** → **Alert rules**
2. Clique em **"+ New alert rule"** (canto superior direito)

### 2.2. Seção 1: Enter alert rule name

1. No campo **"Name"**, digite: `Erros de Conexão Login`
2. (Ou qualquer nome que você preferir)

### 2.3. Seção 2: Define query and alert condition

#### 2.3.1. Configurar Query A

1. **Data source**: Selecione seu Prometheus (ex: `prometheus-credgestor`)
2. **Query**: Cole a query PromQL:
   ```promql
   rate(login_connection_errors_total[5m])
   ```
3. **Legend**: `Erros de Conexão Login` (opcional)
4. Clique em **"Run queries"** para testar

#### 2.3.2. Configurar Alert Condition (Expressions)

**⚠️ IMPORTANTE**: Se você ver o erro "[sse.dependencyError] did not execute expression [C] due to a failure of the dependent expression or query [A]", consulte o arquivo `TROUBLESHOOTING_ALERTAS_GRAFANA.md`.

**Método Recomendado: Threshold Direto**

1. Clique em **"Add expression"**
2. Selecione **"Threshold"**
3. Configure:
   - **Input**: Selecione `A` (sua query)
   - **Condition**: `IS ABOVE`
   - **Value**: `0`
4. Clique em **"Set 'C' as alert condition"** (ou o nome da expressão, ex: "Set 'B' as alert condition")

**Método Alternativo: Reducer + Threshold**

Se o método acima não funcionar:

1. Clique em **"Add expression"** → **"Reduce"**
2. Configure:
   - **Input**: `A`
   - **Function**: `Last`
   - **Mode**: `Strict`
3. Clique em **"Add expression"** novamente → **"Threshold"**
4. Configure:
   - **Input**: Selecione o reducer criado (ex: `B`)
   - **Condition**: `IS ABOVE`
   - **Value**: `0`
5. Clique em **"Set 'C' as alert condition"**

**Dica**: Certifique-se de que a Query A está retornando dados antes de criar as expressões. Clique em **"Run queries"** para verificar.

### 2.4. Seção 3: Add folder and labels

**⚠️ Se você ainda vê o erro na Seção 2, continue mesmo assim - o alerta funcionará quando houver dados.**

1. **Folder**: 
   - Selecione ou crie a pasta **"CredGestor"**
   - Clique em **"+ New folder"** se necessário

2. **Labels**: Clique em **"+ Add labels"** e adicione:
   - **Key**: `severity`, **Value**: `critical`
   - **Key**: `component`, **Value**: `authentication`
   - (Adicione quantos labels quiser)

### 2.5. Seção 4: Set evaluation behavior

1. **Evaluation group and interval**:
   - Selecione ou crie **"CredGestor Alerts"**
   - O intervalo padrão será mostrado (ex: "All rules in the selected group are evaluated every 1m")

2. **Pending period**:
   - Selecione **"1m"** (ou o tempo que preferir)
   - Isso define quanto tempo o alerta deve estar ativo antes de disparar

3. **Keep firing for**:
   - Deixe como **"None"** (ou configure se quiser manter o alerta ativo mesmo após resolver)

4. **Pause evaluation**: Deixe desligado

5. **Configure no data and error handling** (expandir se necessário):
   - **Alert state if no data or all values are null**: Selecione `NoData` ou `OK`
     - Isso evita que o alerta dispare quando não há dados (normal se não houve erros)

### 2.6. Seção 5: Configure notifications

1. **Contact point**: 
   - Selecione **"Slack - CredGestor"** (criado no Passo 1)

2. **Muting, grouping and timings** (opcional):
   - Você pode deixar os padrões ou personalizar
   - **Mute timings**: Para silenciar em horários específicos
   - **Active timings**: Para enviar apenas em horários específicos
   - **Override grouping**: Para personalizar agrupamento
   - **Override timings**: Para personalizar intervalos

### 2.7. Seção 6: Configure notification message

1. **Summary** (opcional):
   ```
   Erro de conexão durante login detectado
   ```

2. **Description** (opcional):
   ```
   {{ $value }} erros de conexão durante login nos últimos 5 minutos.
   Tipo de erro: {{ $labels.error_type }}
   ```

3. **Runbook URL** (opcional): Deixe vazio ou adicione um link

4. (Opcional) Clique em **"+ Add custom annotation"** para adicionar mais informações

### 2.8. Salvar Alerta

1. Clique em **"Save"** (canto inferior esquerdo)
2. O alerta será criado e aparecerá na lista de Alert rules

## 📋 Passo 3: Criar Mais Alertas

Repita o processo acima para criar os outros alertas:

### 3.1. Erro em CRUD de Clientes

**Seção 2 - Query**:
```promql
rate(client_crud_errors_total[5m])
```

**Seção 3 - Labels**:
- `severity`: `high`
- `component`: `crud`
- `resource`: `clients`

**Seção 6 - Summary**:
```
Erro em operação CRUD de clientes
```

**Seção 6 - Description**:
```
Erro em operação CRUD de clientes.
Operação: {{ $labels.operation }}
Tipo: {{ $labels.error_type }}
Código: {{ $labels.error_code }}
```

### 3.2. Erro em CRUD de Empréstimos

**Query**:
```promql
rate(loan_crud_errors_total[5m])
```

**Labels**: `severity=high`, `component=crud`, `resource=loans`

**Summary**: `Erro em operação CRUD de empréstimos`

### 3.3. Erro em CRUD de Parcelas

**Query**:
```promql
rate(installment_crud_errors_total[5m])
```

**Labels**: `severity=high`, `component=crud`, `resource=installments`

**Summary**: `Erro em operação CRUD de parcelas`

### 3.4. Erro de Banco de Dados

**Query**:
```promql
rate(db_connection_errors_total[5m])
```

**Labels**: `severity=critical`, `component=database`

**Summary**: `Erro de conexão com banco de dados`

## 📋 Passo 4: Verificar e Testar

### 4.1. Verificar Alertas Criados

1. Vá em **Alerting** → **Alert rules**
2. Você deve ver todos os alertas criados
3. Verifique o status:
   - **Normal**: Alerta configurado, mas não disparado
   - **Pending**: Alerta detectado, aguardando tempo "Pending period"
   - **Firing**: Alerta ativo, enviando notificações

### 4.2. Testar Notificação

1. Vá em **Alerting** → **Contact points**
2. Clique em "Slack - CredGestor"
3. Clique em **"Test"**
4. Verifique se a mensagem chegou no Slack

### 4.3. Simular Erro para Disparar Alerta

```bash
# Simular erro de login
curl -X POST https://credgestor.app.br/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "teste@teste.com", "senha": "senha_errada"}'
```

Aguarde 1-2 minutos e verifique:
- O alerta aparece como "Firing" no Grafana
- A notificação chegou no Slack

## 🔧 Dicas Importantes

### Sobre Expressions (Seção 2)

- **Reducer**: Converte uma série temporal em um único valor (Last, Avg, Sum, etc.)
- **Threshold**: Verifica se o valor está acima/abaixo de um limite
- Você pode usar o Threshold diretamente na query A, ou criar um Reducer primeiro

### Sobre Alert Condition

- Apenas UMA expressão deve ter a checkbox **"Alert condition"** marcada
- Geralmente é o Threshold que verifica se está acima do limite

### Sobre Labels

- Labels são úteis para:
  - Filtrar alertas
  - Agrupar notificações
  - Silenciar alertas específicos
  - Roteamento de notificações

### Sobre Evaluation Behavior

- **Pending period**: Tempo que o alerta deve estar ativo antes de disparar (evita falsos positivos)
- **Keep firing for**: Tempo que o alerta continua ativo após resolver (evita flapping)

## 📊 Resumo dos Alertas

| Nome | Query | Severidade | Pending |
|------|-------|------------|---------|
| `Erros de Conexão Login` | `rate(login_connection_errors_total[5m])` | critical | 1m |
| `Erro CRUD Clientes` | `rate(client_crud_errors_total[5m])` | high | 1m |
| `Erro CRUD Empréstimos` | `rate(loan_crud_errors_total[5m])` | high | 1m |
| `Erro CRUD Parcelas` | `rate(installment_crud_errors_total[5m])` | high | 1m |
| `Erro Conexão Banco` | `rate(db_connection_errors_total[5m])` | critical | 1m |

## ✅ Checklist

- [ ] Contact point do Slack criado e testado
- [ ] Alerta "Erros de Conexão Login" criado
- [ ] Alerta "Erro CRUD Clientes" criado
- [ ] Alerta "Erro CRUD Empréstimos" criado
- [ ] Alerta "Erro CRUD Parcelas" criado
- [ ] Alerta "Erro Conexão Banco" criado
- [ ] Teste de notificação realizado
- [ ] Alerta testado com erro simulado

## 🐛 Troubleshooting

### Alert Condition não funciona

- Certifique-se de que apenas UMA expressão tem "Alert condition" marcado
- Use Threshold com "IS ABOVE 0" para detectar qualquer erro
- Verifique se a query está retornando dados

### Notificações não chegam

- Teste o contact point: **Alerting** → **Contact points** → **Test**
- Verifique se o contact point está selecionado na Seção 5
- Verifique a URL do webhook do Slack

### Alertas não disparam

- Verifique se há dados nas métricas (use Explore no Grafana)
- Ajuste o threshold se necessário
- Verifique o "Pending period" (pode estar muito longo)
