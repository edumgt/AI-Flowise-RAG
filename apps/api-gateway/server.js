require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { startTracing } = require('../../otel/node/tracing');

startTracing('api-gateway');

const { auditMiddleware } = require('./src/middleware/audit');
const { authRouter } = require('./src/routes/auth');
const { documentsRouter } = require('./src/routes/documents');
const { chatRouter } = require('./src/routes/chat');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '2mb' }));

// audit (logs status/latency/traceparent)
app.use(auditMiddleware);

// Static FE
app.use('/', express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/chat', chatRouter);

app.get('/healthz', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3005;
app.listen(port, () => console.log(`[api-gateway] listening on :${port}`));
