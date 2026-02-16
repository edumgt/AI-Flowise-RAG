const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REG_DIR = path.join(__dirname, '../../data/registry');
fs.mkdirSync(REG_DIR, { recursive: true });

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function registryKey(tenant, dept) {
  return path.join(REG_DIR, `${tenant}__${dept}.json`);
}

function loadRegistry(tenant, dept) {
  const p = registryKey(tenant, dept);
  if (!fs.existsSync(p)) return { tenant, dept, documents: [] };
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function saveRegistry(tenant, dept, reg) {
  const p = registryKey(tenant, dept);
  fs.writeFileSync(p, JSON.stringify(reg, null, 2), 'utf-8');
}

function upsertDocumentVersion({ tenant, dept, originalname, mimetype, size, localPath, s3, requestedBy }) {
  const reg = loadRegistry(tenant, dept);

  // same display name considered same document
  let doc = reg.documents.find(d => d.name === originalname);
  if (!doc) {
    doc = {
      docId: crypto.randomUUID(),
      name: originalname,
      createdAt: new Date().toISOString(),
      deleted: false,
      versions: []
    };
    reg.documents.push(doc);
  }

  const nextVersion = (doc.versions.at(-1)?.version || 0) + 1;
  const sha256 = sha256File(localPath);

  const ver = {
    version: nextVersion,
    uploadedAt: new Date().toISOString(),
    mimetype,
    size,
    sha256,
    localPath,
    s3,
    requestedBy
  };
  doc.versions.push(ver);
  doc.updatedAt = ver.uploadedAt;
  doc.deleted = false;

  saveRegistry(tenant, dept, reg);
  return { docId: doc.docId, version: nextVersion, sha256 };
}

function listDocuments(tenant, dept) {
  const reg = loadRegistry(tenant, dept);
  return reg.documents;
}

function getDocumentById(tenant, dept, docId) {
  const reg = loadRegistry(tenant, dept);
  return reg.documents.find(d => d.docId === docId) || null;
}

function softDeleteDoc(tenant, dept, docId) {
  const reg = loadRegistry(tenant, dept);
  const doc = reg.documents.find(d => d.docId === docId);
  if (!doc) return null;
  doc.deleted = true;
  doc.deletedAt = new Date().toISOString();
  saveRegistry(tenant, dept, reg);
  return doc;
}

module.exports = {
  upsertDocumentVersion,
  listDocuments,
  getDocumentById,
  softDeleteDoc,
};
