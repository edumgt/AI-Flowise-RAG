const fs = require('fs');
const path = require('path');

const AUDIT_DIR = path.join(__dirname, '../../data/audit');
fs.mkdirSync(AUDIT_DIR, { recursive: true });
const AUDIT_FILE = path.join(AUDIT_DIR, 'audit.log');

function auditMiddleware(req, res, next) {
  const start = Date.now();
  const traceparent = req.headers['traceparent'] || null;

  res.on('finish', () => {
    const latencyMs = Date.now() - start;
    const entry = {
      ts: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      latencyMs,
      user: req.user?.sub || null,
      roles: req.user?.roles || null,
      tenant: req.body?.tenant || req.query?.tenant || null,
      dept: req.body?.dept || req.query?.dept || null,
      docId: req.body?.docId || null,
      traceparent,
      ua: req.headers['user-agent'] || null,
    };
    fs.appendFileSync(AUDIT_FILE, JSON.stringify(entry) + '\n', 'utf-8');
  });

  next();
}

module.exports = { auditMiddleware };
