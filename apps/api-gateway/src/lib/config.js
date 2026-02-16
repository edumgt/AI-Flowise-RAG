const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

function loadTenants() {
  const p = process.env.TENANTS_FILE || path.join(process.cwd(), "..", "..", "config", "tenants.yaml");
  const raw = fs.readFileSync(p, "utf-8");
  return YAML.parse(raw);
}

function loadUsers() {
  const p = process.env.USERS_FILE || path.join(process.cwd(), "..", "..", "config", "users.json");
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw);
}

module.exports = { loadTenants, loadUsers };
