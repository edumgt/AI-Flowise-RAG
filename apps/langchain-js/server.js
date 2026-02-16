require('dotenv').config();
const express = require('express');
const { startTracing } = require('../../otel/node/tracing');

startTracing('langchain-js');

const { ingestFileHandler } = require('./src/ingest');
const { chatHandler } = require('./src/chat');

const app = express();
app.use(express.json({ limit: '2mb' }));

app.post('/ingest/file', ingestFileHandler);
app.post('/chat', chatHandler);

app.get('/healthz', (req, res) => res.json({ ok: true }));
app.listen(3001, () => console.log('[langchain-js] :3001'));
