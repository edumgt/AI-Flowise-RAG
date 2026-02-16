const express = require("express");
const cors = require("cors");
const { z } = require("zod");

const env = require("./lib/env");
const { answerQuestion } = require("./lib/rag");
const { ingestSampleDocs, SAMPLE_DIR } = require("./lib/ingest");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/", (req, res) => res.json({ service: "langchain-js-rag-api", sampleDir: SAMPLE_DIR }));

app.post("/ingest", async (req, res) => {
  try {
    const result = await ingestSampleDocs();
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/chat", async (req, res) => {
  const schema = z.object({ question: z.string().min(1), topK: z.number().int().min(1).max(20).optional() });
  try {
    const { question, topK } = schema.parse(req.body || {});
    const out = await answerQuestion({ question, topK: topK || 5 });
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

app.listen(env.port, () => {
  console.log(`[langchain-api] listening on :${env.port}`);
});
