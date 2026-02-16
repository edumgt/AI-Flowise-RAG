from qdrant_client import QdrantClient
from llama_index.core import VectorStoreIndex
from llama_index.vector_stores.qdrant import QdrantVectorStore

from .settings import configure_llamaindex, qdrant_config


def query(question: str, top_k: int = 5) -> dict:
    configure_llamaindex()
    url, collection = qdrant_config()
    client = QdrantClient(url=url)

    vector_store = QdrantVectorStore(client=client, collection_name=collection)
    index = VectorStoreIndex.from_vector_store(vector_store)

    qe = index.as_query_engine(similarity_top_k=top_k)
    resp = qe.query(question)

    # response object... to string
    text = str(resp)

    # Attempt to surface sources
    sources = []
    if hasattr(resp, "source_nodes") and resp.source_nodes:
        for i, n in enumerate(resp.source_nodes):
            meta = getattr(n.node, "metadata", {}) or {}
            sources.append({
                "ref": f"#{i+1}",
                "score": getattr(n, "score", None),
                "source": meta.get("file_path") or meta.get("file_name") or meta.get("source") or "unknown",
            })

    return {"answer": text, "sources": sources}
