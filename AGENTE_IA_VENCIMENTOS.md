# 🤖 Agente de IA - Notificações de Vencimentos Diários

## 📋 Descrição

Este agente de IA automatiza o envio de mensagens para os **usuários do sistema** informando sobre clientes com parcelas vencendo no dia atual. Diferente dos workflows n8n que enviam mensagens para os clientes, este agente notifica os usuários internos do sistema.

## 🎯 Funcionalidades

- ✅ Busca automaticamente parcelas vencendo hoje (status `PENDING` ou `LATE`)
- ✅ Agrupa vencimentos por tenant
- ✅ Busca usuários ativos de cada tenant
- ✅ Envia notificações personalizadas para cada usuário
- ✅ Suporta envio via Email e WhatsApp
- ✅ Formata mensagens com resumo e detalhes das parcelas

## 📦 Arquivos

- `scripts/ai_agent_vencimentos_diarios.py` - Script principal do agente
- `AGENTE_IA_VENCIMENTOS.md` - Esta documentação

## 🚀 Como Usar

### Pré-requisitos

1. **Variáveis de Ambiente Configuradas:**
   ```bash
   export SUPABASE_URL="https://seu-projeto.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="sua-chave-service-role"
   ```

2. **Dependências Python:**
   ```bash
   pip install supabase python-dotenv
   ```

### Execução Manual

```bash
# Executar o agente manualmente
cd /var/www/credgestor-homologacao
python3 scripts/ai_agent_vencimentos_diarios.py
```

### Execução Automática (Cron)

Para executar o agente diariamente, adicione ao crontab:

```bash
# Editar crontab
crontab -e

# Adicionar linha para executar diariamente às 8h
0 8 * * * cd /var/www/credgestor-homologacao && /usr/bin/python3 scripts/ai_agent_vencimentos_diarios.py >> /var/log/credgestor_ai_agent.log 2>&1
```

### Execução com Docker

Se estiver usando Docker, você pode executar o agente dentro do container:

```bash
# Executar no container do backend
docker exec -it credgestor-backend python3 scripts/ai_agent_vencimentos_diarios.py

# Ou criar um container separado para o agente
docker run --rm \
  -e SUPABASE_URL="https://seu-projeto.supabase.co" \
  -e SUPABASE_SERVICE_ROLE_KEY="sua-chave" \
  credgestor-backend \
  python3 scripts/ai_agent_vencimentos_diarios.py
```

## 📧 Configuração de Envio de Email

O agente atualmente **simula** o envio de emails. Para implementar envio real, edite a função `enviar_email()` no script.

### Opção 1: SendGrid

```python
import sendgrid
from sendgrid.helpers.mail import Mail

def enviar_email(self, destinatario: str, assunto: str, mensagem: str) -> bool:
    try:
        sg = sendgrid.SendGridAPIClient(api_key=os.getenv('SENDGRID_API_KEY'))
        message = Mail(
            from_email='noreply@credgestor.com.br',
            to_emails=destinatario,
            subject=assunto,
            plain_text_content=mensagem
        )
        response = sg.send(message)
        return response.status_code == 202
    except Exception as e:
        print(f"❌ Erro ao enviar email: {e}")
        return False
```

### Opção 2: AWS SES

```python
import boto3
from botocore.exceptions import ClientError

def enviar_email(self, destinatario: str, assunto: str, mensagem: str) -> bool:
    try:
        ses_client = boto3.client('ses', region_name='us-east-1')
        response = ses_client.send_email(
            Source='noreply@credgestor.com.br',
            Destination={'ToAddresses': [destinatario]},
            Message={
                'Subject': {'Data': assunto},
                'Body': {'Text': {'Data': mensagem}}
            }
        )
        return response['ResponseMetadata']['HTTPStatusCode'] == 200
    except ClientError as e:
        print(f"❌ Erro ao enviar email: {e}")
        return False
```

### Opção 3: SMTP Simples

```python
import smtplib
from email.mime.text import MIMEText

def enviar_email(self, destinatario: str, assunto: str, mensagem: str) -> bool:
    try:
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_user = os.getenv('SMTP_USER')
        smtp_password = os.getenv('SMTP_PASSWORD')
        
        msg = MIMEText(mensagem, 'plain', 'utf-8')
        msg['Subject'] = assunto
        msg['From'] = smtp_user
        msg['To'] = destinatario
        
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()
        
        return True
    except Exception as e:
        print(f"❌ Erro ao enviar email: {e}")
        return False
```

