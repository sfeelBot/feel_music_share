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

## 2026-07-26 ("코드로 참여하기" 실제 구현)
- 작업: `HomeScreen.tsx`의 `handleJoinByCode` 스텁("준비 중" Alert)을 실제 참여 로직으로 교체.
  1. `sessionService.ts`: `getSessionByInviteCode(inviteCode)`(읽기 전용 조회, 대소문자/공백 정규화) +
     `joinSessionByCode(inviteCode, joiningUser, platform?)` 신규 — 참여자를 세션에 추가하고
     `JoinSessionResult`(`{ok:true, session, participant}` | `{ok:false, reason}`)를 반환한다.
     `reason`은 `not_found` | `capacity_full` | `platform_required` 세 가지로 명확히 구분.
  2. `SessionContext.tsx`: `createSession`과 대칭적인 `joinSession` 액션 신규(성공 시에만 session/
     currentParticipantId 갱신, 실패 시 결과를 그대로 반환해 화면이 분기하도록 함). 지시대로
     context value 객체에서 `createSession` 바로 다음(관리자 임명/서비스 전환 코드와 최대한 거리를
     두는 위치)에 추가했다 — 세션 설정 화면을 병행 작업 중인 다른 에이전트와의 병합 충돌 최소화 목적.
  3. `HomeScreen.tsx`: 초대 코드 입력 → `joinSession` 호출 → 성공 시 `navigation.navigate('Room',
     {sessionId})`. 세션이 혼합(mixed) 모드면 `joinSession`이 `platform_required`를 반환하고, 화면이
     `CreateSessionScreen.tsx`의 'form'→'platform' 패턴과 동일하게 자체 `step` state로 `PlatformSelect`
     컴포넌트(참여자 쪽 최초 실연결 — Round 7 검증 R7.31 갭 해소)를 보여준 뒤 선택된 플랫폼으로
     `joinSession`을 재호출해 최종 확정한다. 새 네비게이션 라우트는 만들지 않고 화면 내부 상태
     전환만으로 처리(호스트 플로우와 동일한 판단).
  4. 실패 케이스 두 가지를 서로 다른 Alert 문구로 명확히 구분: "세션을 찾을 수 없어요"(`not_found`) vs
     "이 세션은 정원이 가득 찼어요"(`capacity_full`). 빈 코드 입력 시에도 별도 Alert.
- 판단 근거(정원 초과 처리, 지시대로 근거 기록): 04-playlist.md는 정원 정책을 "생성 시점 고정"이라고만
  정의하고 정원 초과 참여 시도의 동작을 명세하지 않았다. 대기열 등록 같은 추가 기능은 스펙에 없으므로
  만들지 않고, 참여 자체를 거부 + 사유 안내하는 쪽으로 판단했다. 정원 검사는 "이미 참여 중인 사람이
  같은 코드로 재입장"하는 경우(같은 participantId)에는 건너뛴다 — 새 인원이 아니므로 정원이 이미
  찼더라도 실패시키지 않는다(예: 앱을 재시작하지 않고 Room→Home으로 나갔다가 같은 코드로 재입장하는
  경우 대비, `leaveSession`이 currentParticipantId를 지워도 프로필 자체는 그대로라 재조회가 될 수 있음).
  또한 정원 초과 여부를 `platform_required`보다 먼저 검사하도록 순서를 잡았다 — 어차피 못 들어갈
  세션이면 플랫폼을 고르게 하는 것 자체가 불필요한 단계이기 때문.
- Firebase 연동 관련(하지 않은 것, TODO로 명시): 세션은 여전히 이 앱 프로세스의 in-memory `Map`에만
  존재한다(`sessionService.ts` 상단 기존 TODO 주석과 동일한 제약). 즉 "코드로 참여하기"는 **같은
  기기(같은 앱 인스턴스)에서 방금 만든 세션에 한해서만** 실제로 동작한다 — 다른 기기의 세션은 이
  프로세스 메모리에 없어 항상 `not_found`가 된다. 새로 발생한 제약이 아니라 이 앱 전체가 이미 갖고
  있던 데모 스코프 한계이며, 억지로 우회하지 않았다(지시대로).
- 작업 범위 밖(건드리지 않음): 세션 설정 화면, 관리자 임명/해제, 서비스 전환 관련 코드. 이 worktree는
  작업 시작 시점에 `main`보다 다소 뒤처져 있어(별도 브랜치로 분기된 채 `dbd275c` 혼합 모드 구현 등이
  누락된 상태) `PlatformSelect.tsx`/혼합 모드 `CreateSessionScreen.tsx`/`types/domain.ts`(MixedPlaylistEntry
  등)가 이 worktree에 아예 없었다 — 이번 작업이 의존하는 파일들이라 `git merge main`으로 fast-forward
  동기화만 먼저 수행했다(로컬 병합, 다른 에이전트의 실제 작업 내용을 편집하지는 않음). 병합 커밋은
  fast-forward라 새 커밋이 생기지 않았다(122fcc9 → b78621d).
- 변경 파일: `apps/mobile/src/services/session/sessionService.ts`(`getSessionByInviteCode`/
  `joinSessionByCode`/`JoinSessionResult` 신규), `apps/mobile/src/state/SessionContext.tsx`(`joinSession`
  액션 신규), `apps/mobile/src/screens/HomeScreen.tsx`(`handleJoinByCode` 실로직 교체 + 혼합 모드
  플랫폼 선택 단계), `apps/mobile/__tests__/joinSessionByCode.test.ts`(신규 — 세션 생성→참여 흐름을
  같은 프로세스 안에서 시뮬레이션하는 단위 테스트 7건: 정상 참여/역할·링컬러, 코드 대소문자·공백
  허용, 존재하지 않는 코드, 정원 초과, 혼합 세션 platform_required, 혼합 세션 platform 지정 성공,
  재입장 시 정원 우회).
- 상태: 완료(검증 대기) — 단, Android 네이티브 빌드는 아래 "비고"의 환경 제약으로 이 worktree
  경로에서는 직접 확인하지 못했다.
- 비고(검증 시 주의):
  - `npx tsc --noEmit`: 0 errors.
  - `npx eslint .`: 0 errors, 22 warnings(전부 기존 `react-native/no-inline-styles` 경고, 신규 경고
    없음 — 이번 변경 파일에서 새로 발생한 경고 없음).
  - `npx jest`: 6 suites / 30 tests 전부 통과(신규 `joinSessionByCode.test.ts` 7건 포함, 회귀 없음).
  - **Android `assembleDebug` 빌드 블로커(내 코드 변경과 무관, 환경 제약)**: 이 worktree 경로
    (`E:\music share\.claude\worktrees\agent-ab4f705e4e664e61e\...`)가 `main` 체크아웃 경로(`E:\music
    share\apps\mobile\...`)보다 훨씬 깊어, `react-native-safe-area-context`/`react-native-screens`의
    신 아키텍처 CMake/ninja 코드젠 빌드(`app:buildCMakeDebug[arm64-v8a]`)에서 생성되는 오브젝트 파일
    경로가 Windows 260자 제한을 넘겨 `ninja: error: ... Filename longer than 260 characters`로 실패한다.
    `verification-log.md`의 이전 라운드들은 전부 (짧은) `main` 체크아웃 경로에서 `BUILD SUCCESSFUL`을
    반복 확인해왔다 — 즉 이번 실패는 내가 만든 코드(순수 JS/TS, 네이티브 파일 무변경)의 회귀가
    아니라 이 worktree 디렉터리 깊이 자체에서 비롯된 구조적 제약으로 판단한다. 레지스트리 변경
    (Windows 긴 경로 지원)이나 프로젝트 신 아키텍처 설정 변경은 이번 작업 범위 밖이라 임의로
    건드리지 않았다 — 검증 에이전트가 (a) 병합 후 `main`의 짧은 경로에서 빌드하거나 (b) 이 blocker를
    별도로 리더에게 보고하는 쪽을 권장한다.
  - `docs/specs/`, `docs/design/`는 읽기만 하고 수정하지 않았다.
  - 커밋은 하지 않았다 — 리더 검토 후 처리. worktree 브랜치: `worktree-agent-ab4f705e4e664e61e`
    (작업 시작 시 `main`과의 fast-forward 동기화 포함, HEAD는 `main`의 `b78621d`와 동일한 지점 위에
    이번 변경들이 커밋되지 않은 워킹트리 상태로 얹혀 있음).

## 2026-07-26 (세션 설정 화면, worktree `worktree-agent-a9d7e2ffe97d0f204`)
- 작업: 세션 설정(00-ux-flow.md 2.13/2.13a/2.13b) 정식 화면 신규 구현 — "내 역할" 표시(+ 관리자 사임하기), 정원 읽기 전용 표시, 서비스 전환(방장/관리자 전용 활성화 + 확인 다이얼로그 + 전환 중 오버레이), 혼합 세션의 "내가 참여 중인 플랫폼" 읽기 전용 표시(기존에 `ParticipantsBottomSheet.tsx`에 임시로 있던 것을 이 화면으로 이전).
- 상태: 완료(검증 대기)

### 0. worktree 동기화 (구현 착수 전 필수 선행 작업)
이 작업이 배정된 worktree(`worktree-agent-a9d7e2ffe97d0f204`)는 착수 시점에 `main`보다 수십 커밋 뒤처져 있었다(마지막 반영 커밋이 `122fcc9` — 혼합 모드 구현·매칭 파이프라인·Round 9 검증 등 이후 이력 전체가 빠진 상태였다). 이번 작업 지시가 명시적으로 의존하는 파일들(`ParticipantsBottomSheet.tsx`의 혼합 세션 임시 텍스트, `SessionContext.tsx`의 `myPlatform`/`mixedPlaylist`, `types/domain.ts`의 `MixedParticipantPlatform` 등)이 전부 그 뒤처진 이력 안에 있었으므로, 그대로는 작업 자체가 불가능한 상태였다. `git merge main`으로 이 worktree 브랜치를 최신 `main`(`b78621d`)까지 먼저 따라잡은 뒤(충돌 없이 clean merge) 구현을 시작했다 — CLAUDE.md의 "병합은 리더가 처리한다"는 (완료된 기능 브랜치를 최종적으로 main에 합치는) 최종 병합을 가리키는 것으로 해석했고, 작업에 필요한 선행 커밋을 받아오는 이 사전 동기화는 별개로 판단했다. 검증 에이전트가 이 브랜치를 확인할 때 `git log`에 "Merge main to catch up..." 커밋이 보이는 것은 이 때문이며, 의도된 것이다.

### 1. 진입점 판단 (임의 결정, 근거)
`00-ux-flow.md` 플로우차트(72/91행)는 세션 메인에서 "참여자 목록 바텀시트"와 "세션 설정"을 별개의 도착 노드로 그렸을 뿐, 어떤 UI 트리거로 갈리는지는 명시하지 않았다. 헤더에는 "⋮" 아이콘 하나만 있고(`03-screen-mockups.html`의 모든 `.session-header`가 동일), 목업상 참여자 시트와 세션 설정 둘 다 이 아이콘에서 출발하는 것으로 보이나 그 사이 전이 UI는 목업에 없다. 헤더에 아이콘을 하나 더 추가하는 대신, `ParticipantsBottomSheet.tsx` 하단(닫기 버튼 위)에 "⚙ 세션 설정" 링크를 추가해 그리로 이동하는 방식을 택했다 — (1) 목업에 없는 새 헤더 아이콘을 만들지 않아도 되고, (2) 지난 라운드가 이미 이 시트를 "⋮ 메뉴의 실질적인 세션 정보 허브"로 취급해온 관례(이번에 옮겨낸 임시 텍스트의 주석 참고)와 일관되며, (3) "참여자를 보다가 설정도 확인하고 싶어졌다"는 자연스러운 탐색 동선을 제공하기 때문이다.

### 2. 신규/변경 파일
1. **`apps/mobile/src/state/sessionPermissions.ts`(신규)** — 권한/서비스 분기 순수 함수 모음: `canSwitchService`(방장/관리자만 true), `canResignAdmin`(관리자만 true), `shouldShowServiceSwitch`(혼합 세션이면 false), `oppositeService`, `serviceLabel`, `roleDisplayLabel`. `SessionContext.tsx`(가드)와 `SessionSettingsView.tsx`(UI 분기) 양쪽에서 재사용해 "권한 판단 로직이 두 곳에 따로 존재해 서로 어긋나는" 위험을 없앴다.
2. **`apps/mobile/__tests__/sessionPermissions.test.ts`(신규)** — 위 6개 함수 전부에 대한 단위 테스트(권한별 분기, 혼합 세션 예외, 라벨 매핑).
3. **`apps/mobile/src/services/session/sessionService.ts`** — `switchService(sessionId, newService)` 추가. 혼합 세션이면 아무 것도 하지 않고 원본을 그대로 반환. 주석에 데이터 모델의 알려진 한계를 명시했다(아래 "알려진 제약" 참고).
4. **`apps/mobile/src/state/SessionContext.tsx`** — `requestServiceSwitch`/`resignAdmin` 액션 추가. 두 함수 모두 `appointAdmin`/`revokeAdmin` 바로 옆에 배치했고(지시사항대로 `joinSession` 관련 코드와 거리를 뒀다), `useMemo` value/deps 배열에도 같은 자리에 추가했다. `requestServiceSwitch`는 전환 후 `triggerTuning()`을 호출해 late join과 같은 "맞추는 중" 표시를 함께 유발한다(2.13b가 개념적으로 요구하는 "재동기화 시작"을 흉내).
5. **`apps/mobile/src/screens/room/SessionSettingsView.tsx`(신규)** — 세션 설정 화면 본체. `Modal`(`presentationStyle="fullScreen"`)로 구현했다(react-navigation 라우트를 새로 추가하지 않은 이유는 파일 상단 주석 참고 — `RootStackParamList` 변경은 이번 라운드 범위 밖으로 판단, `ParticipantsBottomSheet`도 이미 같은 Modal 오버레이 패턴을 씀). 서비스 전환 확인 다이얼로그(2.13a)·전환 중 오버레이(2.13b)는 `03-screen-mockups.html`의 `.dialog-overlay`/`.dialog-card`/`.transition-overlay__*` 마크업과 카피를 그대로 이식했다 — 유일한 각색은 CSS `spin` 애니메이션이 돌리던 정적 ⏳ 이모지를 RN 표준 `ActivityIndicator`로 대체한 것뿐(텍스트 카피는 100% 동일).
6. **`apps/mobile/src/screens/RoomScreen.tsx`** — `SessionSettingsView` 렌더 + `settingsVisible` state 추가. `viewerRole`을 `session.participants`에서 `currentParticipantId`로 파생. 전환 완료 토스트(2.13b가 요구하는 "전환됐어요" 안내)를 위해 기존 토스트 인프라가 없어 헤더 아래 얇은 배너(`toast`/`toastText` 스타일)를 최소 형태로 새로 만들었다(3.2초 후 자동 소멸).
7. **`apps/mobile/src/components/ParticipantsBottomSheet.tsx`** — 이전 라운드가 임시로 넣어뒀던 "내가 참여 중인 플랫폼" 텍스트(및 이를 위해서만 쓰이던 `viewerPlatform`/`isMixed` 로컬 변수, `myPlatformInfo` 스타일)를 제거하고, 그 자리에 있던 상단 표시를 없앤 대신 하단에 "세션 설정" 링크(`onOpenSettings` prop)를 추가했다. 역할 배지·Free 태그·관리자 임명 메뉴 등 나머지는 그대로 두었다(지시 준수). 더 이상 쓰이지 않게 된 `viewerParticipantId` 구조분해도 함께 제거했다(destructuring에서만 제거, prop 타입 자체는 유지 — 호출부 `RoomScreen.tsx`가 여전히 넘겨주고 있어 향후 재사용 가능).

