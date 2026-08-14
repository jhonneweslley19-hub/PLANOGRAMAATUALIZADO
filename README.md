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
│   ├── app.js        # lógica da aplicação (auth, render, CRUD, QR code)
│   └── vendor/       # bibliotecas de terceiros hospedadas localmente
│       ├── qrcode.min.js
│       └── supabase.js
├── _headers          # cabeçalhos de segurança HTTP (Netlify)
├── vercel.json        # cabeçalhos de segurança HTTP (Vercel)
└── README.md
```

## Bibliotecas vendorizadas (`js/vendor/`)

QRCode.js e supabase-js **não são mais carregados de CDN** — os arquivos
ficam versionados neste repositório. Isso elimina de vez os alertas de scan
"Cross-Domain JavaScript Source File Inclusion" e "Subresource Integrity
Attribute Missing" pra esses dois scripts (deixaram de ser recursos de
outro domínio, então SRI nem se aplica mais a eles) e também tira uma
dependência de disponibilidade de CDN externo em produção.

- `js/vendor/qrcode.min.js` — QRCode.js 1.0.0
- `js/vendor/supabase.js` — supabase-js **2.112.2** (o próprio arquivo
  registra a versão exata no comentário do topo)

**Como atualizar uma dessas bibliotecas no futuro:** baixe a versão nova
(ex. `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@X.Y.Z`), substitua
o arquivo correspondente em `js/vendor/` e teste o app antes de publicar —
como não há mais atualização automática via CDN, uma versão com
vulnerabilidade corrigida do lado deles só chega aqui manualmente.

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
(veja a seção seguinte). No entanto, se você preferir reduzir falsos positivos em
scanners ou evitar expor chaves em commits, siga o fluxo abaixo:

- Não versione `js/config.js` com chaves reais. Em vez disso mantenha um arquivo
  de template `js/config.example.js` (incluso neste repositório) e copie-o para
  `js/config.js` no momento do deploy ou localmente.
- Em hosts como Vercel/Netlify, defina a `SUPABASE_ANON_KEY` como variável de
  ambiente e gere `js/config.js` no passo de build usando essa variável.

Exemplo (local / CI genérico):

```bash
# copiar o template para o arquivo consumido pelo app
cp js/config.example.js js/config.js
# (opcional) substituir o placeholder pelo valor da variável de ambiente
sed -i "s/sua-anon-key/${SUPABASE_ANON_KEY}/" js/config.js
```

Scripts úteis incluídos:

- `scripts/generate-config.sh` — gera `js/config.js` a partir do template usando a variável de ambiente `SUPABASE_ANON_KEY` (bash).
- `scripts/generate-config.ps1` — equivalente para PowerShell (Windows).

CI de segurança:

- Este repositório inclui uma GitHub Action (`.github/workflows/config-secret-check.yml`) que executa um scan rápido em pushes/PRs para detectar padrões de chaves sensíveis e falhar o run se encontrar correspondências.

Integração no GitHub (deploy):

- Para gerar `js/config.js` automaticamente no CI e usar a `SUPABASE_ANON_KEY` sem versioná-la, adicione o segredo `SUPABASE_ANON_KEY` nas `Settings → Secrets` do seu repositório GitHub.
- O workflow incluído possui um job `generate-config` que usa esse segredo para criar `js/config.js` e publica o arquivo como artifact (`config-js`) para que etapas subsequentes (build/deploy) façam o download e incluam no pacote final.

Exemplo de como um job de deploy pode recuperar o arquivo antes do build:

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Download generated config
    uses: actions/download-artifact@v4
    with:
      name: config-js
  - name: Build/Deploy (exemplo)
    run: |
      # agora js/config.js está disponível no workspace
      echo "Rodar build ou deploy..."
```



Se preferir manter a anon key diretamente no bundle, documente isso e acompanhe
as recomendações de RLS no README (requerido para segurança de escrita/leitura).

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
- `Cross-Origin-Opener-Policy: same-origin` e `Cross-Origin-Resource-Policy: same-origin`
  (via `_headers`/`vercel.json`), reduzindo a superfície de configuração
  incorreta entre domínios.
