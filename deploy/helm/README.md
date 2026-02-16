# Helm Chart Skeleton

- values.yaml에서 각 컴포넌트 on/off 가능하도록 설계
- Qdrant는 별도 stateful chart(공식/커뮤니티)를 쓰는 것을 권장하고,
  여기서는 외부 URL로 연결하는 형태를 기본으로 합니다.

사용 예:
```bash
helm upgrade --install bankrag ./deploy/helm/bankrag -n bankrag --create-namespace
```
