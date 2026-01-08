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
2. Configure your environment variables directly in the provided [.env](.env) file (already tracked for local use):
   - `VITE_API_BASE_URL=http://localhost:8000` (URL do backend Python; opcionalmente use `VITE_N8N_BASE_URL` para compatibilidade)
   - `VITE_API_LOGIN_URL=https://credgestor.app.br/auth/login` (opcional; força usar um endpoint de login específico mesmo sem `VITE_API_BASE_URL`)
   - `VITE_SUPABASE_URL=https://avszitcisjexrjkbkxat.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2c3ppdGNpc2pleHJqa2JreGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzE2MjMsImV4cCI6MjA4MTQ0NzYyM30.AyOFyM8uScHLWdhc9diTsn9WM_2dlMc5m4-jfN_LOtU`
   - `SUPABASE_URL=https://avszitcisjexrjkbkxat.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2c3ppdGNpc2pleHJqa2JreGF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTg3MTYyMywiZXhwIjoyMDgxNDQ3NjIzfQ.p-3mHE0HZ719ZLfOTjTeXSLC9hmlmmFfdtBZxt4qLtY`
   - `SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2c3ppdGNpc2pleHJqa2JreGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzE2MjMsImV4cCI6MjA4MTQ0NzYyM30.AyOFyM8uScHLWdhc9diTsn9WM_2dlMc5m4-jfN_LOtU`
   - `VITE_N8N_WEBHOOK_URL=https://n8n.aiagentautomate.com.br/webhook/clientes`
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
# credgestor-homologacao
