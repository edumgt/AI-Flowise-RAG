const fs = require("fs");
const path = require("path");
const { Document } = require("@langchain/core/documents");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");

const { getEmbeddings } = require("./providers");
const { upsertDocuments } = require("./qdrant");

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

async function ingestSampleDocs() {
  const embeddings = getEmbeddings();
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 800, chunkOverlap: 120 });

  const files = listFiles(SAMPLE_DIR).filter((f) => /\.(md|txt)$/i.test(f));
  const docs = files.map((file) => new Document({
    pageContent: fs.readFileSync(file, "utf8"),
    metadata: { source: path.relative(process.cwd(), file), file },
  }));

  const chunks = await splitter.splitDocuments(docs);
  chunks.forEach((d, idx) => {
    d.metadata._id = `${d.metadata.source}::${idx}`;
    d.metadata.chunk = idx;
  });

  const res = await upsertDocuments({ embeddings, documents: chunks });
  return { files: files.length, chunks: res.count };
}

module.exports = { ingestSampleDocs, SAMPLE_DIR };