### 3. 알려진 제약 (검증 시 참고)
- **서비스별 플레이리스트 독립 보존은 UI 카피 수준까지만 재현했다.** 현재 데이터 모델(`SessionState.playlist`)은 활성 서비스와 무관하게 단일 배열을 공유한다 — Spotify↔YouTube 전환 시 실제로 "서로 다른 두 벌의 곡 목록을 각각 유지"하는 데이터 구조가 아니다(전환해도 같은 `playlist` 배열을 계속 보여줄 뿐이라 결과적으로 "곡이 사라지지 않는" 것처럼 보이지만, 04-playlist.md가 요구하는 "서비스별 독립 보존"을 데이터 수준까지 구현한 것은 아니다). `sessionService.switchService` 주석에 TODO(Firebase 연동 시 데이터 모델 확장 필요)로 명시해뒀다 — 이는 이번 라운드 스코프(세션 설정 화면 UI/흐름)를 벗어나는 더 큰 데이터 모델 작업이라 손대지 않았다.
- **PlaylistView.tsx 상단 서비스 칩("🟢 Spotify 플레이리스트 ▸")은 여전히 탭해도 반응하지 않는다.** `00-ux-flow.md` 457행이 "칩을 탭하면 세션 설정의 서비스 전환 화면(2.13a)으로 바로 이동하는 단축 진입점으로 겸용한다"고 명시했으나, 이 칩을 세션 설정 화면과 연결하는 것은 이번 작업 지시 범위(`RoomScreen.tsx`/`ParticipantsBottomSheet.tsx`/신규 화면/`SessionContext.tsx`)에 포함되지 않아 손대지 않았다 — 후속 라운드 과제로 남겨둔다.
- **토스트는 이번 라운드에 처음 만든 최소 컴포넌트다.** 프로젝트 전체에 재사용 가능한 Toast 컴포넌트가 아직 없어(grep으로 확인) `RoomScreen.tsx`에 로컬 state+배너로 최소 구현했다. 여러 화면에서 토스트가 더 필요해지면 공용 컴포넌트로 추출하는 것을 제안한다.
- **관리자 사임 확인 다이얼로그는 `Alert.alert`(OS 네이티브)를 썼다** — `PlaylistView.tsx`의 곡 삭제 확인과 동일한 기존 패턴 재사용. `02-key-ui-patterns.md` 6.4a절이 "정확한 카피는 확정 전"이라고 명시했으므로 임의로 톤을 잡되(취소/사임하기), 최종 카피 확정은 기획 후속 논의 몫으로 남겨둔다.

### 4. 검증 — 정적 검사
- `apps/mobile`에서 `npx tsc --noEmit`: **0 errors**.
- `npx eslint .`: **0 errors, 23 warnings** — 전부 기존 패턴(`react-native/no-inline-styles`), 신규 파일(`SessionSettingsView.tsx`)의 경고 1건도 기존 코드베이스 전반의 동일 패턴(삼항 연산자 인라인 opacity)과 같은 종류.
- `npx jest`: **6 suites / 32 tests 전부 통과**(신규 `sessionPermissions.test.ts` 6건 포함, 기존 5개 스위트 26건 회귀 없음).

### 5. 검증 — Android 빌드 (환경 제약, 내 변경과 무관)
`cd apps/mobile/android && ./gradlew.bat assembleDebug --no-daemon`(지시된 환경변수 그대로 사용)가 `:app:buildCMakeDebug[arm64-v8a]` 단계에서 실패했다 — `ninja: error: Stat(...RNCSafeAreaViewShadowNode.cpp.o): Filename longer than 260 characters`. 이는 Windows `MAX_PATH`(260자) 한계이며 순수 TS/JS만 수정한 이번 작업과 무관함을 다음으로 확인했다:
- 실패한 객체 파일의 전체 경로 길이를 계산한 결과, 이 worktree 경로(`.../.claude/worktrees/agent-a9d7e2ffe97d0f204/...`) 기준 355자였을 뿐 아니라, **저장소 기본 체크아웃 경로(`E:\music share\apps\mobile\...`) 기준으로 환산해도 277자**로 여전히 260자를 초과했다 — 즉 worktree의 추가 경로 깊이가 원인이 아니라, `react-native-safe-area-context`의 새 아키텍처(Fabric) codegen이 만들어내는 CMake/ninja 중간 산출물 경로 구조 자체가 이 리포지토리 위치에서는 Windows 기본 `MAX_PATH` 한계를 구조적으로 넘어선다.
- 레지스트리(`LongPathsEnabled`) 활성화나 리포지토리를 더 짧은 경로로 옮기는 것은 시스템 전역 설정 변경이라 구현 에이전트 권한 밖으로 판단해 시도하지 않았다. `tsc`/`eslint`/`jest`는 모두 통과했으므로 이번 변경 자체의 정합성은 확인됐다 — Android 네이티브 빌드 검증은 검증 에이전트가 이 환경 제약을 인지한 상태에서 별도로 (a) 더 짧은 경로에서 재시도하거나 (b) Windows 장경로 지원을 켠 환경에서 재시도하는 것을 제안한다. iOS는 기존 라운드들과 동일하게 macOS 부재로 미검증(구조적 제약, 신규 아님).

- 변경 파일: 신규 — `apps/mobile/src/state/sessionPermissions.ts`, `apps/mobile/__tests__/sessionPermissions.test.ts`, `apps/mobile/src/screens/room/SessionSettingsView.tsx`. 수정 — `apps/mobile/src/services/session/sessionService.ts`, `apps/mobile/src/state/SessionContext.tsx`, `apps/mobile/src/screens/RoomScreen.tsx`, `apps/mobile/src/components/ParticipantsBottomSheet.tsx`.
- 비고(검증 시 주의):
  - 실기기/에뮬레이터 시나리오: (1) 방장 시점 — Spotify 세션에서 세션 설정 진입 → "전환하기" 탭 → 확인 다이얼로그(재생 중단/보존 안내 문구 확인) → "전환하기" 확정 → 전환 중 오버레이(약 1.4초) → 세션 메인으로 자동 복귀 + 상단 토스트 확인 → 플레이리스트 탭에서 서비스가 YouTube로 바뀌었는지, "다시 전환하기"로 Spotify로 되돌아가는지. (2) 관리자 시점 — 세션 설정에 "관리자 사임하기" 링크가 보이는지, 탭 시 `Alert` 확인 → 사임 후 "내 역할"이 "일반 참여자"로 바뀌고 전환 버튼이 즉시 비활성화되는지(방장이 다시 임명하면 원상복구되는지도 함께). (3) 일반사용자 시점 — 전환 버튼이 비활성(회색)이고 안내 문구가 보이는지, 탭해도 다이얼로그가 뜨지 않는지. (4) 혼합 세션 — 세션 설정에 서비스 전환 항목 자체가 없고 "내가 참여 중인 플랫폼" 읽기 전용 카드만 보이는지, `ParticipantsBottomSheet`에는 더 이상 이 텍스트가 없는지.
  - 커밋은 하지 않았다 — 리더 검토 후 처리. worktree 브랜치: `worktree-agent-a9d7e2ffe97d0f204`(경로: `E:\music share\.claude\worktrees\agent-a9d7e2ffe97d0f204`). 이 브랜치는 착수 전 `main`(`b78621d`)을 이미 병합해 최신 상태다.

## 2026-07-26 (2)
- 작업: `docs/roadmap.md` "다음 순서" 1번(초대 코드 표시, 2.7 갭 해소)·2번(플레이리스트 서비스 칩 → 세션 설정 연결, 2.10b 갭 해소) 구현 + Round 10 지적 문서 주석 오류 2건 정정.
- 상태: 완료(검증 대기)

### 1. 초대 코드 표시 (2.7 갭 해소)
- `grep -rn "inviteCode" apps/mobile/src/screens apps/mobile/src/components`로 재확인한 결과 지시대로 표시 UI가 전혀 없었음을 확인 후 착수.
- `apps/mobile/src/screens/room/SessionSettingsView.tsx`에 `InviteCodeRow` 컴포넌트를 신규 추가 — "내 역할" 섹션 바로 아래, `CapacityRow`(정원 읽기 전용 표시) 바로 위에 배치했다(정원처럼 "세션의 고정 정보를 확인하는 자리"라는 성격이 비슷하다고 판단). 혼합/Spotify·YouTube 두 렌더 분기(`shouldShowServiceSwitch` true/false) 모두에 동일하게 배치해 세션 유형과 무관하게 항상 노출되게 했다.
- 복사/공유는 **`Share.share()`만 사용**했다(지시대로 신규 `@react-native-clipboard/clipboard` 설치를 하지 않는 쪽으로 판단). 근거: (1) RN 코어 `Clipboard`는 이미 deprecated, (2) OS 공유 시트(카카오톡/메시지 등)에는 대개 "복사" 옵션도 함께 노출되는 경우가 많아 2.7 목업의 "링크 공유하기"+"코드 복사" 두 버튼을 하나(`Share.share`)로 합쳐도 실질적 기능 갭이 크지 않다고 판단, (3) 새 네이티브 의존성을 추가하면 Android 빌드 재검증 부담이 커진다는 이전 라운드 관례를 유지. 공유 메시지에 세션명 + 초대 코드를 포함시켰다.
- **세션 생성 직후 전용 노출(2.7 목업의 QR코드 포함 화면)은 생략했다** — 근거: (1) QR 코드 생성은 새 라이브러리 설치가 필요해 "가능하면 새 네이티브/JS 의존성을 피한다"는 원칙에 어긋나고, (2) 세션 설정은 방장이 언제든 열 수 있는 화면이라 "생성 직후 1회성 노출"이 없어도 기능적 갭(코드를 확인할 방법이 아예 없는 상태)은 완전히 해소된다. 이 판단 근거는 `SessionSettingsView.tsx` 파일 상단 주석에도 남겨뒀다. 필요하다면 후속 라운드에서 세션 생성 완료 시 토스트/모달로 짧게 노출하는 것을 제안한다(`docs/roadmap.md` "낮은 우선순위" 절로 이관 고려 가능 — 리더 판단 필요).

### 2. 플레이리스트 서비스 칩 → 세션 설정 연결 (2.10b 갭 해소)
- `apps/mobile/src/screens/room/PlaylistView.tsx`에 `onOpenSettings: () => void` prop을 추가하고, Spotify/YouTube 전용 세션 분기의 서비스 칩(`🟢 Spotify 플레이리스트 ▸` 등) `onPress`에 연결했다.
- `apps/mobile/src/screens/RoomScreen.tsx`에서 `<PlaylistView onOpenSettings={() => setSettingsVisible(true)} />`로 배선 — 이미 있던 `settingsVisible` state와 `SessionSettingsView` 렌더 로직을 그대로 재사용했다(신규 상태/컴포넌트 없음).
- **혼합 세션에서는 칩에 onPress를 연결하지 않았다.** 판단 근거: `PlaylistView.tsx`의 혼합 세션 분기는 애초에 "서비스 칩" 자체가 없다 — 기존 코드(파일 상단 주석, 2026-07-26 확장 절)가 이미 "혼합 세션은 상단 서비스 칩 자리를 매칭 확인 배지(2.11a)가 대신한다"고 명시해뒀고, 실제로 렌더링되는 것도 `matchBadge`(탭하면 `MatchingQueueSheet`를 여는 별도 기능)뿐 서비스 칩이 아니다. 09문서 "결정 3"대로 혼합 세션엔 세션 전체 차원의 서비스 전환 개념 자체가 없어 "서비스 전환 화면 단축 진입점"이라는 칩의 원래 존재 이유가 성립하지 않는다. 지시문이 제안한 "탭하면 세션 설정을 열어 읽기 전용 표시를 보여주는" 대안 동작은, 이미 존재하는 경로(⋮ → 참여자 목록 → "세션 설정" 링크 → `MixedPlatformRow` 읽기 전용 카드)로 충분히 도달 가능하므로 별도로 새 탭 대상을 추가하지 않았다. 즉 갭이 아니라 "애초에 탭할 칩이 물리적으로 없는" 상태로 판단 — 근거는 `PlaylistView.tsx` 파일 상단 주석에도 남겨뒀다.

### 3. Round 10 문서 주석 오류 2건 정정
1. `apps/mobile/src/services/session/sessionService.ts`의 `getSessionByInviteCode` JSDoc — "HomeScreen.tsx의 사전 조회에도... 함께 쓰인다"는 과장 서술을 제거하고, `grep -rn "getSessionByInviteCode"`로 실제 호출부를 재확인해(같은 파일의 `joinSessionByCode` 내부 1곳뿐) 그 사실만 남기도록 정정.
2. `apps/mobile/src/components/PlatformSelect.tsx`의 "코드로 참여하기는 Alert 스텁이라 참여자 쪽엔 연결 안 됨" 낡은 주석 — `HomeScreen.tsx`에서 실제로 `<PlatformSelect value={joiningPlatform} onChange={setJoiningPlatform} />`로 연결돼 있음을 재확인 후, 호스트/참여자 양쪽 다 연결돼 있다는 정확한 서술로 교체.

