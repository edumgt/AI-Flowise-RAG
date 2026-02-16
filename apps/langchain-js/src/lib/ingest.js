const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
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

async function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".txt" || ext === ".md" || ext === ".markdown") {
    return fs.readFileSync(filePath, "utf-8");
  }
  if (ext === ".pdf") {
    const buf = fs.readFileSync(filePath);
    const data = await pdfParse(buf);
    return data.text || "";
  }
  if (ext === ".docx") {
    const buf = fs.readFileSync(filePath);
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return value || "";
  }
  throw new Error(`unsupported_file_type: ${ext}`);
}

async function ingestText(text, meta, collection) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 900,
    chunkOverlap: 120,
  });

  const docs = await splitter.createDocuments([text], [meta]);
  const embeddings = await getEmbeddings();
  const inserted = await upsertDocuments({ docs, embeddings, collection });
  return { inserted, chunks: docs.length };
}

async function ingestFileByPath(filePath, collection, extraMeta = {}) {
  const text = await parseFile(filePath);
  const meta = { source: path.basename(filePath), file: filePath, ...extraMeta };
  return ingestText(text, meta, collection);
}

async function ingestSampleDocs() {
  const files = listFiles(SAMPLE_DIR).filter((f) => /\.(md|txt)$/i.test(f));
  let inserted = 0;
  let chunks = 0;

  for (const f of files) {
    const text = fs.readFileSync(f, "utf-8");
    const out = await ingestText(text, { source: path.relative(SAMPLE_DIR, f), file: f }, process.env.QDRANT_COLLECTION);
    inserted += out.inserted;
    chunks += out.chunks;
  }

  return { inserted, chunks, files: files.length };
}

module.exports = { ingestSampleDocs, ingestFileByPath, parseFile, SAMPLE_DIR };
