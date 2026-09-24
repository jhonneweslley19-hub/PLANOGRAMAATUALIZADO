# 🛒 Sistema de Planogramas com QR Code

Plataforma web para organização de gôndolas em supermercados, centralizando o gerenciamento de planogramas e o acesso às informações pela equipe operacional.

> Projeto desenvolvido com apoio de ferramentas de IA para uso real em um supermercado. Esta é uma versão pública: nome da empresa, e-mails de usuários e a configuração do projeto Supabase original foram substituídos por valores de exemplo.

### Principais funcionalidades

- Cadastro de departamentos e submercadológicos
- Upload e gerenciamento de imagens dos planogramas
- QR Code exclusivo por gôndola, com consulta instantânea pelo celular
- Controle de acesso por níveis (Administrador e Repositor)
- Armazenamento em nuvem via Supabase
- Impressão de etiquetas com QR Code
- Interface responsiva

### Problema resolvido

Repositores não precisam mais procurar planogramas impressos ou pedir informação pro setor responsável — basta escanear o QR Code da gôndola pra ver o layout correto na hora.

### Tecnologias

- HTML5 / CSS3 / JavaScript (vanilla, sem build/bundler)
- Supabase (Postgres, Auth, Storage)
- QRCode.js

---

## Estrutura do repositório

```
.
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── config.js     # URL e anon key do projeto Supabase
│   ├── app.js
│   └── vendor/       # qrcode.min.js e supabase-js, hospedados localmente
├── supabase/
│   ├── setup-rls.sql
│   ├── 2026-09-03-alias-backend.sql
│   └── functions/
│       ├── resolve-alias/index.ts
│       ├── admin-create-user/index.ts
│       └── admin-reset-password/index.ts
├── _headers           # cabeçalhos de segurança (Netlify)
├── vercel.json         # cabeçalhos de segurança (Vercel)
└── README.md
```

## Como rodar localmente

App estático, mas precisa ser servido por HTTP (abrir com `file://` quebra o fetch/CORS do Supabase e a CSP):

```bash
npx serve .
# ou
python3 -m http.server 8080
```

## Configuração do Supabase

Edite `js/config.js` com a URL e a anon key do projeto (Project Settings → API):

```js
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'sua-anon-key';
```

A anon key é pública por natureza em apps client-side — a proteção real dos dados é o RLS no Postgres/Storage, não essa chave. Se quiser evitar versionar a chave mesmo assim:

- Mantenha `js/config.js` fora do git e copie de `js/config.example.js` no deploy.
- Em CI, use `scripts/generate-config.sh` (ou `.ps1` no Windows) com `SUPABASE_ANON_KEY` como variável de ambiente. O workflow `.github/workflows/config-secret-check.yml` já tem um job `generate-config` pronto pra isso, publicando `js/config.js` como artifact.

### Tabelas

- `departamentos` (`code`, `name`, `ord`)
- `submercadologicos` (`dept_code`, `code`, `name`, `image_url`)
- `profiles` (`id`, `email`, `alias`, `role`, `created_at`) — ver `supabase/setup-rls.sql` e `supabase/2026-09-03-alias-backend.sql`
- bucket de Storage `layouts`

### Edge Function `resolve-alias`

O login traduz o alias digitado pro e-mail real chamando essa função no servidor — sem ela, login por alias não funciona (login por e-mail completo continua funcionando normal).

- Painel do Supabase → Edge Functions → New Function `resolve-alias` → colar `supabase/functions/resolve-alias/index.ts` → Deploy.
- Ou via CLI: `supabase functions deploy resolve-alias`.

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já vêm injetados automaticamente no ambiente da função. Rode antes a migração `supabase/2026-09-03-alias-backend.sql`.

### Edge Function `admin-create-user`

Cria usuário novo — verifica no servidor que quem chama é admin de verdade (`profiles.role`), antes de usar a Admin API do Supabase pra criar a conta. Sem essa função, `sb.auth.signUp()` com a anon key não tem nenhum gate real: qualquer um poderia se autocadastrar direto (o botão "Cadastrar usuário" só escondia a ação na interface, não impedia a chamada).

- Painel do Supabase → Edge Functions → New Function `admin-create-user` → colar `supabase/functions/admin-create-user/index.ts` → Deploy.
- Depois, em **Authentication → Providers → Email**, desligue **"Allow new users to sign up"** (ou equivalente) — fecha o autocadastro público de vez, já que a criação de conta passa a ser só por essa função.

### Edge Function `admin-reset-password`

Redefine a senha de um usuário existente — mesma verificação de admin da função acima. Existe porque as contas usam e-mail interno fake (não recebem e-mail de verdade), então recuperação de senha por e-mail não é confiável aqui; a tela de Configurações → Usuários tem um botão "Redefinir senha" que chama essa função.

- Painel do Supabase → Edge Functions → New Function `admin-reset-password` → colar `supabase/functions/admin-reset-password/index.ts` → Deploy.

## Controle de admin/repositor

Fonte de verdade: `public.profiles.role`, com RLS aplicado em `departamentos`, `submercadologicos`, `profiles` e no bucket `layouts` (script completo em `supabase/setup-rls.sql`). Leitura liberada pra qualquer autenticado; escrita só pra `role = 'admin'`, via função auxiliar `is_admin()` (`SECURITY DEFINER`, evita recursão infinita numa policy de `profiles` que consultaria a si mesma).

A interface (`js/app.js`) consulta esse mesmo `profiles.role` a cada login pra decidir o que mostrar — falha fechado se a consulta der erro. Login por alias resolve o e-mail via `resolve-alias` (acima), sem guardar e-mail/papel de usuário em texto puro no bundle público.

Promover um usuário a admin manualmente, se precisar:

```sql
update public.profiles set role = 'admin' where email = 'novo@email.com';
```

## Segurança

- Escape de HTML em todo dado renderizado via `innerHTML` (`escapeHtml()` em `js/app.js`).
- Content-Security-Policy restringindo origem de script/estilo/imagem, sem scripts inline.
- `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy: same-origin`.
- `Cache-Control: no-cache, must-revalidate` no HTML de entrada.
- QRCode.js e supabase-js vendorizados localmente (`js/vendor/`), não carregados de CDN.
- Cabeçalhos HTTP de segurança (Referrer-Policy, X-Frame-Options, X-Content-Type-Options, HSTS) via `_headers` (Netlify) e `vercel.json` (Vercel) — a tag `<meta http-equiv="CSP">` do `index.html` não cobre isso sozinha, alguns desses só existem como cabeçalho HTTP de verdade. Em GitHub Pages esses cabeçalhos não têm como ser customizados — é limitação da plataforma.

## Pendente

Único item, opcional: ativar **Leaked Password Protection** em Authentication → Settings → Password Security no painel do Supabase (checa senha nova contra vazamentos conhecidos).

---

jhonne
