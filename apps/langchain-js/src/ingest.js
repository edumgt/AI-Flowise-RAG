const { z } = require('zod');
const { getEmbeddings } = require('./llm');
const { client, ensureCollection } = require('./qdrant');
const { parseFile, chunkText } = require('./parse');

const schema = z.object({
  collection: z.string().min(3),
  filePath: z.string().min(1),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  docId: z.string().optional(),
  version: z.number().int().optional(),
  sha256: z.string().optional(),
  tenant: z.string().optional(),
  dept: z.string().optional(),
});

async function ingestFileHandler(req, res) {
  try {
    const body = schema.parse(req.body);
    const text = await parseFile(body.filePath);
    const chunks = chunkText(text);

    if (chunks.length === 0) return res.status(400).json({ error: 'no text extracted' });

    const embeddings = getEmbeddings();
    // infer vector size from one embedding (works for OpenAI/Ollama)
    const sampleVec = await embeddings.embedQuery("vector-size-check");
    const vectorSize = sampleVec.length;

    await ensureCollection(body.collection, vectorSize);

    const q = client();
    const vectors = await embeddings.embedDocuments(chunks);
    const now = Date.now();

    const points = vectors.map((v, idx) => ({
      id: `${now}_${idx}`,
      vector: v,
      payload: {
        source: body.fileName || body.filePath,
        chunk: idx,
        text: chunks[idx],
        docId: body.docId || null,
        version: body.version || null,
        sha256: body.sha256 || null,
        tenant: body.tenant || null,
        dept: body.dept || null,
        embedModel: process.env.LLM_PROVIDER === 'ollama'
          ? (process.env.OLLAMA_EMBED_MODEL || null)
          : (process.env.OPENAI_EMBEDDING_MODEL || null),
      },
    }));

    await q.upsert(body.collection, { points });
    return res.json({ ok: true, collection: body.collection, chunks: chunks.length, vectorSize });
  } catch (e) {
    return res.status(400).json({ error: 'ingest failed', detail: String(e) });
  }
}

module.exports = { ingestFileHandler };
