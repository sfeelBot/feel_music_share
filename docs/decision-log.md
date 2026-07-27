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

- [x] 사용자: Firebase 콘솔 → `feel-music-share` 프로젝트 → Build → Realtime Database → "데이터베이스 만들기"로 활성화. (완료, 2026-07-27)
- [x] 활성화 시 나오는 데이터베이스 URL 공유 — `https://feel-music-share-default-rtdb.asia-southeast1.firebasedatabase.app/`(리전: `asia-southeast1`). RTDB는 기본 리전(`us-central1`)이 아닌 인스턴스라 `@react-native-firebase/database`의 `getDatabase(app, url)`에 이 URL을 명시적으로 전달해야 한다(공식 문서 — 비기본 리전 인스턴스는 URL 생략 시 연결 실패). `google-services.json` 재다운로드 없이도 코드에서 이 URL을 직접 넘기는 방식으로 진행(2026-07-27 리더 판단, 아래 참고).
- [x] 리더/구현 에이전트: `@react-native-firebase/app` + `@react-native-firebase/database` 설치, `firebaseClient.ts` STUB을 실제 초기화 코드로 교체(콘솔 활성화 전 코드 준비, 2026-07-27 완료, 커밋 `58317c2`, Round 17 검증 통과).
- [ ] 이후 여러 라운드에 걸쳐 `sessionService.ts`(현재 인메모리 목업)의 읽기/쓰기 로직을 RTDB 호출로 단계적 교체 — RTDB 활성화 완료로 착수 가능해짐.
- [ ] DB 활성화 후 spiker 후속 스파이크로 실제 write→read round-trip 지연시간 실측(참고용 권고가 실측으로 검증되는지 확인) — 이제 가능.

### 관련 문서

- [`docs/spikes/firebase-rtdb-vs-firestore.md`](spikes/firebase-rtdb-vs-firestore.md) — 조사 근거 전체
- [`docs/firebase-integration-guide.md`](firebase-integration-guide.md) — 연동 진행 상태·다음 단계
- [`docs/decisions-needed.md`](decisions-needed.md) — 이 결정으로 해소된 대기 항목
- `docs/specs/05-sync-architecture.md`, `docs/specs/06-mvp-scope-and-tech-stack.md`

---

## 2026-07-27 — RTDB 보안 규칙 인증 방식 + 호스트 마이그레이션 선출 규칙

**참석**: 사용자(제품 오너), 리더(오케스트레이터)
**안건**: `docs/specs/10-rtdb-schema-and-security-rules.md`(planner 산출물)가 "결정 아님"으로 남겨둔 인증 방식 선택 + `docs/specs/04-playlist.md`가 2026-07-25부터 미확정으로 남겨둔 호스트 마이그레이션 선출 규칙, 두 건을 함께 확정.

### 배경

- `sessionService.ts`를 실제 RTDB 호출로 교체하기 전에 반드시 정해야 하는 두 가지 결정 사항이 planner의 RTDB 스키마 설계 라운드에서 확인됐다(RTDB 트리 스키마 자체는 이미 설계 완료, `docs/specs/10-rtdb-schema-and-security-rules.md`).
- 인증 방식: Cloud Functions가 없는 이 아키텍처에서는 RTDB 보안 규칙이 사실상 유일한 서버측 검증 계층이다. `auth` 객체 없이는 "이 쓰기가 진짜 방장/본인이 보낸 것인지" 규칙 언어로 검증할 방법이 원천적으로 없다는 게 설계 문서의 핵심 논거.
- 호스트 마이그레이션 선출 규칙: "승계 후 기존 관리자 목록이 유지된다"는 이미 2026-07-25에 확정됐으나, "누가" 승계되는지 자체는 미정 상태로 남아있었고, RTDB 로드맵 4라운드(참여자/역할)가 이 규칙에 의존해 다시 필요해졌다.

### 논의 내용

1. **인증 방식**: 시나리오 A(익명 인증)는 04문서가 이미 확정한 3단계 권한 체계(방장만 관리자 임명 등)를 서버 측에서 실제로 강제할 수 있는 유일한 방법. 시나리오 B(무인증)는 추가 비용이 없지만 방장 사칭·타인 매칭 상태 조작을 막을 수 없어 권한 체계가 클라이언트 신뢰 수준에 머무른다. "장거리 연인·친구 소규모 세션"이라는 이 앱의 실사용 맥락상 B도 당장 큰 사고로 이어질 가능성은 낮다는 게 planner의 참고 의견이었으나, 04문서가 이미 명시적으로 확정한 권한 체계를 실질적으로 무력화하는 선택이기도 하다.
2. **호스트 마이그레이션 선출 규칙**: 기존 관리자 우선 승계 vs 참여 순서 최고참 승계 두 옵션을 비교. 관리자는 방장이 신뢰해 임명한 사람이라는 점에서 "이미 검증된 신뢰"를 우선하는 쪽이 더 안전하다는 논리로 관리자 우선 승계 쪽에 무게가 실림.

