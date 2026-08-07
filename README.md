🚀 **Projeto: Sistema Inteligente de Planogramas com QR Code**

Plataforma web para otimizar a organização de gôndolas em supermercados, centralizando o gerenciamento de planogramas e facilitando o acesso às informações pela equipe operacional.

### Principais funcionalidades

✅ Cadastro de departamentos e submercadológicos.
✅ Upload e gerenciamento de imagens dos planogramas.
✅ Geração automática de QR Codes exclusivos para cada gôndola.
✅ Consulta instantânea do layout pelo celular, apenas escaneando o QR Code.
✅ Controle de acesso por níveis de usuário (Administrador e Repositor).
✅ Armazenamento em nuvem utilizando Supabase.
✅ Impressão de etiquetas com QR Code para fixação nas gôndolas.
✅ Interface moderna, responsiva e intuitiva.

### Problema resolvido

Em muitos supermercados, os repositores precisam procurar planogramas impressos ou solicitar informações ao setor responsável, tornando a reposição mais lenta e aumentando a chance de erros.

Com este sistema, basta escanear o QR Code da gôndola para visualizar imediatamente o layout correto, garantindo mais agilidade, padronização e precisão na organização dos produtos.

### Tecnologias utilizadas

- HTML5 / CSS3 / JavaScript (Vanilla JS)
- Supabase (Banco de Dados Postgres, Autenticação e Storage)
- QRCode.js

---

## Estrutura do repositório

```
.
├── index.html        # marcação da página (sem lógica/estilo embutidos)
├── css/
│   └── styles.css    # todo o CSS da aplicação
├── js/
│   ├── config.js     # URL e anon key do projeto Supabase
│   └── app.js        # lógica da aplicação (auth, render, CRUD, QR code)
└── README.md
```

## Como rodar localmente

É um app estático (sem build/bundler), mas precisa ser servido por HTTP — abrir o
`index.html` direto com `file://` quebra o `fetch`/CORS do Supabase e a
Content-Security-Policy. Qualquer servidor estático simples resolve:

```bash
npx serve .
# ou
python3 -m http.server 8080
```

Depois acesse `http://localhost:PORTA`.

## Configuração do Supabase

Edite `js/config.js` com a URL e a **anon key** do seu projeto
(Painel do Supabase → Project Settings → API):

```js
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'sua-anon-key';
```

A anon key **é destinada a ser pública** em aplicações client-side — sozinha ela
não concede acesso a nada. Toda a proteção real dos dados vem das políticas de
**Row Level Security (RLS)** configuradas no Postgres e no bucket de Storage
(veja a seção seguinte). Por isso ela pode continuar versionada no repositório.

### Tabelas esperadas

- `departamentos` (`code`, `name`, `ord`)
- `submercadologicos` (`dept_code`, `code`, `name`, `image_url`)
- bucket de Storage `layouts` (imagens públicas dos planogramas)

## ⚠️ Importante sobre o controle de admin/repositor

O papel exibido na interface (`admin` vs `repositor`) é guardado em
`localStorage` no navegador — é só uma preferência de UI (mostrar/esconder
botões). **Ele não é, e não pode ser, a fonte de verdade de segurança.**
Qualquer pessoa logada pode alterar esse valor pelo DevTools do navegador.

A única forma de impedir de fato que um usuário não-admin escreva/apague
dados é bloquear isso no próprio Supabase com RLS. Isso precisa ser feito no
painel do Supabase (não está neste repositório) — recomendação:

```sql
-- Fonte de verdade real do papel de cada usuário (substitui o localStorage)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'repositor' check (role in ('admin','repositor'))
);

alter table public.departamentos enable row level security;
alter table public.submercadologicos enable row level security;
alter table public.profiles enable row level security;

-- leitura liberada para qualquer usuário autenticado
create policy "leitura autenticada" on public.departamentos
  for select using (auth.role() = 'authenticated');
create policy "leitura autenticada" on public.submercadologicos
  for select using (auth.role() = 'authenticated');

-- escrita (insert/update/delete) só para quem tem role='admin' em profiles
create policy "somente admin escreve" on public.departamentos
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
create policy "somente admin escreve" on public.submercadologicos
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
```

