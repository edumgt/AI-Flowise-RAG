from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

from .ingest import ingest_dir, ingest_file
from .rag import query
from .otel import setup_otel

app = FastAPI(title="llamaindex-rag-api", version="0.2.0")
setup_otel(app)


class ChatReq(BaseModel):
    question: str = Field(..., min_length=1)
    topK: int = Field(5, ge=1, le=20)
    collection: str = Field(..., min_length=3)


class IngestFileReq(BaseModel):
    filePath: str = Field(..., min_length=1)
    collection: str = Field(..., min_length=3)
    metadata: Optional[Dict[str, Any]] = None


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/ingest")
def ingest_endpoint():
    # legacy: sample docs ingestion (default collection)
    return {"ok": True, **ingest_dir()}


@app.post("/ingest/file")
def ingest_file_endpoint(req: IngestFileReq):
    return {"ok": True, **ingest_file(req.filePath, req.collection, req.metadata)}


@app.post("/chat")
def chat_endpoint(req: ChatReq):
    return {"ok": True, **query(req.question, top_k=req.topK, collection=req.collection)}
