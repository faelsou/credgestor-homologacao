# 🔧 Troubleshooting: Dashboard CredGestor - "No Data"

Este guia ajuda a resolver o problema de "No data" em todos os painéis do dashboard.

## 🔍 Diagnóstico Rápido

### Passo 1: Verificar Data Sources

1. **Verifique se os data sources estão configurados**:
   - Vá em **Configuration** → **Data Sources**
   - Verifique se existem:
     - ✅ PostgreSQL (ou `grafana-postgresql-datasource-supabase-credgestor`)
     - ✅ Prometheus

2. **Teste a conexão**:
   - Clique em cada data source
   - Clique em **Save & Test**
   - Verifique se aparece "Data source is working"

### Passo 2: Verificar Variáveis do Dashboard

1. **Abra o dashboard** e veja os dropdowns no topo
2. **Verifique as variáveis**:
   - Clique no ícone de engrenagem (⚙️) → **Variables**
   - Verifique:
     - `DS_PROMETHEUS` → Deve apontar para seu data source Prometheus
     - `DS_POSTGRES` → Deve apontar para seu data source PostgreSQL

3. **Se as variáveis não existirem ou estiverem vazias**:
   - Edite cada variável
   - Selecione o data source correto
   - Salve o dashboard

## 🗄️ Troubleshooting PostgreSQL (Métricas de Negócio)

### Problema: Painéis de PostgreSQL mostram "No data"

#### Solução 1: Verificar Conexão

1. Vá em **Configuration** → **Data Sources**
2. Selecione seu data source PostgreSQL
3. Clique em **Save & Test**
4. Se falhar, verifique:
   - Host correto (ex: `aws-1-us-east-2.pooler.supabase.com:6543`)
   - Usuário e senha corretos
   - SSL Mode: `require`

#### Solução 2: Testar Query SQL Diretamente

1. No Grafana, vá em **Explore**
2. Selecione o data source PostgreSQL
3. Cole esta query de teste:
   ```sql
   SELECT COUNT(*) as total FROM tenants WHERE ativo = true;
   ```
4. Clique em **Run query**
5. Se retornar dados, o problema está nas queries do dashboard

#### Solução 3: Verificar Schema do Banco

As queries do dashboard assumem estas tabelas:
- `tenants`
- `clients` (ou `clientes`)
- `loans` (ou `emprestimos`)
- `installments` (ou `parcelas`)
- `tenant_users` (ou `usuarios`)
- `login_audit`

**Verifique se as tabelas existem**:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Ajuste as queries do dashboard** se os nomes das tabelas forem diferentes.

#### Solução 4: Verificar Nomes das Colunas

As queries assumem estas colunas:
- `tenants.ativo` (boolean)
- `clients.created_at` (timestamp)
- `loans.created_at` (timestamp)
- `installments.status`, `installments.due_date`, `installments.amount`
- `login_audit.created_at`, `login_audit.success`

**Verifique as colunas**:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tenants';
```

## 📊 Troubleshooting Prometheus (Métricas de Infraestrutura)

### Problema: Painéis de Prometheus mostram "No data"

#### Solução 1: Verificar Conexão com Prometheus

1. Vá em **Configuration** → **Data Sources**
2. Selecione o data source Prometheus
3. Configure a URL:
   - Se na mesma rede Docker: `http://observability_prometheus:9090`
   - Se externamente: `http://localhost:9090` ou `http://seu-ip:9090`
4. Clique em **Save & Test**

#### Solução 2: Testar Query PromQL Diretamente

1. No Grafana, vá em **Explore**
2. Selecione o data source Prometheus
3. Teste estas queries básicas:

```promql
# Verificar se o Prometheus está funcionando
up

# Ver todos os jobs disponíveis
up{job!=""}

# Ver containers disponíveis (cAdvisor)
container_cpu_usage_seconds_total

# Ver métricas do sistema (node_exporter)
node_cpu_seconds_total
```

4. Se retornar dados, o problema está nas queries específicas do dashboard

#### Solução 3: Descobrir Labels dos Containers

1. No **Explore**, execute:
```promql
container_cpu_usage_seconds_total
```

2. Veja os resultados e identifique:
   - Qual label identifica os containers do CredGestor?
   - Pode ser: `name`, `container_label_com_docker_swarm_service_name`, etc.

3. **Teste diferentes labels**:
```promql
# Opção 1: Por nome
container_cpu_usage_seconds_total{name=~".*credgestor.*"}

# Opção 2: Por serviço Docker Swarm
container_cpu_usage_seconds_total{container_label_com_docker_swarm_service_name=~".*credgestor.*"}

# Opção 3: Ver todos os containers primeiro
container_cpu_usage_seconds_total
```

4. **Ajuste as queries do dashboard** com o label correto

#### Solução 4: Verificar se o Prometheus está Coletando

1. Acesse o Prometheus diretamente: `http://seu-prometheus:9090`
2. Vá em **Status** → **Targets**
3. Verifique se os targets estão **UP**:
   - `cadvisor` (porta 8080)
   - `node` (node_exporter, porta 9100)
   - Outros jobs configurados

