require('dotenv').config();
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { Worker } = require('bullmq');
const { startTracing } = require('../../otel/node/tracing');

startTracing('indexing-worker');

const connection = { url: process.env.REDIS_URL || 'redis://redis:6379' };

const JOBS_DIR = process.env.JOBS_DIR || '/app/data/jobs';
fs.mkdirSync(JOBS_DIR, { recursive: true });

function collectionName(tenant, dept) {
  return `bankrag__${tenant}__${dept}`;
}

function writeStatus(jobId, payload) {
  const p = path.join(JOBS_DIR, `${jobId}.json`);
  fs.writeFileSync(p, JSON.stringify(payload, null, 2), 'utf-8');
}

async function ingestToEngine(engine, jobData) {
  const { tenant, dept, file } = jobData;
  const collection = collectionName(tenant, dept);

  const payload = {
    collection,
    filePath: file.localPath,
    fileName: file.originalname,
    mimeType: file.mimetype,
    // versioning metadata (optional)
    docId: jobData.docId,
    version: jobData.version,
    sha256: jobData.sha256,
    tenant,
    dept
  };

  const e = (engine || 'llamaindex').toLowerCase();
  if (e === 'langchain') {
    return axios.post(`${process.env.LANGCHAIN_URL}/ingest/file`, payload).then(r => r.data);
  }
  // flowise ingestion is normally via UI nodes; keep worker for lc/li engines
  return axios.post(`${process.env.LLAINDEX_URL}/ingest/file`, payload).then(r => r.data);
}

const worker = new Worker('indexing', async (job) => {
  const data = job.data;
  const statusBase = {
    jobId: data.jobId,
    tenant: data.tenant,
    dept: data.dept,
    engine: data.engine,
    file: data.file,
    docId: data.docId,
    version: data.version,
    sha256: data.sha256,
    status: 'running',
    updatedAt: new Date().toISOString()
  };
  writeStatus(data.jobId, statusBase);

  try {
    const result = await ingestToEngine(data.engine, data);
    writeStatus(data.jobId, { ...statusBase, status: 'done', result, updatedAt: new Date().toISOString() });
    return result;
  } catch (e) {
    const err = e?.response?.data ? JSON.stringify(e.response.data) : String(e);
    writeStatus(data.jobId, { ...statusBase, status: 'failed', error: err, updatedAt: new Date().toISOString() });
    throw e;
  }
}, { connection });

worker.on('completed', (job) => console.log('[worker] completed', job.id));
worker.on('failed', (job, err) => console.log('[worker] failed', job?.id, err?.message));
console.log('[indexing-worker] running');
