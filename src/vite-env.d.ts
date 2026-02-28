/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_LOGIN_URL?: string;
  readonly VITE_API_TENANT_ID?: string;
  readonly VITE_N8N_BASE_URL?: string;
  readonly VITE_N8N_TENANT_ID?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
