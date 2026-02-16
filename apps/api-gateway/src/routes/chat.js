const express = require('express');
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');
const { allowedScope } = require('../lib/config');

const chatRouter = express.Router();

function collectionName(tenant, dept) {
  return `bankrag__${tenant}__${dept}`;
}

chatRouter.post('/', requireAuth, async (req, res) => {
  const { question, tenant, dept, engine, topK } = req.body || {};
  if (!question || !tenant || !dept) return res.status(400).json({ error: 'question/tenant/dept required' });

  const user = { tenants: req.user.tenants, depts: req.user.depts };
  if (!allowedScope(user, tenant, dept)) return res.status(403).json({ error: 'forbidden' });

  const col = collectionName(tenant, dept);
  const e = (engine || 'llamaindex').toLowerCase();

  try {
    if (e === 'langchain') {
      const r = await axios.post(`${process.env.LANGCHAIN_URL}/chat`, { question, collection: col, topK: topK || 5 });
      return res.json(r.data);
    }
    if (e === 'flowise') {
      // Flowise: typically you call a deployed chatflow endpoint.
      // Here we proxy to a placeholder endpoint; you should set FLOWISE_CHATFLOW_URL in prod.
      const url = process.env.FLOWISE_CHATFLOW_URL;
      if (!url) return res.status(400).json({ error: 'FLOWISE_CHATFLOW_URL not set' });
      const r = await axios.post(url, { question, collection: col, topK: topK || 5 });
      return res.json(r.data);
    }
    // default llamaindex
    const r = await axios.post(`${process.env.LLAINDEX_URL}/chat`, { question, collection: col, topK: topK || 5 });
    return res.json(r.data);
  } catch (e) {
    return res.status(500).json({ error: 'downstream error', detail: e?.response?.data || String(e) });
  }
});

module.exports = { chatRouter };