### 결정

1. **RTDB 보안 규칙 인증 방식: 시나리오 A(Firebase Auth 익명 인증) 채택.** `@react-native-firebase/auth` 신규 설치, `participantId`를 `auth.uid`로 통일하는 설계 변경을 포함해 진행한다.
2. **호스트 마이그레이션 선출 규칙: 기존 관리자 우선 승계.** 세부 타이브레이크(관리자가 여러 명일 때 누가, 관리자가 없을 때 대체 규칙)는 사용자 결정 범위에 포함되지 않아 리더가 합리적 기본값을 제안해 `04-playlist.md`에 반영: **관리자가 여러 명이면 가장 먼저 임명된 관리자**, **관리자가 없으면 세션 참여 순서 기준 최고참**. 이 기본값은 확정 필요 항목이 아니라 구현 단계에서 조정 가능한 세부 규칙으로 취급한다.

### 후속 조치

- [x] `docs/specs/04-playlist.md` "호스트 마이그레이션 시 권한 승계" 절에 선출 규칙 확정 사실 반영, "확인 필요" 목록에서 해당 항목 해소 처리.
- [x] `docs/decisions-needed.md`에서 두 항목(인증 방식, 선출 규칙) 삭제.
- [ ] 구현 라운드: `@react-native-firebase/auth` 설치, 앱 시작 시 `signInAnonymously()` 호출 배선, `participantId` 생성 방식을 `auth.uid` 기준으로 전환(`utils/id.ts`/`ParticipantInfo` 소비 화면 영향 범위 조사 포함).
- [ ] `docs/specs/10-rtdb-schema-and-security-rules.md`의 시나리오 A 규칙 JSON을 기준으로 실제 RTDB 규칙 배포(Firebase 콘솔 또는 `firebase deploy --only database` — 아직 Firebase CLI 프로젝트 초기화가 안 되어 있다면 그것도 필요).
- [ ] 4라운드(참여자/역할) 구현 시 위 선출 규칙(관리자 우선, 타이브레이크 기본값)을 반영.

### 관련 문서

- [`docs/specs/10-rtdb-schema-and-security-rules.md`](specs/10-rtdb-schema-and-security-rules.md) — 인증 시나리오 A/B 비교 전체
- [`docs/specs/04-playlist.md`](specs/04-playlist.md) — 권한 체계, 호스트 마이그레이션 선출 규칙
- [`docs/decisions-needed.md`](decisions-needed.md) — 이 결정으로 해소된 대기 항목

---

## 2026-07-27 — 개발 우선순위를 YouTube 중심으로 전환

**참석**: 사용자(제품 오너), 리더(오케스트레이터)
**안건**: Spotify와 YouTube 둘 다 지원한다는 기존 MVP 범위 결정(`docs/specs/06-mvp-scope-and-tech-stack.md`)은 유지하되, **앞으로의 개발 작업 순서와 UI 기본값을 YouTube 우선으로 바꿀지** 결정.

### 배경

- 이번 세션에서 Spotify 쪽 API 제약이 반복적으로 발목을 잡았다: (1) Development Mode 앱의 카탈로그 엔드포인트 접근 제한(진단이 한 차례 바뀌었으나 결국 `limit` 파라미터 축소 문제로 확인), (2) Extended Quota Mode는 2025년 3월 기준 "정식 등록 사업자 + MAU 25만 이상" 요건이라 개인 프로젝트로는 사실상 신청 자격 자체가 없음(`docs/decisions-needed.md` 참고).
- 반면 YouTube Data API v3는 OAuth 없이 API 키 하나로 검색이 바로 동작하고(2026-07-27 실연동 완료, 커밋 `07d57ac`), 쿼터 제약은 있지만 계정 심사 같은 구조적 장벽이 없다.
- AskUserQuestion으로 변경 범위와 사유를 명확히 확인: (a) 범위는 "개발 우선순위를 YouTube로"(UI 기본값 변경 + 향후 작업 순서 조정, Spotify는 유지하되 적극 개선은 보류) — Spotify 지원 자체를 축소/제거하는 것은 **아님**. (b) 사유는 확인대로 Spotify API 제약 때문.

### 결정

