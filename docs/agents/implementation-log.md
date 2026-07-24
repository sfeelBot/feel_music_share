# 구현(Implementation) 작업 로그

작업 시작/종료 시 아래 형식으로 항목을 **추가**한다 (append-only, 기존 내용 삭제 금지).

```
## YYYY-MM-DD
- 작업: ...
- 상태: 진행중 | 완료(검증 대기) | 블로커
- 변경 파일: ...
- 비고: ...
```

## 2026-07-24
- 작업: Spotify 전용 세션 MVP 핵심 화면 구현 착수 (온보딩 3컷, Spotify 연동+OAuth 로그인, 세션 생성, Now Playing, 플레이리스트 탭, 참여자 바텀시트). `docs/design/01-style-guide.md`·`03-screen-mockups.html`의 색상 토큰/컴포넌트 패턴을 이식하는 테마 시스템부터 구축.
- 상태: 진행중
- 변경 파일: (진행 중, 완료 후 하단에 정리)
- 비고: 기존 스캐폴딩(`services/api/*`, `services/realtime/socket.ts`)은 커스텀 REST/WebSocket 백엔드(`apps/backend`, 존재하지 않음)를 전제로 작성되어 있었으나, `CLAUDE.md`/`docs/specs/06-mvp-scope-and-tech-stack.md`가 2026-07-24 Firebase로 백엔드를 확정했으므로 이번 라운드에서 해당 레이어를 Firebase 지향 구조(자리만 마련, 목업 데이터)로 교체한다. 상세는 완료 로그에 기록.

## 2026-07-24 (완료)
- 작업: Spotify 전용 세션 MVP 핵심 화면 구현 완료.
  1. 테마 시스템(`src/theme/tokens.ts`, `ThemeContext.tsx`) — `01-style-guide.md`/`03-screen-mockups.html`의 라이트·다크 CSS 변수를 그대로 옮김. `useColorScheme` 기반으로 다크모드를 1급 시민으로 취급(스타일가이드 4절).
  2. 공통 컴포넌트: `Avatar`(컬러 링+왕관 오버레이), `PickerBadge`(선곡자 배지, nowPlaying/inline 변형), `SyncStatusBadge`(4단계: 동기화됨/맞추는 중/지연/끊김), `RoleBadge`(방장/관리자, 일반사용자는 배지 없음), `CapacityStepper`(정원 2~12명, 기본 2명), `Buttons`(Primary/Secondary/Spotify pill 버튼), `ParticipantsBottomSheet`(참여자 상세 상태 + 방장 전용 관리자 임명/해제 메뉴 + 참여/재생 인원 조건부 헤더), `AddTrackModal`(Spotify Web API 실검색).
  3. 화면: `OnboardingScreen`(3컷, 마지막 컷은 투명성 카드 US-406), `SpotifyConnectScreen`(Premium 안내+OAuth 로그인), `HomeScreen`(세션 생성/코드 참여 진입점), `CreateSessionScreen`(세션명/서비스 라디오-Spotify만 활성/정원 스테퍼/동적 안내 배너), `RoomScreen`(세그먼트 탭 컨테이너+참여자 바텀시트 트리거) → `room/NowPlayingView`(앨범아트/선곡자 배지/진행바/컨트롤/동기화 배지/참여자 아바타 스택+방장 왕관, Free 계정 배너), `room/PlaylistView`(미니 플레이어, 현재곡 강조+대기열+접히는 재생완료 섹션, 곡 추가 모달 연동, 롱프레스 삭제 확인).
  4. 백엔드 레이어 재설계(Firebase 확정 반영): 기존 커스텀 REST(`services/api/*`)/WebSocket(`services/realtime/socket.ts`) 전부 제거. 대신 `services/spotify/spotifyWebApi.ts`(Spotify Web API 직접 호출 — 프로필/Premium 조회, 곡 검색, 실제로 동작함), `services/firebase/firebaseClient.ts`(Firebase 연동 지점 STUB + 상세 TODO), `services/session/sessionService.ts` + `mockSessionSeed.ts`(인메모리 세션/플레이리스트/참여자 목업, Firestore/RTDB/Cloud Functions 교체 지점을 함수 단위로 주석 명시), `state/SessionContext.tsx`(위 서비스를 감싸는 전역 상태, 재생 명령/곡 추가삭제/관리자 임명을 로컬에서 처리하되 각 지점에 `TODO(Firebase 연동)` 명시).
  5. `types/domain.ts` 확장: `ParticipantRole`(host/admin/regular), `AccountTier`(premium/free), `SyncState` 4단계, 세션 정원 상수(`SESSION_CAPACITY_MIN/MAX/DEFAULT`).
  6. `.env.example` 신규 작성(Spotify Developer 앱 등록 + Firebase 프로젝트 생성 절차 안내), `src/config/env.ts`에 Firebase placeholder 키 추가, `README.md`에 다음 단계 안내 섹션 추가.
  7. `jest.config.js`의 `transformIgnorePatterns`에 `react-native-base64`(react-native-app-auth의 전이 의존성) 추가 — 기존에 `__tests__/App.test.tsx`가 실패하던 문제를 함께 고쳤다(회귀 아님, 사전에 존재하던 파싱 오류).
