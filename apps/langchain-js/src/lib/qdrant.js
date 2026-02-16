const { QdrantClient } = require("@qdrant/js-client-rest");
const env = require("./env");

function client() {
  return new QdrantClient({ url: env.qdrant.url });
}

async function ensureCollection({ embeddings, collection }) {
  const c = client();
  const col = collection || env.qdrant.collection;

  const cols = await c.getCollections();
  const exists = cols.collections.some((x) => x.name === col);
  if (exists) return { client: c, collection: col };

  // Determine vector size dynamically based on embedding
  const probe = await embeddings.embedQuery("vector-size-probe");
  const size = probe.length;

  await c.createCollection(col, {
    vectors: { size, distance: "Cosine" },
  });
  return { client: c, collection: col };
}

async function upsertDocuments({ docs, embeddings, collection }) {
  const { client: c, collection: col } = await ensureCollection({ embeddings, collection });
  const vectors = await embeddings.embedDocuments(docs.map((d) => d.pageContent));

  const points = docs.map((d, idx) => ({
    id: `${Date.now()}-${idx}-${Math.random().toString(16).slice(2)}`,
    vector: vectors[idx],
    payload: {
      text: d.pageContent,
      meta: d.metadata || {},
    },
  }));

  await c.upsert(col, { points });
  return points.length;
}

async function search({ query, embeddings, topK, collection }) {
  const { client: c, collection: col } = await ensureCollection({ embeddings, collection });
  const v = await embeddings.embedQuery(query);

  const out = await c.search(col, {
    vector: v,
    limit: topK,
    with_payload: true,
  });

  return out.map((h) => ({
    score: h.score,
    text: h.payload?.text,
    meta: h.payload?.meta,
    id: h.id,
  }));
}

module.exports = { upsertDocuments, search };
