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

## 2026-07-25 (Android 빌드 실패 수정 — compileSdk/AGP 버전 충돌)
- 작업: 리더의 로컬 검증(`cd apps/mobile/android && ./gradlew assembleDebug`)에서 발견된 빌드 실패 수정. 원인은 `react-native-app-auth`(Spotify OAuth Custom Tabs, `services/auth/spotifyAuth.ts`)의 `android/build.gradle`이 `androidx.browser:browser:1.9.0`을 하드코딩 의존하는 것 — 이 버전이 (1) AAR 메타데이터로 compileSdk 36 이상을 요구하고 (2) AGP 8.9.1 이상을 요구하는데, 프로젝트는 AGP 8.6.0(RN 0.76.9/@react-native/gradle-plugin 기본값)/compileSdk 35였다.
  1. **해결 방법 조사 및 판단**: 처음에는 "androidx.browser를 낮은 버전으로 force"하는 쪽이 AGP/Gradle/compileSdk를 한꺼번에 안 올려도 되니 더 안전하다고 판단해 `resolutionStrategy.force 'androidx.browser:browser:1.8.0'`을 시도했으나, 실제로 빌드해보니 `RNAppAuthModule.java`가 `CustomTabsIntent.Builder#setEphemeralBrowsingEnabled(Boolean)`을 직접 호출하고 있고 이 API는 androidx.browser 1.9.0에서 새로 추가된 것이라 1.8.0으로 낮추면 컴파일 자체가 깨졌다(`cannot find symbol`). 즉 force 방식은 이 프로젝트에서 실제로는 작동 불가능함을 실측으로 확인 — AGP/compileSdk를 올리는 쪽으로 방향을 바꿨다.
  2. `apps/mobile/android/build.gradle`: `compileSdkVersion` 35→36, `buildToolsVersion` "35.0.0"→"36.1.0"(로컬 SDK에 이미 설치된 버전과 일치시켜 다운로드 불필요하게 함), AGP classpath를 버전 미지정(`com.android.tools.build:gradle`, 전이적으로 8.6.0 해석됨)에서 `com.android.tools.build:gradle:8.10.1`로 명시. AGP 8.10.1을 고른 이유: compileSdk 36을 지원하는 최소 안정 버전대(8.10.x)의 최신 패치라 AGP 8.9.x(compileSdk 35까지만 지원, 문서로 확인)보다는 위, 최신 8.11/9.x보다는 RN 0.76.9 기본값(8.6.0)에서 덜 멀리 감. `targetSdkVersion`은 34로 유지(compileSdk와 targetSdk는 독립적으로 올릴 수 있고, 런타임 동작 변경 리스크를 피하려 targetSdk는 건드리지 않음). `minSdkVersion`(24), `ndkVersion`(26.1.10909125)은 변경 없음(로컬 SDK에 해당 NDK 이미 설치돼 있어 그대로 사용 가능).
  3. `apps/mobile/android/gradle/wrapper/gradle-wrapper.properties`: AGP 8.10.1의 최소 요구 Gradle 버전이 8.11.1이라(Android 공식 문서 확인) distributionUrl을 gradle-8.10.2-all.zip → gradle-8.11.1-all.zip으로 상향.
  4. `.github/workflows/android-debug-apk.yml`: compileSdk 36에 맞춰 `sdkmanager` 설치 대상을 `platforms;android-35`/`build-tools;35.0.0` → `platforms;android-36`/`build-tools;36.1.0`으로 갱신, 관련 주석도 갱신.
  5. **실제 빌드 검증**: JAVA_HOME=`D:\Android Studio\jbr`, ANDROID_HOME/ANDROID_SDK_ROOT=`E:\Android\Sdk`, GRADLE_USER_HOME=`E:\gradle-home` 환경에서 `./gradlew.bat assembleDebug` 직접 실행 → **`BUILD SUCCESSFUL in 6m 58s` (168 actionable tasks: 168 executed) 확인**. `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` 실제 생성 확인(130,163,456 bytes).
  6. JS/TS 회귀 확인: `npx tsc --noEmit`(에러 0), `npx eslint .`(에러 0, 기존과 동일한 13개 warning만 — 신규 아님), `npx jest`(1/1 통과) 모두 재확인, 네이티브 설정 변경이라 예상대로 회귀 없음.
- 상태: 완료(검증 대기)
- 변경 파일: `apps/mobile/android/build.gradle`, `apps/mobile/android/gradle/wrapper/gradle-wrapper.properties`, `.github/workflows/android-debug-apk.yml`.
- 비고(검증 시 주의):
  - **iOS는 이번 라운드에서 손대지 않았다.** 이번 이슈는 Android 전용(AGP/compileSdk/androidx.browser)이었고 iOS 쪽 Podfile/Xcode 프로젝트 설정은 변경 없음 — 검증 에이전트는 iOS 빌드에 영향 없다고 가정해도 되나, 관례대로 iOS 체크리스트도 별도로 통과해야 최종 완료로 간주.
  - AGP 8.10.1로 올리면서 Gradle도 8.11.1로 함께 올랐다 — CI(ubuntu-latest, `actions/setup-java@v4`로 JDK 17)에서도 Gradle 8.11.1이 요구하는 JDK 17 이상 조건은 이미 충족되어 있어 별도 CI JDK 버전 변경은 하지 않았다. 다만 CI 환경에서 실제로 `platforms;android-36`/`build-tools;36.1.0`을 `sdkmanager`가 정상적으로 다운로드/설치할 수 있는지는 로컬에서는 확인 불가능하므로(로컬은 이미 설치돼 있었음) 검증 에이전트가 실제 CI 실행 결과(GitHub Actions)로 별도 확인 필요.
  - `androidx.browser:browser:1.9.0`을 그대로 두고 compileSdk/AGP를 올리는 쪽으로 결정했기 때문에, 이 앱은 이제 최소 compileSdk 36 기준으로 빌드된다 — 향후 다른 라이브러리를 추가할 때도 compileSdk 36 요구사항이 새 기준선이 된다는 점을 다음 라운드 구현자가 인지해야 한다.
  - `node_modules/react-native-app-auth/android/build.gradle`의 `androidx.browser:browser:1.9.0` 하드코딩 자체는 서드파티 패키지 내부라 고치지 않았다(patch-package 등도 이번 범위 밖으로 판단, 리더 지시에 없었음).

## 2026-07-25 (debug APK "Unable to load script" 수정 — JS 번들 미포함)
- 작업: 사용자가 GitHub Releases의 debug APK(`android-debug-latest`)를 실기기에 설치했을 때 발생한 `Unable to load script` 에러 수정. 원인은 react-native-gradle-plugin의 `debuggableVariants` 기본값(`["debug"]`) — debug 변형은 Metro 서버에서 JS를 받아오는 것을 전제로 JS 번들/에셋 패키징을 스킵하는데, 우리 CI가 배포하는 debug APK는 Metro 없이 그냥 설치해 쓰는 독립 실행형 사이드로드 배포용이라 이 기본 동작과 충돌했다.
  1. `apps/mobile/android/app/build.gradle`의 `react { ... }` 확장 블록에 `debuggableVariants = []` 추가(react-native-gradle-plugin 공식 문서 "Configuration" 절 표준 해결법). 빈 리스트로 설정하면 debug 변형도 release와 동일하게 JS 번들·에셋이 APK 안에 패키징된다.
  2. 부작용 검토: `debuggableVariants`는 "번들을 APK에 넣을지"만 제어하고 `android:debuggable`/`BuildConfig.DEBUG` 자체나 Metro 연동을 막지 않는다 — RN의 `DevSupportManager`는 `getUseDeveloperSupport()`(디버그 빌드 기준 true)일 때 우선 Metro 개발 서버 접속을 시도하고, Metro가 응답하지 않을 때(사이드로드 실기기 상황)에만 APK에 내장된 번들로 폴백하는 구조라 로컬 `npx react-native run-android` + Metro 개발 흐름에는 영향이 없다고 판단(공식 문서 근거로 확인, 로컬에 macOS 없이 실기기로 Metro 연동 자체를 직접 재현 테스트하지는 못함 — 검증 에이전트가 실제 로컬 개발 시나리오까지 재확인 권장).
  3. 실제 빌드 검증: JAVA_HOME=`D:\Android Studio\jbr`, ANDROID_HOME/ANDROID_SDK_ROOT=`E:\Android\Sdk`, GRADLE_USER_HOME=`E:\gradle-home` 환경에서 `./gradlew.bat assembleDebug --no-daemon` 실행 → **`BUILD SUCCESSFUL in 6m 4s`** 확인. `createBundleDebugJsAndAssets` 태스크가 실행됨을 별도로 확인.
  4. APK 내부 확인: `unzip -l app-debug.apk`로 `assets/index.android.bundle` 파일이 1,033,612 bytes(약 1.01MB)로 존재함을 확인(0바이트 아님). APK 전체 용량은 수정 전 130,163,456 bytes → 수정 후 131,131,617 bytes로 약 968KB 증가(번들 크기와 대체로 일치, 리더 예상대로 눈에 띄게 커짐).
  5. JS/TS 회귀 확인: `npx tsc --noEmit`(에러 0), `npx eslint .`(에러 0, 기존과 동일한 13개 warning만), `npx jest`(1/1 통과) 모두 재확인.
- 상태: 완료(검증 대기)
- 변경 파일: `apps/mobile/android/app/build.gradle`.
- 비고(검증 시 주의):
  - iOS는 이번 이슈와 무관(Android debug 변형 번들링 설정 전용)이라 손대지 않았다. iOS는 별도 스토어/TestFlight 배포 경로를 쓰므로 이번 수정과 관계없다.
  - `docs/specs/`, `docs/design/`은 읽지 않고 수정도 하지 않았다(이번 작업 범위에 해당 문서 참조가 필요 없었음).
  - 커밋하지 않았다 — 리더 검토 후 커밋/푸시, 새 GitHub Actions debug APK 릴리즈로 실기기 재설치 테스트는 리더/사용자 몫.
  - Metro 연동 자체가 실제로 안 끊기는지는 문서 근거로만 확인했고 이 환경(Windows, 실기기 USB 연결 없음)에서 `npx react-native run-android`로 직접 재현 테스트는 하지 못했다 — 검증 단계에서 로컬 개발 워크플로우(Metro 기동 후 디버그 빌드 실행)도 함께 확인하면 더 확실하다.

