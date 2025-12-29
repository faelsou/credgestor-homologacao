<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/temp/1

## Run Locally

**Prerequisites:**  Node.js for the frontend and Python 3.10+ for the backend API.


1. Install frontend dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to `.env.local` and set:
   - `GEMINI_API_KEY` (required for the AI features)
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (frontend-safe, limited by RLS)
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` for CLI/Node utilities such as `npm run test:supabase`
   - `VITE_N8N_BASE_URL` (optional) apontando para seus webhooks do n8n. Ex.: `https://n8n.suaempresa.com/webhook`
   - `VITE_N8N_TENANT_ID` (opcional) para pré-definir o tenant em chamadas públicas como `GET /clientes/:tenant_id`
   - `VITE_N8N_WEBHOOK_URL` (opcional) para disparos de relatórios WhatsApp automatizados. O padrão deste projeto aponta para `https://n8n.aiagentautomate.com.br/webhook/clientes`.
   - Never place the `service_role` key in frontend-facing variables; keep it only in backend services or secret managers if you need privileged tasks.
3. Run the frontend app:
   `npm run dev`

4. Install backend dependencies (Python):
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

5. Configure Supabase secrets for the backend API in the project `.env` file:
   - `SUPABASE_URL` – URL do projeto Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` – chave `service_role` (necessária para consolidar dados multi-tenant)
   - `SUPABASE_ANON_KEY` – opcional, caso você queira reutilizar no backend

6. Start the Python backend (FastAPI) from the project root:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```

   Principais rotas:
   - `GET /health` – valida se o backend consegue carregar as variáveis de ambiente
   - `GET /tables` – lista quais tabelas estão disponíveis
   - `GET /tenants` e `GET /tenants/{tenant_id}` – para leitura dos tenants
   - `GET|POST /tenants/{tenant_id}/{resource}` – leitura e criação de registros vinculados ao tenant (`clients`, `experiences`, `historic_scores`, `login_audit`, `tenant_roles`, `tenant_users`, `role_permissions`, `custom_domains`, `user_sessions`)
   - `GET|POST /users` – leitura/criação de usuários globais

## Testar conexão com o Supabase

   ```bash
   npm run test:supabase
   ```
   O script realiza uma chamada de autenticação e informa se a comunicação com o Supabase foi bem-sucedida.

## Modelagem de autenticação multi-cliente

Para autenticar dois clientes distintos (e seus usuários) por e-mail e senha mantendo ambientes separados, importe o script SQL abaixo em seu Postgres/Supabase:

- [`scripts/auth_multiclient.sql`](scripts/auth_multiclient.sql)
  - Cria as tabelas `tenants`, `tenant_users` e `user_sessions`.
  - Habilita as extensões necessárias para UUID e hash de senha.
  - Inclui dois tenants de exemplo (Cliente Alpha e Cliente Beta) e usuários administradores com senha já criptografada via `crypt()`.
  - O login pode ser validado comparando a senha informada com o hash armazenado no campo `password_hash`.
# credgestor
# credgestor
