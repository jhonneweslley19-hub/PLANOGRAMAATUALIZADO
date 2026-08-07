/* Configuração do projeto Supabase — detalhes e política de acesso
   documentados no README.md (seção "Configuração do Supabase"). */
const SUPABASE_URL = 'https://elnriritpifmoqbbaqsh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3NAMzoKiRCOURqDkpRAxaA_JvWtA8wT';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