## 2026-07-25 (플레이리스트 순서 변경 실구현 + YouTube 세션 화면 신규)
- 작업: `docs/qa/spotify-mvp-round1-checklist.md` 4.13(순서 변경 미구현)·4.17(코드 참여, 이번 라운드 범위 아님 — 손대지 않음) 중 4.13 처리 + YouTube 전용 세션 생성/Now Playing 화면 신규.
  1. **[작업 1] 플레이리스트 드래그 재정렬 → 실제 동작하는 ▲/▼ 순서 변경으로 구현**.
     - `react-native-draggable-flatlist` 등 드래그 라이브러리를 새로 설치하지 않았다 — `package.json` 확인 결과 `react-native-gesture-handler`/`reanimated`도 설치돼 있지 않아(react-native-screens는 있지만 제스처 라이브러리는 없음), 새 네이티브 의존성을 추가하면 이번 라운드에 Android/iOS 빌드 재검증 부담이 다시 생긴다고 판단(리더가 언급한 우려와 동일). `04-playlist.md` 110행이 "드래그 앤 드롭 **등**"이라고 방식을 한정하지 않은 점을 근거로 순수 JS 방식을 택했다.
     - `SessionContext.tsx`에 `requestMoveTrack(entryId, 'up' | 'down')` 신규 — `session.playlist` 배열 순서 자체가 재생 순서(커서=`playback.currentEntryId`의 인덱스)라는 기존 불변식(requestNextTrack/requestPrevTrack/removeTrack이 이미 이 불변식에 의존)을 그대로 이용해, "현재 재생 중인 곡의 인덱스보다 뒤"에서만 두 항목을 swap하고 `sessionService.reorderPlaylist`(이미 존재했으나 미사용이던 함수)로 커밋한다. 재생 완료 곡/현재 곡 쪽으로 넘어가려는 이동은 경계에서 무시(guard).
     - `PlaylistView.tsx`의 `TrackRow`: "다음 곡들" 섹션(재생 완료 아님 + 현재 재생 중 아님)에서만 기존 ⠿ 자리에 ▲/▼ 버튼을 렌더링, 재생 완료(readOnly) 섹션은 기존처럼 순서 변경 불가 유지(00-ux-flow.md 2.10b 정책). 첫 곡은 ▲, 마지막 곡은 ▼가 비활성화(`disabled`+낮은 opacity+`accessibilityState`).
  2. **[작업 2] YouTube 전용 세션 생성 + Now Playing 화면 신규**.
     - `CreateSessionScreen.tsx`: 서비스 라디오를 `useState<MusicService>`로 전환, Spotify/YouTube 둘 다 탭으로 선택 가능하게 활성화(혼합은 지시대로 계속 비활성 유지, 건드리지 않음). 안내 배너 문구를 00-ux-flow.md 2.6절 확정 문구("이 방은 YouTube 전용이에요. YouTube 정책상 무광고가 보장되지 않아 광고가 보일 수 있어요." + "나중에 세션 설정에서 전환할 수 있어요")로 정확히 맞춤.
     - `screens/room/YouTubeNowPlayingView.tsx` 신규(00-ux-flow.md 2.10c 목업 그대로 반영): 앨범아트 대신 WebView/IFrame Player 자리(최소 200px 높이, 정책 요구사항)를 플레이스홀더로 확보 — 실제 렌더링은 TODO. Spotify용 진행바(progress track)는 2.10c 목업에 없어 그대로 생략(IFrame Player 자체가 진행 상태를 표시하는 구조라는 근거). 컨트롤(⏮⏯⏭)은 플레이어 영역 **바깥**(아래)에 배치해 정책(02-key-ui-patterns.md 4절 "플레이어 영역 위에 오버레이 금지")을 지켰다.
     - `services/youtube/youtubePlayerStub.ts` 신규 — `spotifyRemote.ts`와 동일한 STUB 패턴(`playVideo/pauseVideo/seekTo/isAdPlaying`). 커스텀 재생 버튼이 반드시 IFrame Player의 실제 재생을 트리거해야 한다는 정책(2.10c)을 지키기 위해 지금부터 버튼 → 이 STUB 호출 경로를 배선해뒀다(실제 구현체 교체 시 버튼 쪽 코드 변경 불필요).
     - **"광고 재생 중" 상태**: 신규 5번째 상태를 만들지 않고 기존 "맞추는 중" 배지에 `reasonLabel: '광고 재생 중'`을 얹는 기존 패턴(02-key-ui-patterns.md 2.2a, `SyncStatusBadge`가 이미 이 필드를 지원)을 그대로 따름. 실제 감지는 `youtubePlayerController.isAdPlaying()`이 담당하는데 지금은 항상 `false`(TODO, 실제 IFrame Player 연동 후 교체) — 감지 불확실 시 단정적으로 보여주지 않는다는 원칙(2.2a)을 지키기 위해 가짜 토글/데모 상태를 임의로 만들지 않았다.
     - Free 계정 배너: `NowPlayingView.tsx`(Spotify 전용)에만 그대로 있고 `YouTubeNowPlayingView.tsx`에는 아예 없음(컴포넌트 자체를 분리했으므로 가드 우회 걱정 없음) — `RoomScreen.tsx`가 `session.service === 'youtube'`일 때만 `YouTubeNowPlayingView`로 라우팅하도록 분기 추가해 재확인함.
     - `PlaylistView.tsx` 재사용: 상단 서비스 칩을 `session.service`에 따라 "🟢 Spotify 플레이리스트"/"🔴 YouTube 플레이리스트"로 분기(`brandColors.youtubeRed`, 기존 토큰 재사용 — 새 색상 만들지 않음). `AddTrackModal.tsx`에 `service` prop 추가, YouTube 세션이면 실제 Spotify Web API 대신 `services/youtube/youtubeMockSearch.ts`(신규, 정적 목업 5곡 + 대소문자 무시 부분일치 필터 + 인위적 300ms 지연) 결과를 사용 — 실제 YouTube Data API 연동은 TODO로 명시.
- 상태: 완료(검증 대기)
- 변경 파일: `apps/mobile/src/state/SessionContext.tsx`(`requestMoveTrack` 신규), `apps/mobile/src/screens/room/PlaylistView.tsx`(▲/▼ 버튼, 서비스 칩 분기), `apps/mobile/src/components/AddTrackModal.tsx`(`service` prop), `apps/mobile/src/screens/CreateSessionScreen.tsx`(YouTube 라디오 활성화, 배너 문구 갱신), `apps/mobile/src/screens/RoomScreen.tsx`(YouTube Now Playing 라우팅), 신규: `apps/mobile/src/screens/room/YouTubeNowPlayingView.tsx`, `apps/mobile/src/services/youtube/youtubePlayerStub.ts`, `apps/mobile/src/services/youtube/youtubeMockSearch.ts`.
- 비고(검증 시 주의):
  - **새 패키지 설치 없음** — `package.json` 변경 없음(제스처/드래그/WebView 라이브러리 전부 미설치 상태 그대로). 따라서 Android 빌드 재검증은 회귀 확인 목적으로만 수행.
  - `npx tsc --noEmit`(0 errors), `npx eslint .`(0 errors, 16 warnings — 기존 13개 + 이번 라운드 신규 3개(`CreateSessionScreen.tsx`의 라디오 opacity, `PlaylistView.tsx`의 ▲/▼ opacity 2건, `YouTubeNowPlayingView.tsx`의 이전곡 버튼 opacity), 전부 기존과 동일한 관용적 `react-native/no-inline-styles` 조건부 스타일 패턴), `npx jest`(1/1 통과) 모두 확인.
  - **Android 빌드 재검증**: JAVA_HOME=`D:\Android Studio\jbr`, ANDROID_HOME/ANDROID_SDK_ROOT=`E:\Android\Sdk`, GRADLE_USER_HOME=`E:\gradle-home`로 `./gradlew.bat assembleDebug --no-daemon` 실행 → **BUILD SUCCESSFUL in 23s**(대부분 UP-TO-DATE, JS 전용 변경이라 네이티브 재컴파일 거의 없었음 — 예상대로 회귀 없음). iOS는 이번에도 macOS 부재로 실기기/시뮬레이터 빌드는 수행하지 못했다(코드는 `Platform.OS` 분기나 iOS 전용 API를 쓰지 않아 리스크는 낮다고 판단하나 최종 확인은 검증 에이전트 몫).
  - `requestMoveTrack`의 순서 변경 범위 판단(현재 재생 중인 곡 인덱스보다 뒤에서만 swap)은 `requestNextTrack`/`requestPrevTrack`이 이미 전제하고 있던 "playlist 배열 순서 = 재생 순서" 불변식을 그대로 재사용한 것이라 새로운 데이터 모델을 추가하지 않았다 — 다만 이 불변식 자체가 코드에 암묵적으로만 존재하고 타입 수준에서 강제되지는 않는다는 점은 기존과 동일한 구조적 약점으로 남아 있다(Firebase 연동 시 서버 측에서도 이 불변식을 지켜야 함, 참고용으로 남김).
  - YouTube 세션의 host `accountTier`는 여전히 `profile.isPremium`(Spotify Premium 여부)에서 그대로 가져온다 — 실제 Google/YouTube 계정 연동이 이번 라운드도 범위 밖이라 의미상 정확하지 않은 필드지만, Free 배너가 `session.service === 'spotify'` 가드로 완전히 분리돼 있어 YouTube 세션 화면에는 어떤 영향도 주지 않음을 확인했다. YouTube의 "참여 인원" 표시도 Premium/Free 구분 없이 전체 인원만 보여주도록 별도 로직으로 분리해뒀다(`YouTubeNowPlayingView.tsx`의 `suffix` 계산).
  - 혼합(Mixed) 세션은 지시대로 전혀 건드리지 않았다(`CreateSessionScreen.tsx`의 혼합 라디오는 여전히 disabled+"곧 지원 예정").
  - 다음 라운드 TODO(둘 다 이번 라운드에서 새로 발견한 것은 아니고, STUB/플레이스홀더 코드에 이미 주석으로 남겨둠): (1) `react-native-webview` 설치 + YouTube IFrame Player 실제 렌더링/재생 트리거/광고 감지(`youtubePlayerStub.ts` 교체), (2) YouTube Data API v3 실제 검색 연동(`youtubeMockSearch.ts` 교체). 둘 다 이번 라운드 지시 범위 밖이었다.

