<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/temp/1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to `.env.local` and set:
   - `GEMINI_API_KEY` (required for the AI features)
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (frontend-safe, limited by RLS)
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` for CLI/Node utilities such as `npm run test:supabase`
   - Never place the `service_role` key in frontend-facing variables; keep it only in backend services or secret managers if you need privileged tasks.
3. Run the app:
   `npm run dev`

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
