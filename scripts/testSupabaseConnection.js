import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Defina SUPABASE_URL e SUPABASE_ANON_KEY antes de testar a conexão.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function main() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Erro ao conectar ao Supabase:', error.message);
      process.exit(1);
    }

    console.log('Conexão com Supabase bem-sucedida.');
    console.log('Sessão atual disponível:', Boolean(data.session));
  } catch (err) {
    console.error('Falha ao tentar conectar ao Supabase:', err);
    process.exit(1);
  }
}

main();