## 2026-07-25 (R3.17 버그 수정 — ParticipantsBottomSheet Free UI 서비스 가드 누락)
- 작업: `docs/qa/spotify-mvp-round1-checklist.md` Round 3 검증 R3.17(유일한 실패 항목) 수정. `ParticipantsBottomSheet.tsx`가 `session.service`를 전혀 참조하지 않아 YouTube 세션에서도 Free 계정 참여자에게 "Free · 재생 불가" 태그와 "참여 N명 (재생 M명)" 조건부 헤더가 그대로 노출되던 문제.
  - `ParticipantsBottomSheet.tsx`: `session: SessionState` prop 신규 추가. `NowPlayingView.tsx`(`screens/room/NowPlayingView.tsx`)가 이미 쓰던 `session.service === 'spotify'` 가드와 동일한 패턴으로 `showFreeTierUi = session.service === 'spotify'` 파생값을 계산 — 헤더 타이틀 분기(`!showFreeTierUi || playableCount === participants.length`일 때 "참여자 (N)"만 표시)와 `ParticipantRow`의 Free 태그 렌더 조건(`showFreeTierUi && participant.accountTier === 'free'`) 둘 다에 적용. `ParticipantRow`에 `showFreeTierUi: boolean` prop 추가해 전달.
  - `RoomScreen.tsx`: `ParticipantsBottomSheet` 렌더링부에 `session={session}` prop 추가(기존에는 `participants={session.participants}`만 넘기고 `session` 자체는 넘기지 않았음 — R3.17에서 지적된 근본 원인).
  - `mockSessionSeed.ts`/`sessionService.ts`의 시딩 로직(`service` 파라미터 미전달)은 이번 수정 범위에 포함하지 않았다 — R3.17 지적 원문은 "Free 태그/헤더가 새어 나가는 UI 가드 부재"를 실패 사유로 명시했고, 이번 수정으로 YouTube 세션에서는 `accountTier` 값과 무관하게 Free 관련 UI 자체가 렌더되지 않으므로(가드가 시딩보다 상위에서 차단) 재현 시나리오는 해결된다. 시딩 로직 자체를 서비스 인지하게 바꾸는 것은 지시 범위(이번 라운드는 이 버그 하나에 집중) 밖이라 손대지 않음.
- 상태: 완료(검증 대기)
- 변경 파일: `apps/mobile/src/components/ParticipantsBottomSheet.tsx`, `apps/mobile/src/screens/RoomScreen.tsx`.
- 비고(검증 시 주의):
  - `npx tsc --noEmit`(0 errors), `npx eslint .`(0 errors, 16 warnings — 전부 기존 관용적 `react-native/no-inline-styles`, 이번 수정으로 신규 발생한 경고 없음), `npx jest`(1/1 통과) 모두 확인.
  - 재현 시나리오는 코드 추적으로 확인: YouTube 세션(`session.service === 'youtube'`)에서는 `showFreeTierUi`가 항상 `false`이므로 `accountTier === 'free'`인 참여자가 시드돼 있어도 태그가 렌더되지 않고, 헤더도 항상 "참여자 (N)"만 표시된다(재생 인원 구분 없음, 지시사항대로 정원만 표시). Spotify 세션에서는 기존 동작(Free 태그·조건부 헤더) 그대로 유지 — 회귀 없음.
  - `docs/specs/`, `docs/design/`은 읽기만 하고 수정하지 않았다. 커밋은 하지 않았다 — 리더 검토 후 커밋.

## 2026-07-26 (SameWave 표시 이름 + 실제 앱 아이콘 적용)
- 작업: 마케팅 이름 "SameWave"(`docs/design/04-app-naming.md`) 확정에 따라 실기기 홈 화면 표시 이름 및 안드로이드 런처 아이콘을 실제 값으로 교체.
  1. **표시 이름 변경**(내부 RN 컴포넌트 등록 이름 `"mobile"`은 그대로 유지, 3개 파일 모두 일치 확인):
     - `apps/mobile/android/app/src/main/res/values/strings.xml`: `app_name` `"Feel Music Share"` → `"SameWave"`(안드로이드 홈 화면/설정 앱 목록 표시명).
     - `apps/mobile/app.json`: `displayName` `"mobile"` → `"SameWave"` (`name`은 `"mobile"` 그대로).
     - `apps/mobile/ios/mobile/Info.plist`: `CFBundleDisplayName` `"Feel Music Share"` → `"SameWave"` (iOS는 이번 스코프에서 빌드 검증 없이 텍스트만 변경).
  2. **실제 앱 아이콘(안드로이드) 적용**: `docs/design/03-screen-mockups.html`의 `<figure class="icon-showcase">` 인라인 SVG(`viewBox="0 0 192 192"`, 노을 그라디언트 배경 + 반투명 원 두 개 + 파형 + 수평선 + 작은 원)를 그대로 추출해 사용, 새 디자인을 만들지 않음.
     - 도구: 이 머신에 ImageMagick(`magick`)/Inkscape/`rsvg-convert` 모두 미설치 확인(`convert.exe`는 Windows 기본 디스크 변환 도구라 사용 불가) → `sharp`(SVG→PNG 래스터라이즈 지원)를 `apps/mobile`에 devDependency로 설치(`package.json`에 `"sharp": "^0.35.3"` 추가, 런타임 앱 번들에는 포함 안 됨, 일회성 스크립트 용도).
     - 일회성 Node 스크립트(스크래치 디렉터리에서 실행 후 삭제, 저장소에는 남기지 않음)로 SVG를 밀도별 픽셀 크기로 렌더링(`density: 384`, `resize({fit:'cover'})`, `flatten({background:'#4A2545'})`로 알파 채널 제거해 투명 배경 없이 노을 그라디언트가 꽉 채워지도록 처리)해 `mipmap-mdpi`(48×48) / `mipmap-hdpi`(72×72) / `mipmap-xhdpi`(96×96) / `mipmap-xxhdpi`(144×144) / `mipmap-xxxhdpi`(192×192) 각 밀도 폴더의 `ic_launcher.png`·`ic_launcher_round.png`(동일 정사각형 PNG 사용, 런처가 필요시 원형 마스킹)를 교체.
     - **적응형 아이콘(API 26+, `mipmap-anydpi-v26`)**: 프로젝트에 해당 리소스가 애초에 존재하지 않음(확인 완료, `find` 결과 legacy `mipmap-*/ic_launcher*.png`만 존재) → 지시대로 legacy 아이콘 교체만 확실히 마무리했고 적응형 아이콘 신규 추가는 이번 라운드 범위 밖으로 남김(TODO).
- 상태: 완료(검증 대기)
- 변경 파일: `apps/mobile/android/app/src/main/res/values/strings.xml`, `apps/mobile/app.json`, `apps/mobile/ios/mobile/Info.plist`, `apps/mobile/android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher.png`(및 `ic_launcher_round.png`), `apps/mobile/package.json`/`package-lock.json`(devDependency `sharp` 추가).
- 비고(검증 시 주의):
  - 렌더링 결과 검증: `file` 명령으로 각 PNG가 의도한 픽셀 크기(48/72/96/144/192)·RGB(알파 없음, 투명 배경 아님) 확인. `Read` 도구로 192×192 PNG를 직접 시각 확인 — 노을 그라디언트, 겹친 두 원, 파형, 수평선, 작은 점 모두 목업과 일치.
  - `npx tsc --noEmit`(0 errors), `npx eslint .`(0 errors, 16 warnings — 전부 기존 관용적 `react-native/no-inline-styles`, 이번 변경으로 신규 발생한 경고 없음), `npx jest`(1/1 통과) 모두 확인.
  - Android 빌드: JAVA_HOME=`D:\Android Studio\jbr`, ANDROID_HOME/ANDROID_SDK_ROOT=`E:\Android\Sdk`, GRADLE_USER_HOME=`E:\gradle-home`로 `./gradlew.bat assembleDebug` 실행 → **BUILD SUCCESSFUL in 1m 10s**. 생성된 `app-debug.apk`를 `unzip -l`로 확인해 새 PNG가 정확한 파일 크기(각 밀도별 원본과 바이트 단위 일치)로 `res/mipmap-*-v4/ic_launcher.png`·`ic_launcher_round.png`에 패키징됐음을 확인. 추가로 `aapt2 dump badging`으로 `application-label:'SameWave'`, `application: label='SameWave' icon='res/mipmap-mdpi-v4/ic_launcher.png'` 확인 — 표시 이름·아이콘 경로 모두 최종 APK에 반영됨.
  - iOS는 이번에도 macOS 부재로 빌드 검증 미수행(Info.plist 텍스트 변경만, 지시사항대로 스코프 밖).
  - `docs/specs/`, `docs/design/`은 읽기만 하고 수정하지 않았다. 커밋은 하지 않았다 — 리더 검토 후 커밋.

