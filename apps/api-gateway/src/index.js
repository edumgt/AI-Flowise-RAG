require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const multer = require("multer");
const fetch = require("node-fetch");
const pino = require("pino");
const pinoHttp = require("pino-http");
const { context, trace } = require("@opentelemetry/api");

const { startOtel } = require("./otel");
const { loadTenants } = require("./lib/config");
const { signToken, authRequired, requireRole, canAccessCollection, verifyLogin } = require("./lib/auth");
const { collectionName } = require("./lib/qdrant");

startOtel();

const log = pino({ level: process.env.LOG_LEVEL || "info" });

function withTraceFields(req) {
  const span = trace.getSpan(context.active());
  const spanCtx = span?.spanContext();
  return spanCtx ? { trace_id: spanCtx.traceId, span_id: spanCtx.spanId } : {};
}

const app = express();
app.use(helmet({ contentSecurityPolicy: false })); // tailwind CDN 허용 위해 CSP는 환경에 맞게 조정
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(pinoHttp({ logger: log, customProps: (req) => withTraceFields(req) }));

// Static FE (vanilla + tailwind)
const publicDir = path.join(__dirname, "..", "public");
app.use("/", express.static(publicDir));

app.get("/health", (req, res) => res.json({ ok: true, service: "api-gateway" }));

// ---- Auth ----
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "missing_credentials" });
  const user = await verifyLogin(username, password);
  if (!user) return res.status(401).json({ error: "invalid_credentials" });
  const token = signToken(user);
  return res.json({ token, user });
});

app.get("/api/me", authRequired, (req, res) => res.json({ user: req.user }));

// ---- Tenants ----
app.get("/api/tenants", authRequired, (req, res) => {
  // 일반 사용자도 선택 UI를 위해 자신의 tenant 정보는 확인 가능 (민감하면 admin only로 변경)
  const cfg = loadTenants();
  const mine = (cfg.tenants || []).filter(t => t.id === req.user.tenant);
  res.json({ tenants: mine });
});

app.get("/api/admin/tenants", authRequired, requireRole("admin"), (req, res) => {
  const cfg = loadTenants();
  res.json(cfg);
});

// ---- Upload + Index ----
const uploadRoot = process.env.UPLOAD_DIR || "/data/uploads";
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) { cb(null, uploadRoot); },
  filename: function (_req, file, cb) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB

function pickEngine(engine) {
  if (engine === "langchain") return "langchain";
  if (engine === "llamaindex") return "llamaindex";
  return process.env.DEFAULT_RAG_ENGINE || "llamaindex";
}

app.post("/api/documents/upload", authRequired, upload.single("file"), async (req, res) => {
  const tenant = req.body.tenant || req.user.tenant;
  const dept = req.body.dept;
  const engine = pickEngine(req.body.engine);

  if (!dept) return res.status(400).json({ error: "missing_dept" });
  if (!canAccessCollection(req.user, tenant, dept)) return res.status(403).json({ error: "forbidden" });

  const filePath = req.file?.path;
  if (!filePath) return res.status(400).json({ error: "missing_file" });

  const collection = collectionName(tenant, dept);

  try {
    // 1) 파싱+인덱싱은 선택한 엔진 서비스가 담당
    if (engine === "llamaindex") {
      const r = await fetch(`${process.env.LLAMAINDEX_URL || "http://llamaindex-py:8000"}/ingest/file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, collection, metadata: { tenant, dept, uploader: req.user.sub } })
      });
      const j = await r.json();
      if (!r.ok) return res.status(r.status).json(j);
      return res.json({ ok: true, engine, collection, result: j });
    } else {
      const r = await fetch(`${process.env.LANGCHAIN_URL || "http://langchain-js:3001"}/ingest/file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, collection, metadata: { tenant, dept, uploader: req.user.sub } })
      });
      const j = await r.json();
      if (!r.ok) return res.status(r.status).json(j);
      return res.json({ ok: true, engine, collection, result: j });
    }
  } catch (e) {
    req.log.error({ err: e }, "upload_ingest_failed");
    return res.status(500).json({ error: "ingest_failed" });
  }
});

// ---- Chat ----
app.post("/api/chat", authRequired, async (req, res) => {
  const { question, dept, tenant, topK, engine } = req.body || {};
  const t = tenant || req.user.tenant;
  const d = dept;
  if (!question || !d) return res.status(400).json({ error: "missing_question_or_dept" });
  if (!canAccessCollection(req.user, t, d)) return res.status(403).json({ error: "forbidden" });

  const collection = collectionName(t, d);
  const useEngine = pickEngine(engine);

  try {
    const target = useEngine === "llamaindex"
      ? `${process.env.LLAMAINDEX_URL || "http://llamaindex-py:8000"}/chat`
      : `${process.env.LANGCHAIN_URL || "http://langchain-js:3001"}/chat`;

    const r = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, topK: topK || 5, collection })
    });
    const j = await r.json();
    if (!r.ok) return res.status(r.status).json(j);
    return res.json({ ok: true, engine: useEngine, collection, ...j });
  } catch (e) {
    req.log.error({ err: e }, "chat_failed");
    return res.status(500).json({ error: "chat_failed" });
  }
});

const port = Number(process.env.PORT || 3005);
app.listen(port, () => log.info({ port }, "api-gateway listening"));
