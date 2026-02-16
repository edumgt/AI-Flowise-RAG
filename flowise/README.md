# Flowise RAG 파이프라인 예시

이 폴더는 Flowise로 **Ingest(지식베이스 구축)** / **Chat(질의응답)** 플로우를 구성할 때의 가이드를 제공합니다.

## 권장 플로우(가장 단순)

### 1) Document Loader
- "Text File" 또는 "Directory" 로 /docs/sample 경로의 문서를 읽기

### 2) Text Splitter
- RecursiveCharacterTextSplitter
  - chunk size: 800
  - overlap: 120

### 3) Embeddings
- OpenAI Embeddings 또는 Ollama Embeddings

### 4) Vector Store
- Qdrant
  - URL: http://qdrant:6333
  - Collection: kb_docs

### 5) Chat / RAG Chain
- Retriever + Chat Model 을 연결해 "context + question" 프롬프트로 답변

> Flowise는 버전에 따라 노드 이름/옵션이 조금씩 달라질 수 있습니다. 이 레포의 LangChain/LlamaIndex 구현을 기준으로 동일한 파라미터를 맞추면 됩니다.