### 4. 검증
- `npx tsc --noEmit`: **0 errors**.
- `npx eslint .`: **0 errors, 23 warnings** — 지시된 baseline(0 errors/23 warnings)과 정확히 동일, 신규 경고 없음.
- `npx jest`: **7 suites / 39 tests 전부 통과** — 지시된 baseline(7 suites/39 tests)과 정확히 동일, 회귀 없음.
- Android: `cd apps/mobile/android && ./gradlew.bat assembleDebug --no-daemon`(지시된 환경변수 그대로) → **BUILD SUCCESSFUL**(203 actionable tasks: 27 executed, 176 up-to-date). 이전 라운드가 겪었던 Windows `MAX_PATH` 관련 ninja 실패는 이번엔 재현되지 않았다(worktree가 아닌 `E:\music share` 기본 경로에서 실행했기 때문으로 추정).
- 신규 네이티브/JS 의존성 없음(`Share`는 `react-native` 코어 API) — `package.json` 변경 없음.
- iOS는 기존 라운드들과 동일하게 macOS 부재로 미검증(구조적 제약, 신규 아님).
- `docs/roadmap.md`도 함께 갱신했다: 2.7 행을 ❌→✅로, 2.10b 행을 🔶→✅로, "다음 순서" 1·2번 체크박스를 모두 체크, 3번(Round 10) 절의 "1번 작업 때 함께 정리 예정" 문구를 정리 완료로 갱신, "완료된 것" 요약 문단도 초대 코드 표시/서비스 칩 연결을 반영해 업데이트했다. 최종 검토는 리더 몫.
- 변경 파일: 수정 — `apps/mobile/src/screens/room/SessionSettingsView.tsx`, `apps/mobile/src/screens/room/PlaylistView.tsx`, `apps/mobile/src/screens/RoomScreen.tsx`, `apps/mobile/src/services/session/sessionService.ts`, `apps/mobile/src/components/PlatformSelect.tsx`, `docs/roadmap.md`.
- 비고(검증 시 주의): (1) 세션 설정 화면 진입(⋮ → 참여자 목록 → 세션 설정, 또는 플레이리스트 탭 서비스 칩) 후 "초대 코드" 카드가 정원 카드 위에 보이는지, 코드가 6자리 대문자로 표시되는지, "초대 코드 공유하기" 탭 시 OS 공유 시트가 뜨는지(에뮬레이터에서는 공유 대상 앱이 없어 시트만 뜨고 취소해도 앱이 죽지 않는지 확인 필요). (2) Spotify/YouTube 전용 세션의 플레이리스트 탭에서 서비스 칩을 탭하면 세션 설정 화면이 바로 열리는지. (3) 혼합 세션의 플레이리스트 탭에서는 매칭 배지가 여전히 매칭 큐 시트를 여는 원래 동작 그대로인지(세션 설정으로 잘못 연결되지 않았는지) 확인. (4) 커밋은 하지 않았다 — 리더 검토 후 처리.

## 2026-07-26 (3)
- 작업: `docs/roadmap.md` "낮은 우선순위" 절 2건 구현 — (1) 2.1 스플래시 화면 신규 추가, (2) 2.14 예외/엣지 상태 화면 중 미구현 2건(재접속 중 오버레이 US-206, 호스트 마이그레이션 토스트 US-204) 컴포넌트 완성 + 배선.
- 상태: 완료(검증 대기) — 단, Android 네이티브 빌드는 병렬 작업 중인 아이콘 리소스 파일의 미완성 상태로 인해 이번 검증 라운드에서 실패(아래 "4. 검증" 참고, 내 변경과 무관함을 확인).

### 1. 2.1 스플래시 화면
- 신규 `apps/mobile/src/screens/SplashScreen.tsx` — 로고 마크(brand.primary 배경의 원형 "S" 배지, 별도 이미지 에셋 없이 텍스트/도형만으로 구성) + 앱 이름("Samewave") + 태그라인("장거리에서도, 같은 순간에", 00-ux-flow.md 2.1절 예시 카피 그대로) + 하단 스피너.
- `apps/mobile/src/navigation/types.ts`의 `RootStackParamList`에 `Splash: undefined`를 최상단에 추가.
- `apps/mobile/src/navigation/RootNavigator.tsx`의 `initialRouteName`을 기존 `status`(로그인 상태) 기반 삼항식에서 항상 `'Splash'`로 고정하고, `Stack.Screen name="Splash"`를 등록했다. 그 결과 이 파일은 더 이상 `useAuth`를 쓸 필요가 없어져 import도 제거했다(로그인 상태 기반 분기 책임이 SplashScreen 내부로 옮겨갔기 때문).
  - **지시문 표현 관련 참고**: 지시문은 "App.tsx의 초기 라우트를 Splash로 바꾸고"라고 적었으나, 실제로 초기 라우트(`Stack.Navigator initialRouteName`)는 `App.tsx`가 아니라 `RootNavigator.tsx`에 있다(`App.tsx`는 Provider 조립만 담당, 라우트 설정 없음). `App.tsx` 자체는 변경하지 않고 `RootNavigator.tsx`를 수정했다 — 지시문의 의도(앱 진입 시 첫 화면을 Splash로)를 그대로 만족시키는 실제 위치를 따른 것으로 판단.
- **자동 전환 로직 판단 근거(지시문이 요구한 대로 로그에 남김)**: `SplashScreen.tsx`가 `useAuth()`의 `status`를 읽어 최소 노출 시간(`SPLASH_MIN_DISPLAY_MS = 900ms`) 후 `navigation.replace(status === 'signed_in' ? 'Home' : 'Onboarding')`으로 전환한다. `AuthContext.tsx`가 토큰 영속화를 하지 않아(파일 상단 기존 TODO) 앱 재시작 시 `status`가 항상 `'signed_out'`으로 시작하므로, "온보딩은 봤지만 Spotify 연동 전"인 사용자를 구분해 `SpotifyConnect`로 바로 보내는 세 번째 분기는 **의도적으로 넣지 않았다** — 그 상태를 구분할 영속 플래그 자체가 코드에 없어 지금 만들면 영원히 도달 못 하는 죽은 코드가 된다. 지시문이 명시한 대로 "실제 로딩 상태 확인"이 아니라 "짧게 보여주고 다음 화면으로 자동 전환"하는 수준으로만 구현했다. 판단 근거는 `SplashScreen.tsx` 파일 상단 주석에도 동일하게 남겼다.

### 2. 2.14 예외/엣지 상태 화면 — 재접속 중 오버레이(US-206) + 호스트 마이그레이션 토스트(US-204)
- 드리프트 보정 표시(US-403, `SyncStatusBadge.tsx`)는 지시대로 건드리지 않았다.
- 신규 `apps/mobile/src/components/ReconnectingOverlay.tsx` — "반투명 오버레이 + 스피너 + '연결이 불안정해요, 다시 연결하는 중...'" 문구를 00-ux-flow.md 2.14절 그대로 옮겼다. `SessionSettingsView.tsx`의 `TransitionOverlay`(2.13b)와 톤을 맞춰 `theme.overlay`/`theme.headerText` 토큰을 재사용했다. `visible`이 true로 유지된 지 `LEAVE_OPTION_TIMEOUT_MS`(8초, 문서가 구체적 초 단위를 명시하지 않아 임의 선택한 구현 판단)가 지나면 "세션에서 나가기" 버튼(`SecondaryButton` 재사용)이 추가로 나타난다.
- `apps/mobile/src/screens/RoomScreen.tsx`에 배선: "내 참여자 레코드의 `connectionStatus === 'reconnecting'`"이라는 조건으로 `visible`을 계산한다(`ParticipantInfo.connectionStatus` 필드가 이미 도메인 타입에 존재해 재사용 — 지시문이 예상한 대로). "세션에서 나가기"는 `useSession().leaveSession()` 호출 후 `navigation.navigate('Home')`으로 연결했다(기존에 `leaveSession`을 실제로 호출하는 UI 진입점이 어디에도 없었던 것을 이번에 처음 연결함).
  - **정직하게 남긴 한계**: `services/session/mockSessionSeed.ts`가 모든 참여자의 `connectionStatus`를 항상 `'connected'`로 고정 생성하고, 이를 바꾸는 코드가 어디에도 없다(`state/SessionContext.tsx` 기존 주석도 "지금은 항상 'connected'로 고정된 목업"이라고 이미 명시해뒀던 부분과 일치). 즉 이 오버레이는 컴포넌트 자체는 완성됐지만 실제 앱 사용 중에는 나타나지 않는다 — 실제 네트워크 끊김/재접속 감지는 Firebase Realtime Database Presence(`onDisconnect` 등) 연동 이후의 과제로 TODO를 컴포넌트 파일과 `RoomScreen.tsx` 양쪽에 남겼다. 가짜 타이머 등으로 "실제로 끊긴 것처럼" 흉내 내는 목업 트리거는 만들지 않았다(지시문이 명시적으로 금지).
- 호스트 마이그레이션 토스트는 별도 컴포넌트를 만들지 않고 `RoomScreen.tsx`에 이미 있던 토스트 인프라(`toastMessage`/`showToast`, 세션 설정 전환 완료 알림용으로 먼저 만들어져 있던 것)를 재사용했다(지시문이 제안한 "재사용 검토"를 따름). `showToast`를 `useCallback`으로 바꾸고(기존엔 매 렌더 재생성되는 일반 함수였음, 아래 effect의 의존성으로 안전하게 넣기 위한 리팩터), `session.hostParticipantId`가 이전 렌더 대비 실제로 바뀌었는지 `useRef`로 추적하는 `useEffect`를 추가해 바뀐 순간에만 `호스트가 자리를 비웠어요. {새 호스트 displayName}님이 새 호스트가 되었어요.` 토스트를 띄운다.
  - **정직하게 남긴 한계**: `session.hostParticipantId`를 실제로 바꾸는 액션이 `sessionService.ts`/`SessionContext.tsx` 어디에도 없다(호스트 임명/이양 기능 자체가 이번 스코프 밖 — 04-playlist.md "확인 필요" 4번 참고). 따라서 이 감지 로직은 **가짜 트리거가 아니라 진짜로 상태 변화에 반응하는 코드**지만, 그 상태를 만드는 쪽이 아직 없어 실제로는 발동하지 않는다. 실제 호스트 이탈 감지(마지막 접속 시각, Presence 등)는 Firebase 연동 이후 과제로 TODO를 남겼다.

### 3. 검증
- `npx tsc --noEmit`: **0 errors**.
- `npx eslint .`: **0 errors, 23 warnings** — 지시된 baseline과 정확히 동일, 신규 경고 없음. 새 컴포넌트의 조건부 렌더(스피너/버튼 노출 등)는 모두 불리언 state 분기로 처리하고 `StyleSheet.create` 밖으로 리터럴 값이 있는 인라인 스타일 객체를 만들지 않도록 주의해 `react-native/no-inline-styles` 신규 경고를 피했다.
- `npx jest`: **7 suites / 39 tests 전부 통과** — baseline과 정확히 동일, 회귀 없음. 새 화면/컴포넌트에 대한 전용 단위 테스트는 추가하지 않았다(기존 `App.test.tsx`가 전체 렌더 트리를 스모크 테스트하는 수준이고, `ReconnectingOverlay`/`SplashScreen`은 순수 UI+타이머 컴포넌트라 로직 테스트 대상이 마땅치 않다고 판단 — 필요하면 검증 에이전트가 추가 제안 가능).
- 신규 네이티브/JS 의존성 없음 — `package.json` 변경 없음.
- **Android 빌드(`cd apps/mobile/android && ./gradlew.bat assembleDebug --no-daemon`, 지시된 환경변수 그대로)는 이번 라운드에서 실패**했다 — `:app:mergeDebugResources` 단계에서 `res/drawable/ic_launcher_background.xml:20:45: Invalid namespace prefix 'android' for value of 'name' attribute 'android:attr/fillColor'` 에러. `git status`로 확인한 결과 이 파일은 **내가 건드리지 않은 `res/` 디렉토리(지시문이 명시적으로 손대지 말라고 한 영역)에 아직 커밋되지 않은 상태(untracked)로 존재**하며, 병렬로 진행 중인 적응형 아이콘 작업이 아직 완료되지 않은 중간 상태로 판단된다. 내 변경분(TS/TSX 코드)이 원인이 아님을 `tsc`/`eslint`/`jest` 전부 통과로 방증했다. `res/` 디렉토리는 지시대로 전혀 수정하지 않았다 — 이 Android 빌드 실패는 아이콘 작업이 마무리된 뒤 재검증이 필요하다는 점을 검증 에이전트/리더에게 명시적으로 전달한다.
- iOS는 기존 라운드들과 동일하게 macOS 부재로 미검증(구조적 제약, 신규 아님).

### 4. 로드맵 갱신
- `docs/roadmap.md` 2.1 행: ❌ → ✅(`SplashScreen.tsx`, 비고에 "SpotifyConnect 직행 분기는 영속화 부재로 의도적 생략" 추가).
- `docs/roadmap.md` 2.14 행: 🔶 → 🔶 유지(완전한 ✅는 아님) — 드리프트 배지는 기존대로 완료, 재접속 오버레이/호스트 토스트는 "컴포넌트+배선 완성, 실제 트리거는 Firebase 연동 후 과제"로 비고를 갱신. 세 항목 모두 코드/UI 수준에서는 완성됐으나 트리거 조건 중 2개가 구조적으로 미완(외부 서비스 연동 의존)이라 🔶 유지가 정확하다고 판단.

