# 기능 로드맵 (화면별 현황 + 진행 순서)

> 이 파일은 **살아있는(live) 문서**입니다 — `docs/decisions-needed.md`/`docs/agents/leader-log.md`의 "현재 상황 요약" 절과 같은 성격으로, append-only가 아니라 **상황이 바뀔 때마다 해당 항목을 직접 갱신**합니다(체크박스 토글, 상태 문구 교체, 완료 항목은 "완료된 것" 절로 이동). 과거 이력 자체는 `docs/agents/*-log.md`(append-only)에 그대로 남으니, 여기서는 "지금 뭐가 됐고 뭐가 남았는지"만 빠르게 파악하면 됩니다.
>
> 기준 문서: `docs/design/00-ux-flow.md`(화면 번호 2.1~2.14). 마지막 갱신: 2026-07-28.

## 범례

- ✅ 완료(구현+검증 통과)
- 🟡 구현 완료, 검증 진행/대기 중
- 🔶 부분 구현(알려진 갭 있음)
- 🔁 설계 변경으로 대체됨(원래 계획과 다르지만 의도적 — 문제 아님)
- ❌ 미구현
- ➖ 해당 없음(스펙상 선택적이거나 불필요해짐)
- 🔒 외부 계정/서비스 대기로 막힘(코드 문제 아님)

## 화면별 현황

