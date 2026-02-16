import os
from dotenv import load_dotenv

from llama_index.core import Settings


def configure_llamaindex() -> None:
    """Configure global Settings.llm and Settings.embed_model based on env vars."""
    load_dotenv()

    llm_provider = os.getenv("LLM_PROVIDER", "openai").lower()
    emb_provider = os.getenv("EMBEDDING_PROVIDER", "openai").lower()

    if llm_provider == "ollama":
        from llama_index.llms.ollama import Ollama
        Settings.llm = Ollama(
            model=os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
            base_url=os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434"),
            request_timeout=120.0,
        )
    else:
        from llama_index.llms.openai import OpenAI
        Settings.llm = OpenAI(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            api_key=os.getenv("OPENAI_API_KEY"),
        )

    if emb_provider == "ollama":
        from llama_index.embeddings.ollama import OllamaEmbedding
        Settings.embed_model = OllamaEmbedding(
            model_name=os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text"),
            base_url=os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434"),
        )
    else:
        from llama_index.embeddings.openai import OpenAIEmbedding
        Settings.embed_model = OpenAIEmbedding(
            model=os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small"),
            api_key=os.getenv("OPENAI_API_KEY"),
        )


def qdrant_config() -> tuple[str, str]:
    url = os.getenv("QDRANT_URL", "http://qdrant:6333")
    collection = os.getenv("QDRANT_COLLECTION", "kb_docs")
    return url, collection