## 💬 Configuração de Envio de WhatsApp

O agente agora **suporta envio real** de WhatsApp através de variáveis de ambiente. A mensagem enviada para cada cliente inclui:

- ✅ **Nome do cliente**
- ✅ **Valor da parcela** (se modelo PRICE) ou **Valor dos juros** (se modelo INTEREST_ONLY)
- ✅ **Telefone do cliente** para contato

### Formato da Mensagem WhatsApp

```
🔔 *Lembrete de Vencimento*

Olá *[Nome do Cliente]*!

Sua [parcela/juros] #[número] no valor de *R$ [valor]* vence hoje ([data]).

Por favor, realize o pagamento para evitar juros e multa.

*Telefone para contato:* [telefone]

Obrigado!
```

### Configuração Rápida

**Opção 1: Usando script de configuração (Recomendado)**

```bash
# Edite o arquivo scripts/configurar_whatsapp.sh e altere SUA_INSTANCIA
# Depois execute:
source scripts/configurar_whatsapp.sh
.venv/bin/python3 scripts/ai_agent_vencimentos_diarios.py
```

**Opção 2: Variáveis de ambiente manualmente**

```bash
# Configure o nome da sua instância (encontre no painel da Evolution API)
export WHATSAPP_API_INSTANCE="nome-da-sua-instancia"

# Configure a chave de autenticação
export AUTHENTICATION_API_KEY="CN4AnbOtY79Wv6wNyx88cdoKXqugcINi"

# OU use URL completa:
export WHATSAPP_API_URL="https://api.evolutionapi.com/v1/message/sendText/nome-da-sua-instancia"
export WHATSAPP_API_TOKEN="CN4AnbOtY79Wv6wNyx88cdoKXqugcINi"
```

O agente detectará automaticamente essas variáveis e enviará mensagens reais.

**⚠️ IMPORTANTE:** Você precisa saber o nome da sua instância na Evolution API. Encontre no painel administrativo da Evolution API.

### Opção 1: Evolution API

```python
import requests

def enviar_whatsapp(self, telefone: str, mensagem: str) -> bool:
    try:
        api_url = os.getenv('WHATSAPP_API_URL', 'https://api.evolutionapi.com/v1/message/sendText/INSTANCIA')
        api_token = os.getenv('WHATSAPP_API_TOKEN')
        
        # Formatar telefone (remover caracteres não numéricos e adicionar código do país)
        telefone_limpo = ''.join(filter(str.isdigit, telefone))
        if not telefone_limpo.startswith('55'):
            telefone_limpo = '55' + telefone_limpo
        
        response = requests.post(
            api_url,
            json={
                'number': telefone_limpo,
                'text': mensagem
            },
            headers={
                'Authorization': f'Bearer {api_token}',
                'Content-Type': 'application/json'
            }
        )
        
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Erro ao enviar WhatsApp: {e}")
        return False
```

### Opção 2: Twilio WhatsApp

```python
from twilio.rest import Client

def enviar_whatsapp(self, telefone: str, mensagem: str) -> bool:
    try:
        account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        from_number = os.getenv('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')
        
        client = Client(account_sid, auth_token)
        
        # Formatar telefone
        telefone_limpo = ''.join(filter(str.isdigit, telefone))
        if not telefone_limpo.startswith('55'):
            telefone_limpo = '55' + telefone_limpo
        
        message = client.messages.create(
            from_=from_number,
            body=mensagem,
            to=f'whatsapp:+{telefone_limpo}'
        )
        
        return message.sid is not None
    except Exception as e:
        print(f"❌ Erro ao enviar WhatsApp: {e}")
        return False
```

## 📊 Estrutura da Mensagem

A mensagem enviada aos usuários contém:

```
🔔 NOTIFICAÇÃO DE VENCIMENTOS - DD/MM/YYYY

Olá! Este é um resumo automático dos vencimentos do dia de hoje para o tenant: [Nome do Tenant]

📊 RESUMO:
• Total de parcelas vencendo: X
• Valor total em aberto: R$ X.XXX,XX

📋 DETALHES DAS PARCELAS:

🔴 Cliente: [Nome do Cliente]
   • Parcela #X
   • Valor: R$ X.XXX,XX
   • Status: LATE/PENDING
   • Contato: [Telefone/Email]

---
Sistema CredGestor - Agente de IA
Gerado automaticamente em DD/MM/YYYY HH:MM:SS
```

## 🔍 Query SQL Utilizada

