# Flowise: BankRAG 운영형 템플릿(가이드)

Flowise는 버전별 export JSON 포맷이 달라질 수 있어,
이 레포는 **(1) 노드 체크리스트 + (2) 예시 템플릿(JSON 샘플)**을 제공합니다.

## 1) 채팅용 RAG Chatflow (권장)
노드 구성(예시):
1. **Qdrant Retriever** (collection: `bankrag__{tenant}__{dept}` 또는 변수로 받기)
2. **Conversational Retrieval QA Chain** (or RetrievalQA)
3. **Chat Model** (OpenAI/Ollama)
4. (옵션) **Prompt Template**: "컨텍스트 밖 추측 금지, 준법/보안 주의"

템플릿 샘플: `flowise/flows/chatflow_bankrag_rag.json`

## 2) 인덱싱(업로드→분할→업서트) Flow (운영형)
실무에서는 업로드 API(게이트웨이) + 워커 방식이 더 흔하지만,
Flowise만으로도 문서 인덱싱 플로우를 만들 수 있습니다.

노드 구성(예시):
1. **Document Loader** (파일/URL/S3 등)
2. **Text Splitter**
3. **Embeddings**
4. **Qdrant Upsert**

템플릿 샘플: `flowise/flows/ingestflow_bankrag_upsert.json`

## 3) Gateway에서 Flowise 호출하기
- Flowise Chatflow Deploy 후 endpoint URL을 확보하고,
- `.env`에 `FLOWISE_CHATFLOW_URL` 설정
- FE에서 engine=flowise 선택 후 사용

> 보안상 Flowise endpoint는 내부망에 두고 Gateway만 외부로 노출하는 구성을 권장합니다.


## Flowise에서 Ollama 사용
- Ollama Base URL: `http://ollama:11434` (Flowise도 같은 docker network)
- LLM: `llama3.1:8b`, Embeddings: `nomic-embed-text`