## 2026-07-26 (YouTube 실제 재생 연동 — WebView + IFrame Player API)
- 작업: YouTube 세션의 실제 영상 재생 연동. 이전 라운드까지는 UI 골격뿐이던 `YouTubeNowPlayingView`/`youtubePlayerStub`를 실제 `react-native-webview` 기반 IFrame Player 제어로 교체(`docs/specs/03-youtube-integration.md` 2절/8절 채택 아키텍처 "대안 A — 로컬 임베드 재생 + 명령 동기화" 그대로 구현).
  1. `services/youtube/youtubePlayerHtml.ts`(신규): `<WebView source={{html}}>`에 주입할 HTML/JS 템플릿 생성기. `https://www.youtube.com/iframe_api` 로드 후 `onYouTubeIframeAPIReady`에서 `new YT.Player(...)` 생성, `window.__yt*` 전역 함수(`__ytPlayVideo/__ytPauseVideo/__ytSeekTo/__ytLoadVideoById/__ytCueVideoById`)를 RN → WebView 커맨드 진입점으로 노출, `onStateChange`마다 `getVideoData().video_id`가 요청한 videoId와 다르면 광고로 간주하는 휴리스틱으로 `{type:'stateChange', isAd}`를 `window.ReactNativeWebView.postMessage`로 RN에 전달(표준 IFrame Player API 함수만 사용, DOM 조작/광고 스킵 코드 없음 — 8-2절 Section III.I.5/6 준수).
  2. `services/youtube/youtubePlayerStub.ts`(파일명 유지, 내용 전면 교체 — STUB → 실제 구현): `WebViewYoutubePlayerController` 클래스가 `_attachWebView(ref)`/`_handleBridgeMessage(event)`로 WebView 인스턴스를 붙이고 메시지를 파싱, `playVideo/pauseVideo/seekTo/loadVideoById/cueVideoById`는 `injectJavaScript`로 커맨드를 보내되 IFrame Player가 아직 `ready` 신호를 보내기 전에는 큐에 쌓아뒀다가 ready 시점에 순서대로 flush. `seekTo()`는 `isAdPlaying()`이 true이면 무조건 무시(8-3절 "광고 중 서버발 seek 무시" 정책을 컨트롤러 레벨에서 마지막 방어선으로 한 번 더 적용). `isAdPlaying()`/`onAdStateChanged(listener)`로 광고 상태를 노출 — `YouTubeNowPlayingView`가 이 이벤트를 구독해 리렌더. `extractYoutubeVideoId(serviceTrackId)` 헬퍼 신규 — `youtube:video:<id>` 접두사를 벗겨 videoId를 추출(접두사 없으면 원본 문자열 그대로 폴백, 향후 실 API 연동 대비).
  3. `screens/room/YouTubeNowPlayingView.tsx`: 플레이스홀더 `<View>` 자리를 실제 `<WebView>`로 교체(200px 최소 높이 유지, 컨트롤은 여전히 플레이어 바깥에 배치 — 5절/8-2절 정책 유지). 최초 영상은 HTML 자체에 구워서(`useMemo`, 빈 deps — 재마운트 방지) 로드하고, 이후 곡 전환은 `session.playback.currentEntryId` 변경을 감시하는 단일 `useEffect`가 `loadVideoById`(재생 중)/`cueVideoById`(일시정지 중)를 호출하도록 일원화 — `requestNextTrack`/`requestPrevTrack`/자동 다음 곡(곡 삭제) 등 진입 경로를 개별 배선할 필요 없이 entryId 변경 감지 하나로 전부 커버. `isAdPlaying` 상태를 구독해 `SyncStatusBadge`에 "맞추는 중... (광고 재생 중)"으로 반영(기존 `reasonLabel` 패턴 재사용, UI 변경 없음).
  4. 부수 수정: `WebView`(클래스 컴포넌트, 제네릭 `P = undefined`)를 `useRef<WebView>`/`ref` prop에 직접 쓰면 `react-native-webview@14.0.1` + TS 5.0.4 조합에서 `No overload matches this call`(props가 `never`로 추론) 오류가 나는 것을 확인 — `React.ElementRef<typeof WebView>`로 우회(컨트롤러/뷰 양쪽 다 적용). `jest.config.js`의 `transformIgnorePatterns`에 `react-native-webview` 추가(ESM `import` 구문이 기본적으로 jest 변환 대상에서 제외돼 있어 `__tests__/App.test.tsx`가 파싱 실패하던 문제 수정). `__mocks__/react-native-webview.js`(신규) — 네이티브 모듈(`RNCWebViewModule`) 부재로 인한 `TurboModuleRegistry` 예외를 막기 위해 `WebView`를 더미 `View`로 대체하는 jest manual mock 추가(node_modules 패키지 대상 mock이라 별도 `jest.mock()` 호출 없이 자동 적용됨).
  5. `SessionContext.tsx`는 의도적으로 건드리지 않음 — Spotify(`spotifyRemote.ts`)와 동일한 패턴대로, 서비스별 실제 플레이어 제어는 해당 서비스 전용 Now Playing 뷰 안에서만 일어나고 컨텍스트는 서비스 불가지론적(Firebase 지향) 상태로 유지.
- 상태: 완료(검증 대기)
- 변경 파일(신규): `apps/mobile/src/services/youtube/youtubePlayerHtml.ts`, `apps/mobile/__mocks__/react-native-webview.js`. (수정): `apps/mobile/src/services/youtube/youtubePlayerStub.ts`(전면 교체), `apps/mobile/src/screens/room/YouTubeNowPlayingView.tsx`, `apps/mobile/jest.config.js`. `apps/mobile/package.json`/`package-lock.json`의 `react-native-webview: ^14.0.1` 의존성은 직전(중단된) 세션에서 이미 추가돼 있던 것을 그대로 사용(버전 갱신 없이 유지).
- 비고(검증 시 주의):
  - `npx tsc --noEmit`: **0 errors**. `WebView` 관련 오버로드 오류는 `React.ElementRef<typeof WebView>` 우회로 해결(위 4번 참고, `WebView<undefined>`를 직접 참조하면 재현됨 — 검증 에이전트가 향후 react-native-webview 버전을 올릴 경우 이 타입 이슈가 해결됐는지 재확인 권장).
  - `npx eslint .`: **0 errors, 16 warnings** — 전부 기존 관용적 `react-native/no-inline-styles`(이번 변경으로 `YouTubeNowPlayingView.tsx`에 1건 늘었으나 `NowPlayingView.tsx`의 기존 동일 패턴 `opacity: hasPrevTrack ? 1 : 0.4`과 동일한 종류, 신규 유형 경고 없음). 처음에는 `react-hooks/exhaustive-deps` 관련 불필요한 `eslint-disable` 주석 때문에 `eslint-comments/no-unused-disable` 경고가 하나 더 있었는데, 실제로 위반이 없는 effect의 disable 주석을 제거해 해소함(최종 16건에는 포함 안 됨).
  - `npx jest`: **1/1 통과**(`__tests__/App.test.tsx` 스모크 테스트, `App` 전체 트리를 렌더링하므로 `YouTubeNowPlayingView`/WebView import 경로도 실제로 통과됨 — 단, 렌더 자체는 초기 화면이 `Onboarding`이라 YouTube 룸 화면까지 실제로 마운트되지는 않는다. WebView 관련 코드가 "임포트되어도 크래시하지 않는다"는 수준까지만 이 테스트로 확인됨, YouTube Now Playing 화면 자체의 렌더링 스냅샷/유닛 테스트는 이번 라운드에서 신규 작성하지 않았다 — TODO).
  - Android 빌드: `JAVA_HOME=D:\Android Studio\jbr`, `ANDROID_HOME`/`ANDROID_SDK_ROOT=E:\Android\Sdk`, `GRADLE_USER_HOME=E:\gradle-home`로 `cd apps/mobile/android && ./gradlew.bat assembleDebug --no-daemon` 실행 → **BUILD SUCCESSFUL in 1m 46s**. 로그에 `:react-native-webview:compileDebugKotlin`, `:react-native-webview:compileDebugJavaWithJavac`, `:react-native-webview:assembleDebug` 태스크가 모두 정상 실행/성공한 것을 확인 — `settings.gradle`의 `autolinkLibrariesFromCommand()` 방식 autolinking이 별도 수동 설정 없이 신규 네이티브 모듈을 정상 인식함(이번 라운드 최대 리스크로 지목됐던 지점, 문제 없음으로 확인).
  - iOS는 이번에도 macOS 부재로 빌드 검증 미수행(지시사항대로 스코프 밖, 문서화만).
  - **실기기/에뮬레이터 런타임 미검증(지시사항대로 이번 라운드 필수 아님)** — 다음 라운드/검증 단계에서 특히 확인이 필요한 것들:
    1. 광고 감지 휴리스틱(`getVideoData().video_id` 불일치 판정)의 실제 정확도 — IFrame Player API가 광고 재생 여부를 나타내는 전용 상태 코드를 공식 문서에 노출하지 않아 채택한 실무적 휴리스틱이라, 실기기에서 오탐/미탐 가능성이 있음.
    2. `mockSessionSeed.ts`의 데모 시드 플레이리스트는 서비스와 무관하게 항상 `spotify:track:demoN` 형식이라(기존부터 있던 제약, 이번 라운드에서 고치지 않음 — 범위 밖), YouTube 세션이어도 데모 진입 시 `extractYoutubeVideoId`가 그 문자열 전체를 videoId로 취급해 실제 존재하지 않는 영상 ID를 요청하게 된다. `AddTrackModal`로 직접 곡을 추가하면(`youtubeMockSearch.ts`가 `youtube:video:mockN` 형식을 쓰므로) 프리픽스 파싱 자체는 의도대로 동작하지만, 그 `mockN`도 실제 YouTube videoId가 아니라서 실기기에서는 결국 `onError` 콜백으로 이어질 것으로 예상됨(YouTube Data API 실연동 전까지는 근본적으로 해결 불가 — CLAUDE.md 지시대로 이번 라운드 범위 밖).
    3. WebView 안에서 자동재생(`autoplay`/`mediaPlaybackRequiresUserAction={false}`)이 실제 Android/iOS 기기에서 사용자 제스처 없이 정상 동작하는지는 미검증.
  - `docs/specs/`, `docs/design/`은 읽기만 하고 수정하지 않았다. 커밋은 하지 않았다 — 리더 검토 후 커밋.

