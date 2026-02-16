# 운영/관측 체크리스트

## 관측(Observability)

- latency: p50/p95 응답시간
- retrieval: top-k hit rate, empty context ratio
- quality: 사용자 피드백, 정답률 샘플링, grounding 여부
- cost: 토큰 사용량, 호출 수, 모델별 비용

## 장애 대응

- Vector DB 장애 시 fallback(캐시/기본답변)
- 인덱싱 파이프라인과 serving 분리
- rate limit, timeout, retry 정책