O agente utiliza a seguinte lógica para buscar parcelas:

```sql
SELECT 
  inst.id,
  inst.loan_id,
  inst.client_id,
  inst.number,
  inst.due_date,
  inst.amount,
  inst.amount_paid,
  inst.status,
  inst.tenant_id,
  clients.name,
  clients.phone,
  clients.email
FROM public.installments inst
JOIN public.clients ON inst.client_id = clients.id
WHERE inst.due_date = CURRENT_DATE
  AND inst.status IN ('PENDING', 'LATE')
ORDER BY inst.tenant_id, inst.due_date;
```

## ⚙️ Configurações Avançadas

### Filtrar por Tenant Específico

Para processar apenas um tenant específico, modifique a função `buscar_parcelas_vencendo_hoje()`:

```python
def buscar_parcelas_vencendo_hoje(self, tenant_id: Optional[str] = None):
    hoje = date.today().isoformat()
    query = self.supabase.table('installments').select(...).eq('due_date', hoje)
    
    if tenant_id:
        query = query.eq('tenant_id', tenant_id)
    
    response = query.in_('status', ['PENDING', 'LATE']).execute()
    return response.data or []
```

### Adicionar Delay entre Envios

Para evitar rate limiting, adicione delay entre envios:

```python
import time

def enviar_notificacoes(self, tenant_vencimentos, usuarios):
    for usuario in usuarios:
        # ... código de envio ...
        time.sleep(2)  # Aguarda 2 segundos entre cada envio
```

### Personalizar Mensagem por Role

Para personalizar mensagens baseado no role do usuário:

```python
def formatar_mensagem(self, tenant_vencimentos, usuario_role='user'):
    if usuario_role == 'admin':
        # Mensagem mais detalhada para admins
        mensagem = self._formatar_mensagem_admin(tenant_vencimentos)
    else:
        # Mensagem resumida para outros usuários
        mensagem = self._formatar_mensagem_resumida(tenant_vencimentos)
    return mensagem
```

## 🐛 Troubleshooting

### Erro: "SUPABASE_URL não está configurada"

**Solução:** Configure as variáveis de ambiente:
```bash
export SUPABASE_URL="https://seu-projeto.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="sua-chave"
```

### Erro: "Nenhuma parcela encontrada"

**Possíveis causas:**
- Não há parcelas vencendo hoje
- Status das parcelas não é `PENDING` ou `LATE`
- Problema de conexão com o banco de dados

**Solução:** Verifique manualmente:
```sql
SELECT COUNT(*) 
FROM public.installments 
WHERE due_date = CURRENT_DATE 
  AND status IN ('PENDING', 'LATE');
```

### Erro: "Nenhum usuário encontrado para o tenant"

**Possíveis causas:**
- Não há usuários ativos no tenant
- Campo `ativo` está como `false` na tabela `tenant_users`

**Solução:** Verifique:
```sql
SELECT * 
FROM public.tenant_users 
WHERE tenant_id = 'seu-tenant-id' 
  AND ativo = true;
```

## 📝 Logs

O agente imprime logs detalhados durante a execução:

```
============================================================
🤖 AGENTE DE IA - NOTIFICAÇÕES DE VENCIMENTOS DIÁRIOS
============================================================
✅ Agente inicializado com sucesso

🔍 Buscando parcelas vencendo hoje (2024-01-15)...
✅ Encontradas 5 parcelas vencendo hoje

📊 Processando 5 parcelas por tenant...
✅ Processados 2 tenants com vencimentos

🏢 Processando tenant: Empresa ABC
   • 3 parcelas
   • R$ 1.500,00 em aberto

📤 Enviando notificações para 2 usuários do tenant Empresa ABC...
📧 [EMAIL] Enviando para admin@empresa.com...
💬 [WHATSAPP] Enviando para +5511999999999...

============================================================
✅ Processo concluído com sucesso!
============================================================
```

## 🔐 Segurança

- ⚠️ **NUNCA** exponha a `SUPABASE_SERVICE_ROLE_KEY` publicamente
- ⚠️ Use variáveis de ambiente ou secrets management
- ⚠️ Configure permissões adequadas no crontab
- ⚠️ Monitore logs para detectar uso não autorizado

## 📚 Referências

- [Documentação Supabase Python](https://supabase.com/docs/reference/python/introduction)
- [Workflow n8n de Cobrança](./N8N_AUTOMACAO_COBRANCA.md) - Para comparação
- [Estrutura do Banco de Dados](./DIAGRAMA_ER.md)
