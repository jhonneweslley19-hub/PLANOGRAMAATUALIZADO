/* Lógica da aplicação. Depende de js/config.js (variável global `sb`) e das
   bibliotecas carregadas via <script> no <head> (QRCode, supabase-js). */

/* ---------- Utilidades de segurança ---------- */
/* Escapa qualquer valor antes de injetá-lo em innerHTML — nomes, alias,
   e-mails e URLs de imagem vêm de entrada digitada e não devem ser
   tratados como HTML confiável. */
function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

/* Contas criadas no painel do Supabase (Authentication > Users), com "Auto Confirm User" marcado.
   O Supabase exige email, então cada "usuário" mapeia pra um email interno fixo. */
const USER_EMAIL_MAP = {
  'admopcao': 'admopcao@interno.opcaosupermercados.local',
  'repositor': 'repositor@interno.opcaosupermercados.local',
};
const INTERNAL_EMAIL_DOMAINS = ['interno.opcaosupermercados.local', 'interno.opcaosupermercados.com'];
const CURRENT_INTERNAL_EMAIL_DOMAIN = INTERNAL_EMAIL_DOMAINS[0];
const REPOSITOR_EMAIL = USER_EMAIL_MAP['repositor'];

function buildInternalEmail(alias){
  return `${alias.trim().toLowerCase()}@${CURRENT_INTERNAL_EMAIL_DOMAIN}`;
}

function buildInternalEmailVariants(alias){
  const normalized = alias.trim().toLowerCase();
  return INTERNAL_EMAIL_DOMAINS.map(domain => `${normalized}@${domain}`);
}

/* Usado só pelo botão "Importar dados iniciais" (roda uma vez, popula as tabelas) */
const seedData = [
  { code:'001', name:'MERCEARIA SALGADA', subs:[
    { code:'001', name:'AMENDOIM CIA' },{ code:'002', name:'AZEITES' },{ code:'004', name:'BATATA FRITA' },
    { code:'005', name:'ENLATADOS E CONSERVAS' },{ code:'007', name:'MASSAS' },{ code:'009', name:'OLEOS' },
    { code:'010', name:'SALGADINHO E SNACK' },{ code:'011', name:'SARDINHA, ATUM CIA' },
    { code:'012', name:'SOPAS E CREMES' },{ code:'013', name:'MOLHOS E CONDIMENTOS' },
  ]},
  { code:'002', name:'MERCEARIA DOCE', subs:[
    { code:'001', name:'ACHOCOLATADOS CIA' },{ code:'002', name:'ALIMENTO INFANTIL' },{ code:'003', name:'AVEIA, MINGAU CIA' },
    { code:'004', name:'BISCOITOS CIA' },{ code:'005', name:'CEREAL MATINAL' },{ code:'006', name:'BOMBONIERI' },
    { code:'007', name:'DOCE, GOIABADA CIA' },{ code:'008', name:'CONSERVAS' },{ code:'009', name:'GELATINA CIA' },
    { code:'010', name:'GELEIA' },{ code:'011', name:'INGREDIENTE DOCE' },{ code:'012', name:'MISTURA BOLO CIA' },
    { code:'013', name:'SOBREMESA EM PO' },{ code:'014', name:'SUPLEMENTO NUTRICIONAL' },{ code:'015', name:'CAFE CIA' },
    { code:'016', name:'CHA CIA' },{ code:'017', name:'MATINAIS' },{ code:'018', name:'LEITE PO' },
  ]},
  { code:'003', name:'BEBIDA', subs:[
    { code:'001', name:'AGUAS' },{ code:'002', name:'APERITIVO E LICOR' },{ code:'003', name:'BEBIDA DE SOJA' },
    { code:'004', name:'CERVEJA' },{ code:'005', name:'CHA PRONTO' },{ code:'006', name:'ISOTONICOS E ENERGETICOS' },
    { code:'007', name:'REFRESCO EM PO' },{ code:'008', name:'REFRIGERANTE' },{ code:'009', name:'SUCO CONCENTRADO' },
    { code:'010', name:'SUCO PRONTO' },{ code:'011', name:'VODKA CIA' },{ code:'012', name:'WHISKY' },
    { code:'013', name:'CACHACA' },{ code:'014', name:'DIVERSOS' },{ code:'015', name:'LICORES' },
    { code:'016', name:'VINHO' },{ code:'017', name:'ESPUMANTE' },{ code:'018', name:'CHAMPAGNE' },{ code:'019', name:'COMBOS E FESTAS' },
  ]},
  { code:'004', name:'SAUDE ESTETICA', subs:[
    { code:'001', name:'ADOCANTE' },{ code:'002', name:'BEBIDA' },{ code:'003', name:'BISCOITO' },
    { code:'004', name:'BOMBONIERE' },{ code:'005', name:'CEREAL, GRANOLA CIA' },{ code:'006', name:'GELATINA' },
    { code:'007', name:'GELEIA' },{ code:'008', name:'LATICINEOS' },{ code:'009', name:'MERCEARIA' },
    { code:'010', name:'MERCEARIA DOCE' },{ code:'011', name:'REFRESCO EM PO' },{ code:'012', name:'SORVETE' },
    { code:'013', name:'SUCO' },{ code:'014', name:'LEVEDURAS' },{ code:'015', name:'SUPLEMENTOS CIA' },
    { code:'016', name:'FARMACIA' },
  ]},
  { code:'005', name:'FRIOS E LATICINEOS', subs:[] },
  { code:'006', name:'LIMPEZA', subs:[] },
  { code:'007', name:'HIGIENE E PERFUMARIA', subs:[] },
  { code:'009', name:'BAZAR', subs:[] },
  { code:'010', name:'PET SHOP', subs:[] },
  { code:'011', name:'RESTAURANTE', subs:[] },
  { code:'015', name:'PADARIA TERCEIRIZADA', subs:[] },
  { code:'016', name:'CEREAIS', subs:[] },
];