**개발 우선순위를 YouTube 중심으로 전환한다.** 구체적으로:
1. 세션 생성 화면(`CreateSessionScreen.tsx`)의 서비스 선택 기본값을 Spotify → **YouTube**로 변경.
2. 앞으로 신규 기능/버그 수정 등 실제 작업 순서는 YouTube 관련 항목을 우선 배치.
3. Spotify 지원 자체는 유지한다 — 기존 기능을 제거하거나 혼합 모드에서 배제하지 않는다. 다만 Spotify 전용 개선(예: Extended Quota Mode 신청 등)은 적극적으로 진행하지 않고 필요성이 명확해질 때(예: 실사용 중 실제로 막히는 지점이 재확인될 때) 재검토한다.
4. MVP 범위 자체(Spotify+YouTube+혼합 3종 세션 유형 모두 지원)는 바뀌지 않는다 — 이건 "우선순위/기본값" 조정이지 스코프 축소가 아니다.

### 후속 조치

- [ ] `CreateSessionScreen.tsx` 서비스 선택 기본값 및 라디오 버튼 순서를 YouTube 우선으로 변경(구현 라운드 진행 예정).
- [ ] `docs/roadmap.md` "다음 순서" 절에 YouTube 우선순위 반영.
- [x] 이 결정 자체를 회의록으로 기록(이 항목).

### 관련 문서

- `docs/decisions-needed.md` — Spotify Extended Quota Mode 항목(적극 진행 보류로 재해석)
- `docs/external-service-setup-guide.md` — YouTube API 설정 완료 기록
- `docs/specs/06-mvp-scope-and-tech-stack.md` — 원래 MVP 범위 결정(Spotify+YouTube 동시 지원, 바뀌지 않음)

---

## 2026-07-28 — Spotify 지원 완전 제거 + 혼합(Mixed) 세션 모드 제거 (MVP 범위 재정의)

**참석**: 사용자(제품 오너), 리더(오케스트레이터)
**안건**: 위 2026-07-27 결정("개발 우선순위를 YouTube로 전환하되 Spotify 지원 자체는 유지")을 **번복**하고, Spotify 관련 코드를 전부 삭제해 YouTube 단일 플랫폼 앱으로 재편할지 결정.

### 배경

- 2026-07-27 결정 이후에도 Spotify API 제약이 계속 발목을 잡았다(Extended Quota Mode는 개인 프로젝트로 사실상 신청 불가라는 사실이 재확인됨, `docs/decisions-needed.md`).
- 사용자가 "spotfy 관련된 부분을 모두 삭제한 버젼을 만들어주고 그걸 main으로 해줘"라고 명시적으로 요청 — 어제(2026-07-27)의 "유지" 결정을 뒤집는 것임을 리더가 먼저 인지하고 사용자에게 확인.
- 혼합(Mixed) 세션 모드는 "서로 다른 플랫폼 참여자를 매칭"하는 것이 핵심 개념이라, Spotify가 완전히 빠지면 개념 자체가 성립하지 않는다는 점을 리더가 짚고 AskUserQuestion으로 처리 방향을 확인.

### 논의 내용

1. **Spotify 삭제 범위**: 전면 삭제로 확정 — OAuth 로그인, Web API 연동(검색/재생 제어), Spotify 전용 세션 유형, 관련 UI(`SpotifyConnectScreen`, Premium 안내 모달 등)/타입/의존성(`react-native-app-auth`)/테스트 전부 대상.
2. **혼합 모드 처리**: 두 가지 선택지 비교 — (a) 혼합 모드도 함께 삭제(YouTube 단일 플랫폼 앱으로 재편, 세션 생성 시 서비스 선택지 자체가 사라짐), (b) 코드/타입은 남기되 사실상 작동 불가 상태로 방치. (b)는 죽은 코드가 그대로 남아 혼란을 준다는 점에서 불리하다고 판단.
3. **배포 방식**: 삭제 작업 전 현재 상태(Spotify+혼합 모드 포함)를 별도 백업 브랜치로 보존한 뒤, 삭제 작업은 `main`에 새 커밋으로 쌓는 방식(히스토리 리라이트 없음)으로 진행하기로 확인. 완료 후 origin까지 push하기로 확인.

### 결정