Repita a mesma ideia nas policies do bucket `layouts` (Storage → Policies):
upload/remoção só para `auth.uid()` com `role = 'admin'` em `profiles`;
leitura pública (o app depende de URLs públicas para os QR codes).

## Segurança — o que já foi tratado no código

- **Escape de HTML** em todo dado renderizado via `innerHTML` (nomes,
  aliases, e-mails, URLs de imagem) usando a função `escapeHtml()` em
  `js/app.js`, prevenindo XSS armazenado.
- **Content-Security-Policy** (`index.html`) restringindo de onde
  script/estilo/imagem podem ser carregados e bloqueando scripts inline.
- Removidos os atributos `style="display:none"` inline do HTML (agora vêm
  do CSS), permitindo uma CSP mais restrita em `style-src`.
- Removido o botão "Limpar histórico" nas Configurações, que não tinha
  nenhuma ação associada (histórico de versões é uma constante fixa no
  código, não um dado que faça sentido "limpar").

## Cabeçalhos de segurança HTTP (Referrer-Policy, X-Frame-Options, X-Content-Type-Options, HSTS…)

Scanners como o Mozilla Observatory / securityheaders.com checam o
**cabeçalho HTTP** de verdade — a tag `<meta http-equiv="Content-Security-Policy">`
do `index.html` não conta pra a maioria deles, e diretivas como
`frame-ancestors` são silenciosamente ignoradas quando vêm de `<meta>` (só
funcionam como cabeçalho HTTP). `X-Frame-Options`, `X-Content-Type-Options` e
`Strict-Transport-Security` não têm nenhum equivalente em `<meta>` — só
existem como cabeçalho HTTP.

Este repositório já inclui os dois formatos mais comuns de hospedagem
estática, prontos pra funcionar sem configuração extra:

- **Netlify** → detecta `_headers` na raiz automaticamente.
- **Vercel** → detecta `vercel.json` (seção `headers`) na raiz automaticamente.
- **Nginx/Apache própios** → replique as mesmas diretivas com
  `add_header X-Frame-Options "DENY";` etc. no `server {}`.
- **GitHub Pages** → **não suporta cabeçalhos HTTP customizados em hipótese
  nenhuma** (nem com `_headers`, nem com nenhum arquivo de config — é uma
  limitação da plataforma, não deste repositório). Se o site estiver
  publicado ali, os itens de CSP/X-Frame-Options/X-Content-Type-Options/HSTS
  de um scanner externo **vão continuar aparecendo como reprovados** até o
  site migrar para Netlify/Vercel/Cloudflare Pages ou passar por um proxy
  (ex.: Cloudflare na frente, com uma Transform Rule injetando os cabeçalhos).

## Segurança — pendente (requer acesso ao painel do Supabase)

- Aplicar as políticas de RLS acima (o item mais importante).
- Travar a versão exata dos scripts de CDN (`qrcode.min.js`,
  `supabase-js`) e adicionar `integrity="sha384-..."` (Subresource
  Integrity). Para gerar o hash de um arquivo:
  ```bash
  curl -s <url-do-script> | openssl dgst -sha384 -binary | openssl base64 -A
  ```
  e usar o resultado como `integrity="sha384-RESULTADO"` na tag `<script>`.
- Trocar os `prompt()`/`confirm()` nativos do fluxo "Cadastrar usuário" por
  um formulário próprio, com validação de força de senha.

---

Este projeto demonstra como uma solução simples, aliada à tecnologia, pode melhorar significativamente os processos internos, reduzir retrabalho e aumentar a eficiência operacional no varejo.