## 2026-07-26 (버그 수정: R5.17 WebView 재부착 경합)
- 작업: `docs/qa/spotify-mvp-round1-checklist.md` "Round 5 검증"에서 지적된 R5.17(WebView ref 재부착 경합 버그) 수정. `YouTubeNowPlayingView.tsx`의 WebView attach `useEffect`가 빈 의존성 배열(`[]`)이라 컴포넌트 최초 마운트 시 1회만 실행되는 것이 원인 — `currentVideoId`가 `null`이 되어 `<WebView>`가 언마운트됐다가 이후 새 곡 추가로 다시 마운트돼도 이 effect가 재실행되지 않아 `youtubePlayerController` 내부 webView 참조가 영구히 `null`로 남고, 이후 모든 재생 명령(`playVideo/pauseVideo/loadVideoById/cueVideoById`)이 `pendingCommands` 큐에 쌓인 채 flush되지 않는 문제였다.
  - 수정: `currentVideoId`로부터 파생한 `isWebViewMounted = Boolean(currentVideoId)`(안정적인 boolean, WebView가 실제로 JSX에 렌더링되는지 여부와 정확히 일치)를 새 변수로 선언하고, attach effect의 의존성 배열을 `[]`에서 `[isWebViewMounted]`로 변경. `currentVideoId` 값 자체(같은 세션 안에서 곡이 바뀔 때마다 매번 달라짐)에 직접 의존하지 않은 이유: WebView 인스턴스는 그대로인데 매 곡 전환마다 불필요한 detach/재attach가 일어나는 것을 피하기 위함(리더 지시사항의 권고를 그대로 채택). 참고로 `Boolean(currentVideoId)`를 의존성 배열에 인라인으로 직접 쓰면 `react-hooks/exhaustive-deps`가 "complex expression, extract it to a separate variable"로 에러를 내므로(정적 분석 불가) 반드시 별도 변수로 추출해야 했다 — 처음 인라인으로 시도했다가 `npx eslint .`에서 에러 1건을 발견해 변수 추출로 수정.
  - 재마운트 시 재부착이 보장되는 근거(코드 추적, 시나리오별):
    | 시나리오 | `isWebViewMounted` 이전 값 → 이후 값 | effect 재실행 여부 | WebView 실제 상태와의 정합성 |
    |---|---|---|---|
    | 최초 마운트(곡 있음) | (없음) → `true` | 실행(mount) — `_attachWebView(webViewRef.current)` | WebView가 이미 렌더링된 이후 effect가 실행되므로(effect는 커밋 이후 실행되는 React 규칙) `webViewRef.current`가 non-null — 정상 attach |
    | 플레이리스트 전부 삭제(곡 없음) | `true` → `false` | 재실행 — 이전 effect의 cleanup(`_attachWebView(null)`)이 먼저 실행된 뒤, 새 effect 실행(`_attachWebView(webViewRef.current)`이나 이 시점엔 `<WebView>`가 이미 언마운트돼 `webViewRef.current`가 `null`) | detach 정상, 이후 재부착 시도도 `null`로 정합적(어차피 렌더링 안 됨) |
    | 새 곡 추가로 다시 채워짐(R5.17 재현 경로) | `false` → `true` | 재실행 — cleanup(`_attachWebView(null)`, 이미 null이라 no-op) → 새 effect 실행 시점에는 React가 커밋 단계를 마쳐 `<WebView>`가 이미 마운트된 뒤이므로 `webViewRef.current`가 새 WebView 인스턴스를 가리킴 — **여기가 버그의 핵심 수정 지점**: 기존엔 이 전환에서 effect가 전혀 재실행되지 않아 `null`로 영구 고정됐으나, 이제는 정확히 재실행되어 재부착됨 |
    | 같은 세션 안에서 곡만 전환(WebView 유지) | `true` → `true`(값 불변) | 재실행 안 함 | 불필요한 재부착 없음(의도한 최적화, 리더 지시사항의 트레이드오프 판단 그대로 채택) |
    | 컴포넌트 전체 언마운트(Now Playing 탭 이탈 등, 곡 있는 상태) | `true` → (없음) | cleanup만 실행(`_attachWebView(null)`) | 정상 detach, 메모리/참조 누수 없음 |
  - React의 `useEffect` cleanup 규칙(의존성이 바뀔 때마다 새 effect 실행 전에 이전 cleanup이 먼저 실행됨)에 따라 detach가 항상 재attach보다 선행되므로 이중 attach나 stale 참조가 남을 여지가 없다.
- 상태: 완료(검증 대기)
- 변경 파일: `apps/mobile/src/screens/room/YouTubeNowPlayingView.tsx`(attach effect 의존성 수정 + `isWebViewMounted` 변수 추가 + 주석 보강). 다른 파일은 건드리지 않음(지시사항대로 이번 버그 1건에만 집중).
- 비고(검증 시 주의):
  - `npx tsc --noEmit`: **0 errors**(round 5와 동일).
  - `npx eslint .`: **0 errors, 16 warnings** — round 5와 정확히 동일한 개수/종류(전부 기존 관용적 `react-native/no-inline-styles`). 처음 `Boolean(currentVideoId)`를 의존성 배열에 인라인으로 넣었을 때는 `react-hooks/exhaustive-deps` 에러가 1건 발생했었으나(위에서 설명한 대로 변수 추출로 해소), 최종 버전에서는 에러 0건.
  - `npx jest`: **1/1 통과**(`__tests__/App.test.tsx`), round 5와 동일.
  - Android 빌드: `JAVA_HOME=D:\Android Studio\jbr`, `ANDROID_HOME`/`ANDROID_SDK_ROOT=E:\Android\Sdk`, `GRADLE_USER_HOME=E:\gradle-home`로 `cd apps/mobile/android && ./gradlew.bat assembleDebug --no-daemon` 실행 → **BUILD SUCCESSFUL in 23s**(대부분 UP-TO-DATE, 이번 변경은 JS 전용이라 네이티브 재컴파일 없음 — 예상대로 회귀 없음). `clean` 완전 재빌드는 이번 라운드에서 별도로 재실행하지 않았다(round 5에서 이미 클린 빌드로 확인됐고, 이번 변경이 순수 JS라 네이티브 레이어에 영향을 줄 수 없다고 판단 — 검증 에이전트가 필요하다고 판단하면 재확인 요청 가능).
  - iOS는 이번에도 macOS 부재로 빌드 검증 미수행(구조적 제약, round 1부터 동일).
  - 이 버그는 실기기 없이 코드 추적만으로 재현/수정 근거를 확보했다 — 위 표의 5개 시나리오가 검증 에이전트가 재현 시나리오를 재추적할 때 참고할 수 있도록 상세히 남겨둔다. 실기기에서의 최종 확인(플레이리스트를 비웠다가 새 곡을 추가하고 실제로 영상이 재생되는지)은 여전히 별도 필요(round 5 R5.18~R5.21과 동일 범주 제약).
  - `docs/specs/`, `docs/design/`은 이번에도 읽기/수정 없음. 커밋은 하지 않았다 — 리더 검토 후 커밋.

## 2026-07-26 (Spotify Client ID 실값 반영)
- 작업: 사용자가 Spotify Developer Dashboard에서 앱 등록 후 발급받은 실제 Client ID를 `apps/mobile/src/config/env.ts`의 `ENV.SPOTIFY_CLIENT_ID`에 반영. `'TODO_SPOTIFY_CLIENT_ID'` placeholder → `'4b076092ea1b4f8e9d41b7eaec85920a'`로 교체, 그 외 값(`SPOTIFY_REDIRECT_URI`, `SPOTIFY_APP_REMOTE_REDIRECT_URI`, Firebase placeholder 등)은 지시대로 건드리지 않았다. `.env.example`의 `SPOTIFY_CLIENT_ID=` 줄도 지시대로 빈 채로 유지(수정 안 함). `.env` 기반 설정 전환 같은 리팩터링도 이번 범위에 포함하지 않았다(파일 헤더의 TODO 주석 그대로 유지).
- 상태: 완료(검증 대기)
- 변경 파일: `apps/mobile/src/config/env.ts`(한 줄만 변경).
- 비고(검증 시 주의):
  - `git diff`로 이번 변경이 정확히 그 한 줄(`SPOTIFY_CLIENT_ID` 값)뿐임을 확인했다.
  - `npx tsc --noEmit`: 에러 다수 발생하나 전부 이번 변경과 무관한 기존 이슈임을 `git stash`로 교차 확인 — (1) `__tests__/playlistSequencing.test.ts`·`__tests__/trackMatcher.test.ts`의 `describe/it/expect` 미인식(tsconfig에 jest 타입 미설정, jest 실행 자체는 정상 통과함 — tsc와 jest의 타입 검사 경로가 다름), (2) `src/state/SessionContext.tsx(386,97)` "Expected 4 arguments, but got 5" — 이 작업 시작 시점에 이미 워킹트리에 있던 다른 미완료 작업(`mockSessionSeed.ts`/`sessionService.ts`/`SessionContext.tsx`/`theme/tokens.ts`/`types/domain.ts`가 커밋되지 않은 채 수정된 상태로 남아 있었음, 이번 작업자가 만든 변경 아님)에서 비롯된 것으로 보인다. 이번 작업은 `env.ts` 한 줄만 건드렸으므로 위 에러들에 대한 책임 범위 밖이나, 검증/차기 라운드에서 인지할 수 있도록 남겨둔다.
  - `npx eslint .`: **0 errors, 16 warnings**(기존과 동일, 신규 경고 없음).
  - `npx jest`: **3 suites / 11 tests 전부 통과**(`playlistSequencing.test.ts`, `trackMatcher.test.ts`, `App.test.tsx`) — tsc에서는 타입 에러가 났던 테스트 파일들도 jest 자체 실행(babel 트랜스폼 경로)에서는 정상 통과함, 회귀 아님.
  - 실제 OAuth 로그인 콜백/Premium 확인 플로우는 지시대로 실기기 없이 검증하지 않았다 — 값 반영과 정적 검증까지만 수행. Android/iOS 실기기 빌드도 이번 라운드에서는 수행하지 않았다(지시 범위 밖, 변경이 문자열 값 하나뿐이라 빌드 영향 없음).
  - 커밋은 하지 않았다 — 리더가 처리.

## 2026-07-26 (혼합(Mixed) 세션 모드 실제 구현)

- 작업: `docs/specs/09-cross-platform-mixed-mode.md`/`04-playlist.md`/`00-ux-flow.md`(2.6c/2.10d/2.11a~d/2.13)/`02-key-ui-patterns.md`(5절)를 근거로 세 번째 세션 유형(혼합)을 실제로 구현. `CreateSessionScreen.tsx`의 혼합 라디오가 계속 비활성이던 것을 활성화하고, 데이터 모델·휴리스틱 매칭·매칭 확인 UI 4종·혼합 Now Playing·서비스 전환 UI 숨김까지 전 범위를 다뤘다.

### 스코프 판단(리더/사용자 확인 없이 임의로 넘어가지 않고 여기 근거와 함께 남김)

