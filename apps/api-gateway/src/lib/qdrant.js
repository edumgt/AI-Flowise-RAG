function sanitizeId(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function collectionName(tenant, dept) {
  const t = sanitizeId(tenant);
  const d = sanitizeId(dept);
  return `bankrag__${t}__${d}`;
}

module.exports = { sanitizeId, collectionName };