| # | 화면 | 상태 | 구현 위치 | 비고 |
|---|---|---|---|---|
| 2.1 | 스플래시 | ✅ | `SplashScreen.tsx` | 로고+앱이름+태그라인, 최소 노출 시간 후 자동 전환(Onboarding/Home). "온보딩은 봤지만 미연동" 분기는 토큰 영속화 부재로 의도적 생략 |
| 2.2 | 온보딩(3컷) | ✅ | `OnboardingScreen.tsx` | Round 1 검증 통과 |
| 2.3 | Spotify 연동 안내→OAuth | ✅ | `SpotifyConnectScreen.tsx` | Client ID 반영 완료(커밋 `229a2bc`), Round 9 검증 통과. 실기기 로그인 콜백만 미확인 |
| 2.4 | Premium 아님 안내 | 🔁 | `SpotifyConnectScreen.tsx`(모달) | 원래 설계(차단 화면)를 Free 계정 참여 허용 정책(2026-07-24 확정)에 맞춰 안내 모달로 대체(커밋 `977298c`, Round 9 통과) |
| 2.4b | Free 계정 안내 | ✅ | `NowPlayingView.tsx`, `ParticipantsBottomSheet.tsx` | 배너+참여자 태그, 서비스별/참여자별 가드 확인됨(R3.17, 혼합모드 R7.3~7.5) |
| 2.5 | 홈 | ✅ | `HomeScreen.tsx` | |
| 2.6 | 세션 생성 | ✅ | `CreateSessionScreen.tsx` | Spotify/YouTube/혼합 3개 유형, 정원 스테퍼(기본 2명) 전부 구현 |
| 2.6a | Spotify 앱 설치 유도 | ❌ | — | 엣지케이스. `react-native-app-auth`가 시스템 브라우저(Custom Tabs)를 쓰는 방식이라 "앱 미설치" 분기 자체의 필요성이 원래 설계 때보다 낮아짐 — 실기기 검증 후 필요성 재판단 |
| 2.6b | YouTube 계정 연동 유도 | ❌ | — | WebView 임베드 방식(IFrame Player)이라 별도 Google 로그인 화면이 애초에 불필요해짐 — 설계 전제가 바뀐 케이스 |
| 2.6c | 혼합 세션 플랫폼 선택 | ✅ | `PlatformSelect.tsx` | 호스트(`CreateSessionScreen`)·참여자(`HomeScreen`) 양쪽 다 연결 완료(커밋 `caea14d`, 이전엔 R7.31로 참여자 쪽 미연결 상태였음) |
| 2.7 | 초대 공유 | ✅ | `SessionSettingsView.tsx` | `session.inviteCode`를 세션 설정 화면에 상시 노출 + `Share.share()`로 공유(커밋 `bedbc72`, Round 11 검증 통과). QR코드 포함 세션 생성 직후 전용 화면(목업 원안)은 새 의존성 회피를 위해 의도적으로 생략(근거는 implementation-log 참고) |
| 2.8 | 세션 참여 | ✅ | `HomeScreen.tsx`, `sessionService.joinSessionByCode` | 코드 조회/정원초과/혼합 플랫폼선택 3분기 구현(커밋 `caea14d`), Round 10 검증 통과(31개 항목 전부 pass) |
| 2.9 | 세션 대기실 | ➖ | — | 스펙 자체가 "선택적(optional)"로 명시됨 |
| 2.10 | 세션 메인(탭 컨테이너) | ✅ | `RoomScreen.tsx` | |
| 2.10a | Now Playing — Spotify | ✅ | `NowPlayingView.tsx` | |
| 2.10c | Now Playing — YouTube | ✅ | `YouTubeNowPlayingView.tsx` | 실제 WebView+IFrame Player 재생 연동 완료(Round 5→6) |
| 2.10d | Now Playing — 혼합 | ✅ | `NowPlayingView.tsx`/`YouTubeNowPlayingView.tsx` mixed 분기 | 참여자별 매칭 상태(pending/failed 시 상태카드) 확인됨(Round 7) |
| 2.10b | 플레이리스트 탭 | ✅ | `PlaylistView.tsx` | 상단 서비스 칩("🟢 Spotify 플레이리스트 ▸")이 세션 설정 화면 오픈으로 연결됨(커밋 `bedbc72`, Round 11 검증 통과). 혼합 세션은 칩 자체가 매칭 확인 배지로 대체돼 있어(전환 개념 없음) 미연결 — 의도된 상태, 코드 트레이스로 재확인됨 |
| 2.11 | 곡 검색/추가 | ✅ | `AddTrackModal.tsx` | |
| 2.11a | 매칭 진행 중 | ✅ | `MatchingQueueSheet.tsx` | 큐 인덱싱 버그(R7.13) Round 8에서 수정 완료 |
| 2.11b | 매칭 확인 카드 | ✅ | `MatchConfirmCard.tsx` | |
| 2.11c | 대체 후보 목록 | ✅ | `MatchCandidateList.tsx` | |
| 2.11d | 매칭 실패 안내 | ✅ | `MatchFailCard.tsx` | |
| 2.12 | 참여자 목록 | ✅ | `ParticipantsBottomSheet.tsx` | 역할배지/관리자 임명/Free 표시/세션설정 진입 링크 |
| 2.13 | 세션 설정 | ✅ | `SessionSettingsView.tsx` | 구현(커밋 `caea14d`) + Round 10 검증 통과 — 역할 표시, 정원 읽기전용, 관리자 사임, 서비스 전환 |
| 2.13a | 서비스 전환 확인 다이얼로그 | ✅ | `SessionSettingsView.tsx` 내부 | 위와 동일 라운드, 통과 |
| 2.13b | 전환 중 오버레이 | ✅ | `SessionSettingsView.tsx` 내부 | 위와 동일 라운드, 통과 |
| 2.14 | 예외/엣지 상태 | 🔶 | `SyncStatusBadge.tsx`, `ReconnectingOverlay.tsx`, `RoomScreen.tsx` | 드리프트 배지(US-403) 완료. 재접속 오버레이(US-206)·호스트 마이그레이션 토스트(US-204)는 컴포넌트+배선(실제 데이터 조건)까지 완성했으나, 그 조건을 실제로 발동시키는 네트워크 끊김/호스트 이탈 감지 로직 자체가 없어(Firebase Presence 연동 이후 과제) 실사용 중에는 나타나지 않음 — 그래서 완전한 ✅가 아니라 🔶 유지 |

## 다음 순서 (구체적 작업 단위, 2026-07-27 갱신)

> **(2026-07-27 확정) 개발 우선순위를 YouTube 중심으로 전환** — 회의록: `docs/decision-log.md`. Spotify 지원 자체는 유지하되(MVP 범위 불변), 신규 작업 순서와 UI 기본값은 YouTube를 우선한다. 사유: Spotify Development Mode API 제약이 반복적으로 발목을 잡았고 Extended Quota Mode는 개인 프로젝트로 사실상 신청 불가인 반면, YouTube Data API v3는 API 키만으로 바로 동작.

