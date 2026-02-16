const state = {
  token: null,
  me: null,
  tenant: 'branch',
  dept: 'teller',
  engine: 'llamaindex',
};

function $(sel) { return document.querySelector(sel); }
function el(tag, cls, html) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (html != null) d.innerHTML = html;
  return d;
}

function setMsg(id, msg, isError=false) {
  const box = $(id);
  box.textContent = msg;
  box.className = 'text-sm mt-3 ' + (isError ? 'text-rose-600' : 'text-slate-600');
}

function authHeaders() {
  return state.token ? { 'Authorization': 'Bearer ' + state.token } : {};
}

async function api(path, opts={}) {
  const r = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      ...authHeaders(),
    }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
  return data;
}

async function login() {
  $('#loginMsg').classList.add('hidden');
  try {
    const username = $('#inpUser').value.trim();
    const password = $('#inpPass').value.trim();
    const res = await api('/api/auth/login', { method:'POST', body: JSON.stringify({ username, password }) });
    state.token = res.token;
    state.me = await api('/api/auth/me', { method:'GET' });
    $('#panelLogin').classList.add('hidden');
    $('#panelWorkspace').classList.remove('hidden');
    $('#badgeScope').textContent = state.me.user;
    renderSelectors();
    updateScopeLabel();
    await refreshJobs();
    await refreshDocs();
  } catch (e) {
    $('#loginMsg').textContent = String(e.message || e);
    $('#loginMsg').classList.remove('hidden');
  }
}

function logout() {
  state.token = null;
  state.me = null;
  $('#panelLogin').classList.remove('hidden');
  $('#panelWorkspace').classList.add('hidden');
  $('#badgeScope').textContent = 'guest';
}

function allowed(tenant, dept) {
  const t = state.me?.tenants || [];
  const d = state.me?.depts || [];
  const tOk = t.includes('*') || t.includes(tenant);
  const dOk = d.includes('*') || d.includes(dept);
  return tOk && dOk;
}

function renderSelectors() {
  const tenants = ['branch','hq'];
  const deptsByTenant = {
    branch: ['teller','risk'],
    hq: ['aml','compliance']
  };

  const selTenant = $('#selTenant');
  selTenant.innerHTML = '';
  tenants.filter(t => state.me.tenants.includes('*') || state.me.tenants.includes(t))
    .forEach(t => selTenant.appendChild(el('option', null, t)));

  state.tenant = selTenant.value || 'branch';

  const selDept = $('#selDept');
  selDept.innerHTML = '';
  (deptsByTenant[state.tenant] || []).filter(d => state.me.depts.includes('*') || state.me.depts.includes(d))
    .forEach(d => selDept.appendChild(el('option', null, d)));
  state.dept = selDept.value || (deptsByTenant[state.tenant] || [])[0] || 'teller';

  $('#selEngine').value = state.engine;

  selTenant.onchange = () => {
    state.tenant = selTenant.value;
    // rerender dept
    const selDept2 = $('#selDept');
    selDept2.innerHTML = '';
    (deptsByTenant[state.tenant] || []).filter(d => state.me.depts.includes('*') || state.me.depts.includes(d))
      .forEach(d => selDept2.appendChild(el('option', null, d)));
    state.dept = selDept2.value || (deptsByTenant[state.tenant] || [])[0] || state.dept;
    updateScopeLabel();
  };

  selDept.onchange = () => { state.dept = selDept.value; updateScopeLabel(); };
  $('#selEngine').onchange = () => { state.engine = $('#selEngine').value; updateScopeLabel(); };
}

function updateScopeLabel() {
  $('#currentScope').textContent = `${state.tenant} / ${state.dept}  (engine: ${state.engine})`;
}

