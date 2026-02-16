const dotenv = require("dotenv");

dotenv.config();

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

module.exports = {
  port: Number(process.env.PORT || 3001),

  llmProvider: (process.env.LLM_PROVIDER || "openai").toLowerCase(),
  embeddingProvider: (process.env.EMBEDDING_PROVIDER || "openai").toLowerCase(),

  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    embedModel: process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small",
  },

  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || "http://host.docker.internal:11434",
    model: process.env.OLLAMA_MODEL || "llama3.1:8b",
    embedModel: process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text",
  },

  qdrant: {
    url: process.env.QDRANT_URL || "http://qdrant:6333",
    collection: process.env.QDRANT_COLLECTION || "kb_docs",
  },

  // Optional: force env presence in production
  required,
};
