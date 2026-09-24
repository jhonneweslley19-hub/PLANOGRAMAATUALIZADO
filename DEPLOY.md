Deploy
======

App estático (sem build/bundler) — `js/config.js` já vem versionado com a URL e a anon key reais do Supabase (ver README).

## Deploy principal: integração Git da Vercel

Repositório conectado direto no painel da Vercel — cada push na branch `main` publica automaticamente, sem comando de build nem variável de ambiente extra.

## Alternativa: Netlify

Também funciona sem configuração (`_headers` já incluído): conectar o repositório em **Site configuration → Build & deploy → Continuous deployment → Repository**.

Workflow opcional `.github/workflows/deploy-netlify.yml`: caminho alternativo via Netlify CLI. Não é necessário — sem os secrets `NETLIFY_AUTH_TOKEN`/`NETLIFY_SITE_ID` configurados, o job só pula o deploy.

## Deploy manual (local)

```bash
npm install -g netlify-cli
NETLIFY_AUTH_TOKEN=your_token npx netlify deploy --dir=. --prod --site YOUR_SITE_ID
```

## Observações

- `js/config.example.js` é o template pra rodar com outro projeto Supabase (fork, ambiente de teste) — ver README.