async function uploadFile() {
  const f = $('#fileInput').files[0];
  if (!f) return setMsg('#uploadMsg', '파일을 선택해주세요.', true);

  if (!allowed(state.tenant, state.dept)) return setMsg('#uploadMsg', '권한이 없습니다.', true);

  const form = new FormData();
  form.append('tenant', state.tenant);
  form.append('dept', state.dept);
  form.append('engine', state.engine);
  form.append('file', f);

  setMsg('#uploadMsg', '업로드 중...');
  const r = await fetch('/api/documents/upload', {
    method: 'POST',
    headers: authHeaders(),
    body: form
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return setMsg('#uploadMsg', data.error || '업로드 실패', true);

  setMsg('#uploadMsg', `업로드 완료. Job queued: ${data.jobId}`);
  $('#fileInput').value = '';
  await refreshJobs();
}

function addChatBubble(role, text) {
  const box = $('#chatBox');
  const bubble = el('div', 'p-4 rounded-2xl border border-slate-200 bg-slate-50');
  bubble.innerHTML = `
    <div class="text-xs text-slate-500">${role}</div>
    <div class="mt-1 whitespace-pre-wrap">${escapeHtml(text)}</div>
  `;
  box.prepend(bubble);
}

function escapeHtml(s) {
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

async function ask() {
  const q = $('#inpQuestion').value.trim();
  if (!q) return;
  addChatBubble('user', q);
  $('#inpQuestion').value = '';

  try {
    const res = await api('/api/chat', {
      method:'POST',
      body: JSON.stringify({ question: q, tenant: state.tenant, dept: state.dept, engine: state.engine, topK: 5 })
    });
    addChatBubble('assistant', res.answer || JSON.stringify(res, null, 2));
  } catch (e) {
    addChatBubble('error', String(e.message || e));
  }
}

async function refreshDocs() {
  const res = await api(`/api/documents/list?tenant=${encodeURIComponent(state.tenant)}&dept=${encodeURIComponent(state.dept)}`, { method:'GET' });
  const box = $('#docsBox');
  box.innerHTML = '';
  (res.documents || []).slice().reverse().forEach(d => {
    const latest = d.versions?.at(-1);
    const row = el('div', 'py-2 border-b border-slate-100');
    row.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="font-medium">${escapeHtml(d.name)} <span class="text-xs text-slate-500">(v${latest?.version || '-'})</span></div>
        <button data-del="${d.docId}" class="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50">Delete</button>
      </div>
      <div class="text-xs text-slate-500 mt-1">docId: ${d.docId} • updated: ${d.updatedAt || d.createdAt}</div>
    `;
    box.appendChild(row);
  });

  box.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = async () => {
      const docId = btn.getAttribute('data-del');
      if (!confirm('정말 삭제(soft delete)할까요? Qdrant 벡터도 제거됩니다.')) return;
      try {
        await api('/api/documents/delete', { method:'POST', body: JSON.stringify({ tenant: state.tenant, dept: state.dept, docId }) });
        await refreshDocs();
      } catch (e) {
        alert('delete failed: ' + (e.message || e));
      }
    };
  });
}

async function refreshJobs() {
  const res = await api('/api/documents/jobs', { method:'GET' });
  const box = $('#jobsBox');
  box.innerHTML = '';
  (res.jobs || []).slice().reverse().forEach(j => {
    const row = el('div', 'py-2 border-b border-slate-100');
    row.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="font-medium">${j.jobId} <span class="text-xs text-slate-500">(${j.engine})</span></div>
        <div class="text-xs px-2 py-1 rounded-full ${j.status==='done'?'bg-emerald-100 text-emerald-700':j.status==='failed'?'bg-rose-100 text-rose-700':'bg-slate-100 text-slate-700'}">${j.status}</div>
      </div>
      <div class="text-xs text-slate-500 mt-1">${j.tenant}/${j.dept} • ${j.file?.originalname || '-'} • updated: ${j.updatedAt || '-'}</div>
      ${j.error ? `<div class="text-xs text-rose-600 mt-1">${escapeHtml(j.error)}</div>` : ''}
    `;
    box.appendChild(row);
  });
}

function offcanvas(open) {
  const oc = $('#offcanvas');
  const bd = $('#offcanvasBackdrop');
  if (open) {
    bd.classList.remove('hidden');
    oc.classList.remove('-translate-x-full');
  } else {
    bd.classList.add('hidden');
    oc.classList.add('-translate-x-full');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  $('#btnLogin').onclick = login;
  $('#btnLogout').onclick = logout;
  $('#btnUpload').onclick = () => uploadFile().catch(e => setMsg('#uploadMsg', e.message, true));
  $('#btnAsk').onclick = ask;
  $('#inpQuestion').addEventListener('keydown', (e) => { if (e.key === 'Enter') ask(); });
  $('#btnRefreshJobs').onclick = () => refreshJobs().catch(() => {});
  $('#btnRefreshDocs').onclick = () => refreshDocs().catch(() => {});

  // Offcanvas
  $('#openOffcanvas').onclick = () => offcanvas(true);
  $('#closeOffcanvas').onclick = () => offcanvas(false);
  $('#offcanvasBackdrop').onclick = () => offcanvas(false);
  document.querySelectorAll('[data-scroll]').forEach(btn => {
    btn.onclick = () => {
      offcanvas(false);
      const target = document.querySelector(btn.getAttribute('data-scroll'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    };
  });
});
