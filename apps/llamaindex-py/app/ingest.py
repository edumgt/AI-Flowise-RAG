import os
from pathlib import Path

from llama_index.core import SimpleDirectoryReader, VectorStoreIndex, StorageContext
from qdrant_client import QdrantClient
from llama_index.vector_stores.qdrant import QdrantVectorStore

from .settings import configure_llamaindex, qdrant_config

DOCS_DIR = Path(os.getenv("DOCS_DIR", "/docs/sample"))


def ingest() -> dict:
    configure_llamaindex()
    url, collection = qdrant_config()
    client = QdrantClient(url=url)

    vector_store = QdrantVectorStore(client=client, collection_name=collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    documents = SimpleDirectoryReader(str(DOCS_DIR), required_exts=[".md", ".txt"]).load_data()
    index = VectorStoreIndex.from_documents(documents, storage_context=storage_context)

    # Force index build
    _ = index

    return {"ok": True, "docs_dir": str(DOCS_DIR), "docs": len(documents), "collection": collection}


if __name__ == "__main__":
    print(ingest())