1. **데이터 모델 — 유니온이 아니라 완전히 별도 타입/배열로 분리**: `PlaylistEntry`(Spotify/YouTube 전용)를 유니온으로 확장하지 않고, `MixedPlaylistEntry`를 신규 타입으로 만들어 `SessionState.mixedPlaylist: MixedPlaylistEntry[]`를 별도 필드로 추가했다(`playlist`는 혼합 세션에서 항상 빈 배열). 근거: 04문서가 "혼합 모드는 기존 모델과 근본적으로 다른 구조"라고 명시했고, 기존 `PlaylistView`/`NowPlayingView`/`YouTubeNowPlayingView`가 이미 `PlaylistEntry.track` 구조에 깊게 의존하고 있어 유니온으로 합치면 모든 소비처에 타입 좁히기 분기가 강제된다. 대신 `session.service`(`'spotify'|'youtube'|'mixed'`)로 어느 배열/뷰를 쓸지 판별하는 방식을 택했다(`types/domain.ts` 주석에도 동일하게 근거 남김).
2. **매칭 신뢰도 가중치/임계값 — 실측 없이 합리적 기본값만, TODO로 명시**: `services/matching/trackMatcher.ts`에 제목 유사도(Levenshtein 기반, 순수 JS 구현 — 새 문자열유사도 패키지 의존성 추가하지 않음) 0.35 + 아티스트 일치 0.45(스펙이 "가장 높은 가중치" 권고) + 길이 근접도 0.2로 가중합, 등급 임계값은 high≥85/medium≥60을 잠정 채택했다. 09문서 "결정 4"가 실측 스파이크 이후 확정을 권고한 값이라 전부 `// TODO(실측 필요, 09-cross-platform-mixed-mode.md "결정 4")` 주석을 달아 조정 지점을 명확히 남겼다 — 이번 라운드에서 임의로 정밀화하지 않았다.
3. **매칭은 참여자별로 절대 조용히 확정되지 않음(결정 2 준수)**: 곡 추가 시 즉시 재생에 반영하는 경로를 만들지 않았다. 곡을 추가한 사람 본인의 선택조차 `confirmState: 'pending'`으로 시작해 매칭 확인 큐(2.11a→2.11b)를 거쳐야 "확정"된다 — 유일한 예외는 **세션 생성 시 시드되는 데모 플레이리스트**(`mockSessionSeed.buildDemoMixedPlaylist`)로, 이건 기존 Spotify/YouTube 전용 세션 시드도 항상 그랬듯 "고정된 데모 표시용 데이터"라 처음부터 `confirmState: 'confirmed'`로 시작한다(사용자가 실제로 조작한 결과가 아니라 화면 채우기용 픽스처). **새로 추가하는 곡부터는 예외 없이 확인 큐를 거친다** — 이게 이번 라운드가 실제로 검증해야 하는 핵심 경로다.
4. **다른 참여자 계정 대신 검색할 수 없는 구조적 한계 — 가짜 데이터로 메우지 않음**: 이 앱은 아직 "코드로 세션 참여"가 동작하지 않아(HomeScreen.tsx, 기존 TODO) 실제로는 이 기기의 로그인 사용자(currentParticipantId, 대부분 호스트)만 실사용자이고 나머지 참여자는 데모 인물이다. `state/mixedMatching.ts`의 `resolveParticipantMatch`는 **platform이 'youtube'인 비-본인 참여자만 실제로 검색·랭킹**하고(목업 검색이라 토큰 불필요), **platform이 'spotify'인 비-본인 참여자는 실제 Spotify 계정(accessToken)이 없어 검색 자체를 수행하지 않고 곧바로 매칭 실패로 반환**한다 — 가짜 매칭 결과를 지어내지 않는다는 원칙(09문서가 요구하는 "불완전함을 감추지 않는다"는 태도와 일치)을 지켰다. 이건 실제 프로덕션(Firebase+각자 로그인)에서는 사라지는 이 앱 특유의 로컬 데모 제약이라 함수 주석에도 명시했다.
5. **혼합 세션에는 서비스 전환 UI가 원래 없다 — "숨긴다"는 요구사항이 자동 충족됨**: 세션 설정(2.13) 화면 자체가 이 코드베이스에 아직 없다(서비스 전환 UI 자체가 어느 세션 유형에도 구현된 적이 없음 — `grep`으로 재확인). 따라서 "혼합 세션에서 전환 UI를 숨겨라"는 요구사항이 자연히 충족된다. 다만 "내가 참여 중인 플랫폼: X (변경 불가)" 같은 읽기 전용 표시가 필요하다는 취지를 살리기 위해, `ParticipantsBottomSheet.tsx`(RoomScreen 헤더 "⋮" 메뉴의 실질적 진입점)에 혼합 세션 전용 안내 텍스트를 추가했다 — 2.13이 아직 없다는 사실이 확인되면 다음 라운드에서 정식 세션 설정 화면으로 옮기는 것을 제안한다.
6. **매칭 큐 네비게이션 단순화**: 2.11a가 "여러 개면 다음/이전으로 넘기는 큐 형태"를 제안했는데, 처리(확정/스킵/수동교체)한 항목은 큐에서 자동으로 빠지고 다음 항목으로 넘어가는 방식으로 구현했다(`MatchingQueueSheet.tsx`) — "다음" 버튼을 눌러 미처리 항목을 건너뛰는 것도 가능(`cursor` 상태), "이전"은 구현하지 않았다(뒤로 가도 액션을 취소할 방법이 없어 실익이 낮다고 판단, 확정 아님 — 필요하면 후속 라운드에서 추가 가능).
7. **참여 플랫폼 선택(2.6c)은 호스트 플로우에만 실제 연결**: `PlatformSelect.tsx`는 props만으로 완결된 재사용 가능 컴포넌트로 만들었지만, 실제로 호출되는 곳은 `CreateSessionScreen.tsx`(호스트가 혼합 세션을 만들 때)뿐이다 — "코드로 참여하기"가 여전히 Alert 스텁(`HomeScreen.tsx`, 기존 라운드부터 있던 제약, 이번 지시 범위 밖)이라 참여자 쪽 진입 경로 자체가 이 앱에 없기 때문. 컴포넌트 자체는 참여자 플로우가 생기면 그대로 재사용 가능하다.
8. **Free 계정 가드가 혼합 세션에 새어 들어가지 않도록 개별 판단으로 전면 교체**: 지시 7번(R3.17 재발 방지)에 따라 `NowPlayingView.tsx`(혼합 분기), `YouTubeNowPlayingView.tsx`(혼합 분기), `ParticipantsBottomSheet.tsx`(`shouldShowFreeTag`/`isPlayable` 헬퍼 신규) 세 곳 모두 `session.service === 'spotify'` 같은 세션 전체 가드 대신 **참여자 개인의 `platform === 'spotify' && accountTier === 'free'`** 기준으로 판단하도록 고쳤다.

### 구현 내용 요약

1. **세션 생성**(`CreateSessionScreen.tsx`): 혼합 라디오 활성화. 혼합 선택 후 "세션 만들기"를 누르면 곧바로 생성하지 않고 2.6c(`PlatformSelect.tsx`, 신규) 단계로 전환 — 호스트 본인의 참여 플랫폼을 고른 뒤에야 실제로 세션이 생성된다.
2. **데이터 모델**(`types/domain.ts`): `MixedParticipantPlatform`, `MatchConfidenceLevel`, `MatchConfirmState`, `ParticipantMatchStatus`, `MatchedTrackCandidate`, `ParticipantMatch`, `MixedPlaylistEntry` 신규. `ParticipantInfo.platform`(혼합 세션 전용), `SessionState.mixedPlaylist` 추가.
3. **매칭 로직**(`services/matching/trackMatcher.ts` 신규): 제목 정규화(괄호 표기·특수문자 제거)+Levenshtein 유사도, 아티스트 일치도(완전/부분/불일치 3단계), 길이 근접도 가중합으로 0~100 점수 산출 + high/medium/low 등급. `findMatchesOnPlatform`이 Spotify는 `spotifyWebApi.searchSpotifyTracks`(실제 API), YouTube는 `youtubeMockSearch.searchYoutubeTracksMock`(기존 목업)을 그대로 재사용해 검색 후 랭킹. 단위 테스트(`__tests__/trackMatcher.test.ts`) 5건 — 동명이곡 오매칭 방지(아티스트 가중치 검증) 등.
4. **세션 서비스/컨텍스트**(`services/session/sessionService.ts`, `state/SessionContext.tsx`, `state/mixedMatching.ts`, `state/playlistSequencing.ts` 신규): `addMixedTrack`(추가자 매칭 즉시 반영 + 다른 참여자 매칭 비동기 개별 진행), `confirmMyMatch`/`selectMyMatchCandidate`/`manualMatchTrack`/`skipMyMatch`, `myPendingMatchEntryIds`(2.11a 배지용 큐) 신규. 기존 `requestNextTrack`/`requestPrevTrack`/`removeTrack`/`requestMoveTrack`을 `playlist`/`mixedPlaylist` 양쪽에서 동작하도록 리팩터링하면서 중복 로직을 `state/playlistSequencing.ts`(순수 함수, 단위 테스트 5건)로 추출.
5. **매칭 확인 UI**(신규 컴포넌트 5개): `MatchConfidenceBadge`(일치율 %+등급, 03 mockup `.confidence-badge` 색 토큰 그대로 이식), `MatchConfirmCard`(2.11b), `MatchCandidateList`(2.11c), `MatchFailCard`(2.11d), `MatchingQueueSheet`(2.11a 배지→큐 오케스트레이터, "직접 검색하기"는 기존 `AddTrackModal`을 헤더 타이틀만 오버라이드해 재사용). `PlaylistView.tsx`에 매칭 대기 배지 + 트랙 행별 "내 매칭" 상태 텍스트(찾는 중/확인 필요/확정됨) 추가.
6. **Now Playing 혼합**(`NowPlayingView.tsx`/`YouTubeNowPlayingView.tsx` 확장, `state/mixedTrackView.ts` 신규 — 두 파일이 공유하는 순수 판정 함수, 단위 테스트 5건): 내 매칭이 미확인/실패 상태면 재생 영역 대신 상태 카드(확인하러 가기/직접 검색하기 버튼)를 보여준다. 동기화 배지에 "나: Spotify/YouTube" 병기, 참여자 아바타에 서비스 아이콘 오버레이(`Avatar.tsx` `platform` prop 신규), `RoomScreen.tsx`는 `myPlatform` 기준으로 두 레이아웃 중 하나를 라우팅.
7. **테마**(`theme/tokens.ts`): `matchColors`(high/medium/low) + `ColorTokens.matchHighBg/matchMediumBg/matchLowBg`(라이트/다크 둘 다) — 03 mockup CSS 변수 값 그대로.