let currentUser = null;
let isAdmin = false;
let departamentos = [];
let activeDeptIdx = 0;
let activePage = 'dept';
let deepLinkHandled = false;
let subOrderMap = {};
let isDraggingSub = false;
let currentDragSub = null;
const SUB_ORDER_STORAGE_KEY = 'planogramaSubOrders';
const USER_ACCOUNT_STORAGE_KEY = 'planogramaUserAccounts';
const DEFAULT_USER_ACCOUNTS = [
  { alias:'admopcao', email:'admopcao@interno.opcaosupermercados.com', role:'admin' },
  { alias:'repositor', email:'repositor@interno.opcaosupermercados.com', role:'repositor' },
];
const SYSTEM_VERSIONS = [
  { version:'1.0.0', date:'08/07/2026', message:'Lançamento inicial do painel com reordenação por drag-and-drop, controle admin e modo escuro.' },
];
let themeMode = 'light';
let userAccounts = [];

function loadThemePreference(){
  const stored = localStorage.getItem('planogramaTheme');
  themeMode = stored === 'dark' ? 'dark' : 'light';
  applyTheme(themeMode);
}

function saveThemePreference(){
  localStorage.setItem('planogramaTheme', themeMode);
}

function applyTheme(mode){
  themeMode = mode === 'dark' ? 'dark' : 'light';
  document.body.classList.toggle('dark', themeMode === 'dark');
  const btn = document.getElementById('themeToggleBtn');
  if (btn) btn.textContent = themeMode === 'dark' ? 'Modo claro' : 'Modo escuro';
  saveThemePreference();
}

function loadSubOrders(){
  try{ subOrderMap = JSON.parse(localStorage.getItem(SUB_ORDER_STORAGE_KEY) || '{}') || {}; }
  catch(e){ subOrderMap = {}; }
}

function saveSubOrders(){
  localStorage.setItem(SUB_ORDER_STORAGE_KEY, JSON.stringify(subOrderMap));
}

function loadUserAccounts(){
  try{ userAccounts = JSON.parse(localStorage.getItem(USER_ACCOUNT_STORAGE_KEY) || '[]') || []; }
  catch(e){ userAccounts = []; }
  const existingEmails = userAccounts.map(u => u.email.toLowerCase());
  DEFAULT_USER_ACCOUNTS.forEach(base => {
    if (!existingEmails.includes(base.email.toLowerCase())) userAccounts.unshift({ ...base });
  });
}

function saveUserAccounts(){
  const customAccounts = userAccounts.filter(u => !DEFAULT_USER_ACCOUNTS.some(base => base.email.toLowerCase() === u.email.toLowerCase()));
  localStorage.setItem(USER_ACCOUNT_STORAGE_KEY, JSON.stringify(customAccounts));
}

