# 📱 Automação de Cobrança - n8n Workflow

## 📋 Descrição

Este workflow automatiza o envio de mensagens de cobrança para clientes que têm parcelas vencendo no dia atual. O sistema:

1. **Executa diariamente** (configurável via cron)
2. **Consulta o banco de dados** para encontrar parcelas vencendo hoje
3. **Envia mensagem via WhatsApp** para cada cliente
4. **Registra o processamento** no banco de dados

## 📦 Arquivos

- `n8n_workflow_cobranca_vencimento.json` - Versão completa com logs e tratamento de erros
- `n8n_workflow_cobranca_vencimento_simples.json` - Versão simplificada

## 🚀 Como Importar no n8n

### Passo 1: Acessar o n8n

1. Abra o n8n (versão 1.115 ou superior)
2. Vá em **Workflows** > **Import from File**
3. Selecione o arquivo JSON desejado

### Passo 2: Configurar Credenciais do Banco de Dados

1. Clique no nó **"Buscar Parcelas Vencendo Hoje"**
2. Configure as credenciais PostgreSQL:
   - **Host**: URL do seu Supabase (ex: `db.xxxxx.supabase.co`)
   - **Database**: `postgres`
   - **User**: `postgres` (ou seu usuário)
   - **Password**: Senha do banco
   - **Port**: `5432`
   - **SSL**: Habilitado (Requerido para Supabase)

**Exemplo de conexão Supabase:**
```
Host: db.abcdefghijklmnop.supabase.co
Database: postgres
User: postgres
Password: sua_senha_aqui
Port: 5432
SSL: true
```

### Passo 3: Configurar API de WhatsApp

O workflow está configurado para usar uma API de WhatsApp. Você precisa escolher uma das opções abaixo:

#### Opção A: Evolution API (Recomendado)

1. Configure as variáveis de ambiente no n8n:
   - `WHATSAPP_API_URL`: `https://api.evolutionapi.com/v1/message/sendText/SUA_INSTANCIA`
   - `WHATSAPP_API_TOKEN`: Seu token da Evolution API

2. No nó **"Enviar WhatsApp"**, ajuste o body para:
```json
{
  "number": "{{ $json.telefone }}",
  "text": "{{ $json.mensagem }}"
}
```

#### Opção B: Twilio WhatsApp

1. Configure as variáveis de ambiente:
   - `WHATSAPP_API_URL`: `https://api.twilio.com/2010-04-01/Accounts/SEU_ACCOUNT_SID/Messages.json`
   - `WHATSAPP_API_TOKEN`: Seu token do Twilio

2. Ajuste o body para formato Twilio:
```json
{
  "From": "whatsapp:+14155238886",
  "To": "whatsapp:{{ $json.telefone }}",
  "Body": "{{ $json.mensagem }}"
}
```

3. Configure autenticação Basic Auth com:
   - Username: Seu Account SID
   - Password: Seu Auth Token

#### Opção C: WhatsApp Business API (Meta)

1. Configure:
   - `WHATSAPP_API_URL`: `https://graph.facebook.com/v18.0/SEU_PHONE_NUMBER_ID/messages`
   - `WHATSAPP_API_TOKEN`: Seu Access Token

2. Ajuste o body:
```json
{
  "messaging_product": "whatsapp",
  "to": "{{ $json.telefone }}",
  "type": "text",
  "text": {
    "body": "{{ $json.mensagem }}"
  }
}
```

#### Opção D: Webhook Customizado

Se você tiver um webhook próprio ou usar outro serviço, ajuste o nó **"Enviar WhatsApp"** conforme necessário.

### Passo 4: Configurar Agendamento

O workflow está configurado para executar **diariamente às 8h** (cron: `0 8 * * *`).

Para alterar:

1. Clique no nó **"Agendamento Diário"**
2. Configure o horário desejado:
   - `0 8 * * *` - Todo dia às 8h
   - `0 9 * * *` - Todo dia às 9h
   - `0 8,14 * * *` - Às 8h e 14h
   - `0 8 * * 1-5` - Segunda a sexta às 8h

### Passo 5: Testar o Workflow

1. Clique em **"Execute Workflow"** manualmente
2. Verifique os logs de execução
3. Confira se as mensagens foram enviadas

## 🔍 Estrutura do Workflow

### Nós Principais

