from fastapi import FastAPI
from pydantic import BaseModel, Field

from .ingest import ingest
from .rag import query

app = FastAPI(title="llamaindex-rag-api", version="0.1.0")


class ChatReq(BaseModel):
    question: str = Field(..., min_length=1)
    topK: int = Field(5, ge=1, le=20)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/ingest")
def ingest_endpoint():
    return ingest()


@app.post("/chat")
def chat_endpoint(req: ChatReq):
    return {"ok": True, **query(req.question, top_k=req.topK)}