function getAccountByEmail(email){
  const normalizedEmail = email.trim().toLowerCase();
  let account = userAccounts.find(u => u.email.toLowerCase() === normalizedEmail);
  if (account) return account;
  const fallbackAlias = normalizedEmail.split('@')[0];
  const fallback = DEFAULT_USER_ACCOUNTS.find(u => u.alias === fallbackAlias);
  if (fallback){
    const validEmails = buildInternalEmailVariants(fallbackAlias);
    if (validEmails.includes(normalizedEmail)){
      account = { ...fallback, email: normalizedEmail };
      if (!userAccounts.some(u => u.email.toLowerCase() === normalizedEmail)){
        userAccounts.unshift(account);
        saveUserAccounts();
      }
      return account;
    }
  }
  return null;
}

function resolveAuthEmailCandidates(identifier){
  const normalized = identifier.trim().toLowerCase();
  if (!normalized) return [];
  if (normalized.includes('@')) return [normalized];
  const account = userAccounts.find(u => u.alias === normalized) || DEFAULT_USER_ACCOUNTS.find(u => u.alias === normalized);
  const explicit = account ? account.email : buildInternalEmail(normalized);
  const variants = buildInternalEmailVariants(normalized).filter(email => email !== explicit);
  return [explicit, ...variants];
}

function getAliasFromInternalEmail(email){
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) return null;
  const [alias, domain] = normalized.split('@');
  return INTERNAL_EMAIL_DOMAINS.includes(domain) ? alias : null;
}

async function ensureKnownUserExists(email, password){
  const alias = getAliasFromInternalEmail(email);
  if (!alias) return false;
  const account = userAccounts.find(u => u.alias === alias) || DEFAULT_USER_ACCOUNTS.find(u => u.alias === alias);
  if (!account) return false;

  const { error } = await sb.auth.signUp({ email, password });
  if (!error){
    if (!userAccounts.some(u => u.email.toLowerCase() === email.toLowerCase())){
      userAccounts.unshift({ alias: account.alias, email, role: account.role });
      saveUserAccounts();
    }
    return true;
  }
  return false;
}

function removeUserAccount(alias){
  const account = userAccounts.find(u => u.alias === alias);
  if (!account) return;
  if (DEFAULT_USER_ACCOUNTS.some(base => base.alias === alias)){
    alert('Usuários padrão não podem ser removidos aqui.');
    return;
  }
  if (!confirm(`Remover o usuário local "${alias}"?`)) return;
  userAccounts = userAccounts.filter(u => u.alias !== alias);
  saveUserAccounts();
  renderSettingsPage();
}

function toggleUserRole(alias){
  const account = userAccounts.find(u => u.alias === alias);
  if (!account) return;
  account.role = account.role === 'admin' ? 'repositor' : 'admin';
  saveUserAccounts();
  renderSettingsPage();
}

function getUserAliasByEmail(email){
  const account = userAccounts.find(u => u.email === email);
  return account ? account.alias : null;
}

function formatTimestamp(ts){
  return new Date(ts).toLocaleString('pt-BR', { hour12:false });
}

function renderVersionHistory(){
  if (!SYSTEM_VERSIONS.length) return '<p>Nenhuma versão registrada ainda.</p>';
  return `<table class="list-table">${SYSTEM_VERSIONS.map(entry=>`
      <tr><td>${escapeHtml(entry.date)}</td><td><strong>${escapeHtml(entry.version)}</strong> — ${escapeHtml(entry.message)}</td></tr>`).join('')}</table>`;
}

function renderUserAccountsList(){
  if (!userAccounts.length) return '<p>Nenhum usuário configurado.</p>';
  return `<table class="list-table">${userAccounts.map(u=>`
      <tr>
        <td><strong>${escapeHtml(u.alias)}</strong><br><small>${escapeHtml(u.email)}</small></td>
        <td>
          <span class="list-badge">${escapeHtml(u.role)}</span>
          <button class="btn-outline" data-action="toggle-role" data-alias="${escapeHtml(u.alias)}" type="button">Trocar papel</button>
          <button class="btn-outline" data-action="remove-user" data-alias="${escapeHtml(u.alias)}" type="button">Remover</button>
        </td>
      </tr>`).join('')}</table>`;
}

function applySavedSubOrders(){
  departamentos.forEach((dept)=>{
    const stored = Array.isArray(subOrderMap[dept.code]) ? [...subOrderMap[dept.code]] : [];
    const existingCodes = dept.subs.map(s => s.code);
    const ordered = [];
    stored.forEach(code => {
      if (existingCodes.includes(code)) ordered.push(dept.subs.find(s => s.code === code));
    });
    dept.subs.forEach(sub => { if (!ordered.find(s => s.code === sub.code)) ordered.push(sub); });
    dept.subs = ordered;
    subOrderMap[dept.code] = ordered.map(s => s.code);
  });
  saveSubOrders();
}