- 상태: 완료(검증 대기)
- 변경 파일: `apps/mobile/src/theme/*`, `apps/mobile/src/components/*`(신규 8개), `apps/mobile/src/screens/*`(Onboarding/SpotifyConnect/Home/CreateSession/Room 재작성 또는 신규, `screens/room/*` 신규), `apps/mobile/src/services/*`(auth/AuthContext 재작성, spotify/spotifyWebApi 신규, firebase/firebaseClient 신규, session/* 신규; api/*·realtime/* 삭제), `apps/mobile/src/state/SessionContext.tsx`(재작성), `apps/mobile/src/types/domain.ts`(확장, protocol.ts 삭제), `apps/mobile/src/utils/format.ts`·`id.ts`(신규), `apps/mobile/src/navigation/*`(경로 추가), `apps/mobile/App.tsx`(ThemeProvider 추가), `apps/mobile/.env.example`(신규), `apps/mobile/README.md`, `apps/mobile/jest.config.js`.
- 비고(검증 시 주의):
  - `npx tsc --noEmit`, `npx eslint src App.tsx`(0 errors, inline-style warning만 존재), `npx jest`(1/1 통과) 모두 로컬에서 확인함. 다만 iOS/Android 시뮬레이터·실기기 빌드/런타임 검증은 하지 않았다(이 라운드는 코드 작성까지, 검증 에이전트 몫).
  - Spotify 로그인은 `react-native-app-auth`의 `authorize()`를 그대로 쓰지만, `ENV.SPOTIFY_CLIENT_ID`가 placeholder라 실제 로그인은 Spotify Developer 앱 등록 전까지 불가능하다. 커스텀 URL 스킴(`feelmusicshare://...`)도 아직 iOS Info.plist/Android AndroidManifest.xml에 등록하지 않았다 — 다음 라운드 TODO.
  - 세션/플레이리스트/참여자 데이터는 전부 인메모리 목업(`sessionService.ts`)이라 앱을 재시작하면 사라진다. 여러 기기 간 실시간 동기화는 전혀 동작하지 않는다(Firebase 미연동, 의도된 제약).
  - 드래그 앤 드롭 순서변경(US-303), 참여자 바텀시트의 드래그-닫기 제스처는 시각적 자리만 있고 실제 동작은 구현하지 않았다(제스처/드래그 라이브러리 미설치) — 각 파일에 TODO 표시.
  - "코드로 참여하기"는 UI만 있고 실제 참여 로직은 Alert로 "준비 중" 안내만 한다(다른 기기와의 실시간 참여는 Firebase 없이는 애초에 검증 불가능).
  - YouTube/혼합 세션 라디오는 비활성 + "곧 지원 예정" 표시만 하고 화면/로직은 만들지 않았다(리더 지시로 이번 라운드 범위 밖).
  - 다음 라운드 착수 전 필요: (1) Spotify Developer Dashboard 앱 등록(Client ID 발급, Redirect URI 등록, 커스텀 URL 스킴 네이티브 설정), (2) Firebase 프로젝트 생성(Firestore/RTDB + Cloud Functions, google-services.json/GoogleService-Info.plist 추가) — 둘 다 `.env.example`에 절차 정리해둠.