1. **Spotify 지원을 완전히 제거한다.** OAuth/Web API 연동, Spotify 전용 세션, 관련 UI/타입/의존성 전부 삭제 대상.
2. **혼합(Mixed) 세션 모드도 함께 제거한다.** 앱은 YouTube 단일 플랫폼으로 재편된다 — 세션 생성 시 서비스 선택 단계 자체가 없어진다.
3. **삭제 전 상태를 `spotify-mixed-legacy` 브랜치로 보존**(로컬+origin 둘 다 push 완료, 커밋 `477317a` 지점). 필요 시 이 브랜치에서 언제든 되돌아볼 수 있다.
4. **삭제 작업은 `main`에 새 커밋으로 진행**(force-push/히스토리 리라이트 없음), 완료·검증 후 origin/main에 push한다.
5. 이 결정으로 `docs/specs/06-mvp-scope-and-tech-stack.md`(Spotify+YouTube 동시 지원 결정), `docs/specs/02-spotify-integration.md`, `docs/specs/09-cross-platform-mixed-mode.md` 등 다수의 기존 spec 문서가 **더 이상 현재 앱 상태를 반영하지 않게 된다** — 삭제하지 않고 "과거 결정 이력"으로 남기되, 각 문서 상단에 이 결정으로 대체됐다는 안내를 추가한다(문서 자체를 지우면 왜 이런 구조였는지의 맥락이 사라지므로 보존).

### 후속 조치

- [ ] planner에게 정확한 삭제 범위(파일 단위) + 데이터 모델(`MusicService` 타입 등) 변경 계획 수립 위임.
- [ ] 관련 spec 문서(02, 06, 09 등)에 "이 결정으로 대체됨" 안내 추가.
- [ ] implementer에게 단계적 삭제 작업 위임(규모가 크므로 여러 라운드로 분할 예상).
- [ ] designer에게 단순화된 화면 흐름(서비스 선택 단계 제거) 검토 위임(필요 시).
- [ ] verifier에게 최종 검증 위임(Docker+KVM, "주요 기능 변경"급).
- [ ] 전부 완료 후 `origin/main`에 push.

### 관련 문서

- 위 "2026-07-27 — 개발 우선순위를 YouTube 중심으로 전환" 항목(이번 결정으로 대체됨 — 삭제하지 않고 이력으로 유지)
- `docs/specs/02-spotify-integration.md`, `docs/specs/06-mvp-scope-and-tech-stack.md`, `docs/specs/09-cross-platform-mixed-mode.md` — 이번 결정으로 대체된 과거 spec

---

## 2026-07-28 — 로그인 방식: 간편 로그인(Google + Kakao 등) 채택

**참석**: 사용자(제품 오너), 리더(오케스트레이터)
**안건**: 위 "Spotify 지원 완전 제거" 결정으로 비어버린 로그인 수단을 무엇으로 채울지 — `docs/specs/11-youtube-only-migration-plan.md` 5절이 제시한 3가지 선택지(닉네임만/익명인증+프로필화면/실제 OAuth) 중 결정.

### 결정

**실제 소셜 로그인(간편 로그인) 방식을 채택한다 — Google, Kakao 등.** 5절의 선택지 (c)에 해당. 기기를 바꿔도 같은 계정으로 로그인하면 신원이 유지되고, "진짜 로그인"이라는 사용자 기대에 부합한다는 게 (c)를 고를 때의 장점으로 이미 정리돼 있었다.

### 후속 조치 — 착수 전 기술 조사 필요 (중요)

- Google 로그인은 Firebase Authentication이 기본 제공하는 표준 제공자라 비교적 단순하다(`@react-native-google-signin/google-signin` + Firebase `GoogleAuthProvider`, Google Cloud Console OAuth 클라이언트 등록 + Android SHA-1 지문 등록 필요).
- **Kakao 로그인은 Firebase Authentication의 기본 제공 제공자 목록에 없다** — Google/Apple/Facebook/Twitter/GitHub/Microsoft/Yahoo/Play Games/Game Center + 이메일/전화번호/익명만 기본 지원되고, Kakao는 별도 연동이 필요하다(예: Kakao SDK로 발급받은 토큰을 Firebase Custom Token으로 교환하는 서버 로직 — 이 프로젝트가 아직 Cloud Functions를 도입하지 않았다는 점과 직접 충돌할 가능성이 있음, 또는 Kakao가 OIDC(OpenID Connect)를 지원한다면 Firebase의 범용 OIDC 제공자 설정으로 우회 가능할 수도 있음 — **정확한 현재(2026년 기준) 연동 방법은 확정되지 않았고 조사가 필요하다**).
- 따라서 실제 구현(migration 로드맵의 "라운드 3")에 들어가기 전에, spiker에게 Kakao+Firebase Auth 연동의 정확한 현재 방법(Cloud Functions 필요 여부 포함)을 조사시킨 뒤 착수한다. Google 로그인 자체는 이 조사와 무관하게 표준 경로라 병행 진행 가능.
- 데이터 모델(라운드 1)·화면 UI 단순화(라운드 2)는 이 결정과 무관하게 이미 착수 가능 상태 그대로 유지.

### 관련 문서

- `docs/specs/11-youtube-only-migration-plan.md` 5절 — 원래 제시된 3가지 선택지
- `docs/decisions-needed.md` — 이 결정으로 해소된 항목 A
