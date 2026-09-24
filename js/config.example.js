/* Template de configuração — copiar para `js/config.js` e preencher os valores.
   NÃO commit este arquivo com chaves reais. */
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'sua-anon-key';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/*
  Como usar localmente:
  - Copie este arquivo: `cp js/config.example.js js/config.js`
  - Edite `js/config.js` e substitua os placeholders.

  Em CI/deploy (ex.: Vercel/Netlify), gere `js/config.js` durante o build
  a partir da variável de ambiente que contém sua anon key.
*/
