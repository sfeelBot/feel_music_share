# 결정 회의록

> 이 파일은 프로젝트의 주요 기술/제품 결정을 회의록 형식으로 기록하는 **append-only 로그**입니다 — 새 결정이 나올 때마다 아래에 새 항목을 추가합니다(기존 항목 수정/삭제 없음). 결정에 이르기까지의 상세 조사 근거(스파이크, 실측 데이터 등)는 각 항목에서 관련 문서로 링크합니다. `docs/decisions-needed.md`(대기 중인 결정 목록, 실제 결정이 나면 항목이 삭제됨)와는 성격이 다릅니다 — 그쪽은 "아직 결정 안 된 것의 살아있는 목록"이고, 이 파일은 "이미 내려진 결정의 영구 기록"입니다.

---

## 2026-07-27 — Firebase 실시간 동기화 백엔드: Realtime Database vs Firestore

**참석**: 사용자(제품 오너), 리더(오케스트레이터)
**안건**: `docs/specs/06-mvp-scope-and-tech-stack.md`가 "Firebase 확정, RTDB/Firestore는 미정"으로 남겨둔 항목의 최종 결정

### 배경

- 이 앱의 핵심 비기능 요구사항은 **저지연 실시간 재생 동기화**(`CLAUDE.md`). `docs/specs/05-sync-architecture.md`의 "서버 기준 시계 + host-follower 모델"에서, 참여자 전원이 재생 상태(현재 곡/서버기준 시각/재생여부)를 실시간 리스너로 상시 구독하는 구조다 — 즉 "적은 쓰기 + 매우 많은 동시 읽기(구독)"라는 접근 패턴.
- 2026-07-26 spiker 서브에이전트가 실측을 시도했으나, 이 시점엔 프로젝트에 RTDB/Firestore 둘 다 콘솔에서 활성화되어 있지 않아 실제 지연시간 실측은 불가능했다(REST API 호출로 `SERVICE_DISABLED`/404 확인). 대신 공식 문서·2026년 최신 커뮤니티 자료 조사로 대체 — 상세: [`docs/spikes/firebase-rtdb-vs-firestore.md`](spikes/firebase-rtdb-vs-firestore.md).

### 논의 내용

1. **지연시간**: 공식 문서 기준 RTDB ≤10ms, Firestore ≤30ms — RTDB가 이 앱의 최우선순위(저지연)에 더 직접 부합.
2. **접근 패턴 적합성**: 재생 동기화 상태(단순 키-값, 고빈도 소량 갱신, 다수 동시 구독)는 RTDB가 원래 최적화된 사용 사례. 플레이리스트(정렬/필터 등 구조화된 쿼리 필요)는 Firestore가 유리하나, 이 앱은 현재 플레이리스트 정렬/검색을 클라이언트 측(인메모리)에서 처리하고 있어 이 우위가 결정적이지 않음.
3. **비용 구조**: RTDB는 읽기/쓰기 연산 자체는 무료(저장 용량+대역폭만 과금, $5/GB 저장·$1/GB 다운로드), Firestore는 읽기/쓰기/삭제 연산 건별 과금($0.06/10만 읽기 등). 이 앱처럼 "참여자 전원이 실시간 구독을 계속 유지"하는 패턴은 Firestore의 읽기 과금 모델에서 세션이 활발해질수록 비용이 빠르게 누적될 여지가 있는 반면, RTDB는 읽기 자체가 무료라 이 패턴에 구조적으로 유리.
4. **대안으로 하이브리드(재생 상태=RTDB, 플레이리스트=Firestore)도 검토했으나**, 초기 설정 복잡도(두 서비스 동시 활성화, 두 SDK 설치)가 늘어나는 트레이드오프가 있어 MVP 단계에서는 과도하다고 판단.
5. 실측 데이터가 아직 없다는 한계는 인지 — 콘솔에서 RTDB를 활성화하면 후속 스파이크로 실제 리전 기준 지연시간 실측을 진행할 수 있음.

### 결정

**Realtime Database(RTDB) 단일 구성으로 확정한다.**

- 재생 동기화 상태(`SessionState.playback`)는 RTDB로 실시간 브로드캐스트.
- 플레이리스트/참여자/세션 메타데이터도 우선 RTDB 단일 트리 구조로 시작한다(하이브리드는 채택하지 않음 — 설정 단순성 우선). 구조화된 쿼리가 실제로 병목이 되면 그때 Firestore 도입을 재검토할 수 있다(지금 결정을 뒤집는 게 아니라, 필요성이 실증되면 별도 결정 사항으로 다시 논의).

### 후속 조치

- [ ] 사용자: Firebase 콘솔 → `feel-music-share` 프로젝트 → Build → Realtime Database → "데이터베이스 만들기"로 활성화.
- [ ] 활성화 시 나오는 데이터베이스 URL(리전 정보 포함) 공유 — `google-services.json` 재다운로드가 필요할 수 있음(현재 파일에는 RTDB URL이 없음, DB 생성 후 갱신됨).
- [ ] 리더/구현 에이전트: `@react-native-firebase/app` + `@react-native-firebase/database` 설치, `firebaseClient.ts` STUB을 실제 초기화 코드로 교체(콘솔 활성화 여부와 무관하게 코드 준비는 병행 진행 — 2026-07-27 착수).
- [ ] 이후 여러 라운드에 걸쳐 `sessionService.ts`(현재 인메모리 목업)의 읽기/쓰기 로직을 RTDB 호출로 단계적 교체.
- [ ] DB 활성화 후 spiker 후속 스파이크로 실제 write→read round-trip 지연시간 실측(참고용 권고가 실측으로 검증되는지 확인).

### 관련 문서

- [`docs/spikes/firebase-rtdb-vs-firestore.md`](spikes/firebase-rtdb-vs-firestore.md) — 조사 근거 전체
- [`docs/firebase-integration-guide.md`](firebase-integration-guide.md) — 연동 진행 상태·다음 단계
- [`docs/decisions-needed.md`](decisions-needed.md) — 이 결정으로 해소된 대기 항목
- `docs/specs/05-sync-architecture.md`, `docs/specs/06-mvp-scope-and-tech-stack.md`
