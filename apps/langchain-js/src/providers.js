const { ChatOpenAI, OpenAIEmbeddings } = require('@langchain/openai');
const { ChatOllama, OllamaEmbeddings } = require('@langchain/ollama');

function getEmbeddings() {
  const provider = (process.env.EMBEDDING_PROVIDER || 'openai').toLowerCase();

  if (provider === 'ollama') {
    return new OllamaEmbeddings({
      model: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    });
  }

  return new OpenAIEmbeddings({
    model: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small',
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function getChatModel() {
  const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase();

  if (provider === 'ollama') {
    return new ChatOllama({
      model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      temperature: 0.2,
    });
  }

  return new ChatOpenAI({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0.2,
  });
}

module.exports = { getEmbeddings, getChatModel };
