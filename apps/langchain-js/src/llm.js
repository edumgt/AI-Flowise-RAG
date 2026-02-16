const { ChatOpenAI, OpenAIEmbeddings } = require('@langchain/openai');
const { ChatOllama, OllamaEmbeddings } = require('@langchain/community');

function isOllama() {
  return (process.env.LLM_PROVIDER || 'ollama').toLowerCase() === 'ollama';
}

function getEmbeddings() {
  if (isOllama()) {
    return new OllamaEmbeddings({
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://ollama:11434',
      model: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
    });
  }
  return new OpenAIEmbeddings({ model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large' });
}

function getChatModel() {
  if (isOllama()) {
    return new ChatOllama({
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://ollama:11434',
      model: process.env.OLLAMA_LLM_MODEL || 'llama3.1:8b',
      temperature: 0.2,
    });
  }
  return new ChatOpenAI({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.2 });
}

module.exports = { getEmbeddings, getChatModel, isOllama };
