const { ChatOpenAI, OpenAIEmbeddings } = require("@langchain/openai");
const { ChatOllama, OllamaEmbeddings } = require("@langchain/ollama");
const env = require("./env");

function getEmbeddings() {
  if (env.embeddingProvider === "ollama") {
    return new OllamaEmbeddings({
      baseUrl: env.ollama.baseUrl,
      model: env.ollama.embedModel,
    });
  }

  // Default: OpenAI
  if (!env.openai.apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai"
    );
  }
  return new OpenAIEmbeddings({
    apiKey: env.openai.apiKey,
    model: env.openai.embedModel,
  });
}

function getChatModel() {
  if (env.llmProvider === "ollama") {
    return new ChatOllama({
      baseUrl: env.ollama.baseUrl,
      model: env.ollama.model,
      temperature: 0.2,
    });
  }

  // Default: OpenAI
  if (!env.openai.apiKey) {
    throw new Error("OPENAI_API_KEY is required when LLM_PROVIDER=openai");
  }
  return new ChatOpenAI({
    apiKey: env.openai.apiKey,
    model: env.openai.model,
    temperature: 0.2,
  });
}

module.exports = { getEmbeddings, getChatModel };