async function initAuth(){
  loadUserAccounts();
  const { data:{ session } } = await sb.auth.getSession();
  await handleSession(session);
  sb.auth.onAuthStateChange((_event, session)=> handleSession(session));
}

async function handleSession(session){
  currentUser = session ? session.user : null;
  let account = currentUser ? getAccountByEmail(currentUser.email) : null;
  if (!account && currentUser){
    const aliasFromEmail = currentUser.email.split('@')[0].toLowerCase();
    account = DEFAULT_USER_ACCOUNTS.find(u => u.alias === aliasFromEmail) || null;
    if (account){
      if (!userAccounts.some(u => u.email.toLowerCase() === currentUser.email.toLowerCase())){
        userAccounts.unshift({ ...account });
        saveUserAccounts();
      }
    }
  }
  isAdmin = !!account && account.role === 'admin';
  document.getElementById('authGate').classList.toggle('hidden', !!currentUser);

  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn){ settingsBtn.style.display = isAdmin ? 'inline-flex' : 'none'; }

  if (currentUser){
    const label = account ? `${account.alias} · ${account.role}` : currentUser.email;
    document.getElementById('sessionLabel').textContent = isAdmin ? `Admin: ${label}` : `Repositor: ${label}`;
    await loadData();
    if (!deepLinkHandled){
      deepLinkHandled = true;
      const params = new URLSearchParams(location.search);
      const deptCode = params.get('dept'), subCode = params.get('sub');
      if (deptCode && subCode) openModal(deptCode, subCode);
    }
  } else {
    renderDepts(); renderMain();
  }
}

async function createUserFlow(){
  const alias = prompt('Alias de login (ex: vendedor):');
  if (!alias) return;
  const normalized = alias.trim().toLowerCase();
  if (userAccounts.some(u => u.alias === normalized)){
    alert('Esse alias já existe. Escolha outro.');
    return;
  }
  const password = prompt('Senha do usuário:');
  if (!password) return;
  const role = confirm('Esse usuário deve ser administrador?\nOK = Sim / Cancelar = Repositor') ? 'admin' : 'repositor';
  const email = buildInternalEmail(normalized);

  const { error } = await sb.auth.signUp({ email, password });
  if (error){
    const msg = error.message || 'Erro desconhecido';
    if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('já existe')){
      if (!userAccounts.some(u => u.email === email)){
        userAccounts.unshift({ alias: normalized, email, role });
        saveUserAccounts();
      }
      alert('Usuário já estava registrado, mas o alias foi adicionado ao painel.');
      renderSettingsPage();
      return;
    }
    alert('Não foi possível criar o usuário: ' + msg);
    return;
  }

  userAccounts.unshift({ alias: normalized, email, role });
  saveUserAccounts();
  renderSettingsPage();
}

document.getElementById('loginBtn').addEventListener('click', async ()=>{
  const username = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errBox = document.getElementById('loginError');
  errBox.style.display = 'none';

  const emails = resolveAuthEmailCandidates(username);
  if (!emails.length){
    errBox.textContent = 'Usuário ou e-mail inválido.';
    errBox.style.display = 'block';
    return;
  }

  let lastError = null;
  for (const email of emails){
    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (!error) return;
    lastError = error;
  }

  errBox.textContent = `Erro de login: ${lastError?.message || 'Senha incorreta.'}`;
  errBox.style.display = 'block';
});

document.getElementById('togglePassword').addEventListener('click', ()=>{
  const input = document.getElementById('loginPass');
  const btn = document.getElementById('togglePassword');
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.textContent = isHidden ? 'Ocultar' : 'Mostrar';
});

document.getElementById('logoutBtn').addEventListener('click', ()=>{ sb.auth.signOut(); activePage = 'dept'; });
document.getElementById('settingsBtn').addEventListener('click', ()=>{ activePage = 'settings'; renderMain(); });

/* ---------- Dados (Postgres via Supabase) ---------- */
async function loadData(){
  const { data: depts, error: e1 } = await sb.from('departamentos').select('*').order('ord');
  const { data: subs, error: e2 } = await sb.from('submercadologicos').select('*').order('code');
  if (e1 || e2){ console.error(e1, e2); return; }
  departamentos = (depts || []).map(d => ({
    code: d.code, name: d.name, ord: d.ord,
    subs: (subs || []).filter(s => s.dept_code === d.code).map(s => ({ code: s.code, name: s.name, image_url: s.image_url || '' })),
  }));
  loadSubOrders();
  applySavedSubOrders();
  renderDepts();
  renderMain();
}