- 상태: 완료(검증 대기)
- 변경 파일: 신규 — `apps/mobile/src/services/matching/trackMatcher.ts`, `apps/mobile/src/state/mixedMatching.ts`, `apps/mobile/src/state/mixedTrackView.ts`, `apps/mobile/src/state/playlistSequencing.ts`, `apps/mobile/src/components/{MatchConfidenceBadge,MatchConfirmCard,MatchCandidateList,MatchFailCard,MatchingQueueSheet,PlatformSelect}.tsx`, `apps/mobile/__tests__/{trackMatcher,playlistSequencing,mixedTrackView}.test.ts`. 수정 — `apps/mobile/src/types/domain.ts`, `apps/mobile/src/theme/tokens.ts`, `apps/mobile/src/services/session/{sessionService,mockSessionSeed}.ts`, `apps/mobile/src/state/SessionContext.tsx`, `apps/mobile/src/screens/CreateSessionScreen.tsx`, `apps/mobile/src/screens/RoomScreen.tsx`, `apps/mobile/src/screens/room/{NowPlayingView,YouTubeNowPlayingView,PlaylistView}.tsx`, `apps/mobile/src/components/{AddTrackModal,Avatar,ParticipantsBottomSheet}.tsx`.
- 비고(검증 시 주의):
  - `npx tsc --noEmit`(0 errors), `npx eslint .`(0 errors, 22 warnings — 기존 16개+이번 라운드 신규 6개, 전부 기존과 동일한 관용적 `react-native/no-inline-styles` 조건부 스타일 패턴, 신규 유형 경고 없음), `npx jest`(4 suites/16 tests 전부 통과 — 신규 3개 스위트 15건 + 기존 App.test.tsx) 모두 확인.
  - Android: `JAVA_HOME=D:\Android Studio\jbr`, `ANDROID_HOME`/`ANDROID_SDK_ROOT=E:\Android\Sdk`, `GRADLE_USER_HOME=E:\gradle-home`로 `cd apps/mobile/android && ./gradlew.bat assembleDebug --no-daemon` 실행 → **BUILD SUCCESSFUL in 23s**(대부분 UP-TO-DATE — 이번 라운드는 새 네이티브 의존성을 추가하지 않았다, `package.json`/`package-lock.json` 변경 없음 `git diff --stat`로 확인). iOS는 이번에도 macOS 부재로 빌드 검증 미수행(구조적 제약, 기존 라운드들과 동일).
  - **실기기/에뮬레이터 런타임 미검증**(코드 추적 기반 구현) — 검증 에이전트가 특히 확인해야 할 시나리오: (1) 혼합 세션 생성 → 호스트 플랫폼 선택 → 세션메인 진입까지 전체 흐름, (2) 곡 추가 시 매칭 확인 배지가 뜨고 큐를 통해 확정/후보선택/직접검색/실패-스킵 네 갈래 모두 실제로 동작하는지, (3) Now Playing에서 내 매칭이 pending/failed일 때 상태 카드가 뜨고 "확인하러 가기"를 누르면 큐가 열리는지, (4) 확정 후 실제로 Spotify Remote(스텁)/YouTube WebView에 트랙이 반영되는지(기존 라운드의 재생 스텁/실연동 수준을 그대로 물려받음 — Spotify는 여전히 App Remote SDK 미연동 STUB이라 실제 재생은 안 됨, YouTube는 WebView 실연동이라 mock 검색 결과의 videoId가 실존하지 않으면 `onError`로 이어질 것으로 예상, 기존 YouTube 라운드 로그에 이미 기록된 것과 동일한 제약).
  - **다음 라운드 TODO**: (1) 매칭 가중치/임계값 실측 스파이크(09문서 결정4), (2) 세션 설정(2.13) 정식 화면 신설 시 `ParticipantsBottomSheet`에 임시로 넣어둔 "내가 참여 중인 플랫폼" 표시를 그쪽으로 이전, (3) "코드로 참여하기" 구현 시 `PlatformSelect.tsx`를 참여자 플로우에도 연결, (4) 매칭 큐의 "이전" 네비게이션(현재 "다음"만 존재), (5) Firebase 연동 시 `addMixedTrack`의 참여자별 비동기 매칭 결과를 실시간 브로드캐스트로 전환(현재는 인메모리 SessionContext 로컬 상태로만 반영 — 리더 지시 범위 밖으로 명시됐던 부분).
  - `docs/specs/`, `docs/design/`은 읽기만 하고 수정하지 않았다. 커밋은 하지 않았다 — 리더 검토 후 커밋.

## 2026-07-26 (Spotify Free 계정 안내 링크 버그 수정)
- 작업: 실기기에서 발견된 버그 수정 — Spotify 연동 화면(`SpotifyConnectScreen.tsx`)의 "Premium이 없으신가요? →" 링크에 `onPress` 핸들러가 없어 눌러도 아무 반응이 없던 죽은 버튼 문제 해결.
- 상태: 완료(검증 대기)
- 변경 파일: `apps/mobile/src/screens/SpotifyConnectScreen.tsx` (단일 파일, 신규 컴포넌트/네비게이션 라우트 추가 없음).
- 비고(스코프 판단 근거 — 이번 라운드는 검증 없이 조용히 만들지 말라는 지시에 따라 명확히 기록):
  - **왜 (b, `00-ux-flow.md` 2.4 레이아웃을 새 화면으로 재현)가 아니라 (a, 가벼운 안내 모달)를 택했는가**: 2.4는 애초에 "Free 계정이면 온보딩 자체를 차단할지 부분 허용할지 정책 미확정"이라는 전제 위에서 "차단"을 기본값으로 그린 화면이었다(2.4 본문: "정책 확정 사항 아님... 이 화면은 '차단'을 기본값으로 그리되, 실제 정책이 확정되면 문구/버튼만 조정"). 그런데 `docs/specs/04-playlist.md` "Free 계정(무료 등급) 처리" 절이 2026-07-24에 **해석 A(참여 자체는 항상 허용, 동기화 재생 제어만 제한)로 확정**되고 해석 B(참여 자체 제한)는 명시적으로 폐기됐다. 즉 2.4가 존재하던 전제(차단 여부 미확정) 자체가 소멸했다 — 지금 2.4 레이아웃(제목 "Premium 계정이 아니에요" + 로그인 진행 경로 없이 "알아보기"/"나중에 다시 확인" 두 버튼뿐)을 그대로 새 화면/라우트로 만들면 "차단" 뉘앙스를 다시 만드는 셈이라 확정된 정책과 어긋난다고 판단했다. 이 링크가 실제로 전달해야 하는 것은 "Free 계정이어도 로그인·참여는 계속할 수 있다"는 안내이므로, 새 네비게이션 라우트(`RootStackParamList` 변경) 없이 같은 화면 안에서 뜨는 안내 모달 + 기존 `login()`으로 바로 이어지는 "로그인 계속하기" 버튼을 구현했다. 지시사항의 두 제약("회원 로그인 자체를 막는 코드 추가 금지", "기존 `login()` 흐름 재사용")과도 가장 잘 맞는 방법이라 판단.
  - 모달 문구는 `04-playlist.md`의 "Free 계정 사용자는 곡 재생(동기화 재생 대상)이 불가능하다" / "세션 참여 자체는 항상 허용된다"(해석 A) 표현을 반영해 "로그인·세션 참여·곡 추가/삭제/순서변경은 가능, 동기화 재생 참여만 불가"로 작성했다.
  - 2.4가 제시했던 "Spotify Premium 알아보기" 버튼은 그대로 살려 `Linking.openURL('https://www.spotify.com/premium/')`로 구현했다(외부 브라우저를 열 수 없어도 조용히 무시하고 모달은 계속 사용 가능).
  - `AuthContext.login()`은 그대로 호출만 했다 — 내부 로직은 전혀 건드리지 않았고, Free/Premium 여부와 무관하게 로그인 성공 시 `signed_in`으로 전환하는 기존 동작을 그대로 유지했다.
  - 검증: `apps/mobile`에서 `npx tsc --noEmit`(0 errors), `npx eslint .`(0 errors, 22 warnings — 전부 기존에 있던 `react-native/no-inline-styles` 경고, 이 파일에서 새로 발생한 경고 없음), `npx jest`(4 suites/16 tests 전부 통과, 회귀 없음) 확인. Android: `JAVA_HOME=D:\Android Studio\jbr`, `ANDROID_HOME`/`ANDROID_SDK_ROOT=E:\Android\Sdk`, `GRADLE_USER_HOME=E:\gradle-home`로 `cd apps/mobile/android && ./gradlew.bat assembleDebug --no-daemon` → **BUILD SUCCESSFUL in 24s**. iOS는 이전 라운드들과 동일하게 macOS 부재로 빌드 미검증(구조적 제약, 신규 아님).
  - 실기기 Spotify OAuth 로그인 자체(콜백 포함)는 지시에 따라 시도하지 않았다 — 이 버튼의 배선(링크 탭 → 모달 오픈 → "로그인 계속하기" 탭 → 모달 닫힘 + `login()` 호출 → `status === 'signed_in'`이 되면 `navigation.replace('Home')`)까지만 코드 추적으로 확인했다. 검증 에이전트는 실기기/에뮬레이터에서 다음을 확인해달라: (1) 링크 탭 시 모달이 실제로 뜨는지, (2) "로그인 계속하기" 탭 시 모달이 닫히고 기존 Spotify OAuth 플로우(시스템 브라우저)가 정상 시작되는지, (3) "Spotify Premium 알아보기" 탭 시 외부 브라우저로 spotify.com/premium이 열리는지, (4) "닫기" 탭 시 모달만 닫히고 원래 로그인 버튼 화면으로 안전하게 복귀하는지, (5) 다크모드에서 모달 배경/텍스트 대비가 정상인지(`theme.bgElevated`/`theme.text`/`theme.textSecondary` 재사용이라 회귀 낮음으로 예상하나 미육안검증).
  - `docs/design/`, `docs/specs/`는 읽기만 하고 수정하지 않았다. 지시대로 다른 화면/혼합 모드 관련 코드는 손대지 않았다. 커밋은 하지 않았다 — 리더 검토 후 커밋.

## 2026-07-26 (버그 수정: R7.13 매칭 큐 인덱싱 경합)

- 작업: `docs/qa/spotify-mvp-round1-checklist.md` "Round 7 검증" R7.13(`MatchingQueueSheet.tsx`의 `goToNextInQueue` 인덱싱 버그) 수정. 검증 에이전트가 코드 정적 추적(React state batching 규칙 기반, Round 5 R5.17과 동일 방법론)으로 확정 재현한 버그로, 원인은 `goToNextInQueue`가 `myPendingMatchEntryIds.length`(처리하려는 항목이 아직 포함된 "처리 전" 렌더의 값)를 기준으로 `cursor + 1`을 계산하는데, 처리 함수 호출(`confirmMyMatch`/`skipMyMatch`/`manualMatchTrack`)과 `setCursor` 호출이 같은 이벤트 핸들러에서 동기 실행되어 React가 배칭하면서 다음 렌더의 "처리 후(더 짧아진)" 배열과 어긋나 커서가 한 칸 더 앞서가 버리는 경합이었다 — 대기 항목이 정확히 2건이면 시트가 조기 종료, 3건 이상이면 항목이 통째로 건너뛰어짐.

### 수정 방향 및 근거(왜 인덱스 산술을 없애는 쪽을 택했는가)

리더 지시사항이 제안한 대로 **숫자 인덱스(cursor) 대신 entryId 기준으로 "다음에 보여줄 항목"을 결정**하는 방식을 채택했다. 다만 실제로 구현하면서 다음을 추가로 확인·판단했다:

