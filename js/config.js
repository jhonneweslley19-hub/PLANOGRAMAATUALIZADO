/* =========================================================================
   Configuração do projeto Supabase.
   Painel do projeto > Project Settings > API > Project URL / anon public key.

   A "anon key" abaixo é destinada a ser pública em apps client-side — por si
   só ela não concede nenhum acesso. A segurança real dos dados depende das
   políticas de Row Level Security (RLS) configuradas nas tabelas do Postgres
   e no bucket de Storage "layouts". O papel "admin"/"repositor" usado nesta
   tela é só uma preferência de interface (guardada no localStorage do
   navegador) — ele NÃO substitui RLS. Veja o README para o motivo e para as
   policies recomendadas.
   ========================================================================= */
const SUPABASE_URL = 'https://elnriritpifmoqbbaqsh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3NAMzoKiRCOURqDkpRAxaA_JvWtA8wT';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