- `Cache-Control` explícito: `no-cache, must-revalidate` no HTML de entrada
  (que muda conforme login/dados) e cache curto e revalidado em `css/`/`js/`.
- Comentários explicativos longos nos arquivos servidos (`index.html`,
  `js/config.js`, `js/app.js`) foram resumidos/movidos pra este README —
  não tinham nada sensível, mas continham palavras como "admin"/"key" que
  scanners de "comentários suspeitos" (ex.: ZAP) sinalizam por padrão.

## Sobre o alerta "PII Disclosure" (endereços de e-mail)

Um scanner vai continuar acusando isso mesmo depois de qualquer ajuste de
comentário: `js/app.js` contém, em texto puro, os e-mails internos fixos
(`admopcao@interno.opcaosupermercados.local`, `repositor@...`, e as
variantes `.com`) usados pra mapear o "alias" digitado no login pro e-mail
que o Supabase Auth exige. Isso **precisa** estar no JavaScript do cliente
pra função de login funcionar — não é um vazamento acidental, é a lógica do
app, e não são endereços de pessoas reais (são aliases internos sintéticos).
Duas opções, nenhuma delas encaixada nesta rodada de correções:

1. **Aceitar como falso positivo** documentado (é o que este README está
   fazendo agora).
2. **Mover a resolução alias→e-mail pro servidor** (uma Supabase Edge
   Function que recebe alias+senha e resolve o e-mail internamente antes de
   chamar `signInWithPassword`), removendo esses e-mails do bundle público.
   Isso é uma mudança de arquitetura maior — avise se quiser que eu
   implemente.

## Itens de scan que dependem de mais detalhe pra corrigir com segurança

Sem o alerta completo do scanner (URL exata + trecho da resposta) eu não
tenho como confirmar a causa sem arriscar "consertar" algo que não é o
problema real:

- **Divulgação de Data e Hora - Unix**: não encontrei nenhum número de 10
  dígitos (timestamp Unix) em `index.html`/`css/`/`js/` deste repositório —
  o mais provável é que venha de dentro do `qrcode.min.js` ou do
  `supabase-js` (bibliotecas de terceiros, fora do nosso controle) ou de um
  cabeçalho HTTP da própria hospedagem. Me manda a URL/trecho que o
  scanner apontou que eu confirmo.
- ~~**Cross-Domain JavaScript Source File Inclusion (2)**~~ — **resolvido**:
  `qrcode.min.js` e `supabase-js` agora são servidos localmente em
  `js/vendor/` (ver seção "Bibliotecas vendorizadas" acima), deixaram de
  ser scripts de outro domínio.
- **Sub Resource Integrity Attribute Missing (3)**: 2 dos 3 casos foram
  resolvidos junto com o item acima (deixaram de ser recurso externo, então
  SRI nem se aplica mais). O terceiro é o `<link rel="stylesheet">` do
  Google Fonts, que continua pendente — o CSS do Google muda conforme o
  navegador de quem acessa (fontes em formatos diferentes), então um hash
  fixo quebraria em vários navegadores. A correção real aqui é hospedar as
  fontes localmente também (baixando os `.woff2` via
  [google-webfonts-helper](https://gwfh.mranftl.com/fonts)) — quer que eu
  faça isso também?
- **Information Disclosure - Information in Browser localStorage**: é o
  mesmo problema já documentado acima em "Segurança — pendente (requer
  acesso ao painel do Supabase)" — a lista de usuários/papéis fica no
  `localStorage` porque não existe uma tabela `profiles` real no Supabase
  ainda. A correção é a mesma: aplicar RLS + tabela `profiles`.
- **Modern Web Application**: alerta informativo do ZAP (só avisa que é uma
  SPA), não é uma vulnerabilidade — nada a corrigir.

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
- Trocar os `prompt()`/`confirm()` nativos do fluxo "Cadastrar usuário" por
  um formulário próprio, com validação de força de senha.

---

Este projeto demonstra como uma solução simples, aliada à tecnologia, pode melhorar significativamente os processos internos, reduzir retrabalho e aumentar a eficiência operacional no varejo.