async function importSeedData(){
  if (!isAdmin) return;
  const { data: existing } = await sb.from('departamentos').select('code').limit(1);
  if (existing && existing.length && !confirm('Já existem departamentos cadastrados. Importar mesmo assim?')) return;
  for (const [i, d] of seedData.entries()){
    await sb.from('departamentos').upsert({ code: d.code, name: d.name, ord: i });
    for (const s of d.subs){
      await sb.from('submercadologicos').upsert({ dept_code: d.code, code: s.code, name: s.name, image_url:'' });
    }
  }
  alert('Importação concluída.');
  await loadData();
}

/* ---------- Render ---------- */
function renderDepts(){
  const list = document.getElementById('deptList');
  list.innerHTML = departamentos.map((d,i)=>`
    <button class="dept-btn${i===activeDeptIdx?' active':''}" data-idx="${i}" type="button">
      <span><span class="code">${escapeHtml(d.code)}</span>${escapeHtml(d.name)}</span>
      <span class="count">${d.subs.length}</span>
    </button>
  `).join('');
}

function renderMain(){
  const content = document.getElementById('content');
  if (activePage === 'settings'){
    renderSettingsPage();
    return;
  }
  const dept = departamentos[activeDeptIdx];
  if (!dept){
    document.getElementById('breadcrumb').textContent = 'Mercadológico';
    document.getElementById('deptTitle').textContent = '—';
    document.getElementById('deptDesc').textContent = '';
    content.innerHTML = isAdmin
      ? '<div class="empty-state">Nenhum departamento cadastrado ainda.<br><button class="btn-outline" id="importBtn" type="button" style="margin-top:14px;">Importar dados iniciais</button></div>'
      : '<div class="empty-state">Nenhum departamento cadastrado ainda.</div>';
    if (isAdmin){ const b = document.getElementById('importBtn'); if (b) b.addEventListener('click', importSeedData); }
    return;
  }

  document.getElementById('breadcrumb').textContent = `Mercadológico ${dept.code}`;
  document.getElementById('deptTitle').textContent = dept.name;

  const subs = dept.subs;
  const addCardHtml = isAdmin ? '<button class="add-card" id="addSubBtn" type="button">+ adicionar submercadológico</button>' : '';

  if (subs.length === 0){
    document.getElementById('deptDesc').textContent = 'Nenhum submercadológico cadastrado ainda pra esse setor.';
    content.innerHTML = isAdmin
      ? `<div class="subs-grid">${addCardHtml}</div>`
      : `<div class="empty-state">Nenhum submercadológico cadastrado ainda pra <b>${escapeHtml(dept.name)}</b>.</div>`;
    if (isAdmin) wireAddSubBtn(dept);
    return;
  }

  document.getElementById('deptDesc').textContent = `${subs.length} submercadológicos — clique num pra abrir o layout.${isAdmin ? ' Arraste uma foto sobre o card pra anexar foto ou arraste o card para reordenar.' : ''}`;
  content.innerHTML = `
    <div class="section-toolbar">
      <span></span>
      <button class="btn-outline" id="printAllBtn" type="button">Imprimir etiquetas do setor</button>
    </div>
    <div class="subs-grid">${subs.map(s=>{
      const has = !!s.image_url;
      const code = escapeHtml(s.code);
      return `
        <button class="sub-card" data-sub="${code}" type="button"${isAdmin ? ' draggable="true"' : ''}>
          ${isAdmin ? `<span class="card-remove" data-remove="${code}" title="Remover item">✕</span>` : ''}
          <div class="top-row">
            <span class="code">${escapeHtml(dept.code)}-${code}</span>
            <span class="status-tag ${has?'ok':'pending'}">${has?'com layout':'sem layout'}</span>
          </div>
          <span class="name">${escapeHtml(s.name)}</span>
          ${isAdmin ? `<span class="upload-hint" data-upload="${code}">arraste ou toque pra anexar foto</span>` : ''}
        </button>`;
    }).join('')}${addCardHtml}</div>`;

  document.getElementById('printAllBtn').addEventListener('click', ()=>printDeptLabels(dept));
  if (isAdmin){
    wireAddSubBtn(dept);
    wireCardRemove(dept);
    wireCardUpload(dept);
    wireCardDragDrop(dept);
  }
}