1. **cursor state 자체를 완전히 제거**: 처음엔 "cursor를 증가시키지 않고 유지"(R7.13 검증 로그가 제시한 대안)만으로도 충분한지 검토했으나, 그 방법도 여전히 "처리된 항목이 항상 cursor가 가리키던 바로 그 위치에 있었다"는 암묵적 불변식에 의존하는 인덱스 산술이라 판단했다. 대신 `state/matchQueueNavigation.ts`(신규, 순수 함수)의 `resolveQueueEntryId(pendingIds, skippedIds?)`가 매 렌더마다 `myPendingMatchEntryIds`(SessionContext가 항상 최신으로 재계산하는 실제 대기 목록)에서 직접 "다음에 보여줄 entryId"를 계산하도록 했다 — cursor라는 별도 state를 아예 없애 "state가 참조하는 배열 길이가 언제 갱신되는지"라는 시점 의존성 자체를 제거했다. `MatchingQueueSheet.tsx`는 이제 `const entryId = resolveQueueEntryId(myPendingMatchEntryIds);` 한 줄로 대체됐다 — 처리된 항목은 `myPendingMatchEntryIds`에서 다음 렌더에 자연히 빠지므로, "다음 인덱스가 몇인가"를 계산할 필요 자체가 없다(항상 대기열의 첫 항목을 보여주면 됨).
2. **"처리돼서 빠짐" vs "그냥 넘겨봄"의 구조적 분리(지시사항이 지적한 두 번째 문제)**: 이 컴포넌트의 커서 증가가 (1) 처리 후 다음으로 넘어가는 경우(배열 자체가 줄어듦)와 (2) "다음" 버튼으로 미처리 항목을 그냥 건너뛰어 보는 경우(배열은 그대로, `implementation-log.md` "매칭 큐 네비게이션 단순화" 항목이 언급한 기능)를 인덱스 산술 하나로 뭉뚱그리고 있었다는 지시사항의 지적은 코드 확인 결과 정확했다. 다만 **현재 UI에는 실제로 (2)를 트리거하는 버튼이 없다** — `MatchingQueueSheet.tsx` 전체를 다시 읽고 `cursor`/`다음` 텍스트를 grep한 결과, "다음" 버튼은 존재하지 않고 헤더의 `(N/M)` 카운터는 표시 전용이며, `cursor`를 증가시키는 경로는 오직 처리 액션 세 곳(`onConfirm`/`onSkip`/`handleManualSelect`)뿐이었다. 즉 (2)는 "cursor state가 있으니 이론적으로 가능한 동작"으로 이전 구현 로그에 기술됐을 뿐, 실제로 배선된 기능이 아니었다. 그래서 `resolveQueueEntryId`는 `skippedIds`를 옵션 파라미터로 받아 (2) 시맨틱을 구조적으로 지원하도록 설계했지만(향후 "다음" 버튼이 추가되면 컴포넌트가 그 Set만 채워 넣으면 되도록), **컴포넌트 자체에는 이 Set을 채우는 실제 UI를 새로 추가하지 않았다** — 존재하지 않는 버튼을 위해 컴포넌트에 항상 빈 상태로 남는 state를 미리 심어두는 것은 불필요한 복잡도(사용되지 않는 state)를 더한다고 판단했기 때문이다(스코프 임의 확장 금지 원칙과도 부합). 대신 이 시맨틱은 `__tests__/matchQueueNavigation.test.ts`에서 순수 함수 수준으로 직접 검증해, 설계가 실제로 두 의미를 구분해서 다룰 수 있음을 근거로 남겼다.
3. **헤더 카운터(`(N/M)`) 표시는 유지**: `myPendingMatchEntryIds.indexOf(entryId as string) + 1`로 매 렌더 즉시 파생시켰다(별도 state 없이 렌더 시점에 계산되므로 stale 값이 될 수 없음).

### 검증 — 시나리오별 근거(지시사항이 요구한 3가지 + `matchQueueNavigation.test.ts`로 자동화)

| 시나리오 | 추적 근거 |
|---|---|
| 대기 항목 정확히 2건일 때 첫 항목 처리 후 두 번째 항목이 실제로 보이는가 | `resolveQueueEntryId(['a','b'])` → `'a'`(카드 표시) → "확정하기" 탭 → `confirmMyMatch('a')` 호출로 `entry.matches[me].confirmState`가 `'confirmed'`로 바뀜 → 다음 렌더에서 `SessionContext`의 `myPendingMatchEntryIds` `useMemo`가 재계산되어 `['b']`(길이 1, `'a'`가 실제로 빠짐)가 됨 → `resolveQueueEntryId(['b'])` → `'b'` → `entry`/`myMatch` 둘 다 유효(undefined 아님) → 82행 `if (!entry \|\| !myMatch)` 가드가 발동하지 않고 두 번째 카드가 정상 렌더됨. `__tests__/matchQueueNavigation.test.ts`의 "shows the second entry after the first is processed..." 테스트로 이 배열 전이를 직접 시뮬레이션해 통과 확인. |
| 3건 이상일 때 항목이 건너뛰어지지 않는가 | 위와 동일한 방식으로 `['a','b','c']` → 'a' 처리 → `['b','c']` → 'b' 처리 → `['c']` → 'c' 처리 → `[]` → `undefined`(큐 자동 종료) 순서를 `resolveQueueEntryId`가 매 단계 정확히 `'a'→'b'→'c'→undefined`로 반환함을 "walks through all entries in order without skipping any when N=3" 테스트로 확인 — 이전 버그처럼 중간 항목이 건너뛰어지는 경우가 구조적으로 발생할 수 없다(각 단계가 항상 그 시점의 실제 `pendingIds`만 참조하고, 이전 렌더의 length를 기억해두는 state가 전혀 없기 때문). |
| "다음" 버튼으로 건너뛴 뒤 다시 그 항목으로 돌아올 수 있는가 | 위 2번 판단 근거에서 밝혔듯 현재 UI에는 이 기능을 트리거하는 버튼이 실제로 없어 실제 화면에서 재현할 수는 없었다 — 대신 설계 수준에서 `resolveQueueEntryId(pending, skippedIds)`가 이 시맨틱을 올바르게 지원함을 순수 함수 테스트로 검증했다: `['a','b','c']`+`skipped={'a'}` → `'b'`(스킵한 a를 건너뜀), 전부(`{'a','b','c'}`) 스킵하면 `pendingIds[0]`인 `'a'`로 되돌아감("이전" 버튼 없이도 건너뛴 항목을 잃지 않음, "wraps back to the first pending entry..." 테스트), 마지막으로 "처리돼서 빠짐"과 "그냥 넘겨봄"이 동시에 섞인 경우(`pending=['a','c']`, `b`는 실제 처리되어 배열에서 빠짐, `a`는 스킵만 됨, `skipped={'a'}`)에도 정확히 `'c'`를 반환함을 "correctly distinguishes..." 테스트로 확인 — R7.13류 경합이 이 시맨틱 확장에서도 재발하지 않을 구조임을 뒷받침한다. |

### 검증 — 정적 검사/빌드

- `apps/mobile`에서 `npx tsc --noEmit`: **0 errors**.
- `npx eslint .`: **0 errors, 22 warnings** — Round 7과 정확히 동일한 개수/종류(전부 기존 `react-native/no-inline-styles`), 이번 변경으로 신규 발생한 경고 없음.
- `npx jest`: **5 suites / 23 tests 전부 통과**(신규 `matchQueueNavigation.test.ts` 7건 포함, 기존 4개 스위트 16건 그대로 회귀 없음).
- Android: `JAVA_HOME=D:\Android Studio\jbr`, `ANDROID_HOME`/`ANDROID_SDK_ROOT=E:\Android\Sdk`, `GRADLE_USER_HOME=E:\gradle-home`로 `cd apps/mobile/android && ./gradlew.bat assembleDebug --no-daemon` → **BUILD SUCCESSFUL in 23s**(203 actionable tasks, 27 executed/176 up-to-date — 순수 JS/TS 변경이라 대부분 UP-TO-DATE, 새 네이티브 의존성 없음). iOS는 이전 라운드들과 동일하게 macOS 부재로 빌드 미검증(구조적 제약).
- 이번 수정으로 `goToNextInQueue` 함수와 `cursor`/`setCursor` state, 관련 두 `useEffect`(초기화·클램프)가 전부 제거됐다 — `git diff --stat`으로 `MatchingQueueSheet.tsx` 변경이 29줄(추가/삭제 합산) 규모로 국소적임을 확인. `resolveQueueEntryId`를 사용하지 않는 `selectMyMatchCandidate` 경로(후보 선택 시 카드로 되돌아가는 동작, 2.11c)는 이번에도 건드리지 않았다 — R7.7이 확인한 대로 원래부터 `goToNextInQueue`를 호출하지 않는 유일한 예외였고 이번 버그의 영향을 받지 않았기 때문.

- 상태: 완료(검증 대기)
- 변경 파일: 수정 — `apps/mobile/src/components/MatchingQueueSheet.tsx`. 신규 — `apps/mobile/src/state/matchQueueNavigation.ts`(순수 함수), `apps/mobile/__tests__/matchQueueNavigation.test.ts`(단위 테스트 7건). 지시대로 다른 파일은 건드리지 않았다.
- 비고(검증 시 주의):
  - 실기기 검증 필요: (1) 혼합 세션에서 곡 2개를 연달아 추가 → 매칭 큐를 열고 첫 항목 "확정하기" → 두 번째 항목이 실제로 이어서 표시되는지(시트가 조기 종료되지 않는지), (2) 곡 3개 이상을 추가해 동일하게 순서대로 전부 노출되는지, (3) "이 곡 없이 넘어가기"(`MatchFailCard`)와 "직접 검색하기"로 수동 매칭한 뒤에도 동일하게 다음 항목이 정상 노출되는지 — 이번 로그의 표는 코드/단위 테스트 기반 근거이며, 실기기에서의 최종 시각적 확인은 별도로 필요하다(Round 5 R5.17 수정 로그와 동일한 검증 범주).
  - "다음(미처리 항목 넘겨보기)" 버튼은 이번 수정에서도 추가하지 않았다 — 현재 UI/스펙(00-ux-flow.md 2.11a)에 명시적으로 요구되지 않은 신규 기능이라 스코프 확장으로 보고 손대지 않았다. `resolveQueueEntryId`의 `skippedIds` 파라미터는 향후 이 버튼이 추가될 때 재사용할 수 있도록 설계·테스트만 미리 갖춰둔 것이다.
  - `docs/qa/`, `docs/specs/`, `docs/design/`는 읽기만 하고 수정하지 않았다. 커밋은 하지 않았다 — 리더 검토 후 커밋.
