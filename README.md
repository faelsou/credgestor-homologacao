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
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Testar conexão com o Supabase

1. Defina as variáveis de ambiente com as credenciais do seu projeto Supabase (por exemplo, no shell atual):
   ```bash
   export VITE_SUPABASE_URL="https://<projeto>.supabase.co"
   export VITE_SUPABASE_ANON_KEY="<sua anon key>"
   ```
2. Execute o teste de conectividade:
   ```bash
   npm run test:supabase
   ```
   O script realiza uma chamada de autenticação e informa se a comunicação com o Supabase foi bem-sucedida.
# credgestor
