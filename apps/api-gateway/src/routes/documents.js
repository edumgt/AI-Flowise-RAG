const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { nanoid } = require('nanoid');
const { requireAuth } = require('../middleware/auth');
const { allowedScope } = require('../lib/config');
const { uploadFileToS3 } = require('../lib/s3');
const { getQueue } = require('../lib/queue');
const { upsertDocumentVersion, listDocuments, getDocumentById, softDeleteDoc } = require('../lib/registry');
const { QdrantClient } = require('@qdrant/js-client-rest');

const documentsRouter = express.Router();
const uploadDir = path.join(__dirname, '../../data/uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${nanoid(8)}_${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

function collectionName(tenant, dept) {
  return `bankrag__${tenant}__${dept}`;
}

function qdrant() {
  return new QdrantClient({ url: process.env.QDRANT_URL || 'http://qdrant:6333' });
}

/**
 * Upload -> (S3 optional) -> Registry version -> enqueue indexing job
 */
documentsRouter.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  const { tenant, dept, engine } = req.body || {};
  if (!tenant || !dept) return res.status(400).json({ error: 'tenant/dept required' });

  const user = { tenants: req.user.tenants, depts: req.user.depts };
  if (!allowedScope(user, tenant, dept)) return res.status(403).json({ error: 'forbidden' });

  const f = req.file;
  if (!f) return res.status(400).json({ error: 'file required' });

  const jobId = nanoid(12);
  const s3Enabled = String(process.env.S3_ENABLED || 'false') === 'true';

  let s3 = null;
  if (s3Enabled) {
    const key = `${tenant}/${dept}/${jobId}/${path.basename(f.filename)}`;
    s3 = await uploadFileToS3({ key, filePath: f.path, contentType: f.mimetype });
  }

  // Version registry
  const { docId, version, sha256 } = upsertDocumentVersion({
    tenant, dept,
    originalname: f.originalname,
    mimetype: f.mimetype,
    size: f.size,
    localPath: f.path,
    s3,
    requestedBy: req.user.sub,
  });

  const queue = getQueue();
  await queue.add('ingest', {
    jobId,
    tenant,
    dept,
    engine: (engine || 'llamaindex'),
    docId,
    version,
    sha256,
    file: {
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      localPath: f.path,
      s3,
    },
    requestedBy: req.user.sub,
    createdAt: new Date().toISOString(),
  }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });

  return res.json({ ok: true, jobId, queued: true, docId, version, sha256, s3 });
});

/**
 * Job status (shared volume /app/data/jobs)
 */
documentsRouter.get('/jobs', requireAuth, async (req, res) => {
  const jobsDir = path.join(__dirname, '../../data/jobs');
  fs.mkdirSync(jobsDir, { recursive: true });

  const items = fs.readdirSync(jobsDir)
    .filter(x => x.endsWith('.json'))
    .slice(-100)
    .map(fn => JSON.parse(fs.readFileSync(path.join(jobsDir, fn), 'utf-8')))
    .sort((a,b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''));

  res.json({ jobs: items.slice(-30) });
});

/**
 * List documents in registry (per tenant/dept)
 */
documentsRouter.get('/list', requireAuth, async (req, res) => {
  const tenant = req.query.tenant;
  const dept = req.query.dept;
  if (!tenant || !dept) return res.status(400).json({ error: 'tenant/dept required' });

  const user = { tenants: req.user.tenants, depts: req.user.depts };
  if (!allowedScope(user, tenant, dept)) return res.status(403).json({ error: 'forbidden' });

  const docs = listDocuments(tenant, dept);
  res.json({ documents: docs });
});

/**
 * Versions for a document
 */
documentsRouter.get('/versions', requireAuth, async (req, res) => {
  const tenant = req.query.tenant;
  const dept = req.query.dept;
  const docId = req.query.docId;
  if (!tenant || !dept || !docId) return res.status(400).json({ error: 'tenant/dept/docId required' });

  const user = { tenants: req.user.tenants, depts: req.user.depts };
  if (!allowedScope(user, tenant, dept)) return res.status(403).json({ error: 'forbidden' });

  const doc = getDocumentById(tenant, dept, docId);
  if (!doc) return res.status(404).json({ error: 'not found' });
  res.json({ document: doc });
});

/**
 * Soft delete (registry tombstone) + remove points from Qdrant by filter docId
 */
documentsRouter.post('/delete', requireAuth, async (req, res) => {
  const { tenant, dept, docId } = req.body || {};
  if (!tenant || !dept || !docId) return res.status(400).json({ error: 'tenant/dept/docId required' });

  const user = { tenants: req.user.tenants, depts: req.user.depts };
  if (!allowedScope(user, tenant, dept)) return res.status(403).json({ error: 'forbidden' });

  const doc = softDeleteDoc(tenant, dept, docId);
  if (!doc) return res.status(404).json({ error: 'not found' });

  const col = collectionName(tenant, dept);
  const client = qdrant();
  // delete points where payload.docId == docId
  await client.delete(col, {
    filter: {
      must: [{ key: "docId", match: { value: docId } }]
    }
  });

  res.json({ ok: true, deleted: true, docId, collection: col });
});

module.exports = { documentsRouter };
