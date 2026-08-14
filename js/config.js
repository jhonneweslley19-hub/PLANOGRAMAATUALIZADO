/* Configuração do projeto Supabase — detalhes e política de acesso
   documentados no README.md (seção "Configuração do Supabase"). */
/* ATENÇÃO: não comite chaves reais neste arquivo. Substitua este
   placeholder localmente ou via pipeline de deploy antes de publicar. */
const SUPABASE_URL = 'https://elnriritpifmoqbbaqsh.supabase.co';
const SUPABASE_ANON_KEY = 'REPLACE_WITH_YOUR_SUPABASE_ANON_KEY';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
