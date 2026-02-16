const fs = require("fs");
const path = require("path");

const { Document } = require("@langchain/core/documents");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");

const env = require("../lib/env");
const { getEmbeddings } = require("../lib/providers");
const { upsertDocuments } = require("../lib/qdrant");

const SAMPLE_DIR = process.env.DOCS_DIR || "/docs/sample";

function listFiles(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out;
}

async function main() {
  console.log(`[ingest] provider=${env.embeddingProvider}, qdrant=${env.qdrant.url}/${env.qdrant.collection}`);

  const embeddings = getEmbeddings();
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 120,
  });

  const files = listFiles(SAMPLE_DIR).filter((f) => /\.(md|txt)$/i.test(f));
  if (files.length === 0) {
    console.log(`[ingest] no files found in ${SAMPLE_DIR}`);
    return;
  }

  const docs = [];
  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    docs.push(
      new Document({
        pageContent: raw,
        metadata: {
          source: path.relative(process.cwd(), file),
          file,
        },
      })
    );
  }

  const chunks = await splitter.splitDocuments(docs);

  // Attach stable IDs for upsert
  chunks.forEach((d, idx) => {
    d.metadata._id = `${d.metadata.source}::${idx}`;
    d.metadata.chunk = idx;
  });

  const res = await upsertDocuments({ embeddings, documents: chunks });
  console.log(`[ingest] upserted: ${res.count} chunks from ${files.length} files`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
