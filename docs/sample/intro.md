# RAG 요약

RAG(Retrieval-Augmented Generation)는 LLM이 답변을 생성하기 전에 관련 문서를 검색(retrieve)하여
그 문맥(context)을 함께 제공함으로써, 환각(hallucination)을 줄이고 최신/사내 지식 기반 답변을 가능하게 합니다.

운영 시에는 다음 포인트가 중요합니다.

- 청킹/임베딩 정책을 표준화하고 버전 관리
- 메타데이터(출처, 문서 버전, 권한)를 함께 저장
- Retrieval 품질(TopK, recall), 답변 품질, 비용/지연을 관측