## 2026-07-26 (적응형 아이콘 — Android 8.0+/API 26+ Adaptive Icon 신규)
- 작업: `docs/roadmap.md` "낮은 우선순위" 절 항목 — Android 적응형 아이콘(`mipmap-anydpi-v26`) 신규 추가. `docs/design/03-screen-mockups.html`의 `<figure class="icon-showcase">` 인라인 SVG(노을 그라디언트+겹치는 두 원+파형+수평선+작은 원, `viewBox="0 0 192 192"`)를 그대로 배경/전경 두 레이어로 분리해 재사용, 새 디자인 없음. 이 세션에서 병렬로 진행 중이던 SplashScreen/ReconnectingOverlay 작업(`2026-07-26 (3)` 로그)이 겪은 Android 빌드 실패("`ic_launcher_background.xml:20:45: Invalid namespace prefix 'android'`")는 내가 처음 파일을 만드는 중이던 미완성 상태였고, 이번 라운드에서 원인(아래 4번)을 찾아 고쳤다 — 최종적으로 Android 빌드 성공 확인함(같은 문제였다면 병렬 라운드에서도 이제 해소됨).
  1. **레이어 분리 및 안전 영역(safe zone) 계산**: 원본 192-unit viewBox 기준 전경 요소(수평선+겹치는 두 원+파형+작은 원)의 바운딩박스 중심은 (96, 88.5), 가장 바깥 지점(수평선 끝점 (20,138)/(172,138))이 그 중심에서 약 90.7유닛 떨어져 있음을 계산. 이를 108dp 캔버스로 옮기며 66dp 안전 영역(반지름 33dp, 모든 마스크 모양에서 잘리지 않음이 보장되는 원)에 여유를 두고 들어가도록 `scale(0.35)` + `translate(20.4, 23.025)`를 적용 — 변환 후 가장 바깥 지점이 캔버스 중심(54,54)에서 약 31.75dp 거리(33dp 미만, 여유 확보). 배경 레이어는 노을 그라디언트만 108×108 전체를 채우고(둥근 모서리 `rect rx=44`는 legacy 전용이라 제거 — 마스킹은 OS가 담당), 전경 레이어는 투명 배경 위에 원본 SVG 요소(라인/두 원/파형/작은 원)를 그대로 옮김.
  2. **배경 레이어**: `res/drawable/ic_launcher_background.xml`(신규) — 단순 2점 선형 그라디언트라 PNG 대신 표준 `<vector>` + `<gradient android:type="linear">`(`aapt:attr`)로 정확히 재현 가능하다고 판단해 벡터 드로어블로 구현(작업 지시가 허용한 "정확히 재현 가능하면 벡터가 낫다" 원칙 적용). 원본 SVG의 `linearGradient x1=0 y1=0 x2=0.15 y2=1`(objectBoundingBox 단위)을 108-유닛 절대좌표로 환산해 `startX=0 startY=0 endX=16.2 endY=108`로 매핑, 색상 정지점(`#FFB25B`→`#FF6F61`(52%)→`#4A2545`)은 그대로 유지.
  3. **전경 레이어**: `res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher_foreground.png`(신규, 108/162/216/324/432px — legacy 48/72/96/144/192px의 2.25배, Android Studio Image Asset 도구가 쓰는 표준 배율) — 반투명 원 두 개(`radialGradient` + `mix-blend-mode:screen`)와 파형(4.5px 스트로크 3줄), 수평선, 작은 점을 투명 배경 위에 그대로 유지해야 해서 벡터 드로어글로는 (a) mix-blend-mode를 API 26~28에서 지원하지 않고 (b) radial gradient의 세부 표현이 손실될 우려가 있어 PNG를 유지(지시문이 허용한 예외 조건 그대로 적용, 근거를 여기 남김). 도구는 지난 라운드와 동일하게 `sharp`(이미 `apps/mobile`의 devDependency, 추가 설치 없음) — 일회성 Node 스크립트(스크래치 디렉터리에서 작성/실행, 저장소에는 남기지 않음)로 `width/height` 속성을 밀도별 목표 픽셀 크기로 직접 지정한 SVG 문자열을 만들어 `sharp(Buffer).resize(size,size).png()`로 래스터라이즈(과거처럼 `density` 옵션을 추정하지 않고 SVG 자체의 width/height를 목표 픽셀 크기로 명시해 흐려짐 없이 정확한 해상도로 렌더링).
  4. `mipmap-anydpi-v26/ic_launcher.xml`·`ic_launcher_round.xml`(신규, 둘 다 동일 내용) — 표준 `<adaptive-icon>` XML, `background`는 `@drawable/ic_launcher_background`, `foreground`는 `@mipmap/ic_launcher_foreground` 참조. 두 아이콘(원형용/기본용)이 배경·전경 레이어를 공유하는 것은 적응형 아이콘의 표준 패턴(마스크 모양만 OS가 다르게 적용)이라 문제 없음.
  5. **버그 발견 및 수정**: 처음 작성한 XML 3개(`ic_launcher_background.xml`/`ic_launcher.xml`/`ic_launcher_round.xml`) 모두 `xmlns:android` 네임스페이스 URI를 `http://schemas.android.com/apis/res/android`(오타, "apis")로 잘못 썼다 — `grep`으로 프로젝트의 다른 리소스 XML(`rn_edit_text_material.xml`)을 확인해 정답이 `http://schemas.android.com/apk/res/android`("apk")임을 발견하고 3개 파일 모두 정정. 이 오타가 정확히 병렬 라운드가 겪은 `Invalid namespace prefix 'android' for value of 'name' attribute 'android:attr/fillColor'` 에러의 원인이었다(`aapt:attr name="android:fillColor"`가 `android` 프리픽스를 표준 네임스페이스로 인식하지 못해 발생) — 정정 후 재빌드로 해소 확인.
  6. Legacy `mipmap-*/ic_launcher.png`·`ic_launcher_round.png`는 지시대로 전혀 건드리지 않았다(API 26 미만 기기 대비 그대로 유지) — `git status`로 기존 5개 밀도 폴더의 legacy PNG가 수정되지 않았음을 재확인.
- 상태: 완료(검증 대기)
- 변경 파일: 신규 — `apps/mobile/android/app/src/main/res/drawable/ic_launcher_background.xml`, `apps/mobile/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`, `apps/mobile/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`, `apps/mobile/android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher_foreground.png`. `docs/roadmap.md`(적응형 아이콘 항목 체크). `apps/mobile/package.json`은 변경 없음(sharp가 이미 이전 라운드에 devDependency로 설치돼 있어 재설치 불필요 — `node -e "require('sharp')"`로 사용 가능 확인 후 그대로 씀).
- 비고(검증 시 주의):
  - `npx tsc --noEmit`(0 errors), `npx eslint .`(0 errors, 23 warnings — 전부 기존 관용적 `react-native/no-inline-styles`, 신규 경고 없음, 순수 Android 리소스 변경이라 예상대로 영향 없음), `npx jest`(7 suites/39 tests 전부 통과) 모두 확인.
  - Android 빌드: JAVA_HOME=`D:\Android Studio\jbr`, ANDROID_HOME/ANDROID_SDK_ROOT=`E:\Android\Sdk`, GRADLE_USER_HOME=`E:\gradle-home`로 `./gradlew.bat assembleDebug --no-daemon` → 처음엔 XML 주석에 `--`(더블 하이픈)가 포함돼 `parseDebugLocalResources` 실패(XML 주석 규칙 위반, 즉시 정정) → 그다음 네임스페이스 오타로 `mergeDebugResources` 실패(위 5번) → 둘 다 고친 뒤 **BUILD SUCCESSFUL in 15s**(203 actionable tasks: 33 executed, 170 up-to-date) 확인.
  - `aapt2 dump badging`(`E:\Android\Sdk\build-tools\36.1.0\aapt2.exe`)으로 최종 APK 확인: `application: label='SameWave' icon='res/mipmap-anydpi-v26/ic_launcher.xml'`, `application-icon-120`~`application-icon-65534` 전부 `res/mipmap-anydpi-v26/ic_launcher.xml`을 가리킴 — API 26+ 적응형 아이콘이 실제로 최우선 아이콘 리소스로 선택됨을 확인. `unzip -l app-debug.apk`로 `res/drawable/ic_launcher_background.xml`, `res/mipmap-anydpi-v26/ic_launcher.xml`·`ic_launcher_round.xml`, `res/mipmap-*-v4/ic_launcher_foreground.png` 전부 패키징됨과 동시에 기존 `res/mipmap-*-v4/ic_launcher.png`·`ic_launcher_round.png`(legacy)도 그대로 남아있음을 확인(둘 다 포함, 대체가 아니라 추가라는 지시사항 그대로 충족).
  - 렌더링 결과를 `Read` 도구로 시각 확인: (a) `mipmap-xxxhdpi/ic_launcher_foreground.png`(432×432, 투명 배경) — 겹치는 두 원+파형+작은 점이 캔버스 중앙에 잘 모여 있고 가장자리(수평선 끝부분 등)가 잘리지 않은 것을 눈으로 확인. (b) `mipmap-mdpi/ic_launcher_foreground.png`(108×108, 가장 작은 밀도)도 동일 구도로 흐려짐/깨짐 없이 렌더링됨 확인. (c) 스크래치 디렉터리에 배경+전경 합성 미리보기(432px, 원형 마스크 시뮬레이션 포함)를 별도로 만들어 최종 조합이 목업과 일치하고 원형 마스크로 잘라도 콘텐츠가 안전하게 안쪽에 들어감을 추가로 확인(이 미리보기 자체는 실제 앱 리소스가 아니라 검증용, 저장소에 남기지 않음).
  - 일회성 Node 스크립트는 스크래치 디렉터리(`.../scratchpad/icon/render.js`)에 작성해 실행했고 저장소에는 커밋 대상 파일로 남기지 않았다(관례 그대로 유지). `sharp`를 요구하는 `require`가 스크립트 자체 위치 기준으로는 해석되지 않아(Node의 모듈 해석 규칙상 스크립트 상위 디렉터리 트리에 `node_modules`가 없음) `NODE_PATH=".../apps/mobile/node_modules"` 환경변수를 지정해 실행했다 — 향후 유사 작업 시 참고.
  - iOS는 이번 작업 범위 밖(지시문이 Android 전용으로 명시)이라 손대지 않았다.
  - 이 세션에서 병렬로 진행 중이던 `apps/mobile/src/`(스플래시/엣지 상태 화면) 작업과는 지시대로 전혀 겹치지 않게 `android/app/src/main/res/`만 건드렸다 — `git status`로 최종 확인 시 내가 만든 파일 외에 다른 파일이 수정되지 않았음을 재확인.
- "낮은 우선순위 / 보류" 절의 2.1/2.14 체크박스를 모두 체크(완료 표시)하고, 2.14 항목에 "컴포넌트는 완성, 실제 트리거는 Firebase Presence 연동 후 과제로 이관"이라는 설명을 덧붙였다.
- 변경 파일: 신규 — `apps/mobile/src/screens/SplashScreen.tsx`, `apps/mobile/src/components/ReconnectingOverlay.tsx`. 수정 — `apps/mobile/src/navigation/types.ts`, `apps/mobile/src/navigation/RootNavigator.tsx`, `apps/mobile/src/screens/RoomScreen.tsx`, `docs/roadmap.md`.
- 비고(검증 시 주의): (1) 앱 최초 실행 시 스플래시가 잠깐(약 0.9초) 보이고 Onboarding으로 자동 전환되는지, 뒤로가기로 스플래시로 돌아가지지 않는지(`navigation.replace` 사용 확인). (2) `ReconnectingOverlay`/호스트 토스트는 지금 데이터로는 실사용 중 절대 나타나지 않는다는 점을 검증 체크리스트에 "트리거 불가, 코드 리뷰로만 확인" 같은 형태로 반영해달라(강제로 보이게 하려면 `RoomScreen.tsx`의 `myConnectionStatus === 'reconnecting'` 조건이나 `mockSessionSeed.ts`의 `connectionStatus` 값을 임시로 바꿔야 하는데, 후자는 목업 파일 수정이라 이번 라운드 범위 밖으로 판단해 하지 않았다 — 필요하면 검증 에이전트가 임시 로컬 수정으로 스모크 확인 후 되돌리는 방식을 제안한다). (3) Android 빌드는 아이콘 작업 완료 후 재검증 필요(이번 실패는 내 변경과 무관, 위 "3. 검증" 참고). (4) 커밋은 하지 않았다 — 리더 검토 후 처리.

## 2026-07-26 (서비스별 플레이리스트 독립 보존 — 데이터 수준 구현)
- 작업: `docs/roadmap.md` "낮은 우선순위" 절 항목 — 04-playlist.md "플레이리스트 구조"(세션 1 : 서비스별 플레이리스트 N, N=2)가 요구하는 "Spotify↔YouTube 전환 시 비활성화되는 쪽 플레이리스트가 삭제되지 않고 그대로 보존됨"을 데이터 모델 수준까지 실제로 구현했다. 기존에는 `SessionState.playlist: PlaylistEntry[]` 단일 배열을 서비스와 무관하게 공유해서, 전환해도 "우연히 곡이 안 사라지는" 것처럼 보였을 뿐 실제로는 같은 하나의 목록을 계속 보여주는 것이었다(`switchService` 기존 주석에 이미 이 한계가 명시돼 있었음).

### 1. 데이터 구조 설계 판단 (핵심, 근거 상세)
- `apps/mobile/src/types/domain.ts`: `SessionState.playlist: PlaylistEntry[]`를 제거하고 `playlists: Record<SingleMusicService, ServicePlaylistState>`로 교체(`SingleMusicService = Exclude<MusicService, 'mixed'>`, `ServicePlaylistState = {entries: PlaylistEntry[]; lastPlayback: ServicePlaybackMemory}`, `ServicePlaybackMemory = {currentEntryId: string | null; positionMs: number}`).
  - 왜 `Record<서비스, {entries, lastPlayback}>`인가: 곡 목록뿐 아니라 "그 서비스가 비활성화되기 직전의 재생 위치"까지 서비스별로 독립시켜야 한다고 판단했다(아래 판단 참고). 곡 목록만 분리하고 재생 위치는 여전히 공유 `playback` 하나만 쓰면 "전환해도 곡은 안 사라지는데 아까 어디까지 들었는지는 기억 못 한다"는 절반짜리 구현이 된다 — 04문서 13행 "이어서 쓸 수 있다"는 서술이 곡 목록뿐 아니라 재생 지점까지 포함한다고 해석했다(정확한 근거는 domain.ts의 `ServicePlaybackMemory` 주석에 남김).
  - `currentEntryId`를 서비스별로 독립시킬지 여부(작업 지시가 명시적으로 판단을 요구한 지점): 독립시키기로 판단 — `positionMs`도 함께. 다만 `isPlaying`/`serverTimestamp`/`updatedByParticipantId`는 스냅샷에 포함하지 않았다 — 서비스 전환은 05-sync-architecture.md 관점에서 항상 "재동기화" 이벤트이므로, 복귀 시점에는 항상 새로 재생을 시작(`isPlaying: true`, `serverTimestamp: Date.now()`)하는 기존 정책(SessionContext.requestServiceSwitch가 원래 하던 것)을 그대로 유지하는 편이 "몇 분 전에 멈춰있던 상태 그대로 조용히 복귀"보다 실시간 동기화 앱 성격에 맞다고 판단했다.
  - 왜 `SingleMusicService`를 새로 만들고 `MixedParticipantPlatform`을 재사용하지 않았는가: 값 집합(`'spotify'|'youtube'`)은 구조적으로 같지만, `MixedParticipantPlatform`은 "혼합 세션에서 참여자 개인이 고른 플랫폼"이라는 참여자 단위 개념이고 `SingleMusicService`는 "세션 전체의 활성 서비스"라는 세션 단위 개념이다. 우연히 값 집합이 같다고 타입을 합치면 코드를 읽을 때 "이 값이 세션 단위인지 참여자 단위인지"가 흐려진다고 판단해 별도 타입으로 유지했다(domain.ts 주석에 동일 근거 기록).
  - 혼합 세션과의 관계: `playlists.spotify`/`playlists.youtube`는 혼합 세션에서는 항상 `{entries: [], lastPlayback: {currentEntryId: null, positionMs: 0}}`로 두고 쓰지 않는다 — `mixedPlaylist`(플랫폼 중립, 완전히 다른 구조)를 그대로 쓴다. 작업 지시대로 `mixedPlaylist` 자체는 전혀 건드리지 않았다.
- 데모 시드 정책(mockSessionSeed.ts 파일 자체는 수정하지 않고, `sessionService.createSession`에서 조립 로직만 변경): "세션 생성 시점에 활성화된 서비스에만" 데모 곡 3개를 채우고, 비활성 서비스는 처음부터 빈 플레이리스트로 시작하도록 판단했다 — 세션 생성 직후 아직 서비스 전환을 한 번도 안 한 시점에 "가보지 않은 서비스"에 이미 데모 곡이 있는 건 어색하고, 검증 시나리오("YouTube로 전환 → YouTube 플레이리스트는 비어있음")와도 정확히 부합한다.

