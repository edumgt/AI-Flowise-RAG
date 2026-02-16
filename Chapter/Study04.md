# Study04 - 관측성(OpenTelemetry) 기초 학습

## 1) 기본 용어
- Trace: 요청 단위 실행흐름
- Span: Trace 내부 개별 작업
- Metric: 수치 시계열(지연시간, 처리량, 오류율)

## 2) 이 저장소의 흐름
Node/Python 서비스가 OTel로 텔레메트리를 보내고,
Collector가 Jaeger/Prometheus로 전달합니다.

## 3) 실습
- `/api/chat` 호출 후 Jaeger에서 trace 확인
- Prometheus에서 요청 수/지연시간 지표 탐색
- Grafana 대시보드에서 서비스별 병목 구간 찾기

## 4) 운영 팁
- trace-id를 감사로그와 함께 저장하면 장애분석 속도 향상
- 샘플링 비율을 환경별(dev/stg/prod)로 다르게 운영
