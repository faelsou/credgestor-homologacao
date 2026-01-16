# 📧 Automação de Onboarding - Novo Usuário CredGestor

## 📋 Descrição

Este workflow automatiza o envio de emails de boas-vindas (onboarding) para novos usuários do sistema CredGestor. O sistema:

1. **Executa a cada 5 minutos** (configurável via cron)
2. **Consulta o banco de dados** para encontrar usuários criados nos últimos 10 minutos
3. **Envia email de onboarding** personalizado para cada novo usuário
4. **Registra o envio** no log de auditoria

## 📦 Arquivo

- `n8n_workflow_onboarding_usuario.json` - Workflow completo com tratamento de erros e logs

## 🚀 Como Importar no n8n

### Passo 1: Acessar o n8n

1. Abra o n8n (versão 1.115 ou superior)
2. Vá em **Workflows** > **Import from File**
3. Selecione o arquivo `n8n_workflow_onboarding_usuario.json`

### Passo 2: Configurar Credenciais do Banco de Dados

1. Clique no nó **"Buscar Novos Usuários"**
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

### Passo 3: Configurar Credenciais SMTP (Email)

1. Clique no nó **"Enviar Email de Onboarding"**
2. Configure as credenciais SMTP:

#### Opção A: Gmail (Recomendado para testes)

```
Host: smtp.gmail.com
Port: 587
User: seu-email@gmail.com
Password: sua-senha-de-app (use App Password, não a senha normal)
Secure: STARTTLS
```

**Como criar App Password no Gmail:**
1. Acesse: https://myaccount.google.com/apppasswords
2. Selecione "Mail" e "Other (Custom name)"
3. Digite "n8n" e clique em "Generate"
4. Use a senha gerada (16 caracteres)

#### Opção B: SendGrid

```
Host: smtp.sendgrid.net
Port: 587
User: apikey
Password: sua-api-key-do-sendgrid
Secure: STARTTLS
```

#### Opção C: Amazon SES

```
Host: email-smtp.us-east-1.amazonaws.com
Port: 587
User: sua-access-key-id
Password: sua-secret-access-key
Secure: STARTTLS
```

#### Opção D: Mailgun

```
Host: smtp.mailgun.org
Port: 587
User: seu-usuario-mailgun
Password: sua-senha-mailgun
Secure: STARTTLS
```

### Passo 4: Personalizar o Email

O email já vem com um template HTML bonito e responsivo, mas você pode personalizar:

1. Clique no nó **"Processar Dados do Usuário"**
2. Edite a variável `emailHtml` para alterar o conteúdo HTML
3. Edite a variável `emailTexto` para alterar a versão texto simples
4. Edite a variável `assunto` para alterar o assunto do email

### Passo 5: Ajustar Frequência de Verificação

Por padrão, o workflow verifica novos usuários a cada 5 minutos. Para alterar:

1. Clique no nó **"Verificar Novos Usuários"**
2. Altere a expressão cron:
   - `*/5 * * * *` - A cada 5 minutos (padrão)
   - `*/1 * * * *` - A cada 1 minuto
   - `0 * * * *` - A cada hora
   - `0 8 * * *` - Uma vez por dia às 8h

### Passo 6: Ajustar Janela de Tempo

Por padrão, o workflow busca usuários criados nos últimos 10 minutos. Para alterar:

1. Clique no nó **"Buscar Novos Usuários"**
2. Altere a query SQL:
   - `INTERVAL '10 minutes'` - Últimos 10 minutos (padrão)
   - `INTERVAL '5 minutes'` - Últimos 5 minutos
   - `INTERVAL '1 hour'` - Última hora

## 📊 Como Funciona

### Fluxo do Workflow

1. **Trigger Agendado**: Executa a cada 5 minutos
2. **Buscar Novos Usuários**: Consulta a tabela `tenant_users` para usuários criados recentemente
3. **Processar Dados**: Prepara o conteúdo do email personalizado
4. **Dividir em Lotes**: Processa um usuário por vez
5. **Enviar Email**: Envia o email de onboarding
6. **Registrar no Log**: Salva o envio na tabela `login_audit`
7. **Tratamento de Erros**: Registra erros se houver falha no envio