### 지금 액션 가능한 것 (우선순위 순)

1. **RTDB 보안 규칙 배포** (사용자 액션 대기) — `database.rules.json`을 Firebase 콘솔에 붙여넣기만 하면 됨(`docs/external-service-setup-guide.md` 참고). 이게 되면 세션 생성/조회/참여가 실제로 동작하는지 확인 가능. **현재 유일한 외부 액션 블로커.**
2. **Round 20 검증** (진행 중) — `debuggableVariants=[]` 버그 수정(Round 19, 커밋 `d7b3789`)으로 로그인 벽 이후 화면이 처음으로 실기기 검증 가능해짐 — UI 폴리시/RTDB 1라운드/YouTube 우선순위 전환/YouTube 실검색/Spotify limit 수정, 그동안 정적 검증까지만 됐던 5개 작업을 한꺼번에 실기기 확인.
3. **RTDB 2-A라운드**(단일 서비스 플레이리스트 CRUD) — `docs/specs/10-rtdb-schema-and-security-rules.md` 로드맵의 다음 단계, 위 1번이 풀린 뒤 착수.

### 2026-07-26~28 완료 항목 요약 (상세는 `docs/agents/leader-log.md`/`docs/qa/spotify-mvp-round1-checklist.md`)

- 초대 코드 표시, 플레이리스트 서비스 칩 연결, 스플래시/엣지상태/적응형아이콘, 서비스별 플레이리스트 독립 보존, YouTube 시크 복원 — Round 10~14 전부 검증 통과.
- Docker+KVM 기반 Android 실기기급 검증 역량 확보 + 정책화(Round 15).
- Firebase RTDB 전체 코드 준비: DB 선택(RTDB)/SDK 설치/URL 연결/스키마·보안규칙 설계/익명 인증 결정/세션 생성·조회·참여 1라운드 실연동(커밋 `58317c2`~`0ac969c`).
- UI 폴리시: 스와이프 삭제 + 13개 개선 항목(행 높이, 세션 설정 화면 스택 전환, 터치타겟 확대, 애니메이션 등) — 커밋 `0ac969c`.
- 개발 우선순위를 YouTube 중심으로 전환(회의록 `docs/decision-log.md`) — 세션 생성/참여 기본값 YouTube로(커밋 `a6933e9`), YouTube Data API v3 실연동(검색, 커밋 `07d57ac`), Spotify 검색 `limit` 버그 수정(커밋 `e5b177a`).
- Round 18: 로그인 벽 이후 화면 검증 시도 — `debuggableVariants=[]` 버그로 차단.
- **Round 19(2026-07-28): `debuggableVariants=[]` 버그 근본 수정**(커밋 `d7b3789`) — 데모 로그인 바이패스가 실제로 렌더링+작동함을 Docker 실기기에서 end-to-end 확인(버튼 탭 → HomeScreen 도달까지). 로그인 벽 이후 화면 검증의 구조적 장벽이 드디어 해소됨.

