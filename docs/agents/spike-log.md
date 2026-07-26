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

## 2026-07-26 (매칭 신뢰도 가중치/임계값)
- 질문: 혼합(Mixed) 세션 곡 매칭 로직(`apps/mobile/src/services/matching/trackMatcher.ts`)의 가중치(artist 0.45/title 0.35/duration 0.2)와 등급 임계값(high 85/medium 60)이 09문서가 우려한 실패 케이스(동명이곡, 리마스터/라이브, 표기 차이, 피처링, 리믹스/에디트)에 상식적으로 부합하는가(`docs/roadmap.md` "매칭 신뢰도 가중치/임계값 실측 스파이크", `docs/specs/09-cross-platform-mixed-mode.md` 결정 4).
- 방법: 실측 불가로 판명 — Spotify는 PKCE 로그인이 필요해 토큰을 얻을 수 없고, Client Credentials Flow도 실제로 시도해 `invalid_client`(Client Secret 미보유, 400)로 확인했다. YouTube는 목업 검색이 5곡뿐이라 표본 부족. 대신 `trackMatcher.ts`의 순수 함수(정규화/Levenshtein/가중합)를 그대로 복사한 스크립트로 카테고리별 합성 케이스 20건을 만들어 오프라인 벤치마크를 수행했다(문서/사례 조사가 아니라 "코드 자체를 합성 입력으로 실행"한 것이라 실측도 순수 조사도 아닌 절충 — 산출물에 한계를 명시).
- 결과 요약: 핵심 안전장치(동명이곡+아티스트 완전 불일치 → 55점, medium 문턱 아래로 확실히 떨어짐)는 잘 작동함을 확인, 가중치 유지 권장. 반면 (1) 괄호 밖 대시 접미사("- Remastered", "- Live")는 title 정규화가 못 잡아 high여야 할 케이스가 medium으로 떨어짐, (2) 길이차가 작은 라이브 버전(3초)은 "Live" 신호 자체가 정규화로 지워져 실제로는 다른 레코딩인데 high(95점)로 분류되고 안내 배너 임계값(5초)도 안 넘어 사용자에게 아무 신호가 없음, (3) feat./협업 표기 차이는 82점으로 high 문턱(85)에 못 미쳐 medium에 머묾, (4) 아티스트 부분 일치(`includes()`)가 짧은 이름의 우연한 substring에도 0.6을 줘 동명이곡 오탐 위험이 남아있음(단, 사용자 확인 UI가 잔여 리스크 방어선). 결론적으로 "가중치 숫자 자체를 바꿔야 한다"는 강한 근거는 없었고, 정규화 로직 사각지대와 구조적 한계(라이브 신호 손실)가 더 명확한 개선 지점으로 드러났다.
- 산출물: `docs/spikes/matching-confidence-benchmark.md` (계산 스크립트는 세션 스크래치패드, 프로덕션 코드 미수정)
- 비고: 합성 케이스 기반이라 실제 플랫폼의 제목/아티스트 포맷 분포를 반영하지 못한다(예: 대시 접미사가 실제로 얼마나 흔한지 모름). 실측 재개에는 (a) Spotify 실기기 PKCE 로그인으로 accessToken 발급, (b) YouTube Data API v3 키 발급 후 목업 검색을 실제 API로 교체가 선행돼야 한다.