### Query SQL Utilizada

```sql
SELECT 
  tu.id,
  tu.email,
  tu.tenant_id,
  tu.role,
  tu.created_at,
  t.name as tenant_name,
  t.slug as tenant_slug
FROM public.tenant_users tu
LEFT JOIN public.tenants t ON tu.tenant_id = t.id
WHERE tu.created_at >= NOW() - INTERVAL '10 minutes'
  AND tu.ativo = true
ORDER BY tu.created_at DESC;
```

### Template do Email

O email inclui:
- **Cabeçalho** com logo e título
- **Mensagem personalizada** com nome do usuário
- **Lista de funcionalidades** do sistema
- **Botão de acesso** à plataforma
- **Rodapé** com informações da conta

## 🔧 Configurações Avançadas

### Evitar Envios Duplicados

Para evitar enviar o mesmo email múltiplas vezes, você pode:

1. Adicionar uma coluna `onboarding_email_sent` na tabela `tenant_users`
2. Atualizar a query para verificar apenas usuários que ainda não receberam o email
3. Marcar como enviado após o envio bem-sucedido

**Query atualizada:**
```sql
SELECT ...
FROM public.tenant_users tu
WHERE tu.created_at >= NOW() - INTERVAL '10 minutes'
  AND tu.ativo = true
  AND (tu.metadata->>'onboarding_email_sent')::boolean IS NOT TRUE
```

### Personalizar por Tenant

Você pode personalizar o conteúdo do email baseado no tenant:

1. No nó **"Processar Dados do Usuário"**, adicione lógica condicional:
```javascript
let emailHtml = '';
if (usuario.tenant_slug === 'empresa-a') {
  emailHtml = templateEmpresaA;
} else if (usuario.tenant_slug === 'empresa-b') {
  emailHtml = templateEmpresaB;
} else {
  emailHtml = templatePadrao;
}
```

### Adicionar Webhook para Notificações

Para receber notificações quando um email for enviado:

1. Adicione um nó **HTTP Request** após **"Registrar Sucesso"**
2. Configure para enviar um POST para seu webhook
3. Inclua informações do usuário no payload

## 🧪 Testar o Workflow

### Teste Manual

1. Crie um novo usuário na tabela `tenant_users`:
```sql
INSERT INTO public.tenant_users (tenant_id, email, role, ativo)
VALUES (
  'seu-tenant-id-aqui'::uuid,
  'teste@exemplo.com',
  'user',
  true
);
```

2. Execute o workflow manualmente no n8n
3. Verifique se o email foi enviado

### Verificar Logs

1. Verifique a tabela `login_audit`:
```sql
SELECT * FROM public.login_audit 
WHERE metadata->>'action' = 'onboarding_email_sent'
ORDER BY created_at DESC
LIMIT 10;
```

2. Verifique os logs do n8n para erros

## ⚠️ Troubleshooting

### Email não está sendo enviado

1. **Verifique as credenciais SMTP**: Teste a conexão SMTP separadamente
2. **Verifique se há novos usuários**: Execute a query SQL manualmente
3. **Verifique os logs do n8n**: Procure por erros na execução
4. **Verifique o formato do email**: Certifique-se de que o HTML está válido

### Emails duplicados

1. Implemente a verificação de `onboarding_email_sent` (veja seção acima)
2. Ajuste a janela de tempo para evitar sobreposição

### Erro de conexão com banco

1. Verifique se as credenciais PostgreSQL estão corretas
2. Verifique se o SSL está habilitado (obrigatório para Supabase)
3. Verifique se o firewall permite conexões do n8n

## 📝 Notas Importantes

- O workflow verifica usuários criados nos últimos 10 minutos para evitar processar usuários antigos
- O email é enviado apenas para usuários com `ativo = true`
- O workflow processa um usuário por vez para evitar sobrecarga
- Todos os envios são registrados na tabela `login_audit` para auditoria

## 🔗 Recursos Adicionais

- [Documentação do n8n](https://docs.n8n.io/)
- [Documentação do PostgreSQL](https://www.postgresql.org/docs/)
- [Documentação do Supabase](https://supabase.com/docs)