### 2. 구현
- `apps/mobile/src/services/session/sessionService.ts`: `createSession`은 위 판단대로 `playlists`를 조립(`firstEntryId`는 활성 서비스 쪽 entries의 첫 곡으로 계산, 혼합은 기존과 동일하게 `mixedPlaylist[0]`). `addTrack`/`removeTrack`/`reorderPlaylist`는 전부 신규 헬퍼 `state/activeServicePlaylist.ts`의 `activePlaylistEntries`/`withActivePlaylistEntries`를 통해 "현재 활성 서비스의 entries"만 읽고 쓰도록 변경 — 비활성 서비스의 `session.playlists[다른서비스]`는 절대 손대지 않는다(이 세 함수는 혼합 세션에서는 호출되지 않는다는 기존 전제 그대로 유지, 호출측 SessionContext.tsx가 이미 addMixedTrack 등으로 분기). `switchService(sessionId, newService, switchedByParticipantId)`는 시그니처에 `switchedByParticipantId` 파라미터를 신규 추가(전환 후 `playback.updatedByParticipantId`를 "전환을 실행한 사람"으로 정확히 채우기 위함)하고, 이제 단순히 `service` 플래그만 바꾸는 게 아니라 (1) 전환 직전 활성 서비스의 `playback.currentEntryId`/`positionMs`를 `playlists[oldService].lastPlayback`에 스냅샷 저장, (2) `playlists[newService].lastPlayback`으로부터 새 `session.playback`을 복원(`isPlaying: true`로 항상 재개)하는 두 단계를 수행한다. 반환 타입도 `SessionState` 전체에서 `ServiceSwitchResult`(`{service, playlists, playback}`, 실제로 바뀐 필드만)로 좁혔다 — addTrack 등 다른 함수가 "바뀐 부분만 반환"하는 기존 패턴과 통일.
- `apps/mobile/src/state/activeServicePlaylist.ts`(신규): "활성 서비스의 플레이리스트"를 읽는 `activePlaylistEntries`와, 그 배열을 교체한 `session.playlists`를 만드는 `withActivePlaylistEntries` 두 순수 함수. sessionService.ts와 SessionContext.tsx 양쪽, 그리고 PlaylistView/NowPlayingView/YouTubeNowPlayingView 세 화면이 전부 이 헬퍼를 공유하도록 만들어 `session.service==='mixed'?[]:session.playlists[session.service].entries` 같은 삼항식이 여러 파일에 중복되는 걸 막았다(작업 지시 "최근 라운드들이 state/*.ts 순수 함수 추출 패턴을 잘 써왔다"를 그대로 따름).
- `apps/mobile/src/state/SessionContext.tsx`: `requestNextTrack`/`requestPrevTrack`/`addTrack`/`removeTrack`/`requestMoveTrack`이 전부 `activePlaylistEntries`/`withActivePlaylistEntries`를 거치도록 갱신. `requestServiceSwitch`는 이제 `sessionService.switchService`가 계산까지 다 해서 돌려준 `{service, playlists, playback}`을 그대로 `prev` 위에 병합하기만 한다 — 기존에 있던 "positionMs를 무조건 0으로 리셋" 로직은 제거했다(서비스별 재생 위치 독립 기억·복원이 이번 작업의 핵심이라 여기서 다시 0으로 덮어쓰면 안 됨).
- `apps/mobile/src/screens/room/PlaylistView.tsx`/`NowPlayingView.tsx`/`YouTubeNowPlayingView.tsx`: `session.playlist` 직접 참조를 전부 `activePlaylistEntries(session)`로 교체(혼합 세션 분기는 기존 그대로 유지, 그쪽은 `session.mixedPlaylist`를 그대로 씀).
- `apps/mobile/src/state/playlistSequencing.ts`: 로직 변경 없음(순수 함수라 그대로 재사용 가능 — 애초에 "정렬된 엔트리 배열"만 받는 제네릭 함수라 어느 배열에서 왔는지 몰라도 됨), 파일 헤더 주석만 새 필드 경로를 반영해 갱신.

### 3. 테스트
- `apps/mobile/__tests__/mixedTrackView.test.ts`: `makeSession` 헬퍼가 `SessionState`를 직접 구성하던 곳에서 `playlist: []`를 `playlists: {spotify: {...}, youtube: {...}}`로 갱신(구조 변경에 따른 필수 수정, 회귀 아님) — 이 파일은 혼합 세션(`mixedPlaylist`)만 실제로 검증하므로 로직 자체는 안 건드림.
- `apps/mobile/__tests__/serviceSwitchPlaylistIsolation.test.ts`(신규) — 작업 지시의 "검증 시나리오"를 그대로 코드화: (1) Spotify에서 A/B/C 추가 → YouTube 전환 → YouTube 비어있음 확인 → YouTube에서 D 추가 → Spotify로 복귀 → A/B/C 보존 + D는 안 보임 + D는 YouTube 쪽에 여전히 남아있음(삭제 아님을 명시적으로 확인). (2) `currentEntryId`/`positionMs`가 서비스별로 독립적으로 기억·복원되는지(Spotify에서 50초 지점 시뮬레이션 → YouTube 전환(새 서비스라 null/0) → YouTube에서 15초 지점 시뮬레이션 → Spotify 복귀(50초 그대로 복원) → 다시 YouTube 복귀(15초 그대로 복원)). (3) 같은 서비스로 "전환" 시도 시 아무 것도 안 바뀜(참조 동일성까지 확인). (4) 혼합 세션에서 `switchService` 호출 시 `undefined` 반환(09문서 "결정 3" 회귀 확인).
- `playlistSequencing.test.ts`는 순수 함수 시그니처가 그대로라 수정 불필요(변경 없이 그대로 통과).

### 4. 검증
- `apps/mobile`에서 `npx tsc --noEmit` — 0 errors.
- `npx eslint .` — 0 errors, 23 warnings(전부 기존 `react-native/no-inline-styles` 관용 경고, 신규 경고 없음).
- `npx jest` — **8 suites / 43 tests 전부 통과**(신규 `serviceSwitchPlaylistIsolation.test.ts` 5개 포함, 기존 스위트 전부 회귀 없이 통과).
- Android: `cd apps/mobile/android && ./gradlew.bat assembleDebug --no-daemon`(JAVA_HOME=`D:\Android Studio\jbr`, ANDROID_HOME/ANDROID_SDK_ROOT=`E:\Android\Sdk`, GRADLE_USER_HOME=`E:\gradle-home`) — **BUILD SUCCESSFUL in 24s**(203 actionable tasks: 27 executed, 176 up-to-date).
- iOS는 기존 라운드들과 동일하게 macOS 부재로 미검증(구조적 제약, 신규 아님).
- 회귀 확인: 혼합 세션(`mixedPlaylist`) 관련 코드는 전혀 수정하지 않았고(작업 지시대로), `ParticipantsBottomSheet.tsx`/`MatchingQueueSheet.tsx` 등 `mixedPlaylist`만 참조하는 화면들도 손대지 않았다 — grep으로 `session.playlist`(구 단일 필드) 참조가 코드베이스 전체에서 완전히 제거됐고 남은 참조가 전부 `session.mixedPlaylist`이거나 새 헬퍼 경유임을 확인. 역할/정원/Free/매칭 큐 관련 기존 단위 테스트(`sessionPermissions.test.ts`/`joinSessionByCode.test.ts`/`matchQueueNavigation.test.ts`/`trackMatcher.test.ts`)는 이번 데이터 모델 변경과 무관한 영역이라 전부 그대로 통과.
- `docs/roadmap.md` "낮은 우선순위" 절의 해당 체크박스를 직접 갱신함(미완료 → 완료, Firebase 실제 연동은 여전히 TODO로 명시).
- 상태: 완료(검증 대기)
- 변경 파일: 수정 — `apps/mobile/src/types/domain.ts`, `apps/mobile/src/services/session/sessionService.ts`, `apps/mobile/src/state/SessionContext.tsx`, `apps/mobile/src/state/playlistSequencing.ts`(주석만), `apps/mobile/src/screens/room/PlaylistView.tsx`, `apps/mobile/src/screens/room/NowPlayingView.tsx`, `apps/mobile/src/screens/room/YouTubeNowPlayingView.tsx`, `apps/mobile/__tests__/mixedTrackView.test.ts`, `docs/roadmap.md`. 신규 — `apps/mobile/src/state/activeServicePlaylist.ts`, `apps/mobile/__tests__/serviceSwitchPlaylistIsolation.test.ts`.
- 비고(검증 시 주의): (1) `mockSessionSeed.ts`는 실제로는 수정하지 않았다 — `buildDemoPlaylist`는 여전히 "곡 목록 하나"만 생성하는 순수 함수 그대로 두고, "어느 서비스에 넣을지"는 `sessionService.createSession`에서 조립 시점에 결정하도록 했다(위 1번 판단 참고, 데모 곡은 항상 세션 생성 시점의 활성 서비스에만 들어감 — 비활성 서비스는 빈 채로 시작). (2) `SessionContext.requestServiceSwitch`가 이제 "positionMs를 0으로 강제 리셋"하지 않으므로, 세션 설정 화면에서 서비스를 전환한 뒤 재생 화면의 진행 바가 즉시 0%가 아니라 이전에 그 서비스에서 멈췄던 위치(또는 처음이면 0)로 보이는 게 의도된 동작이다 — 검증 시 "전환하면 항상 0초부터 시작해야 한다"고 오해하지 않도록 주의. (3) Free 계정/정원/역할 관련 기존 QA 체크리스트 항목들은 이번 변경과 무관하지만, 플레이리스트 탭/Now Playing 탭에서 서비스 전환 왕복(Spotify→YouTube→Spotify) 후 곡 목록과 재생 위치가 각각 올바르게 복원되는지는 신규 검증 항목으로 QA 체크리스트에 추가하는 것을 제안한다. (4) 커밋은 하지 않았다 — 리더 검토 후 처리.

## 2026-07-27
- 작업: Round 13 검증에서 발견된 비차단 갭 수정 — "복원된 `positionMs`가 YouTube IFrame Player의 실제 시크에 반영되지 않는다"(직전 라운드 서비스별 플레이리스트 독립 보존 구현, 커밋 `e29c1ec`의 후속 갭).
- 원인 재확인: 갭 리포트가 처음 지목한 `loadVideoById`/`cueVideoById`(곡 전환 경로, `youtubePlayerStub.ts`)는 이미 `startSeconds`를 지원하고 있어 손댈 필요가 없었다 — 실제 원인은 `YouTubeNowPlayingView.tsx`의 `initialHtml` useMemo(컴포넌트 최초 마운트 시 굽는 HTML, 곡 전환과 무관)가 `session.playback.positionMs`를 전혀 참조하지 않았고, `buildYoutubePlayerHtml`이 애초에 `startSeconds` 옵션 자체를 받지 않았다는 점이었다.
- 수정 내용:
  1. `apps/mobile/src/services/youtube/youtubePlayerHtml.ts`: `BuildYoutubePlayerHtmlOptions`에 `startSeconds?: number` 추가. IFrame Player API의 `start` playerVar는 정수 초만 허용(공식 스펙 확인)하므로 `Math.floor`로 방어적 내림 처리하고, 음수/0/미제공은 모두 0으로 클램프. `YT.Player` 생성 시 `playerVars.start`에 반영.
  2. `apps/mobile/src/screens/room/YouTubeNowPlayingView.tsx`: `initialHtml`이 `startSeconds: !isMixed && session ? Math.floor(session.playback.positionMs / 1000) : 0`을 전달하도록 배선. 혼합 세션(`isMixed`)은 명시적으로 제외 — `session.playback.positionMs`가 `switchService`의 서비스별 스냅샷 복원 대상이 아니라 참여자별 매칭 트랙 재생을 따라가는 다른 의미의 값이기 때문(`sessionService.switchService`가 `session.service === 'mixed'`이면 조기 반환하는 것으로 재확인). 최초 참여/생성 직후(`positionMs === 0`)와 전환 후 복귀 케이스가 동일한 마운트 경로/로직으로 자연스럽게 커버됨 — 별도 분기 불필요(지시대로).
  3. 신규 단위 테스트 `apps/mobile/__tests__/youtubePlayerHtml.test.ts` — `buildYoutubePlayerHtml`(순수 함수)의 `startSeconds` 처리(미제공 시 0, 정수 그대로 반영, 소수점 내림, 음수 클램프, videoId/autoplay와 공존)를 생성된 HTML 문자열 포함 여부로 검증(5 tests).
- 검증:
  - `npx tsc --noEmit` — 0 errors.
  - `npx eslint .` — 0 errors, 23 warnings(전부 기존 `react-native/no-inline-styles` 관용 경고, 신규 경고 없음).
  - `npx jest` — **9 suites / 48 tests 전부 통과**(기존 8 suites/43 tests + 신규 `youtubePlayerHtml.test.ts` 5개, 회귀 없음).
  - Android: `cd apps/mobile/android && ./gradlew.bat assembleDebug --no-daemon`(JAVA_HOME=`D:\Android Studio\jbr`, ANDROID_HOME/ANDROID_SDK_ROOT=`E:\Android\Sdk`, GRADLE_USER_HOME=`E:\gradle-home`) — **BUILD SUCCESSFUL in 23s**(203 actionable tasks: 27 executed, 176 up-to-date).
  - `docs/roadmap.md`의 해당 갭 항목을 미완료 → 완료로 갱신(원인/수정 내용 요약 포함).
- 상태: 완료(검증 대기)
- 변경 파일: 수정 — `apps/mobile/src/services/youtube/youtubePlayerHtml.ts`, `apps/mobile/src/screens/room/YouTubeNowPlayingView.tsx`, `docs/roadmap.md`. 신규 — `apps/mobile/__tests__/youtubePlayerHtml.test.ts`.
- 비고(검증 시 주의): (1) 실기기가 없어 실제 YouTube 영상이 복원된 지점부터 시각적으로 재생되는지는 확인 불가 — 이번 검증은 코드 트레이스 + `playerVars.start`에 값이 올바르게 굽히는지 단위 테스트 수준까지만 이뤄졌다. 실기기/에뮬레이터 검증 시 "Spotify→YouTube 전환 후 다시 YouTube로 복귀 → 이전에 멈췄던 지점 근처(±수 초, 네트워크/버퍼링 오차 허용)부터 재생 시작"을 새 체크리스트 항목으로 추가하는 것을 제안한다. (2) 혼합 세션 쪽은 의도적으로 건드리지 않았다 — 혼합 세션에서 YouTube 참여자의 영상이 항상 0초부터 시작하는 기존 동작은 이번 수정 범위 밖이며 회귀도 아니다(애초에 그 케이스의 `positionMs`는 다른 의미이므로 적용 대상이 아니었음). (3) 커밋은 하지 않았다 — 리더 검토 후 처리.

