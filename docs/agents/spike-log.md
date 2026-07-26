# 스파이크(선행검증) 작업 로그

작업 시작/종료 시 아래 형식으로 항목을 **추가**한다 (append-only, 기존 내용 삭제 금지).

```
## YYYY-MM-DD
- 질문: ...
- 방법: 실측 | 문서/사례 조사 | 혼합
- 결과 요약: ...
- 산출물: ...
- 비고: ...
```

## 2026-07-26
- 질문: 재생 동기화 백엔드로 Firebase Realtime Database(RTDB)와 Firestore 중 무엇이 이 프로젝트(저지연 host-follower 동기화 + 구조화된 플레이리스트 쿼리)에 더 적합한가 (`docs/specs/06-mvp-scope-and-tech-stack.md`, `docs/firebase-integration-guide.md`의 미결정 항목).
- 방법: 혼합 — (1) 공식 Firebase 문서·2026년 최신 커뮤니티 비교 아티클 조사, (2) 실제 프로젝트(`feel-music-share`)에 대해 RTDB/Firestore REST API로 write→read round-trip 실측을 시도.
- 결과 요약: 실측은 불가로 판명됨 — Firestore는 REST 호출 시 `PERMISSION_DENIED`/`SERVICE_DISABLED`로 API 자체가 미활성화 상태임을 명확히 확인했고(존재하지 않는 프로젝트명으로 대조 요청 시 다른 오류(`CONSUMER_INVALID`)가 나는 것으로 "프로젝트는 있으나 서비스만 꺼짐"을 검증), RTDB도 두 호스트명 패턴 모두 404로 인스턴스 미생성 정황을 확인했다. 문서 조사 결과, 공식 문서 기준 지연시간은 RTDB "10ms 이하", Firestore "30ms 이하"로 RTDB가 여전히 더 낮게 명시되어 있고, 2026년 최신 커뮤니티 자료들도 "고빈도 소량 갱신·다수 동시 구독자에는 RTDB, 복합 쿼리·오프라인 웹 지원·대규모 확장에는 Firestore"라는 기존 통념과 같은 방향의 결론을 유지하고 있음을 확인했다. 참고용 권고로 "재생 동기화 상태=RTDB, 플레이리스트=Firestore 하이브리드" 또는 "단순화 우선 시 RTDB 단일 구성"을 제시했으나 최종 결정은 아님.
- 산출물: `docs/spikes/firebase-rtdb-vs-firestore.md`
- 비고: 실측 자체는 못 했다 — 콘솔에서 RTDB 또는 Firestore 중 최소 하나를 사용자가 먼저 활성화해야 실제 write→read round-trip 지연시간 실측이 가능하다. 이 조건이 갖춰지면 후속 스파이크로 실측을 이어갈 것을 권고했다(`docs/specs/06-mvp-scope-and-tech-stack.md`의 "후속 조치 제안"과 동일 취지).
