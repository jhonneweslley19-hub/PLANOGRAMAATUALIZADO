Deploy para Netlify
===================

Este repositório inclui um workflow GitHub Actions (`.github/workflows/deploy-netlify.yml`) que:

- Gera `js/config.js` a partir de `js/config.example.js` usando o script `scripts/generate-config.sh` e a variável `SUPABASE_ANON_KEY` (definida como secret).
- Faz deploy para o Netlify usando o Netlify CLI.

Secrets necessários (adicione em Settings → Secrets do repositório):

- `SUPABASE_ANON_KEY` — a anon key do seu projeto Supabase.
- `NETLIFY_AUTH_TOKEN` — token pessoal do Netlify (Team settings → Applications → Personal access tokens).
- `NETLIFY_SITE_ID` — o Site ID do site Netlify onde o deploy será publicado.

Como funciona o deploy automático:

1. Push para a branch `claude/security-structure-improvements-l93uq5` dispara o workflow (ou dispare manualmente via Actions — ver abaixo).
2. O workflow executa `scripts/generate-config.sh` com `SUPABASE_ANON_KEY` para criar `js/config.js` no build.
3. O Netlify CLI publica os arquivos do repositório (`--dir=.`) no site configurado.

Disparo manual do workflow (recomendado se a integração Git do Netlify estiver bloqueando deploys):

1. Vá em `Actions` → escolha `Deploy to Netlify` → `Run workflow`.
2. Clique em `Run workflow` (não é necessário preencher inputs).
3. O workflow irá usar os secrets configurados para gerar `js/config.js` e fazer o deploy via Netlify CLI.

Deploy manual (local):

1. Gerar `js/config.js` localmente:

```bash
cp js/config.example.js js/config.js
# ou (no Linux/macOS) usando a variável de ambiente
SUPABASE_ANON_KEY=your_key_here ./scripts/generate-config.sh
```

2. Instalar Netlify CLI e publicar:

```bash
npm install -g netlify-cli
NETLIFY_AUTH_TOKEN=your_token npx netlify deploy --dir=. --prod --site YOUR_SITE_ID
```

Observações:

- Não comite chaves secretas em `js/config.js`. Use os secrets do GitHub para CI.
- Se seu site exigir uma pasta de publicação diferente (ex.: `dist`), ajuste `--dir` no workflow.
