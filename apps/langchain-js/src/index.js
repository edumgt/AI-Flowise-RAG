require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { z } = require("zod");
const pino = require("pino");
const pinoHttp = require("pino-http");

const { startOtel } = require("./otel");
const env = require("./lib/env");
const { answerQuestion } = require("./lib/rag");
const { ingestSampleDocs, ingestFileByPath, SAMPLE_DIR } = require("./lib/ingest");

startOtel();

const log = pino({ level: process.env.LOG_LEVEL || "info" });

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "4mb" }));
app.use(pinoHttp({ logger: log }));

app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/", (req, res) =>
  res.json({
    service: "langchain-js-rag-api",
    sampleDir: SAMPLE_DIR,
    qdrant: env.qdrant,
    note: "Use /ingest/file with {filePath, collection} for multi-tenant collections."
  })
);

// 기존 샘플 ingest
app.post("/ingest", async (req, res) => {
  try {
    const out = await ingestSampleDocs();
    res.json({ ok: true, ...out });
  } catch (e) {
    req.log.error({ err: e }, "ingest_failed");
    res.status(500).json({ ok: false, error: "ingest_failed" });
  }
});

// 업로드된 파일을 경로로 받아 파싱→인덱싱 (Gateway가 저장한 파일을 공유 볼륨에서 참조)
app.post("/ingest/file", async (req, res) => {
  const schema = z.object({
    filePath: z.string().min(1),
    collection: z.string().min(3),
    metadata: z.record(z.any()).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const out = await ingestFileByPath(parsed.data.filePath, parsed.data.collection, parsed.data.metadata || {});
    res.json({ ok: true, ...out });
  } catch (e) {
    req.log.error({ err: e }, "ingest_file_failed");
    res.status(500).json({ ok: false, error: "ingest_file_failed" });
  }
});

app.post("/chat", async (req, res) => {
  const schema = z.object({
    question: z.string().min(1),
    topK: z.number().int().min(1).max(20).optional(),
    collection: z.string().min(3),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const out = await answerQuestion(parsed.data.question, {
      topK: parsed.data.topK || 5,
      collection: parsed.data.collection,
    });
    res.json({ ok: true, ...out });
  } catch (e) {
    req.log.error({ err: e }, "chat_failed");
    res.status(500).json({ ok: false, error: "chat_failed" });
  }
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => log.info({ port }, "langchain-js listening"));
