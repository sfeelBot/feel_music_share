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

## 2026-07-24 (수정 라운드 — 검증 실패 3건 대응)
- 작업: `docs/qa/spotify-mvp-round1-checklist.md`(커밋 `e4057fe` 검증)에서 실패 3건 + 5절 코드 품질 메모 3건 수정.
  1. [4.12 필수] 현재 재생 중인 곡 삭제 시 다음 곡 자동 전환 누락 → `SessionContext.removeTrack`에서 삭제된 엔트리가 `playback.currentEntryId`였는지 확인 후, 원래 배열에서 삭제된 곡의 다음 엔트리를 찾아 `currentEntryId`/`playedStatus`를 전환. 다음 곡이 없으면 `currentEntryId: null`로 "재생할 곡 없음" 상태 유지(정상 동작).
  2. [4.15 사소] "이전 곡" 버튼 무반응 → `SessionContext`에 `requestPrevTrack` 신규(재생 순서상 바로 앞 엔트리로 이동, `requestNextTrack`과 대칭 구조). `NowPlayingView`에 연결하고, 이전 곡이 없으면(`currentIndex <= 0`) 버튼을 `disabled`+반투명 처리.
  3. [4.16 사소] 목업 참여자 수가 정원 무관 항상 3명 → `mockSessionSeed.buildDemoParticipants(host, capacity)`로 시그니처 변경, 추가 참여자 수를 `min(2, capacity-1)`로 제한. `sessionService.createSession`에서 capacity를 먼저 계산해 전달.
  4. [5절 메모, 선제 보강] Free 계정 배너에 `session.service === 'spotify'` 명시적 가드 추가(`NowPlayingView.tsx`) — 지금은 Spotify 세션만 있어 동작 변화 없음, YouTube 세션 도입 시 오표시 방지.
  5. [5절 메모, 정책 정정] `PlaylistView.tsx`의 `TrackRow`에서 `readOnly`(재생 완료 곡)여도 롱프레스 삭제 가능하도록 수정(순서 변경만 read-only 유지, 삭제는 04-playlist.md대로 항상 허용). `accessibilityHint`도 조건 없이 항상 노출.
  6. [5절 메모, 접근성] `CreateSessionScreen.tsx`의 `RadioRow`에 `accessibilityRole="radio"`, `accessibilityState={{selected, disabled}}` 추가.
- 상태: 완료(검증 대기)
- 변경 파일: `apps/mobile/src/state/SessionContext.tsx`, `apps/mobile/src/screens/room/NowPlayingView.tsx`, `apps/mobile/src/screens/room/PlaylistView.tsx`, `apps/mobile/src/services/session/mockSessionSeed.ts`, `apps/mobile/src/services/session/sessionService.ts`, `apps/mobile/src/screens/CreateSessionScreen.tsx`.
- 비고(검증 시 주의):
  - `npx tsc --noEmit`(0 errors), `npx eslint .`(0 errors, 13 warnings — 기존 12개 + `NowPlayingView.tsx`의 새 조건부 opacity 인라인 스타일 1개, 전부 기존과 동일한 관용적 `react-native/no-inline-styles` 패턴), `npx jest`(1/1 통과) 모두 재확인함.
  - "이전 곡"은 별도 재생 히스토리 모델이 없어(도메인 타입에 history 필드 없음) 플레이리스트 배열 순서를 곧 히스토리로 간주해 바로 앞 엔트리로 이동하는 방식으로 구현했다 — `requestNextTrack`과 대칭 설계라 리뷰 시 함께 비교 확인 권장.
  - `removeTrack`에서 다음 곡으로 넘어갈 때도 `requestNextTrack`과 동일하게 `triggerTuning()`을 호출해 동기화 배지가 "맞추는 중"으로 잠깐 전환되도록 함(자동 전환이므로 사용자에게 상태 변화를 알리는 것이 자연스럽다고 판단, 스펙에 명시되진 않은 임의 UX 판단 — 필요시 리더/디자인 확인 요청 가능).
  - 목업 참여자 색상 배정을 반복문 기반(`ringColorForIndex(index + 1)`)으로 바꾸면서 기존의 두 데모 참여자가 동일 색(teal, index 1)이었던 부분이 서로 다른 색(index 1, 2)으로 바뀌었다 — 시각적 변화이나 요구된 수정(정원 제한)을 구현하며 자연스럽게 발생한 부수 효과, 별도 기능 변경 아님.