## 2026-07-27
- 작업: 디버그 빌드 전용 "데모로 둘러보기" 로그인 바이패스 추가 (실제 Spotify OAuth 없이 로그인 이후 화면(홈/세션 생성/Now Playing/플레이리스트/참여자/세션 설정 등)을 개발자/QA가 확인할 수 있게 함).
  1. `AuthContext.tsx`에 `loginAsDemo()` 액션 추가 — OAuth를 거치지 않고 가짜 `SpotifyProfile`(`id: 'demo-user'`, `displayName: '데모 사용자'`, `isPremium: true`)로 즉시 `status: 'signed_in'` 세팅, `tokens`는 `null`로 유지.
  2. `SpotifyConnectScreen.tsx`에 `__DEV__`로 감싼 "데모로 둘러보기" 링크 추가 — 기존 "Spotify로 로그인" 버튼과 스타일로 명확히 구분(하단 구분선 + "⚠ 개발자 전용 (릴리즈 빌드에서 제외됨)" 라벨 + 작은 밑줄 텍스트 링크). 탭하면 `loginAsDemo()` 호출, 기존 `useEffect`(status === 'signed_in' → Home replace)가 그대로 작동.
  3. 세션 생성/참여 흐름(`CreateSessionScreen.tsx`, `HomeScreen.tsx`) 코드 재확인 — `profile.id`/`profile.displayName`/`profile.isPremium`만 참조하고 `tokens`에 의존하지 않으므로 데모 프로필로도 동일하게 동작함을 확인(코드 변경 없음). `tokens?.accessToken ?? null` 패턴(PlaylistView, MatchingQueueSheet 등)도 이미 optional chaining이라 tokens=null을 안전하게 처리 — Spotify 검색 등 실제 Web API 호출 지점은 accessToken 없이 자연스럽게 실패/빈 결과로 처리됨(의도된 제약, 목업 대체 안 함).
- 상태: 완료(검증 대기)
- 변경 파일: `apps/mobile/src/services/auth/AuthContext.tsx`, `apps/mobile/src/screens/SpotifyConnectScreen.tsx`
- 비고: **개발자/QA 전용 기능이며 릴리즈 빌드에서 완전히 제외됨** — `__DEV__`(React Native 전역, 릴리즈에서는 컴파일 타임에 `false`로 치환되어 데드코드 제거됨)로 감싸서 릴리즈 빌드에는 버튼/로직이 노출되지 않는다. 검증 시 확인 필요: (1) Android 디버그 빌드(`assembleDebug`, JAVA_HOME=D:\Android Studio\jbr, ANDROID_HOME/ANDROID_SDK_ROOT=E:\Android\Sdk, GRADLE_USER_HOME=E:\gradle-home)에서 BUILD SUCCESSFUL 확인 완료(203 tasks, 40s). **이 프로젝트는 2026-07-25 라운드에서 이미 `android/app/build.gradle`에 `debuggableVariants = []`를 설정해뒀으므로(사이드로드 배포용 독립 실행형 debug APK), debug 빌드도 JS 번들을 APK 안에 실제로 패키징한다** — `createBundleDebugJsAndAssets` 태스크 실행을 확인했고, 그 산출물인 `android/app/build/intermediates/sourcemaps/react/debug/index.android.bundle.packager.map`(Metro가 생성한 Hermes 컴파일 전 소스맵, 사람이 읽을 수 있는 JSON)에 `loginAsDemo`, `SpotifyConnectScreen`, "둘러보기"(버튼 텍스트 일부) 문자열이 실제로 포함돼 있음을 직접 열어 확인했다 — 새 코드가 debug APK가 로드할 번들에 실제로 담긴다는 뜻. (최종 패키징된 Hermes bytecode(.hbc)를 raw byte 스캔으로 직접 뒤져보려 했으나 Hermes의 문자열 저장 방식이 오프셋 테이블과 뒤섞여 있어 신뢰할 수 있는 방법이 아니었다 — 소스맵 확인으로 대체함.) Metro 개발 서버로 앱을 띄워 확인할 때도 `__DEV__`는 true이므로 버튼이 보여야 정상. (2) `npx tsc --noEmit`/`npx eslint .`(기존 warning 23개만, 신규 error 없음)/`npx jest`(9 suites, 48 tests 전부 통과) 회귀 없음 확인 완료. (3) 데모 로그인 후 곡 검색 등 실제 Spotify Web API 호출 화면은 accessToken이 없어 에러/빈 결과가 뜨는 것이 정상 — 버그로 오인하지 말 것. YouTube/혼합 세션도 로그인 벽만 넘으면 자연스럽게 접근 가능(별도 구현 불필요, 확인만).

## 2026-07-27 (2)
- 작업: `docs/firebase-integration-guide.md` "파일/정보를 받으면 리더가 진행할 작업" 절의 2번(파일 배치)·3번(Gradle 플러그인 연결)만 진행 — 사용자가 올바른 패키지명(`com.mobile`)으로 재등록한 Firebase Android 앱의 `google-services.json`을 프로젝트에 배치하고 Google Services Gradle 플러그인을 연결. `@react-native-firebase` npm 설치, `firebaseClient.ts` STUB 교체(4~6번)는 이번 범위 밖(Realtime Database vs Firestore 미결정) — 손대지 않음.
  1. `C:\Users\Feel\.claude\uploads\...\1da224e7-googleservices.json`(신규, 원본 그대로) → `apps/mobile/android/app/google-services.json`에 배치. `client` 배열에 `com.mobile`(신규, 올바름, `mobilesdk_app_id` 접미사 `...95015d`)과 `come.mobile`(기존 오타, 그대로 남아있지만 앱이 참조하지 않으므로 무해) 두 항목 포함.
  2. 저장소 루트의 오래된 `E:\music share\google-services.json`(예전 오타 버전, 그동안 커밋 안 하고 방치했던 파일) 삭제 — `git status`에는 계속 `??`(untracked)로만 잡혀있었으므로 삭제해도 git 이력에 영향 없음.
  3. `apps/mobile/android/build.gradle`(루트) `buildscript { dependencies {} }`에 `classpath("com.google.gms:google-services:4.5.0")` 추가. 버전 선정 근거: `dl.google.com`(Google Maven, react-native-app-auth 관련 androidx.browser도 이미 이 저장소를 쓰고 있어 신뢰 가능한 소스) `com/google/gms/google-services/maven-metadata.xml`을 직접 조회 — `<latest>`/`<release>` 모두 `4.5.0`(lastUpdated 2026-06-16), 웹 검색 결과 중 하나가 보여준 "3.1.1"은 오래된 부분 인덱스라 오도 소지가 있어 metadata.xml 직접 조회로 재확인함. AGP 최소 요구치가 낮은 플러그인이라(공식 문서상 3.4+) 이 프로젝트의 AGP 8.10.1/Gradle 8.11.1과 충돌 없음 — 실제 빌드로도 확인됨(아래 검증 참고).
  4. `apps/mobile/android/app/build.gradle`은 기존에 `plugins { id ... }` DSL이 아니라 `apply plugin: "..."` 나열형을 쓰고 있어(react.android, kotlin.android, facebook.react 3줄) 동일 스타일로 `apply plugin: "com.google.gms.google-services"` 한 줄 추가(기존 3줄 바로 아래).
  5. `.gitignore` 확인 — 루트에 `.gitignore` 없고 `apps/mobile/.gitignore`만 존재. `*.keystore`(단 `!debug.keystore` 예외) 규칙만 있고 `google-services.json`을 걸러내는 패턴은 없음 — `git check-ignore -v apps/mobile/android/app/google-services.json`으로 실제 무시되지 않음을 확인(exit code 1). 임의로 gitignore를 건드리지 않음(지시대로 확인만).
