const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { loadUsers } = require("./config");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";

function signToken(user) {
  return jwt.sign(
    {
      sub: user.username,
      roles: user.roles,
      tenant: user.tenant,
      depts: user.depts,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function authRequired(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing_token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user?.roles?.includes(role)) return res.status(403).json({ error: "forbidden" });
    next();
  };
}

function canAccessCollection(user, tenant, dept) {
  if (!user) return false;
  if (user.tenant !== tenant) return false;
  if (user.roles.includes("admin")) return true;
  return (user.depts || []).includes(dept);
}

async function verifyLogin(username, password) {
  const store = loadUsers();
  const u = (store.users || []).find(x => x.username === username);
  if (!u) return null;
  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) return null;
  return { username: u.username, roles: u.roles, tenant: u.tenant, depts: u.depts };
}

module.exports = { signToken, authRequired, requireRole, canAccessCollection, verifyLogin };