## 2026-07-24 (딥링크 등록)
- 작업: `docs/qa/spotify-mvp-round1-checklist.md`(2.2, 3.4)가 지적한 `feelmusicshare://` 커스텀 URL 스킴 네이티브 미등록 문제 해결. react-native-app-auth 8.4.1 공식 문서("Manual Setup" — Android Setup / iOS Setup) 기준으로 아래와 같이 등록.
  1. **Android**: `android/app/build.gradle`의 `defaultConfig`에 `manifestPlaceholders = [appAuthRedirectScheme: "feelmusicshare"]` 추가. 공식 문서상 이 라이브러리는 `AndroidManifest.xml`을 직접 수정하는 방식이 아니라, AppAuth-Android가 자체 매니페스트에 선언한 `net.openid.appauth.RedirectUriReceiverActivity`의 intent-filter data scheme을 빌드 시 이 placeholder로 치환해 병합하는 방식이 표준이다(App Links/https 스킴일 때만 앱 매니페스트에 직접 `<activity>`를 추가하는 예외 케이스가 있으나, 이번 스킴은 커스텀 스킴이라 해당 없음). 따라서 앱의 `AndroidManifest.xml` 파일 자체는 이번에도 건드리지 않았다 — 검증 시 `grep "feelmusicshare" AndroidManifest.xml`로는 여전히 안 잡히니 `build.gradle`의 `manifestPlaceholders`를 확인해야 한다.
  2. **iOS**: `ios/mobile/Info.plist`의 `CFBundleURLTypes`에 `feelmusicshare` 스킴 등록.
  3. **iOS AppDelegate (요청 범위를 넘어 추가)**: 공식 문서("Define openURL callback in AppDelegate", react-native >= 0.68/Objective-C 기준, 이 프로젝트는 RN 0.76.9)에 따르면 Info.plist 등록만으로는 시스템이 URL을 앱에 전달할 뿐, AppAuth의 대기 중인 인증 세션까지 연결되지 않아 `authorize()` 프로미스가 끝나지 않는 문제가 남는다. 그래서 `AppDelegate.h`에 `RNAppAuthAuthorizationFlowManager` 프로토콜 채택 + `authorizationFlowManagerDelegate` 프로퍼티 추가, `AppDelegate.mm`에 `application:openURL:options:`를 구현해 `resumeExternalUserAgentFlowWithURL:` 우선 처리 후 `RCTLinkingManager`로 폴백하도록 했다. 지시받은 3개 항목(2번)에는 명시되지 않았던 변경이라 별도로 표기함 — Info.plist만으로는 iOS에서 로그인 콜백이 여전히 완료되지 않는 것으로 판단해 추가함, 범위를 벗어난 것으로 보이면 롤백 요청 바람.
  4. **스킴 vs 콜백 path 개별 등록 여부(3번 질문에 대한 답)**: 두 콜백 모두 스킴만 등록하면 충분하다. Android는 intent-filter data 요소에 `scheme`만 지정하고 `host`/`path`를 지정하지 않았으므로 Android의 URI 매칭 규칙상 해당 스킴의 모든 host(`spotify-auth-callback`, `spotify-remote-callback` 등)가 매칭된다. iOS도 `CFBundleURLSchemes`는 스킴 단위 등록이며 host/path 구분 없이 시스템이 앱에 라우팅한다(어떤 콜백인지 구분은 AppAuth SDK/애플리케이션 코드가 URL 값 자체로 처리). 따라서 콜백 path별 개별 등록 항목은 추가하지 않았다.
- 상태: 완료(검증 대기)
- 변경 파일: `apps/mobile/android/app/build.gradle`, `apps/mobile/ios/mobile/Info.plist`, `apps/mobile/ios/mobile/AppDelegate.h`, `apps/mobile/ios/mobile/AppDelegate.mm`.
- 비고(검증 시 주의):
  - `npx tsc --noEmit`(0 errors), `npx eslint .`(0 errors, 13 warnings, round 2와 동일 — 새 경고 없음), `npx jest`(1/1 통과) 모두 재확인함. 이번 변경은 전부 네이티브 설정 파일이라 위 세 명령의 검증 범위 밖일 가능성이 높다는 점을 감안해도 회귀는 없었다.
  - `Info.plist`/`AndroidManifest.xml`은 PowerShell `[xml]` 파서로 각각 well-formed 여부를 확인했다(파싱 에러 없음). `build.gradle`은 Groovy라 이 환경에서 문법 검증 도구가 없어 육안 검토만 했다 — 기존 블록 구조(`defaultConfig { ... }`) 안에 표준 형태의 `manifestPlaceholders = [...]`를 추가한 것이라 문법 리스크는 낮다고 판단.
  - **실기기 빌드 검증은 이번 라운드에서도 수행하지 못했다**(Android: JDK/JAVA_HOME 없음, iOS: macOS/Xcode 없음 — round 1/2와 동일한 환경 구조적 제약). 이 변경이 실제로 OAuth 콜백을 앱으로 되돌리는지는 반드시 JDK가 설치된 환경(Android) 및 macOS/Xcode 환경(iOS)에서 실기기 또는 에뮬레이터/시뮬레이터로 재검증이 필요하다. 특히 `SPOTIFY_CLIENT_ID`가 여전히 placeholder(`.env.example`/`src/config/env.ts`)라 전체 로그인 플로우 자체는 이번 딥링크 등록만으로는 끝까지 검증할 수 없다(Spotify Developer Dashboard에 앱 등록 + client ID 채우기가 선행되어야 함, 이번 라운드 범위 밖).
  - iOS AppDelegate 변경이 헤더 참조(`RNAppAuthAuthorizationFlowManager.h`, `RCTLinkingManager.h`)를 올바르게 하는지 `node_modules/react-native-app-auth/ios/`와 `node_modules/react-native/Libraries/LinkingIOS/`에 해당 헤더 파일이 실제로 존재함을 확인했다(경로 존재 확인, 컴파일 검증은 Xcode 필요라 미수행).
  - 새 기능 추가나 범위 확장 없이 지시된 6건만 수정했다. `docs/specs/`, `docs/design/`, `docs/qa/`는 읽기만 하고 수정하지 않았다. 커밋은 하지 않았다(리더 검토 대기).
