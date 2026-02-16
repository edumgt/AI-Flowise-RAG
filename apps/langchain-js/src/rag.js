const fs = require('fs');
const path = require('path');

const { QdrantClient } = require('@qdrant/js-client-rest');
const { QdrantVectorStore } = require('@langchain/qdrant');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { Document } = require('@langchain/core/documents');
const { ChatPromptTemplate } = require('@langchain/core/prompts');

const { getEmbeddings, getChatModel } = require('./providers');

function repoRoot() {
  return path.resolve(__dirname, '..', '..', '..');
}

function docsDir(defaultDir) {
  return defaultDir ? path.resolve(defaultDir) : path.join(repoRoot(), 'docs', 'sample');
}

function qdrantCfg() {
  return {
    url: process.env.QDRANT_URL || 'http://qdrant:6333',
    collection: process.env.QDRANT_COLLECTION || 'kb_docs',
  };
}

async function getVectorStore() {
  const { url, collection } = qdrantCfg();
  const client = new QdrantClient({ url });
  const embeddings = getEmbeddings();

  return new QdrantVectorStore(embeddings, {
    client,
    collectionName: collection,
  });
}

async function resetCollection() {
  const { url, collection } = qdrantCfg();
  const client = new QdrantClient({ url });
  try {
    await client.deleteCollection(collection);
  } catch (_) {
    // ignore if not exists
  }
}

function listFilesRecursive(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(p));
    else out.push(p);
  }
  return out;
}

function readAsText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

async function ingestSampleDocs({ dir, reset } = {}) {
  const base = docsDir(dir);
  if (!fs.existsSync(base)) throw new Error(`docs dir not found: ${base}`);

  if (reset) await resetCollection();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 120,
  });

  const files = listFilesRecursive(base).filter((p) => /\.(md|txt)$/i.test(p));

  const docs = [];
  for (const file of files) {
    const text = readAsText(file);
    const chunks = await splitter.splitText(text);

    chunks.forEach((chunk, i) => {
      docs.push(
        new Document({
          pageContent: chunk,
          metadata: {
            source: path.relative(repoRoot(), file).replace(/\\/g, '/'),
            chunk: i,
          },
        })
      );
    });
  }

  const vectorStore = await getVectorStore();
  await vectorStore.addDocuments(docs);

  return { indexedFiles: files.length, chunks: docs.length, collection: qdrantCfg().collection };
}

async function answerWithRag({ question, topK } = {}) {
  const vectorStore = await getVectorStore();
  const retriever = vectorStore.asRetriever(topK ? { k: topK } : { k: 5 });

  const retrieved = await retriever.getRelevantDocuments(question);

  const context = retrieved
    .map((d, idx) => {
      const src = d.metadata?.source || 'unknown';
      return `[#${idx + 1}] source=${src}\n${d.pageContent}`;
    })
    .join('\n\n');

  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      [
        '너는 사내 문서 기반 RAG 도우미야.',
        '주어진 CONTEXT에 근거해서만 답해. 모르면 모른다고 말해.',
        '가능하면 출처(source) 번호를 함께 표기해.',
      ].join(' '),
    ],
    ['human', 'QUESTION: {question}\n\nCONTEXT:\n{context}\n\nANSWER:'],
  ]);

  const model = getChatModel();
  const msg = await prompt.invoke({ question, context });
  const resp = await model.invoke(msg);

  return {
    answer: resp.content,
    sources: retrieved.map((d) => ({
      source: d.metadata?.source,
      chunk: d.metadata?.chunk,
      preview: (d.pageContent || '').slice(0, 160),
    })),
  };
}

module.exports = { ingestSampleDocs, answerWithRag };
