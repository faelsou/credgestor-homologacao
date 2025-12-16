import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  // Prefer valores de ambiente do Vite, mas faça fallback para variáveis Node em scripts utilitários.
  import.meta.env?.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env?.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    'VITE_SUPABASE_URL não está configurada. Defina a URL do seu projeto Supabase no arquivo .env.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_ANON_KEY não está configurada. Defina a chave pública do seu projeto Supabase no arquivo .env.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type SupabaseClient = typeof supabase;
