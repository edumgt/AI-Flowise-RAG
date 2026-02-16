from typing import Optional
from llama_index.core import VectorStoreIndex, StorageContext
from qdrant_client import QdrantClient
from llama_index.vector_stores.qdrant import QdrantVectorStore

from .settings import configure_llamaindex, qdrant_config


def _load_index(collection: str) -> VectorStoreIndex:
    configure_llamaindex()
    url, _ = qdrant_config()
    client = QdrantClient(url=url)

    vector_store = QdrantVectorStore(client=client, collection_name=collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    return VectorStoreIndex.from_vector_store(vector_store=vector_store, storage_context=storage_context)


def query(question: str, top_k: int = 5, collection: Optional[str] = None) -> dict:
    _, default_collection = qdrant_config()
    col = collection or default_collection
    index = _load_index(col)

    qe = index.as_query_engine(similarity_top_k=top_k)
    resp = qe.query(question)

    # LlamaIndex response may include source nodes
    sources = []
    try:
        for sn in getattr(resp, "source_nodes", [])[:6]:
            meta = getattr(sn.node, "metadata", {}) or {}
            sources.append({
                "source": meta.get("source") or meta.get("file"),
                "score": getattr(sn, "score", None),
            })
    except Exception:
        pass

    return {"answer": str(resp), "sources": sources, "collection": col}
