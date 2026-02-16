const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

function loadUsers() {
  const p = path.join(__dirname, '../../../config/users.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8')).users;
}

function loadTenants() {
  const p = path.join(__dirname, '../../../config/tenants.yaml');
  return YAML.parse(fs.readFileSync(p, 'utf-8')).tenants;
}

function allowedScope(user, tenant, dept) {
  const tOk = user.tenants.includes('*') || user.tenants.includes(tenant);
  const dOk = user.depts.includes('*') || user.depts.includes(dept);
  return tOk && dOk;
}

module.exports = { loadUsers, loadTenants, allowedScope };
