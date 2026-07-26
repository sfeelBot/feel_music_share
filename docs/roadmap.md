# 기능 로드맵 (화면별 현황 + 진행 순서)

> 이 파일은 **살아있는(live) 문서**입니다 — `docs/decisions-needed.md`/`docs/agents/leader-log.md`의 "현재 상황 요약" 절과 같은 성격으로, append-only가 아니라 **상황이 바뀔 때마다 해당 항목을 직접 갱신**합니다(체크박스 토글, 상태 문구 교체, 완료 항목은 "완료된 것" 절로 이동). 과거 이력 자체는 `docs/agents/*-log.md`(append-only)에 그대로 남으니, 여기서는 "지금 뭐가 됐고 뭐가 남았는지"만 빠르게 파악하면 됩니다.
>
> 기준 문서: `docs/design/00-ux-flow.md`(화면 번호 2.1~2.14). 마지막 갱신: 2026-07-26.

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
| 2.1 | 스플래시 | ❌ | — | 별도 화면 없이 온보딩/로그인으로 바로 진입. 낮은 우선순위(아래 "보류" 참고) |
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
| 2.14 | 예외/엣지 상태 | 🔶 | `SyncStatusBadge.tsx` | 동기화 배지(끊김/지연/맞추는 중) 수준만 구현, 전체화면 오버레이 형태의 엣지 상태는 별도로 없음 |

## 다음 순서 (구체적 작업 단위)

### 1~3. 초대 코드 표시 + 플레이리스트 칩 연결 + Round 10/11 검증 — ✅ 전부 완료(2026-07-26)
- [x] 초대 코드 표시(2.7 갭): `SessionSettingsView.tsx`의 `InviteCodeRow` + `Share.share()`(신규 의존성 없음). 커밋 `bedbc72`, Round 11 통과.
- [x] 플레이리스트 서비스 칩 연결(2.10b 갭): `onOpenSettings` prop으로 세션 설정 오픈, 혼합 세션은 칩 자체가 없어 의도적 미연결. 커밋 `bedbc72`, Round 11 통과.
- [x] Round 10(코드로 참여하기+세션 설정, 31개 항목) / Round 11(위 두 갭 해소, 19개 항목) 전부 통과. 사소한 문서 주석 오류 2건도 함께 정정 완료.
- **로드맵 상 "다음 순서" 큰 항목은 이제 4번(외부 계정 대기)만 액션 가능하고, 나머지는 사용자 액션 또는 우선순위 재확인 대기 상태.**

### 4. 외부 계정 설정 완료 대기 (사용자 액션, `docs/decisions-needed.md` 참고)
- [ ] Firebase: `google-services.json` 패키지명 재등록(`com.mobile`) + RTDB/Firestore 콘솔 활성화
- [ ] YouTube Data API v3 활성화
- 이게 풀리면: 실제 멀티 디바이스 참여, 실시간 동기화, YouTube 실제 검색까지 다음 큰 라운드로 이어짐

### 5. 낮은 우선순위 / 보류 (필요성 재확인 후 진행)
- [ ] 2.1 스플래시 화면 — 있으면 좋지만 없어도 기능상 문제 없음
- [ ] 2.6a/2.6b(Spotify 앱 설치 유도, YouTube 계정 연동 유도) — 기술적 전제가 바뀌어 필요성 자체가 낮아짐, 실기기 검증 후 재판단
- [ ] 2.14 전용 엣지 상태 화면(오프라인 등 전체화면 오버레이) — 지금은 동기화 배지 수준으로 충분한지 검토 필요
- [ ] 적응형 아이콘(Android 8.0+, `mipmap-anydpi-v26`) — legacy 아이콘으로 이번 스코프는 완료, 별도 결정 필요
- [ ] iOS 배포 방향(TestFlight/Ad Hoc) — 사용자가 두 차례 "추후 논의"로 보류
- [ ] 매칭 신뢰도 가중치/임계값 실측 스파이크(`09-cross-platform-mixed-mode.md` 결정 4)
- [ ] RTDB vs Firestore 실측 스파이크 후속(`docs/spikes/firebase-rtdb-vs-firestore.md`, DB 활성화 후 가능)
- [ ] 서비스별 플레이리스트 독립 보존을 데이터 수준까지 구현(현재는 전환해도 `playlist` 배열을 그대로 공유 — Firebase 연동과 함께 처리 제안)

## 완료된 것 (요약, 상세는 화면별 현황 표 참고)

- 온보딩, Spotify 연동, 세션 생성(3유형), Now Playing(3유형), 플레이리스트(검색/추가/삭제/순서변경), 참여자 목록(역할/Free/관리자 임명), 매칭 확인 플로우(4화면), 세션 참여(코드), 세션 설정(역할/정원/서비스 전환/초대 코드 공유), 플레이리스트 서비스 칩 단축 진입점.
- QA 라운드 1~11 전부 통과 — 상세 이력은 `docs/qa/spotify-mvp-round1-checklist.md`.