1. **Agendamento Diário** - Trigger que executa o workflow
2. **Buscar Parcelas Vencendo Hoje** - Query SQL no banco
3. **Processar e Formatar** - Formata dados e monta mensagens
4. **Processar uma por vez** - Divide em lotes para evitar sobrecarga
5. **Enviar WhatsApp** - Envia mensagem via API
6. **Sucesso?** - Verifica se o envio foi bem-sucedido
7. **Marcar como Processada** - Atualiza registro no banco
8. **Resumo** - Gera relatório da execução

### Query SQL Utilizada

```sql
SELECT 
  par.id as parcela_id,
  par.numero_parcela,
  par.valor_parcela,
  par.data_vencimento,
  par.status,
  par.tenant_id,
  c.id as cliente_id,
  c.nome as cliente_nome,
  COALESCE(c.whatsapp, c.celular, c.telefone) as telefone,
  prop.numero_proposta,
  prop.valor_aprovado
FROM public.parcelas par
JOIN public.propostas prop ON par.proposta_id = prop.id
JOIN public.clients c ON prop.cliente_id = c.id
WHERE par.data_vencimento = CURRENT_DATE
  AND par.status IN ('pendente', 'atrasado')
  AND c.ativo = true
  AND (c.whatsapp IS NOT NULL OR c.celular IS NOT NULL OR c.telefone IS NOT NULL)
ORDER BY par.data_vencimento, c.nome;
```

### Formato da Mensagem

```
Olá [Nome do Cliente]!

Lembrete: Sua parcela [Número] no valor de R$ [Valor] vence hoje ([Data]).

Por favor, realize o pagamento para evitar juros e multa.

Proposta: [Número da Proposta]
Obrigado!
```

## ⚙️ Configurações Avançadas

### Adicionar Filtro por Tenant

Se você quiser processar apenas um tenant específico, modifique a query SQL:

```sql
WHERE par.data_vencimento = CURRENT_DATE
  AND par.status IN ('pendente', 'atrasado')
  AND c.ativo = true
  AND par.tenant_id = 'SEU_TENANT_ID_AQUI'  -- Adicione esta linha
  AND (c.whatsapp IS NOT NULL OR c.celular IS NOT NULL OR c.telefone IS NOT NULL)
```

### Adicionar Delay entre Envios

Para evitar rate limiting da API, adicione um nó **"Wait"** entre os envios:

1. Adicione um nó **"Wait"** após **"Enviar WhatsApp"**
2. Configure para aguardar 2-5 segundos entre cada envio

### Personalizar Mensagem

Edite o código JavaScript no nó **"Processar e Formatar"** para personalizar a mensagem conforme necessário.

### Adicionar Notificação de Erro

1. Adicione um nó **"Email"** ou **"Slack"** após **"Registrar Erro"**
2. Configure para enviar notificação quando houver falhas

## 🐛 Troubleshooting

### Erro: "Connection refused" no PostgreSQL

- Verifique se o Supabase permite conexões externas
- Confirme as credenciais (host, port, user, password)
- Verifique se o SSL está habilitado

### Erro: "No rows returned"

- Verifique se existem parcelas vencendo hoje no banco
- Teste a query SQL diretamente no banco
- Confirme que os status estão corretos ('pendente' ou 'atrasado')

### Erro: "WhatsApp API returned error"

- Verifique se o token da API está correto
- Confirme se a URL da API está correta
- Verifique os limites de rate da API
- Teste a API manualmente (curl/Postman)

### Mensagens não estão sendo enviadas

- Verifique os logs de execução do n8n
- Confirme se o telefone está no formato correto (55 + DDD + número)
- Teste o envio manualmente com um número conhecido

## 📊 Monitoramento

### Verificar Execuções

1. No n8n, vá em **Executions**
2. Veja o histórico de execuções do workflow
3. Clique em uma execução para ver detalhes

### Métricas Importantes

- Total de parcelas encontradas
- Total de mensagens enviadas com sucesso
- Total de erros
- Tempo de execução

## 🔒 Segurança

- **Nunca** commite credenciais no código
- Use variáveis de ambiente para tokens e senhas
- Configure SSL para conexões com banco de dados
- Limite o acesso ao n8n apenas para usuários autorizados
- Revise periodicamente os logs de execução

## 📝 Notas

- O workflow processa apenas parcelas com status 'pendente' ou 'atrasado'
- Apenas clientes ativos são processados
- O telefone é priorizado na ordem: whatsapp > celular > telefone
- O código do país (55) é adicionado automaticamente se não estiver presente

## 🆘 Suporte

Para problemas ou dúvidas:
1. Verifique os logs de execução no n8n
2. Teste cada nó individualmente
3. Consulte a documentação do n8n: https://docs.n8n.io
4. Consulte a documentação da sua API de WhatsApp
