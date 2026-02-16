const { QdrantClient } = require('@qdrant/js-client-rest');

function client() {
  const url = process.env.QDRANT_URL || 'http://qdrant:6333';
  return new QdrantClient({ url });
}

async function ensureCollection(name, vectorSize) {
  const c = client();
  const existing = await c.getCollections();
  const has = existing.collections.some(x => x.name === name);
  if (!has) {
    await c.createCollection(name, {
      vectors: { size: vectorSize, distance: 'Cosine' },
    });
    return;
  }

  // validate size
  const info = await c.getCollection(name);
  const size = info?.config?.params?.vectors?.size;
  if (size && Number(size) !== Number(vectorSize)) {
    throw new Error(
      `Qdrant collection '${name}' vector size mismatch: existing=${size}, requested=${vectorSize}. ` +
      `컬렉션을 삭제하거나(DEV), tenant/dept를 바꾸거나, 임베딩 모델을 고정하세요.`
    );
  }
}

module.exports = { client, ensureCollection };