4. Se algum target estiver **DOWN**, verifique:
   - Se o serviço está rodando
   - Se a porta está correta
   - Se há problemas de rede

#### Solução 5: Verificar Métricas de API (se aplicável)

Se você quer métricas da API FastAPI:

1. **Verifique se a API expõe `/metrics`**:
   ```bash
   curl http://sua-api:8000/metrics
   ```

2. **Se não expõe**, adicione instrumentação (veja `GRAFANA_OBSERVABILITY_STACK.md`)

3. **Verifique se o Prometheus está coletando**:
   - No Prometheus UI, vá em **Status** → **Targets**
   - Verifique se há um job `credgestor-api` ou similar

## 🔧 Ajustar Queries do Dashboard

### Para PostgreSQL

1. **Edite o dashboard** (ícone de lápis)
2. **Clique em um painel** que mostra "No data"
3. **Na seção Query**, verifique:
   - Se o data source está selecionado corretamente
   - Se a query SQL está correta
   - Se os nomes das tabelas/colunas estão corretos

4. **Teste a query**:
   - Clique em **Run query**
   - Se não retornar dados, ajuste a query

5. **Exemplo de query ajustada**:
   ```sql
   -- Se sua tabela se chama 'clientes' em vez de 'clients'
   SELECT COUNT(*) as total 
   FROM clientes 
   WHERE tenant_id IN (SELECT id FROM tenants WHERE ativo = true);
   ```

### Para Prometheus

1. **Edite o dashboard** (ícone de lápis)
2. **Clique em um painel** que mostra "No data"
3. **Na seção Query**, verifique:
   - Se o data source está selecionado corretamente
   - Se a query PromQL está correta
   - Se os labels estão corretos

4. **Teste a query no Explore primeiro**:
   - Vá em **Explore**
   - Cole a query
   - Ajuste até funcionar
   - Depois copie para o dashboard

5. **Exemplo de query ajustada**:
   ```promql
   # Se seus containers usam label 'name' em vez de 'container_label_com_docker_swarm_service_name'
   container_cpu_usage_seconds_total{name=~"credgestor.*"}
   ```

## 📝 Checklist de Verificação

Marque cada item conforme verifica:

### Data Sources
- [ ] PostgreSQL configurado e testado com sucesso
- [ ] Prometheus configurado e testado com sucesso
- [ ] Variáveis do dashboard apontam para os data sources corretos

### PostgreSQL
- [ ] Conexão com o banco funciona
- [ ] Tabelas existem (`tenants`, `clients`, `loans`, `installments`)
- [ ] Colunas existem e têm os nomes esperados
- [ ] Query de teste retorna dados no Explore

### Prometheus
- [ ] Prometheus está acessível
- [ ] Query `up` retorna dados no Explore
- [ ] cAdvisor está coletando métricas (`container_cpu_usage_seconds_total` retorna dados)
- [ ] node_exporter está coletando métricas (`node_cpu_seconds_total` retorna dados)
- [ ] Labels dos containers foram identificados
- [ ] Queries do dashboard usam os labels corretos

### Dashboard
- [ ] Variáveis `DS_PROMETHEUS` e `DS_POSTGRES` estão configuradas
- [ ] Time range está correto (últimas 6 horas ou mais)
- [ ] Queries foram testadas individualmente no Explore

## 🚀 Solução Rápida: Queries de Teste

### Teste PostgreSQL

No **Explore** do Grafana, teste:

```sql
-- Teste 1: Verificar se consegue conectar
SELECT 1 as test;

-- Teste 2: Verificar tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
LIMIT 10;

-- Teste 3: Contar tenants
SELECT COUNT(*) as total FROM tenants;
```

### Teste Prometheus

No **Explore** do Grafana, teste:

```promql
# Teste 1: Verificar se Prometheus funciona
up

# Teste 2: Ver containers
container_cpu_usage_seconds_total

# Teste 3: Ver sistema
node_cpu_seconds_total

# Teste 4: Filtrar containers CredGestor (ajuste o label)
container_cpu_usage_seconds_total{name=~".*credgestor.*"}
```

## 🆘 Se Nada Funcionar

1. **Verifique os logs do Grafana**:
   - Pode haver erros de conexão ou permissões

2. **Verifique se os serviços estão rodando**:
   ```bash
   # No Portainer ou via Docker
   docker ps | grep -E "prometheus|grafana|postgres"
   ```

3. **Teste acesso direto**:
   - Prometheus: `http://seu-ip:9090`
   - Grafana: `http://seu-ip:3000` (ou porta configurada)

4. **Verifique permissões de rede**:
   - Firewall
   - Docker networks
   - Portas expostas

## 📚 Próximos Passos

Após resolver o "No data":
1. ✅ Verifique se os dados aparecem no Explore
2. ✅ Ajuste as queries do dashboard conforme necessário
3. ✅ Configure alertas (opcional)
4. ✅ Personalize os painéis conforme necessário