### 5. 낮은 우선순위 / 보류 (필요성 재확인 후 진행)
- [x] 2.1 스플래시 화면 — `SplashScreen.tsx` 구현 완료(2026-07-26). 로고+앱이름+태그라인 노출 후 자동 전환, 상세는 implementation-log.md "2026-07-26 (3)" 참고
- [ ] 2.6a/2.6b(Spotify 앱 설치 유도, YouTube 계정 연동 유도) — 기술적 전제가 바뀌어 필요성 자체가 낮아짐, 실기기 검증 후 재판단
- [x] 2.14 전용 엣지 상태 화면(오프라인 등 전체화면 오버레이) — `ReconnectingOverlay.tsx`(US-206) + 호스트 마이그레이션 토스트(US-204, 기존 토스트 인프라 재사용) 구현 완료(2026-07-26). 단, 컴포넌트/배선만 완성이고 실제 발동 조건(네트워크 끊김 감지, 호스트 이탈 감지)은 Firebase 연동 이후 과제로 남음 — 화면별 현황 표 2.14행 🔶 참고
- [x] 적응형 아이콘(Android 8.0+, `mipmap-anydpi-v26`) — 배경(벡터 드로어블 그라디언트) + 전경(PNG, 밀도별) 레이어 분리 구현 완료(2026-07-26). Legacy `mipmap-*/ic_launcher.png`는 API 26 미만 대비 그대로 유지. 상세는 implementation-log.md "2026-07-26 (적응형 아이콘)" 참고
- [ ] iOS 배포 방향(TestFlight/Ad Hoc) — 사용자가 두 차례 "추후 논의"로 보류
- [ ] 매칭 신뢰도 가중치/임계값 실측 스파이크(`09-cross-platform-mixed-mode.md` 결정 4)
- [ ] RTDB vs Firestore 실측 스파이크 후속(`docs/spikes/firebase-rtdb-vs-firestore.md`, DB 활성화 후 가능)
- [x] 서비스별 플레이리스트 독립 보존을 데이터 수준까지 구현 — `SessionState.playlist` 단일 배열을 `playlists: {spotify, youtube}`(서비스별 entries + lastPlayback 재생 위치 기억)로 분리, `switchService`가 전환 시 스냅샷 저장/복원까지 수행하도록 구현 완료(커밋 `e29c1ec`, Round 13 검증 19/19 통과). Firebase 실제 연동(Firestore 구조 설계)은 여전히 TODO로 남음.
  - [x] **후속 갭 수정(Round 13 발견 → 2026-07-27 수정, Round 14 검증 통과 13/13)**: 복원된 `positionMs`가 YouTube IFrame Player의 실제 시크에 반영되지 않던 문제 해결 — 원인은 `loadVideoById`/`cueVideoById`(곡 전환 경로, 이미 `startSeconds` 지원 중이라 그대로 유지)가 아니라 컴포넌트 최초 마운트 시 굽는 `initialHtml`이었다. `buildYoutubePlayerHtml`에 `startSeconds` 옵션(정수 초, `playerVars.start`에 반영)을 추가하고, `YouTubeNowPlayingView.tsx`의 `initialHtml`이 Spotify/YouTube 전용 세션(`!isMixed`)에 한해 `session.playback.positionMs`(ms→초 내림)를 전달하도록 배선했다. 단위 테스트(`__tests__/youtubePlayerHtml.test.ts`) + tsc/eslint/jest(9 suites/48 tests)/Android `assembleDebug` 통과 확인. 실기기 없이는 실제 시크 반영을 시각적으로 확인 불가 — 코드 트레이스+단위 테스트 수준까지만 검증됨(다음 실기기 검증 라운드 후보).
    - **사소한 정정 필요(비차단, Round 14 발견)**: "혼합 세션은 positionMs 의미가 달라 제외"라는 주석/로그 서술이 부정확하다 — 실제로는 `mixedTrackView.ts`가 `positionMs`를 아예 참조하지 않고, `switchService` 자체가 혼합 세션이면 즉시 반환돼 "전환 후 복귀" 시나리오 자체가 성립하지 않는 게 진짜 이유다(동작 자체는 정확함, 근거 서술만 부정확). `YouTubeNowPlayingView.tsx` 96~98행/`youtubePlayerHtml.ts` 28~29행/implementation-log.md 524행 — 다음에 이 파일들을 만질 때 같이 정정.

## 완료된 것 (요약, 상세는 화면별 현황 표 참고)

- 온보딩, Spotify 연동, 세션 생성(3유형), Now Playing(3유형), 플레이리스트(검색/추가/삭제/순서변경), 참여자 목록(역할/Free/관리자 임명), 매칭 확인 플로우(4화면), 세션 참여(코드), 세션 설정(역할/정원/서비스 전환/초대 코드 공유), 플레이리스트 서비스 칩 단축 진입점.
- QA 라운드 1~11 전부 통과 — 상세 이력은 `docs/qa/spotify-mvp-round1-checklist.md`.