function renderSettingsPage(){
  if (!isAdmin){ activePage = 'dept'; renderMain(); return; }
  const content = document.getElementById('content');
  document.getElementById('breadcrumb').textContent = 'Configurações';
  document.getElementById('deptTitle').textContent = 'Painel administrativo';
  document.getElementById('deptDesc').textContent = 'Veja atualizações, gerencie usuários e configure o aplicativo.';
  content.innerHTML = `
    <div class="settings-panel">
      <section class="settings-section">
        <h2>Administração</h2>
        <p>Use estas ações para manter o sistema atualizado e a navegação bem estruturada.</p>
        <div class="settings-actions">
          <button class="btn-outline" id="importAdminBtn" type="button">Importar dados iniciais</button>
          <button class="btn-outline" id="reloadAdminBtn" type="button">Recarregar dados</button>
          <button class="btn-outline" id="themeToggleBtn" type="button">${themeMode === 'dark' ? 'Modo claro' : 'Modo escuro'}</button>
          <button class="btn-outline" id="backToDeptBtn" type="button">Voltar aos setores</button>
        </div>
      </section>
      <section class="settings-section">
        <h2>Versões do sistema</h2>
        ${renderVersionHistory()}
      </section>
      <section class="settings-section">
        <h2>Usuários</h2>
        <p>Gerencie aliases de login e papéis do aplicativo.</p>
        ${renderUserAccountsList()}
        <div class="settings-actions" style="margin-top:12px;">
          <button class="btn-outline" id="createUserBtn" type="button">Cadastrar usuário</button>
        </div>
      </section>
    </div>`;
  document.getElementById('importAdminBtn').addEventListener('click', async ()=>{ await importSeedData(); });
  document.getElementById('reloadAdminBtn').addEventListener('click', () => { loadData(); });
  document.getElementById('themeToggleBtn').addEventListener('click', () => { applyTheme(themeMode === 'dark' ? 'light' : 'dark'); });
  document.getElementById('backToDeptBtn').addEventListener('click', () => { activePage = 'dept'; renderMain(); });
  document.getElementById('createUserBtn').addEventListener('click', createUserFlow);
  content.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const alias = btn.dataset.alias;
      if (btn.dataset.action === 'toggle-role') toggleUserRole(alias);
      if (btn.dataset.action === 'remove-user') removeUserAccount(alias);
    });
  });
}

/* ---------- CRUD de submercadológico ---------- */
function wireAddSubBtn(dept){
  const btn = document.getElementById('addSubBtn');
  if (!btn) return;
  btn.addEventListener('click', async ()=>{
    const code = prompt('Código do novo submercadológico (ex: 020):');
    if (!code) return;
    const name = prompt('Nome do submercadológico (ex: BATATA FRITA):');
    if (!name) return;
    await sb.from('submercadologicos').upsert({ dept_code: dept.code, code: code.trim(), name: name.trim().toUpperCase(), image_url:'' });
    await loadData();
  });
}

function wireCardRemove(dept){
  document.querySelectorAll('.card-remove').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      e.stopPropagation();
      const code = btn.dataset.remove;
      if (!confirm('Remover esse submercadológico?')) return;
      try{ await sb.storage.from('layouts').remove([`${dept.code}/${code}.jpg`]); }catch(err){}
      await sb.from('submercadologicos').delete().eq('dept_code', dept.code).eq('code', code);
      await loadData();
    });
  });
}

function wireCardUpload(dept){
  document.querySelectorAll('[data-upload]').forEach(hint=>{
    hint.addEventListener('click', (e)=>{ e.stopPropagation(); openFilePicker(dept.code, hint.dataset.upload); });
  });
}

function wireCardDragDrop(dept){
  document.querySelectorAll('.sub-card').forEach(card=>{
    const subCode = card.dataset.sub;

    card.addEventListener('dragstart', (e)=>{
      if (!isAdmin) return;
      currentDragSub = subCode;
      isDraggingSub = true;
      e.dataTransfer.effectAllowed = 'move';
      try{ e.dataTransfer.setData('text/plain', subCode); }catch(err){}
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', ()=>{
      isDraggingSub = false;
      currentDragSub = null;
      document.querySelectorAll('.sub-card.drag-over, .sub-card.dragging').forEach(el=> el.classList.remove('drag-over','dragging'));
    });

    card.addEventListener('dragover', (e)=>{
      if (!isAdmin) return;
      e.preventDefault();
      card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', ()=>{
      if (!isAdmin) return;
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', async (e)=>{
      e.preventDefault(); e.stopPropagation();
      card.classList.remove('drag-over');
      if (!isAdmin) return;

      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file){
        await uploadImageForSub(dept.code, subCode, file);
        return;
      }

      if (!currentDragSub || currentDragSub === subCode) return;
      const order = Array.isArray(subOrderMap[dept.code]) ? [...subOrderMap[dept.code]] : dept.subs.map(s => s.code);
      const fromIndex = order.indexOf(currentDragSub);
      const toIndex = order.indexOf(subCode);
      if (fromIndex === -1 || toIndex === -1) return;
      order.splice(fromIndex, 1);
      order.splice(toIndex, 0, currentDragSub);
      subOrderMap[dept.code] = order;
      saveSubOrders();
      applySavedSubOrders();
      renderMain();
    });
  });
}

