const express = require('express');
const bcrypt = require('bcryptjs');
const { loadUsers } = require('../lib/config');
const { sign, verify } = require('../lib/jwt');

const authRouter = express.Router();

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'missing credentials' });

  const users = loadUsers();
  const u = users.find(x => x.username === username);
  if (!u) return res.status(401).json({ error: 'invalid credentials' });

  // demo: plain text password in users.json (운영에선 해시 저장 권장)
  const ok = (u.password === password) || (await bcrypt.compare(password, u.password).catch(() => false));
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const token = sign(u);
  return res.json({ token });
});

authRouter.get('/me', (req, res) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    const payload = verify(token);
    return res.json({ user: payload.sub, roles: payload.roles, tenants: payload.tenants, depts: payload.depts });
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
});

module.exports = { authRouter };