- 검증:
  - `npx tsc --noEmit` — 0 errors(출력 없음).
  - `npx eslint .` — 0 errors, 23 warnings(전부 기존 `react-native/no-inline-styles` 관용 경고, 신규 경고 없음, 이번 변경은 JS/TS를 건드리지 않았으므로 당연한 결과).
  - `npx jest` — 9 suites / 48 tests 전부 통과(회귀 없음).
  - Android: `cd apps/mobile/android && ./gradlew.bat assembleDebug --no-daemon`(JAVA_HOME=`D:\Android Studio\jbr`, ANDROID_HOME/ANDROID_SDK_ROOT=`E:\Android\Sdk`, GRADLE_USER_HOME=`E:\gradle-home`) — **BUILD SUCCESSFUL in 3m 52s**(204 actionable tasks: 194 executed, 10 up-to-date; 첫 클린 빌드급이라 이전 라운드 대비 오래 걸림 — 신규 classpath 도입으로 캐시 일부 무효화된 것으로 보임, 문제 아님). `app:processDebugGoogleServices` 태스크가 실행되어 `app/build/generated/res/processDebugGoogleServices/values/values.xml`을 생성함을 확인 — 내용은 `google_app_id = 1:1000609556712:android:24105986b8836b9795015d`로, `client` 배열 중 **`com.mobile`(올바른 패키지명) 항목과 정확히 일치**(오타 `come.mobile` 항목의 app id `...d7e7371132bad03e95015d`가 아님) — 플러그인이 `applicationId "com.mobile"`과 google-services.json을 올바르게 매칭했다는 직접 증거.
  - 산출물 확인: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` 실제 생성됨(약 133MB, 2026-07-27 11:35).
- 상태: 완료(검증 대기)
- 변경 파일: 신규 배치 — `apps/mobile/android/app/google-services.json`. 수정 — `apps/mobile/android/build.gradle`(classpath 추가), `apps/mobile/android/app/build.gradle`(plugin apply 추가). 삭제 — `E:\music share\google-services.json`(루트, 오래된 오타 버전, 원래 untracked).
- 비고(검증 시 주의): (1) 이번 라운드는 순수 "파일 배치 + Gradle 플러그인 연결"까지다 — `@react-native-firebase/*` npm 패키지는 설치하지 않았고 `services/firebase/firebaseClient.ts`는 여전히 STUB 그대로다(`getFirebaseConnectionStatus()`가 항상 `{isConfigured: false}` 반환) — 이 상태 그대로가 정상이며 버그가 아니다. (2) google-services 플러그인이 하는 일은 현재로선 `google-services.json` → Android 리소스(`values.xml`) 변환뿐이고, 그 리소스를 실제로 소비하는 Firebase SDK가 아직 없으므로 런타임 동작 변화는 전혀 없다 — 앱을 설치/실행해도 이전과 동일하게 보여야 정상(회귀 아님, 오히려 "달라진 게 없어야" 통과). (3) `google-services.json`은 이번에 커밋 대상 파일로 배치했다(Firebase API 키는 클라이언트 앱 노출이 전제인 값이라 이 프로젝트가 기존에 커밋 대상으로 취급해온 전제와 일치, `docs/firebase-integration-guide.md` 참고) — 리더가 커밋 시 `.gitignore`에 걸리지 않고 실제로 스테이징되는지 한 번 더 확인 권장. (4) 다음 라운드(4~6번: npm 패키지 설치, firebaseClient.ts 실제 초기화, sessionService.ts Firebase 전환)는 Realtime Database vs Firestore 결정이 선행돼야 하므로 이번 작업 범위에서 의도적으로 제외했다.

## 2026-07-27 (3) — RTDB 코드 준비: `@react-native-firebase/app` + `/database` 설치, `firebaseClient.ts` 실제 초기화
- 작업: `docs/decision-log.md`(2026-07-27, RTDB 확정)의 후속 조치 — RTDB가 콘솔에서 아직 활성화되지 않은 상태에서도 병행 가능한 코드 준비 작업. `sessionService.ts` 교체(실제 read/write 배선)와 RTDB 보안 규칙은 명시적으로 이번 범위 밖.
  1. **SDK 버전 선택**: `npm view @react-native-firebase/app versions`로 확인한 최신 안정 배포는 `25.1.0`(dist-tag `latest`). peerDependencies는 `react-native: '*'`로 특정 최소 버전을 강제하지 않으나, 공식 FAQ(`rnfirebase.io/faqs-and-tips`)가 "We test with new architecture enabled now, and many of our users are using react-native 0.76+ with new architecture enabled"라고 명시 — 이 프로젝트는 이미 `newArchEnabled=true`(`android/gradle.properties`)라 해당 테스트 조합에 정확히 부합한다고 판단해 `25.1.0`으로 결정(구버전으로 낮출 근거가 없었음). `package.json`의 `@react-native-firebase/app`·`@react-native-firebase/database` 둘 다 `"25.1.0"`으로 **정확히 고정**(caret 없음) — 이 프로젝트가 `react`/`react-native` 자체도 정확히 고정하는 관례를 따른 것이고, 지난 두 라운드(androidx.browser 버전 충돌, google-services 4.5.0 선정)에서 네이티브 의존성의 사소한 버전 드리프트가 빌드를 깨뜨린 전례가 있어 재현성을 우선했다.
  2. **`firebaseClient.ts` STUB → 실제 초기화 코드 교체**: 모듈러 API(`getApps()` from `@react-native-firebase/app`, `getDatabase()` from `@react-native-firebase/database`)로 작성 — 레거시 네임스페이스드 API(`firebase.app()`, `database().ref()`)도 v25에 여전히 존재하지만(공식 문서/타입 확인), v22부터 지속적으로 비권장(deprecated)되는 추세이고 공식 예제도 모듈러 패턴 기준이라 처음부터 모듈러로 통일. `getFirebaseDatabase()` 헬퍼를 신규 노출(인스턴스 생성만, 네트워크 요청 없음) — 지시대로 이 헬퍼를 실제로 호출해 read/write하는 코드는 작성하지 않았다(어떤 소비 코드도 아직 이 파일을 import하지 않음, `grep` 확인).
  3. **`getFirebaseConnectionStatus()` 재설계**: `isAppInitialized`(= `getApps().length > 0`, 네이티브 설정 파일 기반 앱 자동 초기화 여부) + `isDatabaseVerified` + 하위호환 `isConfigured` 세 필드로 구성. **한계를 구분이 아니라 명시로 처리**하기로 판단 — `isDatabaseVerified`는 실제로는 RTDB 활성화 여부를 검증하지 않고 `isAppInitialized`와 동일한 값을 그대로 반영한다(주석에 이유 상세: 앱 초기화는 네이티브 설정 파일만 있으면 동기적으로 완료되지만, 특정 하위 서비스(RTDB)가 콘솔에서 켜졌는지는 실제 네트워크 read/write 응답 전까지 알 방법이 없고, 그 read/write 자체가 이번 라운드 범위 밖이기 때문). 즉 "구분 가능하면 구분, 어려우면 한계를 주석으로 명시" 지시에서 후자를 택했다 — 필드명은 구분된 것처럼 보이지만 값 계산 로직은 아직 동일하다는 점을 검증 에이전트가 코드 리뷰 시 반드시 인지해야 함(다음 라운드에서 `sessionService.ts`가 실제 RTDB 호출로 교체되면, 그 호출의 성공/실패로 `isDatabaseVerified`를 실질적으로 갱신할 수 있음 — 주석에 이 계획을 남겨둠).
  4. `.env.example`의 Firebase 절 갱신: `FIREBASE_PROJECT_ID`/`FIREBASE_API_KEY`/`FIREBASE_APP_ID`/`FIREBASE_DATABASE_URL`이 **현재 불필요함**을 명시(주석 처리 + 근거 설명) — `@react-native-firebase`는 모듈러 웹 JS SDK와 달리 네이티브 브릿지 방식이라 네이티브 설정 파일만 있으면 앱 시작 시 네이티브 레이어에서 기본 앱이 자동 초기화되고, JS에서 `initializeApp(config)`을 다시 호출할 필요가 없다(공식 문서 "Installation" 절 근거). `src/config/env.ts`의 기존 `FIREBASE_*` placeholder 필드는 **건드리지 않았다** — 지시대로 "불필요하면 로그에 남기고, 필요하면 반영"이었고 불필요하다고 판단했으므로 변경 없음. 다만 이 필드들은 이제 사실상 죽은 코드(어디서도 소비되지 않음, `firebaseClient.ts`도 참조하지 않음)로 남아있다는 점은 다음 정리 라운드에서 제거를 고려할 만하다(이번 라운드에서 임의로 제거하지 않음 — 범위 확장 자제).
  5. `jest.config.js`의 `transformIgnorePatterns`에 `@react-native-firebase` 추가 — 해당 패키지의 `dist/module/*.js`가 ESM `export`/`import` 구문 그대로(빌드 후에도 트랜스파일되지 않은 원본)라, 앞으로 어떤 테스트가 이 모듈을 (직접 또는 `firebaseClient.ts` 경유로) import하면 babel-jest 트랜스폼 없이는 파싱 에러가 난다. 이번 라운드는 그 경로를 실제로 타는 테스트를 추가하지 않았지만(= 지금 당장은 없어도 `npx jest` 통과), 다음 라운드(`sessionService.ts` 교체 + 관련 테스트)에서 반드시 필요해질 것이 확실해 미리 추가해뒀다 — 회귀 없음을 `npx jest` 재실행으로 확인.
- 검증:
  - `npx tsc --noEmit` — 0 errors(출력 없음).
  - `npx eslint .` — 0 errors, 23 warnings(전부 기존 `react-native/no-inline-styles` 관용 경고, 신규 경고 없음).
  - `npx jest` — 9 suites / 48 tests 전부 통과(회귀 없음, 신규 테스트는 추가하지 않았다 — 네이티브 모듈을 안전하게 모킹하는 별도 설계가 필요해 이번 라운드 범위를 벗어난다고 판단, 다음 라운드에서 `sessionService.ts`가 실제로 이 모듈을 호출하게 되면 그때 통합 테스트/모킹 전략을 함께 설계하는 편이 낫다고 판단).
  - Android: `cd apps/mobile/android && ./gradlew.bat assembleDebug --no-daemon`(JAVA_HOME=`D:\Android Studio\jbr`, ANDROID_HOME/ANDROID_SDK_ROOT=`E:\Android\Sdk`, GRADLE_USER_HOME=`E:\gradle-home`) — **BUILD SUCCESSFUL in 1m 54s**(262 actionable tasks: 102 executed, 160 up-to-date), `react-native-firebase_app`/`react-native-firebase_database` 모듈이 정상적으로 컴파일·링크됨을 태스크 로그에서 확인. **지시대로 clean 빌드도 추가 수행**(`./gradlew.bat clean` → **BUILD SUCCESSFUL in 11s**) 후 재빌드 → **BUILD SUCCESSFUL in 2m 2s**(262 actionable tasks: 222 executed, 40 up-to-date) — 캐시에 의존하지 않은 풀 컴파일에서도 문제 없음을 확인. androidx.browser 때와 같은 네이티브 버전 충돌은 이번엔 발생하지 않았다(compileSdk 36/AGP 8.10.1/Gradle 8.11.1이 이미 이전 라운드에서 상향돼 있었고, RNFB 25.1.0이 요구하는 수준과 자연스럽게 맞아떨어진 것으로 보임 — 별도 버전 조정 불필요).
  - 산출물 확인: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` 클린 빌드로 재생성됨.
  - `docs/firebase-integration-guide.md`의 "진행 상태 — 코드 준비 작업" 체크리스트 1~5번을 완료로 갱신.
- 상태: 완료(검증 대기)
- 변경 파일: 수정 — `apps/mobile/package.json`/`package-lock.json`(`@react-native-firebase/app`·`@react-native-firebase/database` `25.1.0` 추가), `apps/mobile/src/services/firebase/firebaseClient.ts`(STUB → 실제 초기화), `apps/mobile/jest.config.js`(transformIgnorePatterns), `apps/mobile/.env.example`(Firebase 절 갱신), `docs/firebase-integration-guide.md`(체크리스트 갱신).
- 비고(검증 시 주의): (1) **RTDB read/write는 여전히 실패한다 — 의도된 제약**. `getFirebaseDatabase()`가 반환하는 인스턴스로 실제 `ref(db, path)` + `set`/`onValue` 등을 시도하면, RTDB가 Firebase 콘솔에서 아직 활성화되지 않았으므로 에러가 나야 정상이다(이번 라운드는 이 시도 자체를 코드에 넣지 않았으므로 검증 에이전트가 직접 실기기에서 재현할 필요는 없음, 다음 라운드 이후에나 관측 가능). (2) `getFirebaseConnectionStatus().isDatabaseVerified`는 이름과 달리 아직 실질적으로 앱 초기화 여부만 반영한다는 점(위 3번 설명)을 코드 리뷰 시 반드시 확인 — 이 필드를 소비하는 화면이 아직 없어 사용자 관찰 가능한 영향은 없다. (3) iOS는 지시대로 손대지 않았다 — `GoogleService-Info.plist` 부재로 iOS에서 `@react-native-firebase/app`이 실제로 초기화되는지는 구조적으로 검증 불가 상태 그대로 유지(기존과 동일한 제약, 회귀 아님). (4) 저장소 루트에 남아있던 오래된 `google-services.json`(untracked, 오타 버전)은 지난 라운드에서 이미 삭제된 것으로 로그에 남아있었는데, 이번 라운드 시작 시 세션 스냅샷의 git status에는 다시 `??google-services.json`으로 나타났었다 — 실제로 `ls`/`git status`로 재확인한 결과 현재는 존재하지 않고 워킹트리도 clean했다(아마 세션 스냅샷이 그 삭제 커밋 이전 시점이었던 것으로 추정) — 이번 라운드에서 이 파일을 새로 만들거나 건드리지 않았음을 명시해둔다. (5) 커밋은 하지 않았다 — 리더 검토 후 처리.

## 2026-07-27 (4) — RTDB URL을 실제 값으로 연결: 비기본 리전(`asia-southeast1`) 대응
- 작업: 사용자가 Firebase 콘솔에서 RTDB를 실제로 활성화하고 URL(`https://feel-music-share-default-rtdb.asia-southeast1.firebasedatabase.app/`)을 공유. 이 URL이 `@react-native-firebase/database`의 기본 리전(`us-central1`)이 아닌 `asia-southeast1`이라, `getDatabase()`를 인자 없이 호출하면 올바른 인스턴스에 연결되지 않는다는 공식 문서상 제약을 반영해 코드를 수정. 실제 read/write 배선은 이번에도 범위 밖(다음 라운드 = `sessionService.ts` 교체).
  1. `apps/mobile/src/config/env.ts`: `FIREBASE_DATABASE_URL` placeholder(`'TODO_FIREBASE_REALTIME_DATABASE_URL'`)를 실제 URL로 교체. `FIREBASE_PROJECT_ID`/`FIREBASE_API_KEY`/`FIREBASE_APP_ID`는 지시대로 건드리지 않음(여전히 TODO placeholder, 네이티브 브릿지 방식이라 불필요). JSDoc에 `FIREBASE_DATABASE_URL`이 나머지 세 값과 달리 "실제로 코드에서 소비되는 예외"라는 점을 명시.
  2. `apps/mobile/src/services/firebase/firebaseClient.ts`: `getFirebaseDatabase()`를 `getDatabase()`(인자 없음) → `getDatabase(getApp(), ENV.FIREBASE_DATABASE_URL)`로 변경. `@react-native-firebase/app`에서 `getApp()`을 새로 import, `../../config/env`에서 `ENV`를 import. 상단 JSDoc(진행 상태, "왜 설정값을 직접 넘기지 않는가" 절)과 함수 자체 JSDoc을 RTDB 활성화 + 비기본 리전 URL 명시 필요성에 맞게 갱신. **`getFirebaseConnectionStatus()`의 `isDatabaseVerified` 필드는 지시대로 전혀 건드리지 않았다** — 로직도 JSDoc도 그대로.
  3. `apps/mobile/.env.example`: RTDB가 활성화됐다는 사실과 실제 URL을 반영, `FIREBASE_DATABASE_URL`이 나머지 `FIREBASE_*` 값들과 달리 실제로 채워져 코드에서 쓰인다는 점을 별도 문단으로 설명(기존에는 4개 값 전부 "현재 불필요"로 뭉뚱그려져 있었는데, 이제 부정확해진 부분만 분리해 정정).
- 검증:
  - `npx tsc --noEmit` — 0 errors(출력 없음).
  - `npx eslint .` — 0 errors, 23 warnings(전부 기존 `react-native/no-inline-styles` 관용 경고, 신규 경고 없음 — round 12/13과 정확히 동일한 개수).
  - `npx jest` — 9 suites / 48 tests 전부 통과(회귀 없음).
  - Android: `cd apps/mobile/android && ./gradlew.bat assembleDebug --no-daemon`(JAVA_HOME=`D:\Android Studio\jbr`, ANDROID_HOME/ANDROID_SDK_ROOT=`E:\Android\Sdk`, GRADLE_USER_HOME=`E:\gradle-home`) — **BUILD SUCCESSFUL in 28s**(262 actionable tasks: 27 executed, 235 up-to-date, 증분 빌드). `app-debug.apk` 재생성 확인(135,939,562 bytes).
  - iOS는 이번에도 macOS 부재로 미검증(기존과 동일한 구조적 제약, 회귀 아님).
- 상태: 완료(검증 대기)
- 변경 파일: `apps/mobile/src/config/env.ts`(`FIREBASE_DATABASE_URL` 실값 반영 + JSDoc), `apps/mobile/src/services/firebase/firebaseClient.ts`(`getFirebaseDatabase()`가 `getDatabase(getApp(), url)` 형태로 명시적 URL 전달 + JSDoc 갱신), `apps/mobile/.env.example`(Firebase 절 부분 갱신).
- 비고(검증 시 주의): (1) **정직하게 명시**: 이번 라운드는 실제 네트워크 read/write를 전혀 시도하지 않으므로, 위 4가지 검증 명령 어디에서도 RTDB 연결 성공/실패 자체는 관찰되지 않았다 — "올바른 URL로 DB 인스턴스를 가리키게 코드를 고쳤다"는 정적 검증까지만 확인된 상태다. 런타임에서 실제로 이 URL·리전으로 연결되는지는 `sessionService.ts`가 실제 read/write를 시도하는 다음 라운드(또는 검증 에이전트가 임시 스모크 테스트를 짜는 경우)에야 확인 가능하다. (2) `getFirebaseConnectionStatus().isDatabaseVerified`는 지시대로 이번에도 변경하지 않았다 — 여전히 `isAppInitialized`와 동일한 값만 반영하고, RTDB 활성화/URL 정확성 자체를 검증하지 않는다는 한계가 그대로 유효하다. (3) `getFirebaseDatabase()`를 호출하는 소비 코드는 여전히 없다(`grep` 확인) — 이번 변경 자체로는 앱 런타임 동작에 관찰 가능한 차이가 없어야 정상(회귀 아님). (4) 커밋은 하지 않았다 — 리더가 diff 리뷰 후 직접 커밋 예정.

## 2026-07-27 (5) — RTDB 1라운드: 세션 생성/조회/참여를 RTDB로 교체 + Firebase Auth 익명 인증 도입
- 작업: `docs/specs/10-rtdb-schema-and-security-rules.md`(트리 스키마·시나리오 A) + `docs/decision-log.md` 2026-07-27(인증 방식 확정)을 근거로, `sessionService.ts`의 `createSession`/`getSessionByInviteCode`/`joinSessionByCode`를 실제 RTDB 호출로 교체. `getSession`은 아직 RTDB로 옮기지 않은 필드(playlists/mixedPlaylist/playback)를 위한 로컬 캐시 동기 접근용으로 남기고, 신규 `subscribeToSession`(RTDB `onValue`)을 추가.
  1. **`@react-native-firebase/auth@25.1.0` 설치**(exact-pin, `app`/`database`와 동일 버전 — npm registry에 해당 버전 존재 확인 후 진행). `apps/mobile/src/services/firebase/firebaseAuth.ts` 신규 — `ensureAnonymousAuth()`(이미 `auth.currentUser`가 있으면 재사용, 없으면 `signInAnonymously()`)와 `subscribeToAuthUid()` 제공. 모듈러 API의 `Auth`/`User` 타입을 썼다 — deprecated된 `FirebaseAuthTypes` 네임스페이스는 피함(firebaseClient.ts가 이미 모듈러 API로 통일하기로 한 방침과 일관).
  2. `apps/mobile/src/state/FirebaseAuthContext.tsx` 신규 — 앱 시작 시 `ensureAnonymousAuth()`를 1회 호출해 `uid`를 전역 제공하는 별도 Provider. **`services/auth/AuthContext.tsx`(Spotify OAuth)와는 완전히 독립** — `loginAsDemo()` 등 기존 로직은 전혀 건드리지 않았다(주석에도 명시). `App.tsx`에 `FirebaseAuthProvider`를 `AuthProvider` 바깥에 추가.
  3. **`participantId` = `auth.uid`로 통일**: `grep`으로 `generateId('participant')` 직접 호출부를 전수 조사했으나 **한 곳도 없었다** — 실제 참여자 ID 소스는 `CreateSessionScreen.tsx`/`HomeScreen.tsx`가 쓰던 Spotify 프로필의 `profile.id`였다. 이 두 지점을 `useFirebaseAuth().uid`로 교체(요구사항의 "설계 변경"과 동일한 효과 — RTDB 규칙의 `auth.uid === $participantId` 검사가 성립하려면 실제 Firebase Auth uid여야 한다). `uid`가 아직 준비 전이면(익명 로그인 완료 전) 세션 생성/참여를 진행하지 않도록 가드 추가. `ParticipantInfo.participantId`를 소비하는 화면은 전부 grep으로 확인 — 타입/소비 방식은 그대로라 영향 없음.
  4. **`sessionService.ts` 재작성**: `createSession`은 `/sessions/{id}/meta` + `/sessions/{id}/participants/{hostId}` + `/inviteCodes/{code}` 세 경로를 `update(ref(db), {...})` 다중 경로 원자적 업데이트 **하나**로 커밋(순서대로 여러 `set()` 호출 금지 — 고아 세션 방지). `createdAt`/`joinedAt`은 전부 `serverTimestamp()`(RNFB 모듈러 API의 `ServerValue.TIMESTAMP` 대응 함수)로 기록, `Date.now()`를 쓰지 않음. `getSessionByInviteCode`는 `/inviteCodes/{code}` 단건 조회 → `sessionId` 획득 → `/sessions/{id}/meta`+`/participants` 조회 순서(전체 `/sessions` 순회 없음). `joinSessionByCode`는 본인 참여자 레코드만 `set()`(다른 참여자 레코드를 대신 쓰지 않음 — 보안 규칙의 `auth.uid === $participantId` 전제와 일치).
  5. **데모 참여자/데모 플레이리스트 시드 제거(중요, 로그·리더 보고 대상 변경)**: 기존 `createSession`은 `mockSessionSeed.buildDemoParticipants/buildDemoPlaylist/buildDemoMixedPlaylist`로 가짜 참여자 2명 + 데모 곡 3곡을 항상 채웠다. 이번 라운드부터 **제거** — 근거는 (a) 보안 규칙(시나리오 A) `participants/{pid}.write: auth.uid === $participantId` 조건상 호스트가 자기 자신이 아닌 가짜 participantId로 참여자 레코드를 쓰는 것 자체가 다중 경로 원자적 update() 안에서 허용되지 않는다(그 경로 하나만 규칙 위반이어도 전체 업데이트가 거부됨), (b) 실제 기기 A/B가 초대 코드로 만나는 크로스디바이스 흐름이 이 라운드부터 성립하는데, 기기 A에는 가짜 참여자가 보이고 기기 B에는 안 보이는 불일치가 더 큰 혼란을 준다, (c) `mockSessionSeed.ts` 자신의 기존 TODO 주석이 이미 이 방향("호스트 1명만 시작, 나머지는 실제 입장 시 추가")을 예고하고 있었다. `buildDemoParticipants`/`buildDemoPlaylist`/`buildDemoMixedPlaylist` 함수 자체는 삭제하지 않음(다른 곳에서 참조 안 함, 재사용 대비). **이건 눈에 보이는 UX 변화다** — 새 세션은 이제 호스트 1명 + 빈 플레이리스트로 시작한다. 임의 판단이 아니라 이번 라운드의 보안 규칙 설계에서 논리적으로 강제되는 결과라고 판단해 진행했지만, 리더가 사용자에게 별도로 알릴지 판단 필요.
  6. **부분 마이그레이션 유지**: `addTrack`/`removeTrack`/`reorderPlaylist`/`switchService`/`appointAdmin`/`revokeAdmin`/혼합 모드 매칭 함수들은 이번 라운드 범위가 아니라 손대지 않음 — 여전히 모듈 스코프 in-memory `sessions` Map을 읽고 쓴다. 이 Map의 의미가 "전체 서버 데이터"에서 "아직 RTDB로 안 옮긴 필드(playlists/mixedPlaylist/playback)를 위한 로컬 캐시"로 바뀌었다는 점을 파일 상단 주석에 명시 — `createSession`/`joinSessionByCode`가 RTDB 쓰기와 별개로 이 Map도 계속 채워 넣어 하위 함수들이 계속 동작한다.
  7. **`subscribeToSession` 신규 추가 + `SessionContext.tsx` 최소 연동**: `/sessions/{id}`를 `onValue`로 구독해 meta+participants 변화를 콜백으로 전달(이번 라운드는 RTDB에 이 두 부분만 있으므로 콜백도 그만큼만 포함). `SessionContext.tsx`에 `useEffect`로 연결하되 **의도적으로 `participants` 필드만 병합**한다 — `service` 등 아직 로컬 전용(`requestServiceSwitch`가 낙관적으로 바꾸는 필드)까지 구독이 덮어쓰면, "다른 참여자가 들어왔다"는 무관한 이벤트가 서비스 전환 상태를 되돌려버리는 충돌이 생길 수 있어 범위를 좁혔다(주석에 근거 명시).
  8. **`createSession`/`joinSession`(SessionContext.tsx) 시그니처를 `Promise` 반환으로 변경** — RTDB 호출이 본질적으로 비동기라 불가피한 변경. `CreateSessionScreen.tsx`/`HomeScreen.tsx`의 호출부를 `async`/`await`로 수정(`finalizeCreate`/`attemptJoin`).
  9. **`database.rules.json` 신규 작성**(저장소 루트) — 10번 문서 "시나리오 A" JSON을 기준으로 이번 라운드가 다루는 경로(`/inviteCodes`, `/sessions/{id}/meta`, `/sessions/{id}/participants`)만 포함(`playlists`/`mixedPlaylist`/`playback` 규칙은 다음 라운드 몫이라 아직 안 넣음). **10번 문서 원본 JSON 예시에 있던 버그를 고쳤다** — `participants/$participantId` 블록에 `.write` 키가 중복 정의되어 있어(JSON은 중복 키를 허용하지 않고 나중 값이 이전 값을 덮어씀) 그대로 옮기면 안 됐다. 두 조건(본인 여부 + 정원 검사)을 하나의 `.write` 표현식으로 병합해 유효한 JSON으로 정리(`node -e "JSON.parse(...)"`로 문법 검증 완료). **위치는 저장소 루트**로 판단 — Firebase CLI가 `firebase.json`과 함께 프로젝트 루트에 두는 관례를 따랐고, `apps/mobile/`은 모바일 앱 코드 전용이라 백엔드(RTDB) 설정 파일을 넣기에 맞지 않다고 봄. **배포는 하지 않았다** — Firebase CLI 로그인이 이 환경에서 불가능. 실제 반영하려면 Firebase 콘솔 Realtime Database → 규칙 탭에 붙여넣거나 `firebase deploy --only database`로 배포해야 한다.
  10. **jest 목업 3종 신규**: `apps/mobile/__mocks__/@react-native-firebase/{app,database,auth}.js` — 네이티브 브릿지 모듈이라 jest 환경엔 없음. `database.js`는 `sessionService.ts`가 실제로 쓰는 표면(`ref`/`get`/`set`/`update`/`onValue`/`serverTimestamp`)만 골라 in-memory 페이크 RTDB로 구현(다중 경로 `update()`의 절대경로 병합, `.sv timestamp` placeholder 치환, `onValue` 구독/알림까지 실제로 동작) — 보안 규칙 평가는 하지 않는다(이 라운드 검증 범위 밖). `__resetMockDatabase()`/`__resetMockAuth()`를 테스트 파일에서 호출 가능하게 export.
  11. **테스트 갱신**: `joinSessionByCode.test.ts`/`serviceSwitchPlaylistIsolation.test.ts`의 모든 `createSession`/`joinSessionByCode` 호출을 `await`로 전환. `joinSessionByCode.test.ts`는 데모 시드 제거를 반영해 "capacity-1까지 데모로 채워져 있다"는 기존 전제를 없애고 직접 join을 반복해 정원을 채우는 방식으로 재작성.
- 검증:
  - `npx tsc --noEmit` — 0 errors.
  - `npx eslint .` — 0 errors, 23 warnings(기존부터 있던 `react-native/no-inline-styles` 관용 경고들과 정확히 같은 개수, 신규 warning/error 없음. 처음에 새 테스트 파일의 `require()`에 붙였던 불필요한 `eslint-disable` 주석이 "사용되지 않는 disable" 경고 2건을 유발해 제거 후 재확인).
  - `npx jest` — 9 suites / 48 tests 전부 통과(신규 mock 3종 포함, 회귀 없음).
  - Android: 이 환경(Bash 툴)에는 `java`가 PATH에 없어(`ANDROID_HOME`/`ANDROID_SDK_ROOT`는 설정돼 있음) 직접 `gradlew assembleDebug`/`clean` 빌드를 실행하지 못했다 — **검증 에이전트가 이전 라운드처럼 `JAVA_HOME=D:\Android Studio\jbr` 등을 지정해 증분 빌드 + clean 빌드 둘 다 실행해 확인 필요**(작업 지시에 명시된 필수 항목, CLAUDE.md의 구현/검증 역할 분리 원칙에 따라 검증 에이전트 몫으로 넘김).
  - **실제 RTDB read/write 성공은 검증 불가(예상된 상태, 회귀 아님)** — RTDB 보안 규칙이 아직 미배포(`database.rules.json` 참고)라 실제로 앱을 실행해 세션을 생성해봐도 지금은 거부되는 게 정상이다. 이번 라운드는 코드가 올바른 경로/형식(`sessions/{id}/meta`, `sessions/{id}/participants/{pid}`, `inviteCodes/{code}`)으로 호출을 시도하는지까지만(정적 검증 + jest의 in-memory 페이크 RTDB를 통한 동작 검증) 확인했다.
- 상태: 완료(검증 대기)
- 변경 파일:
  - 신규: `apps/mobile/src/services/firebase/firebaseAuth.ts`, `apps/mobile/src/state/FirebaseAuthContext.tsx`, `apps/mobile/__mocks__/@react-native-firebase/app.js`, `apps/mobile/__mocks__/@react-native-firebase/database.js`, `apps/mobile/__mocks__/@react-native-firebase/auth.js`, `database.rules.json`(저장소 루트).
  - 수정: `apps/mobile/package.json`/`package-lock.json`(`@react-native-firebase/auth` 25.1.0 추가), `apps/mobile/App.tsx`(FirebaseAuthProvider 배선), `apps/mobile/src/services/session/sessionService.ts`(1라운드 4개 함수 RTDB 전환 + subscribeToSession 신규 + 데모 시드 제거), `apps/mobile/src/state/SessionContext.tsx`(createSession/joinSession async화 + 구독 연동), `apps/mobile/src/screens/CreateSessionScreen.tsx`/`HomeScreen.tsx`(firebaseUid 사용 + async 호출), `apps/mobile/__tests__/joinSessionByCode.test.ts`(재작성)/`serviceSwitchPlaylistIsolation.test.ts`(await 반영).
- 비고(검증 시 주의, 중요):
  1. **콘솔 액션 2건이 아직 남아있다** — (a) Firebase 콘솔 → Authentication → Sign-in method → "익명(Anonymous)" 제공업체 활성화(안 하면 `signInAnonymously()`가 `auth/operation-not-allowed`로 실패), (b) `database.rules.json` 배포(안 하면 RTDB read/write 전부 거부). 둘 다 사용자/리더가 콘솔에서 직접 처리해야 하는 액션이라 `docs/firebase-integration-guide.md` "사용자가 마저 해줘야 하는 것" 절에 반영해뒀다 — 리더가 `docs/decisions-needed.md`에도 반영할지 판단 필요(구현 에이전트는 그 파일을 직접 수정하지 않음, 역할 경계).
  2. **데모 참여자/데모 플레이리스트 시드 제거는 UX가 눈에 보이게 달라지는 지점**(위 5번) — 검증 시 "세션 생성 직후 참여자 2명 + 곡 3개가 보인다"는 이전 기대치로 회귀 판정하지 말 것. 새 기대치: "세션 생성 직후 참여자 1명(호스트) + 빈 플레이리스트".
  3. Android: 신규 네이티브 의존성(`@react-native-firebase/auth`) 추가로 인한 빌드 영향(증분 + clean 둘 다)은 이번 라운드에서 직접 확인하지 못했다 — 검증 에이전트가 반드시 확인해야 하는 항목.
  4. iOS는 기존과 동일한 구조적 제약(`GoogleService-Info.plist` 부재)을 그대로 물려받는다 — `@react-native-firebase/auth`도 Android만 실제 네이티브 설정이 있는 상태.
  5. 커밋은 하지 않았다 — 리더가 diff 리뷰 후 처리 예정.

## 2026-07-27 (Spotify 곡 검색 400 오류 수정 — limit=15 → 10, 진단 정정)
- 작업: 실기기에서 곡 검색 시 `{"error": {"status": 400, "message": "Invalid limit"}}`가 발생하던 문제 수정. 리더가 이전에 `docs/decisions-needed.md`에 남긴 "Development Mode 앱은 `/v1/search` 자체 접근 불가(2024-11-27 정책 변경), Extended Quota Mode 신청 필요" 진단은 **낡은 정보에 근거한 오진**이었다 — 리더가 이번 라운드 착수 전 Spotify 공식 문서(https://developer.spotify.com/documentation/web-api/reference/search, https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)를 WebFetch로 직접 재확인한 결과, 2026년 2월 정책 변경으로 Development Mode 앱도 `/v1/search`에 여전히 접근 가능하되 `limit` 파라미터 허용 범위가 0~50(기본 20)에서 **0~10(기본 5)으로 축소**됐을 뿐이다. `spotifyWebApi.ts`의 하드코딩된 `limit=15`가 이 새 상한을 초과한 것이 400의 실제 원인.
  1. `searchSpotifyTracks`가 호출하는 `/search?type=track&limit=15&...`를 `SPOTIFY_SEARCH_LIMIT = 10`(상수, 파일 상단 근거 주석 포함) 참조로 변경. 상한값 10을 그대로 택한 이유: 검색 결과를 최대한 많이 보여주는 편이 UX상 유리하고, 10개면 한 화면 스크롤 목록으로도 충분하다고 판단(다른 값을 택할 근거를 발견하지 못함).
  2. `spotifyWebApi.ts` 전체를 훑어 다른 `limit` 사용처가 있는지 확인(`grep -n "limit"`) — 이 파일이 호출하는 엔드포인트는 `/me`(프로필 조회, limit 파라미터 없음)와 `/search`(이번에 고친 곳) 둘뿐이라 추가로 고칠 곳도, 다음 라운드 후보로 남길 곳도 없었다.
  3. `AddTrackModal.tsx`(검색 UI)를 확인 — 검색 결과 개수(15개)를 가정한 페이지네이션·"더보기" 버튼·고정 인덱스 로직 등은 없었다. `FlatList`가 `results` 배열을 그대로 렌더링하는 구조라 10개로 줄어도 별도 수정 없이 자연스럽게 동작한다.
- 상태: 완료(검증 대기)
- 변경 파일: `apps/mobile/src/services/spotify/spotifyWebApi.ts`.
- 비고(검증 시 주의):
  - `npx tsc --noEmit`(0 errors), `npx eslint .`(0 errors, 25 warnings — 전부 기존과 동일한 관용적 `react-native/no-inline-styles`, 이번 변경으로 신규 발생한 경고 없음), `npx jest`(9 suites / 48 tests 전부 통과) 확인.
  - Android 빌드(`assembleDebug`)는 이번 라운드에서 생략했다 — 이 변경은 JS/TS 파일의 URL 쿼리 파라미터 값 하나만 바꾼 것이라 네이티브 빌드 산출물에 영향을 줄 수 없다고 판단(패키지 의존성/네이티브 설정 변경 없음). 필요시 검증 에이전트가 회귀 확인 차원에서 다시 돌려도 무방하나, 이번 코드 변경만 놓고 보면 빌드 실패 리스크는 없다.
  - **실기기 재검증 필수**: 이번 수정은 코드 리뷰(Spotify 공식 문서 대조)로 원인을 특정하고 고친 것이라, 실제로 400이 사라지고 검색 결과가 정상적으로 나오는지는 아직 실기기로 확인되지 않았다. `docs/decisions-needed.md`의 관련 항목(Spotify Extended Quota Mode)도 "정정, 실기기 재확인 대기" 상태로 갱신해뒀다 — 정상 동작 확인되면 그 항목 자체를 삭제(Extended Quota Mode 불필요로 결론)하는 것이 리더 몫.
  - 커밋은 하지 않았다 — 리더가 diff 리뷰 후 직접 처리 예정.