const fileInput = document.getElementById('fileInput');
function openFilePicker(deptCode, subCode){
  fileInput.dataset.dept = deptCode;
  fileInput.dataset.sub = subCode;
  fileInput.value = '';
  fileInput.click();
}
fileInput.addEventListener('change', async ()=>{
  const file = fileInput.files[0];
  if (!file) return;
  await uploadImageForSub(fileInput.dataset.dept, fileInput.dataset.sub, file);
  if (document.getElementById('modalOverlay').classList.contains('open')){
    openModal(fileInput.dataset.dept, fileInput.dataset.sub);
  }
});

function resizeImageToBlob(file, maxW, quality){
  maxW = maxW || 1000; quality = quality || 0.75;
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = (e)=>{
      const img = new Image();
      img.onload = ()=>{
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadImageForSub(deptCode, subCode, file){
  if (!currentUser){ alert('Faça login como admin primeiro.'); return; }
  if (!file.type.startsWith('image/')){ alert('Solte uma imagem (jpg, png).'); return; }
  const blob = await resizeImageToBlob(file);
  const path = `${deptCode}/${subCode}.jpg`;
  const { error: upErr } = await sb.storage.from('layouts').upload(path, blob, { contentType:'image/jpeg', upsert:true });
  if (upErr){ alert('Erro ao subir a imagem: ' + upErr.message); return; }
  const { data } = sb.storage.from('layouts').getPublicUrl(path);
  await sb.from('submercadologicos').update({ image_url: data.publicUrl }).eq('dept_code', deptCode).eq('code', subCode);
  await loadData();
}

/* ---------- QR code + modal ---------- */
function buildItemUrl(deptCode, subCode){
  return `${location.origin + location.pathname}?dept=${deptCode}&sub=${subCode}`;
}
function getQrDataUrl(container){
  const img = container.querySelector('img');
  const canvas = container.querySelector('canvas');
  if (img && img.src) return img.src;
  if (canvas) return canvas.toDataURL('image/png');
  return '';
}

async function openModal(deptCode, subCode){
  const dept = departamentos.find(d => d.code === deptCode);
  const sub = dept && dept.subs.find(s => s.code === subCode);
  if (!dept || !sub) return;
  const url = buildItemUrl(dept.code, sub.code);

  document.getElementById('modalBread').textContent = `${dept.code} — ${dept.name}`;
  document.getElementById('modalTitle').textContent = `${dept.code}-${sub.code} · ${sub.name}`;
  const body = document.getElementById('modalBody');

  let imgHtml;
  if (sub.image_url){
    imgHtml = `<img class="modal-img" id="modalImg" src="${escapeHtml(sub.image_url)}" alt="Layout de ${escapeHtml(sub.name)}">`;
  } else {
    imgHtml = `<div class="modal-empty" id="modalImg">Nenhuma foto de layout cadastrada ainda pra este submercadológico.${isAdmin ? ' Arraste uma foto aqui ou toque em "Anexar foto".' : ''}</div>`;
  }
  const adminRow = isAdmin ? `
    <div class="modal-upload-row">
      <button id="modalUpload" type="button">${sub.image_url ? 'Trocar foto' : 'Anexar foto'}</button>
      ${sub.image_url ? '<button class="danger" id="modalRemoveImg" type="button">Remover foto</button>' : ''}
    </div>` : '';

  body.innerHTML = `
    ${imgHtml}
    ${adminRow}
    <div class="qr-section">
      <div class="qr-code" id="qrCode"></div>
      <div class="qr-info">
        <div class="qr-label">Cole esse QR na gôndola — ao escanear, todo mundo vê a mesma foto</div>
        <div class="qr-link mono" id="qrLink">${escapeHtml(url)}</div>
        <div class="qr-buttons">
          <button id="qrDownload" type="button">Baixar QR</button>
          <button class="secondary" id="qrPrint" type="button">Imprimir etiqueta</button>
        </div>
      </div>
    </div>`;

  const qrEl = document.getElementById('qrCode');
  qrEl.innerHTML = '';
  new QRCode(qrEl, { text: url, width: 108, height: 108, correctLevel: QRCode.CorrectLevel.M });

  document.getElementById('qrDownload').addEventListener('click', ()=>{
    const src = getQrDataUrl(qrEl);
    if (!src) return;
    const a = document.createElement('a');
    a.href = src; a.download = `qr-${dept.code}-${sub.code}.png`; a.click();
  });
  document.getElementById('qrPrint').addEventListener('click', ()=>{
    printLabels([{ code:`${dept.code}-${sub.code}`, name: sub.name, dataUrl: getQrDataUrl(qrEl) }]);
  });

  if (isAdmin){
    document.getElementById('modalUpload').addEventListener('click', ()=> openFilePicker(dept.code, sub.code));
    const rm = document.getElementById('modalRemoveImg');
    if (rm) rm.addEventListener('click', async ()=>{
      if (!confirm('Remover a foto desse layout?')) return;
      try{ await sb.storage.from('layouts').remove([`${dept.code}/${sub.code}.jpg`]); }catch(err){}
      await sb.from('submercadologicos').update({ image_url:'' }).eq('dept_code', dept.code).eq('code', sub.code);
      await loadData();
      openModal(dept.code, sub.code);
    });
    const dropArea = document.getElementById('modalImg');
    ['dragover','drop'].forEach(evt=> dropArea.addEventListener(evt, e=>e.preventDefault()));
    dropArea.addEventListener('drop', async (e)=>{
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file){ await uploadImageForSub(dept.code, sub.code, file); openModal(dept.code, sub.code); }
    });
  }

  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal(){ document.getElementById('modalOverlay').classList.remove('open'); }

function printLabels(labels){
  const win = window.open('', '_blank', 'width=480,height=640');
  win.document.write(`
    <html><head><title>Etiquetas — Planograma</title>
    <style>
      body{ font-family: Arial, sans-serif; margin:20px; }
      .grid{ display:grid; grid-template-columns: repeat(3, 1fr); gap:14px; }
      .label{ border:1px dashed #999; border-radius:8px; padding:10px; text-align:center; }
      .label img{ width:100px; height:100px; }
      .label .code{ font-family: monospace; font-size:10.5px; color:#666; margin-top:6px; }
      .label .name{ font-size:11.5px; font-weight:600; margin-top:2px; }
      .bar{ margin-bottom:16px; }
      @media print{ .bar{ display:none; } }
    </style>
    </head><body>
    <div class="bar"><button id="printBtn" type="button">Imprimir</button></div>
    <div class="grid">${labels.map(l=>`<div class="label"><img src="${l.dataUrl}"><div class="code">${escapeHtml(l.code)}</div><div class="name">${escapeHtml(l.name)}</div></div>`).join('')}</div>
    </body></html>
  `);
  win.document.close();
  const printBtn = win.document.getElementById('printBtn');
  if (printBtn) printBtn.addEventListener('click', () => win.print());
}

async function printDeptLabels(dept){
  const labels = [];
  for (const s of dept.subs){
    const temp = document.createElement('div');
    temp.style.position = 'absolute'; temp.style.left = '-9999px';
    document.body.appendChild(temp);
    new QRCode(temp, { text: buildItemUrl(dept.code, s.code), width: 140, height: 140, correctLevel: QRCode.CorrectLevel.M });
    await new Promise(r => setTimeout(r, 30));
    labels.push({ code:`${dept.code}-${s.code}`, name: s.name, dataUrl: getQrDataUrl(temp) });
    document.body.removeChild(temp);
  }
  printLabels(labels);
}

/* ---------- Eventos globais ---------- */
document.getElementById('deptList').addEventListener('click', (e)=>{
  const btn = e.target.closest('.dept-btn');
  if (!btn) return;
  activeDeptIdx = Number(btn.dataset.idx);
  activePage = 'dept';
  renderDepts(); renderMain();
  document.getElementById('sidebar').classList.remove('open');
});

document.getElementById('content').addEventListener('click', (e)=>{
  if (isDraggingSub) return;
  const card = e.target.closest('.sub-card');
  if (!card) return;
  const dept = departamentos[activeDeptIdx];
  openModal(dept.code, card.dataset.sub);
});

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', (e)=>{ if (e.target.id === 'modalOverlay') closeModal(); });
document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeModal(); });
document.getElementById('menuToggle').addEventListener('click', ()=> document.getElementById('sidebar').classList.toggle('open'));

loadThemePreference();
initAuth();
