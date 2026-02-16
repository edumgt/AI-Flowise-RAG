/**
 * Vanilla FE + Tailwind (CDN) + Offcanvas UX
 * - 로그인(JWT)
 * - 문서 업로드(부서 컬렉션 분리)
 * - RAG 채팅
 */
const API = {
  login: () => `/api/auth/login`,
  me: () => `/api/me`,
  tenants: () => `/api/tenants`,
  upload: () => `/api/documents/upload`,
  chat: () => `/api/chat`,
};

const state = {
  token: localStorage.getItem("token") || "",
  user: null,
  tenant: null,
  dept: null,
  engine: localStorage.getItem("engine") || "llamaindex",
  tenants: [],
};

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstChild;
}
function qs(sel) { return document.querySelector(sel); }
function setHash(route) { location.hash = route; }

function toast(msg, type="info") {
  const root = qs("#toast-root") || (() => {
    const r = el('<div id="toast-root" class="fixed top-4 right-4 z-50 flex flex-col gap-2"></div>');
    document.body.appendChild(r);
    return r;
  })();

  const tone = type === "error" ? "bg-rose-600" : (type==="ok" ? "bg-emerald-600" : "bg-slate-700");
  const item = el(\`
    <div class="toast \${tone} text-white px-4 py-3 rounded-xl shadow-lg border border-white/10 opacity-0 translate-y-2">
      <div class="text-sm">\${escapeHtml(msg)}</div>
    </div>\`);
  root.appendChild(item);
  requestAnimationFrame(() => {
    item.classList.remove("opacity-0","translate-y-2");
    item.classList.add("opacity-100","translate-y-0");
  });
  setTimeout(() => {
    item.classList.add("opacity-0","translate-y-2");
    setTimeout(() => item.remove(), 250);
  }, 2800);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
}

async function apiFetch(url, opts={}) {
  const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
  if (state.token) headers["Authorization"] = "Bearer " + state.token;
  const res = await fetch(url, { ...opts, headers });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = typeof data === "string" ? data : (data.error || JSON.stringify(data));
    throw new Error(msg);
  }
  return data;
}

function layout(contentHtml) {
  return \`
  <div class="min-h-screen">
    <!-- topbar -->
    <header class="sticky top-0 z-40 backdrop-blur bg-slate-950/70 border-b border-white/10">
      <div class="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <button id="btn-menu" class="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 hover:bg-white/5">
          <span class="text-xl">☰</span>
        </button>
        <div class="flex-1">
          <div class="text-sm text-slate-400">Bank RAG Workspace</div>
          <div class="font-semibold tracking-tight">업무 지식 검색 · 문서 인덱싱 · 준법/리스크 지원</div>
        </div>
        <div class="hidden md:flex items-center gap-2">
          <select id="engine" class="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm">
            <option value="llamaindex">LlamaIndex 엔진</option>
            <option value="langchain">LangChain 엔진</option>
          </select>
          <button id="btn-logout" class="px-3 py-2 text-sm rounded-xl border border-white/10 hover:bg-white/5">로그아웃</button>
        </div>
      </div>
    </header>

    <!-- offcanvas -->
    <div id="backdrop" class="backdrop fixed inset-0 z-50 bg-black/60"></div>
    <aside id="offcanvas" class="offcanvas fixed top-0 left-0 z-50 h-full w-80 bg-slate-950 border-r border-white/10 p-4">
      <div class="flex items-center justify-between">
        <div class="font-semibold">메뉴</div>
        <button id="btn-close" class="w-10 h-10 rounded-xl border border-white/10 hover:bg-white/5">✕</button>
      </div>

      <div class="mt-4 p-3 rounded-2xl border border-white/10 bg-white/5">
        <div class="text-xs text-slate-400">현재 사용자</div>
        <div class="text-sm font-medium" id="me-line">-</div>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <div>
            <div class="text-xs text-slate-400">Tenant</div>
            <select id="tenant" class="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm"></select>
          </div>
          <div>
            <div class="text-xs text-slate-400">Dept</div>
            <select id="dept" class="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm"></select>
          </div>
        </div>
        <div class="mt-2">
          <div class="text-xs text-slate-400">RAG Engine</div>
          <select id="engine-m" class="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm">
            <option value="llamaindex">LlamaIndex</option>
            <option value="langchain">LangChain</option>
          </select>
        </div>
      </div>

      <nav class="mt-4 flex flex-col gap-2">
        <a class="nav px-3 py-2 rounded-xl hover:bg-white/5 border border-white/10" href="#/chat">💬 채팅</a>
        <a class="nav px-3 py-2 rounded-xl hover:bg-white/5 border border-white/10" href="#/upload">📄 문서 업로드</a>
        <a class="nav px-3 py-2 rounded-xl hover:bg-white/5 border border-white/10" href="#/about">ℹ️ 안내</a>
      </nav>

      <div class="mt-auto pt-6">
        <button id="btn-logout-m" class="w-full px-3 py-2 text-sm rounded-xl border border-white/10 hover:bg-white/5">로그아웃</button>
      </div>
    </aside>

    <main class="mx-auto max-w-6xl px-4 py-8">
      \${contentHtml}
    </main>

    <footer class="mx-auto max-w-6xl px-4 pb-10 text-xs text-slate-500">
      * 본 UI/문서는 데모 템플릿입니다. 실제 규정/법령/내부통제는 소속 기관의 최신 문서를 따르세요.
    </footer>
  </div>
  \`;
}

function viewLogin() {
  qs("#app").innerHTML = \`
    <div class="min-h-screen flex items-center justify-center px-4">
      <div class="w-full max-w-md p-6 rounded-3xl border border-white/10 bg-white/5 shadow-xl">
        <div class="text-slate-400 text-sm">Bank RAG Workspace</div>
        <h1 class="text-2xl font-semibold mt-1">로그인</h1>
        <p class="text-sm text-slate-400 mt-2">데모 계정: admin / admin1234, teller / teller1234 ...</p>

        <div class="mt-6 space-y-3">
          <input id="u" class="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-white/10" placeholder="username" />
          <input id="p" type="password" class="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-white/10" placeholder="password" />
          <button id="btn-login" class="w-full px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-medium">로그인</button>
        </div>

        <div class="mt-4 text-xs text-slate-500">
          서버: <code class="text-slate-300">/api-gateway</code> · 벡터DB: <code class="text-slate-300">Qdrant</code> · 엔진: <code class="text-slate-300">LlamaIndex / LangChain</code>
        </div>
      </div>
    </div>
  \`;

  qs("#btn-login").onclick = async () => {
    try {
      const username = qs("#u").value.trim();
      const password = qs("#p").value.trim();
      const r = await apiFetch(API.login(), { method:"POST", body: JSON.stringify({ username, password }) });
      state.token = r.token;
      localStorage.setItem("token", state.token);
      toast("로그인 성공", "ok");
      await bootstrap();
      setHash("/chat");
    } catch (e) {
      toast("로그인 실패: " + e.message, "error");
    }
  };
}

function viewChat() {
  return layout(\`
    <div class="grid md:grid-cols-3 gap-6">
      <section class="md:col-span-2 p-5 rounded-3xl border border-white/10 bg-white/5">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">RAG 채팅</h2>
          <div class="text-xs text-slate-400">컬렉션: <span class="text-slate-200">\${escapeHtml(state.tenant)} / \${escapeHtml(state.dept)}</span></div>
        </div>
        <div id="chat-log" class="mt-4 space-y-3 max-h-[52vh] overflow-auto pr-1"></div>

        <div class="mt-4 flex gap-2">
          <input id="q" class="flex-1 px-4 py-3 rounded-2xl bg-slate-900 border border-white/10" placeholder="질문을 입력하세요 (예: AML red flag 기준 정리해줘)" />
          <button id="btn-send" class="px-4 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 font-medium">전송</button>
        </div>
      </section>

      <aside class="p-5 rounded-3xl border border-white/10 bg-white/5">
        <h3 class="font-semibold">추천 질문</h3>
        <div class="mt-3 grid gap-2">
          \${[
            "KYC 강화확인(EDD) 트리거를 요약해줘",
            "여신 심사 단계 체크리스트 정리해줘",
            "AML red flags 예시를 알려줘",
            "보이스피싱 의심 시 창구 응대 멘트 추천해줘"
          ].map(q => \`<button class="suggest px-3 py-2 rounded-2xl border border-white/10 hover:bg-white/5 text-left text-sm">\${escapeHtml(q)}</button>\`).join("")}
        </div>

        <div class="mt-5 text-xs text-slate-400">
          팁: 좌측 메뉴(Offcanvas)에서 <b>Dept</b>를 바꾸면 부서별 컬렉션이 분리됩니다.
        </div>
      </aside>
    </div>
  \`);
}

function appendMsg(role, text, sources) {
  const log = qs("#chat-log");
  const bubble = el(\`
    <div class="p-4 rounded-3xl border border-white/10 \${role==="user"?"bg-slate-900":"bg-white/5"}">
      <div class="text-xs text-slate-400">\${role==="user"?"You":"Assistant"}</div>
      <div class="mt-2 whitespace-pre-wrap text-sm leading-relaxed">\${escapeHtml(text)}</div>
      \${sources && sources.length ? \`
        <div class="mt-3 text-xs text-slate-400">
          <div class="font-medium text-slate-300">Sources</div>
          <ul class="list-disc ml-5 mt-1 space-y-1">
            \${sources.slice(0,6).map(s => \`<li>\${escapeHtml(s.source || s.file || s.id || "doc")}</li>\`).join("")}
          </ul>
        </div>\` : ""}
    </div>
  \`);
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
}

function viewUpload() {
  return layout(\`
    <div class="grid lg:grid-cols-3 gap-6">
      <section class="lg:col-span-2 p-5 rounded-3xl border border-white/10 bg-white/5">
        <h2 class="text-lg font-semibold">문서 업로드 → 파싱 → 인덱싱</h2>
        <p class="text-sm text-slate-400 mt-2">
          지원 예시: <code class="text-slate-200">.txt .md .pdf .docx</code>
          (환경/라이브러리에 따라 일부 포맷은 제한될 수 있어요)
        </p>

        <div class="mt-5 p-4 rounded-2xl border border-dashed border-white/20 bg-slate-950/40">
          <input id="file" type="file" class="block w-full text-sm text-slate-300" />
          <div class="mt-3 flex items-center gap-2">
            <button id="btn-upload" class="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-medium">업로드 & 인덱싱</button>
            <div class="text-xs text-slate-400">Tenant/Dept/Engine은 좌측 메뉴에서 선택</div>
          </div>
          <div id="upload-status" class="mt-3 text-sm text-slate-300"></div>
        </div>
      </section>

      <aside class="p-5 rounded-3xl border border-white/10 bg-white/5">
        <h3 class="font-semibold">운영 팁</h3>
        <ul class="mt-3 text-sm text-slate-300 space-y-2 list-disc ml-5">
          <li>부서별 컬렉션 분리는 권한/스코프 관리에 유리합니다.</li>
          <li>문서 메타데이터(업로더/날짜/버전)를 함께 저장하세요.</li>
          <li>대용량 PDF는 사전 텍스트 추출 파이프라인(ETL)로 분리하는 게 안정적입니다.</li>
        </ul>
      </aside>
    </div>
  \`);
}

function viewAbout() {
  return layout(\`
    <div class="p-6 rounded-3xl border border-white/10 bg-white/5">
      <h2 class="text-lg font-semibold">이 데모가 보여주는 것</h2>
      <ol class="mt-4 space-y-2 text-sm text-slate-300 list-decimal ml-6">
        <li><b>문서 업로드 API</b>: 파일 업로드 → 파싱 → 인덱싱</li>
        <li><b>멀티 테넌트</b>: tenant/dept별 Qdrant 컬렉션 분리</li>
        <li><b>관측</b>: OpenTelemetry(트레이스/메트릭/로그 연계) 구성</li>
        <li><b>배포</b>: EC2/ALB, ECS, k8s Helm 예시(레포 내 /deploy)</li>
      </ol>

      <div class="mt-6 grid md:grid-cols-3 gap-3 text-xs">
        <div class="p-4 rounded-2xl bg-slate-900 border border-white/10">
          <div class="text-slate-400">Gateway</div>
          <div class="font-medium">JWT · Upload · Proxy</div>
        </div>
        <div class="p-4 rounded-2xl bg-slate-900 border border-white/10">
          <div class="text-slate-400">RAG Engine</div>
          <div class="font-medium">LangChain / LlamaIndex</div>
        </div>
        <div class="p-4 rounded-2xl bg-slate-900 border border-white/10">
          <div class="text-slate-400">Vector DB</div>
          <div class="font-medium">Qdrant collections</div>
        </div>
      </div>
    </div>
  \`);
}

function wireOffcanvas() {
  const oc = qs("#offcanvas");
  const bd = qs("#backdrop");
  const open = () => { oc.classList.add("open"); bd.classList.add("open"); };
  const close = () => { oc.classList.remove("open"); bd.classList.remove("open"); };

  qs("#btn-menu")?.addEventListener("click", open);
  qs("#btn-close")?.addEventListener("click", close);
  bd?.addEventListener("click", close);

  // route click closes on mobile
  document.querySelectorAll("a.nav").forEach(a => a.addEventListener("click", () => {
    if (window.innerWidth < 768) close();
  }));
  return { open, close };
}

function fillTenantDeptSelectors() {
  const tenantSel = qs("#tenant");
  const deptSel = qs("#dept");
  const engineSel = qs("#engine");
  const engineSelM = qs("#engine-m");

  if (engineSel) engineSel.value = state.engine;
  if (engineSelM) engineSelM.value = state.engine;

  function setDeptsForTenant(tenantId) {
    const t = state.tenants.find(x => x.id === tenantId);
    const depts = (t?.depts || []);
    deptSel.innerHTML = depts.map(d => \`<option value="\${d.id}">\${escapeHtml(d.name)} (\${d.id})</option>\`).join("");
    if (!state.dept || !depts.find(d => d.id === state.dept)) {
      state.dept = depts[0]?.id || "";
    }
    deptSel.value = state.dept;
  }

  tenantSel.innerHTML = state.tenants.map(t => \`<option value="\${t.id}">\${escapeHtml(t.name)} (\${t.id})</option>\`).join("");
  state.tenant = state.tenant || state.tenants[0]?.id || "";
  tenantSel.value = state.tenant;

  setDeptsForTenant(state.tenant);

  tenantSel.onchange = () => {
    state.tenant = tenantSel.value;
    setDeptsForTenant(state.tenant);
    localStorage.setItem("tenant", state.tenant);
    localStorage.setItem("dept", state.dept);
    rerender();
  };
  deptSel.onchange = () => {
    state.dept = deptSel.value;
    localStorage.setItem("dept", state.dept);
    rerender();
  };

  function setEngine(v) {
    state.engine = v;
    localStorage.setItem("engine", v);
    if (engineSel) engineSel.value = v;
    if (engineSelM) engineSelM.value = v;
  }
  engineSel?.addEventListener("change", () => setEngine(engineSel.value));
  engineSelM?.addEventListener("change", () => setEngine(engineSelM.value));
}

function wireCommonActions() {
  const logout = () => {
    localStorage.removeItem("token");
    state.token = "";
    state.user = null;
    viewLogin();
  };
  qs("#btn-logout")?.addEventListener("click", logout);
  qs("#btn-logout-m")?.addEventListener("click", logout);
}

function wireChatActions() {
  document.querySelectorAll(".suggest").forEach(btn => {
    btn.addEventListener("click", () => {
      qs("#q").value = btn.textContent.trim();
      qs("#q").focus();
    });
  });

  qs("#btn-send").onclick = async () => {
    const q = qs("#q").value.trim();
    if (!q) return;
    appendMsg("user", q);
    qs("#q").value = "";
    try {
      const r = await apiFetch(API.chat(), {
        method:"POST",
        body: JSON.stringify({ question: q, tenant: state.tenant, dept: state.dept, engine: state.engine, topK: 5 })
      });
      appendMsg("assistant", r.answer || r.text || "(no answer)", r.sources || r.citations || []);
    } catch (e) {
      toast("채팅 실패: " + e.message, "error");
    }
  };
}

function wireUploadActions() {
  qs("#btn-upload").onclick = async () => {
    const f = qs("#file").files[0];
    if (!f) return toast("업로드할 파일을 선택하세요", "error");
    const status = qs("#upload-status");
    status.textContent = "업로드 중...";
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("tenant", state.tenant);
      fd.append("dept", state.dept);
      fd.append("engine", state.engine);

      const res = await fetch(API.upload(), {
        method: "POST",
        headers: state.token ? { "Authorization": "Bearer " + state.token } : {},
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
      status.textContent = "완료: " + JSON.stringify({ engine: data.engine, collection: data.collection }, null, 2);
      toast("인덱싱 완료", "ok");
    } catch (e) {
      status.textContent = "실패: " + e.message;
      toast("업로드 실패: " + e.message, "error");
    }
  };
}

function rerender() {
  const route = (location.hash || "#/chat").replace("#", "");
  if (!state.token) return viewLogin();

  const views = {
    "/chat": viewChat,
    "/upload": viewUpload,
    "/about": viewAbout,
  };
  const html = (views[route] || viewChat)();
  qs("#app").innerHTML = html;

  // offcanvas + selectors
  wireOffcanvas();
  qs("#me-line").textContent = state.user ? \`\${state.user.sub} (\${state.user.roles.join(",")})\` : "-";
  fillTenantDeptSelectors();
  wireCommonActions();

  if (route === "/chat") wireChatActions();
  if (route === "/upload") wireUploadActions();
}

async function bootstrap() {
  // restore tenant/dept
  state.tenant = localStorage.getItem("tenant") || null;
  state.dept = localStorage.getItem("dept") || null;

  const me = await apiFetch(API.me());
  state.user = me.user;

  const t = await apiFetch(API.tenants());
  state.tenants = t.tenants || [];
  if (!state.tenants.length) throw new Error("no tenants visible");

  // default selection
  state.tenant = state.tenant || state.user.tenant || state.tenants[0].id;
  const firstDept = state.tenants[0]?.depts?.[0]?.id;
  state.dept = state.dept || firstDept || "";

  rerender();
}

window.addEventListener("hashchange", rerender);

(async () => {
  if (!state.token) return viewLogin();
  try {
    await bootstrap();
  } catch (e) {
    toast("세션 확인 실패: " + e.message, "error");
    localStorage.removeItem("token");
    state.token = "";
    viewLogin();
  }
})();
