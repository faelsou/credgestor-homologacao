# 🤖 Agente IA - Notificações de Vencimentos Diários (n8n)

## 📋 Descrição

Este workflow n8n automatiza o envio de notificações sobre vencimentos diários:

1. **Busca parcelas vencendo hoje** no banco de dados
2. **Agrupa por tenant** para processamento organizado
3. **Envia emails** para usuários do sistema com resumo completo
4. **Envia WhatsApp** individual para cada cliente com vencimento

## 📦 Arquivo

- `n8n_workflow_agente_ia_vencimentos.json` - Workflow completo para n8n 1.115+

## 🚀 Como Importar no n8n

### Passo 1: Importar o Workflow

1. Abra o n8n (versão 1.115 ou superior)
2. Vá em **Workflows** > **Import from File**
3. Selecione o arquivo `n8n_workflow_agente_ia_vencimentos.json`

### Passo 2: Configurar Credenciais do Banco de Dados

1. Clique no nó **"Buscar Parcelas Vencendo Hoje"**
2. Configure as credenciais PostgreSQL:
   - **Host**: URL do seu Supabase (ex: `db.xxxxx.supabase.co`)
   - **Database**: `postgres`
   - **User**: `postgres` (ou seu usuário)
   - **Password**: Senha do banco
   - **Port**: `5432`
   - **SSL**: Habilitado (Requerido para Supabase)

3. Repita para o nó **"Buscar Usuários do Tenant"** (mesmas credenciais)

### Passo 3: Configurar Variáveis de Ambiente

Configure as seguintes variáveis de ambiente no n8n:

#### WhatsApp (Evolution API)

```bash
# Opção 1: Usar nome da instância (recomendado)
WHATSAPP_API_INSTANCE=CredGestor
AUTHENTICATION_API_KEY=CN4AnbOtY79Wv6wNyx88cdoKXqugcINi

# Opção 2: URL completa
WHATSAPP_API_URL=https://api.evolutionapi.com/v1/message/sendText/CredGestor
WHATSAPP_API_TOKEN=CN4AnbOtY79Wv6wNyx88cdoKXqugcINi
```

#### Email (SendGrid - opcional)

```bash
EMAIL_API_URL=https://api.sendgrid.com/v3/mail/send
SENDGRID_API_KEY=sua-chave-sendgrid
```

**Nota:** Se não configurar email, o workflow ainda funcionará para WhatsApp. Você pode ajustar o nó "Enviar Email" para usar outro serviço (AWS SES, SMTP, etc.).

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
3. **Agrupar por Tenant** - Agrupa parcelas por tenant
4. **Processar Tenants** - Divide em lotes para processar um tenant por vez
5. **Buscar Usuários do Tenant** - Busca usuários ativos de cada tenant
6. **Formatar Email para Usuários** - Prepara mensagens de email
7. **Formatar WhatsApp para Clientes** - Prepara mensagens WhatsApp individuais
8. **Enviar Email** - Envia emails para usuários do sistema
9. **Processar WhatsApp** - Divide mensagens WhatsApp em lotes
10. **Enviar WhatsApp** - Envia mensagens via Evolution API
11. **Verificar Sucesso** - Verifica se o envio foi bem-sucedido
12. **Resumo Execução** - Gera relatório da execução

### Query SQL Utilizada

```sql
SELECT 
  inst.id as parcela_id,
  inst.loan_id,
  inst.client_id,
  inst.tenant_id,
  inst.number as numero_parcela,
  inst.due_date as data_vencimento,
  inst.amount as valor_parcela,
  inst.amount_paid as valor_pago,
  inst.interest_amount,
  inst.principal_amount,
  inst.status,
  c.nome as cliente_nome,
  c.whatsapp,
  c.celular,
  c.telefone,
  c.email as cliente_email,
  l.model as modelo_emprestimo,
  t.name as tenant_name
FROM public.installments inst
JOIN public.clients c ON inst.client_id = c.id
JOIN public.loans l ON inst.loan_id = l.id
JOIN public.tenants t ON inst.tenant_id = t.id
WHERE inst.due_date = CURRENT_DATE
  AND inst.status IN ('PENDING', 'LATE')
  AND c.ativo = true
ORDER BY inst.tenant_id, inst.due_date, c.nome;
```

## 📧 Formato das Mensagens

### Email para Usuários

```
🔔 NOTIFICAÇÃO DE VENCIMENTOS - DD/MM/YYYY

Olá! Este é um resumo automático dos vencimentos do dia de hoje para o tenant: [Nome do Tenant]

📊 RESUMO:
• Total de parcelas vencendo: X
• Valor total em aberto: R$ X.XXX,XX

📋 DETALHES DAS PARCELAS:

🔴 Cliente: [Nome]
   • Parcela #X
   • Parcela/Juros: R$ X.XXX,XX
   • Status: LATE/PENDING
   • Contato: [Telefone/Email]

---
Sistema CredGestor - Agente de IA
Gerado automaticamente em DD/MM/YYYY HH:MM:SS
```

### WhatsApp para Clientes

```
🔔 *Lembrete de Vencimento*

Olá *[Nome do Cliente]*!

Sua [parcela/juros] #[número] no valor de *R$ [valor]* vence hoje ([data]).

Por favor, realize o pagamento para evitar juros e multa.

*Telefone para contato:* [telefone]

Obrigado!
```

## ⚙️ Configurações Avançadas

### Personalizar Mensagem de Email

Edite o código JavaScript no nó **"Formatar Email para Usuários"** para personalizar a mensagem.

### Personalizar Mensagem de WhatsApp

Edite o código JavaScript no nó **"Formatar WhatsApp para Clientes"** para personalizar a mensagem.

### Usar Outro Serviço de Email

Ajuste o nó **"Enviar Email"** para usar:
- AWS SES
- SMTP direto
- Outro serviço de email

### Adicionar Delay entre Envios

Para evitar rate limiting, adicione um nó **"Wait"** após **"Enviar WhatsApp"**:
1. Adicione um nó **"Wait"**
2. Configure para aguardar 2-5 segundos entre cada envio

## 🐛 Troubleshooting

### Erro: "Connection refused" no PostgreSQL

- Verifique se o Supabase permite conexões externas
- Confirme as credenciais do banco de dados
- Verifique se o SSL está habilitado

### Erro: "WhatsApp API não configurada"

- Configure as variáveis de ambiente `WHATSAPP_API_INSTANCE` e `AUTHENTICATION_API_KEY`
- Verifique se o nome da instância está correto
- Confirme se a chave de autenticação está válida

### Mensagens não estão sendo enviadas

- Verifique os logs de execução do workflow
- Confirme se há parcelas vencendo hoje
- Verifique se os clientes têm telefone cadastrado
- Confirme se os usuários estão ativos no tenant

## 📚 Referências

- [Documentação n8n](https://docs.n8n.io/)
- [Evolution API Documentation](https://doc.evolution-api.com/)
- [Workflow Python do Agente](./AGENTE_IA_VENCIMENTOS.md)
