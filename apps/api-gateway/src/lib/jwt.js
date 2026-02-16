const jwt = require('jsonwebtoken');

function sign(user) {
  return jwt.sign(
    { sub: user.username, roles: user.roles, tenants: user.tenants, depts: user.depts },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '12h' }
  );
}

function verify(token) {
  return jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
}

module.exports = { sign, verify };
