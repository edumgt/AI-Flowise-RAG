const { QdrantClient } = require("@qdrant/js-client-rest");
const env = require("./env");

function client() {
  return new QdrantClient({ url: env.qdrant.url });
}

async function ensureCollection({ embeddings }) {
  const c = client();
  const collection = env.qdrant.collection;

  const cols = await c.getCollections();
  const exists = cols.collections.some((x) => x.name === collection);
  if (exists) return { client: c, collection };

  // Determine vector size dynamically based on embedding model
  const test = await embeddings.embedQuery("dimension probe");
  const size = Array.isArray(test) ? test.length : 1536;

  await c.createCollection(collection, {
    vectors: { size, distance: "Cosine" },
  });

  return { client: c, collection };
}

async function upsertDocuments({ embeddings, documents }) {
  const { client: c, collection } = await ensureCollection({ embeddings });

  // Batch embedding for better performance
  const texts = documents.map((d) => d.pageContent);
  const vectors = await embeddings.embedDocuments(texts);

  const points = documents.map((d, i) => {
    const id = d.metadata?._id || `${Date.now()}-${i}-${Math.random()}`;
    return {
      id,
      vector: vectors[i],
      payload: {
        text: d.pageContent,
        ...d.metadata,
      },
    };
  });

  await c.upsert(collection, {
    wait: true,
    points,
  });

  return { count: points.length };
}

async function search({ embeddings, query, topK = 5 }) {
  const { client: c, collection } = await ensureCollection({ embeddings });
  const vector = await embeddings.embedQuery(query);

  const res = await c.search(collection, {
    vector,
    limit: topK,
    with_payload: true,
  });

  return res.map((r) => ({
    score: r.score,
    text: r.payload?.text || "",
    meta: r.payload || {},
  }));
}

module.exports = { ensureCollection, upsertDocuments, search };
