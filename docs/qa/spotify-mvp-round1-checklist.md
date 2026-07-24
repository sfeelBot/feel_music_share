# QA 체크리스트 — Spotify 전용 세션 MVP 핵심 화면 (Round 1)

> 검증 대상 커밋: `e4057fe` ("Implement Spotify-only MVP screens (onboarding through playlist)")
> 검증일: 2026-07-24
> 검증 담당: 검증(Verification) 서브에이전트
> 참고 문서: `docs/agents/implementation-log.md`(2026-07-24 완료 항목), `docs/specs/00/01/04/06`, `docs/design/00-ux-flow.md`, `docs/design/02-key-ui-patterns.md`
> 환경: Windows 11 Pro (10.0.26200), Node v24.15.0, npm 11.12.1. Android SDK는 설치되어 있으나(`%LOCALAPPDATA%\Android\Sdk`) JDK/`java`가 PATH에 없고 `JAVA_HOME` 미설정, Android Studio 실행형 설치도 확인되지 않음(캐시 폴더만 존재). Xcode/macOS 없음.

이번 라운드는 첫 검증 라운드이며 `docs/qa/`에 선행 체크리스트가 없어 이 문서를 신규 작성했다.

## 범례
- ✅ 통과 (재현 확인)
- ❌ 실패 (재현 방법·근거 포함)
- ⛔ 미검증 (환경 제약 — 통과/실패 어느 쪽도 임의로 판단하지 않음)

---

## 1. 정적 검증 (재현)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| 1.1 | `npx tsc --noEmit` (apps/mobile) | ✅ | 0 errors. 출력 없음. 구현 로그의 주장과 일치. |
| 1.2 | `npx eslint .` (apps/mobile) | ✅ | 0 errors, 12 warnings(전부 `react-native/no-inline-styles`, 관용적인 조건부 inline style — `AddTrackModal.tsx`, `Avatar.tsx`, `Buttons.tsx`, `CapacityStepper.tsx`, `SyncStatusBadge.tsx`, `CreateSessionScreen.tsx`, `RoomScreen.tsx`). 구현 로그의 "12개 benign 경고" 주장과 정확히 일치. |
| 1.3 | `npx jest` (apps/mobile) | ✅ | `__tests__/App.test.tsx` 1/1 통과. `jest.config.js`의 `transformIgnorePatterns`에 `react-native-base64` 추가한 것이 정상 작동함을 확인. |

세 항목 모두 리더가 사전에 보고한 결과를 독립적으로 재현해 확인했다 — 신뢰할 수 있음.

## 2. Android 빌드 가능성

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| 2.1 | `cd android && ./gradlew.bat assembleDebug` | ⛔ 미검증(환경 제약) | 실행 시 `ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.`로 즉시 실패. 이 머신에는 Android SDK(`%LOCALAPPDATA%\Android\Sdk`, build-tools/platforms/platform-tools 존재)는 있지만 JDK가 PATH/JAVA_HOME 어디에도 연결되어 있지 않다. `Program Files`, `%LOCALAPPDATA%\Google\AndroidStudio2025.2.2` 등을 뒤져봤으나 Android Studio 번들 JBR(JetBrains Runtime)이나 별도 JDK 설치를 찾지 못했다(Android Studio 캐시/설정 폴더만 존재, 실행 파일 미확인). 따라서 실제 빌드 성공/실패를 이 환경에서 판단할 수 없다. |
| 2.2 | AndroidManifest.xml 등 네이티브 설정 코드 리뷰 | ✅ (범위 내) | 이번 커밋은 `android/`, `ios/` 네이티브 프로젝트 파일을 전혀 건드리지 않았다(`git show --stat`으로 확인) — 순수 JS/TS 레이어 변경이므로 네이티브 빌드 설정 자체의 회귀 리스크는 낮다. 다만 커스텀 URL 스킴(`feelmusicshare://...`, `spotifyAuth.ts`/`.env.example`이 요구)이 `AndroidManifest.xml`/`Info.plist` 어디에도 등록되어 있지 않음을 확인(`grep -n "feelmusicshare"` 결과 없음) — 구현 로그가 명시한 "다음 라운드 TODO"와 일치하며, 이 상태로는 실기기에서 Spotify OAuth 콜백이 앱으로 돌아오지 못한다(딥링크 미등록). |

**Android 결론**: 빌드 성공 여부는 이 환경에서 확인 불가(JDK 부재) — "미검증"으로 남긴다. 코드 자체(JS/TS)는 정적 검증을 통과했으나 실제 기기/에뮬레이터 실행 검증은 별도 환경(JDK 설치된 CI 또는 Android Studio가 정상 동작하는 머신)에서 반드시 재확인이 필요하다.

## 3. iOS 빌드 가능성 / 코드 리뷰

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| 3.1 | 실제 iOS 빌드/실행 (`react-native run-ios`, Xcode 빌드 등) | ⛔ 검증 불가(환경 제약, 구조적) | Windows에는 Xcode가 없어 iOS 빌드 자체가 원천적으로 불가능하다. 실기기/시뮬레이터 검증은 macOS 환경(또는 CI)에서 별도로 반드시 수행해야 한다. |
| 3.2 | `Platform.OS` 분기 코드 오남용 여부 | ✅ | `apps/mobile/src` 전체를 `grep -rn "Platform\."`으로 검색한 결과 이번 라운드 신규/변경 코드에는 `Platform` API 사용 자체가 없다 — 즉 플랫폼별 분기 로직 자체가 존재하지 않으므로 "분기 오류" 리스크는 없다. |
| 3.3 | iOS 전용 API 오남용 | ✅ | 이번 라운드 컴포넌트/화면 코드는 React Native 표준 컴포넌트(`View`/`Text`/`TouchableOpacity`/`Modal`/`ScrollView`/`FlatList`)와 `react-native-safe-area-context`, `@react-navigation/*`만 사용 — iOS 전용 네이티브 API를 직접 호출하는 코드는 없다. |
| 3.4 | iOS 네이티브 설정(Info.plist 등) | ⚠ 참고(2.2와 동일 이슈) | 커스텀 URL 스킴 미등록은 iOS에도 동일하게 적용된다(`ios/mobile/Info.plist`에 `feelmusicshare` 스킴 없음) — 구현 로그에 이미 명시된 TODO. |

**iOS 결론**: 코드 리뷰 수준에서는 플랫폼 분기 버그나 iOS 전용 API 오남용을 발견하지 못했다. 다만 이는 "문제가 없다"의 증명이 아니라 "정적 코드 리뷰로 발견되는 범위 안에서는 문제가 없다"는 의미이며, **실제 iOS 기기/시뮬레이터에서의 런타임 검증은 별도로 반드시 필요**하다(이번 검증에서 수행하지 못함).

## 4. 기능 요구사항 대조

| # | 요구사항 (근거) | 결과 | 상세 |
|---|---|---|---|
| 4.1 | 온보딩 3컷, 마지막 컷 투명성 카드(US-406) | ✅ | `OnboardingScreen.tsx` — `CUTS` 배열 2개 + 하드코딩된 3번째 투명성 페이지로 총 3컷 구성. 문구("재생은 각자의 Spotify 앱에서 이뤄져요...")가 기획/디자인 문서와 일치. |
| 4.2 | Spotify OAuth 로그인 + Premium 확인(US-101/102) | ✅ (코드 레벨) | `spotifyAuth.ts`(기존 파일, PKCE) + `spotifyWebApi.ts`의 `fetchSpotifyProfile`이 `/v1/me`의 `product === 'premium'`으로 판정. 다만 `ENV.SPOTIFY_CLIENT_ID`가 placeholder라 **실제 로그인은 동작 불가**(구현 로그에 명시된 기지 사실, 이번 라운드는 코드 구조까지가 범위). |
| 4.3 | 세션 생성 — 정원 스테퍼 2~12, 기본값 2명(US-207) | ✅ | `CapacityStepper.tsx`가 `SESSION_CAPACITY_MIN=2`/`MAX=12` 범위로 증감 제한. `CreateSessionScreen.tsx`가 `useState(SESSION_CAPACITY_DEFAULT)`(=2)로 초기화 — 기본값 2명 확정 요구사항과 일치. |
| 4.4 | 세션 생성 — 서비스 라디오, Spotify만 활성(리더 지시 범위) | ✅ | YouTube/혼합 라디오는 `disabled` + "곧 지원 예정" 텍스트로 처리, Spotify만 선택 가능. 안내 배너 문구도 서비스별로 분기 준비돼 있음(`INFO_BY_SERVICE`). |
| 4.5 | 역할 배지(방장 👑/관리자 🛡/일반사용자 배지 없음, US-210) | ✅ | `RoleBadge.tsx` — `role === 'regular'`면 `null` 반환(배지 없음이 곧 정보), host/admin 각각 다른 색·라벨. 접근성 라벨도 별도 부여. |
| 4.6 | 관리자 임명/해제는 방장 전용(US-208, 04-playlist.md 확정) | ✅ | `ParticipantsBottomSheet.tsx`의 `canManage = viewerIsHost && item.role !== 'host'` — 방장이 아니면 메뉴(⋮) 자체가 렌더링되지 않음. `sessionService.appointAdmin/revokeAdmin`도 role 전이 조건(`regular→admin`, `admin→regular`)을 지켜 방장 자신이나 이미 방장인 대상은 변경하지 않음. **다만** 서버 측 권한 재검증은 아직 없음(Firebase 미연동, TODO로 명시돼 있어 이번 라운드 범위 밖으로 인정 가능) — `04-playlist.md` "서버가 강제해야 한다"는 요구사항은 현재 클라이언트 UI 레벨에서만 지켜지고 있다는 점을 다음 라운드(Firebase 연동)에서 반드시 잊지 말아야 함. |
| 4.7 | Free 계정 배너 — Spotify 세션에서만 표시(US-106) | ✅ (조건부) | `NowPlayingView.tsx`에서 `viewerIsFree`면 배너 노출. 이번 라운드는 Spotify 세션만 존재하므로 "Spotify에서만 표시" 조건이 자동으로 충족되나, **서비스 타입을 직접 참조해 조건부 렌더링하는 코드는 아직 없다** — YouTube 세션이 실제로 추가되는 다음 라운드에서 `session.service === 'spotify'` 같은 명시적 가드를 반드시 추가해야 한다(현재는 "우연히 항상 참" 상태). 참여자 목록의 "Free · 재생 불가" 배지도 확인(`ParticipantsBottomSheet.tsx`). |
| 4.8 | 참여 인원 vs 재생 인원 조건부 표시(02문서 8절) | ✅ | `NowPlayingView.tsx`, `ParticipantsBottomSheet.tsx` 모두 `playableCount === total`이면 단일 숫자, 다르면 "N명 참여 중 (재생 M명)" 형태로 자동 전환하는 로직 확인. |
| 4.9 | 동기화 상태 배지 4단계(US-404, 02문서 2.2절) | ✅ | `SyncStatusBadge.tsx` — synced/tuning/delayed/disconnected 4단계, 색+아이콘 모양+텍스트 라벨 병행(색맹 접근성 원칙 준수). 다만 실제 드리프트 측정 로직은 없고 목업 `delaySeconds` 기반(TODO로 명시돼 있어 인지된 제약). |
| 4.10 | 선곡자 배지(US-304) | ✅ | `PickerBadge.tsx` — 아바타(컬러 링)+닉네임, "나(닉네임)" 표기, nowPlaying/inline 두 변형 모두 구현. |
| 4.11 | 곡 검색/추가(US-301), 실제 Spotify Web API 연동 | ✅ | `AddTrackModal.tsx` + `spotifyWebApi.ts`의 `searchSpotifyTracks`가 `GET /v1/search?type=track`을 실제로 호출하는 코드(access token만 있으면 동작). 코드 구조상 정상. |
| 4.12 | 곡 삭제(US-302), "현재 재생 중인 곡 삭제 시 다음 곡 자동 전환"(04-playlist.md 기능목록 2번) | ❌ 실패 | `SessionContext.removeTrack`(`state/SessionContext.tsx` 132-151행)은 `sessionService.removeTrack`으로 플레이리스트만 갱신하고, `session.playback.currentEntryId`가 삭제된 곡을 계속 가리키는 문제를 처리하지 않는다. 재현: 세션 생성 → 플레이리스트 탭에서 현재 재생 중인 곡을 롱프레스 삭제 → `NowPlayingView`의 `currentEntry`가 `undefined`가 되어 "재생할 곡이 없어요"로 표시되고 다음 곡으로 자동 전환되지 않음(요구사항 위반). 관련 파일: `apps/mobile/src/state/SessionContext.tsx`(`removeTrack`), `apps/mobile/src/screens/room/NowPlayingView.tsx`. |
| 4.13 | 곡 순서 변경(US-303) | ⛔ 미구현(의도적, 문서화됨) | 드래그 핸들(⠿)은 시각적으로만 존재하고 실제 재정렬 로직 없음 — 구현 로그·코드 주석(`PlaylistView.tsx` 상단)에 이미 "다음 단계 TODO"로 명시돼 있어 "발견되지 않은 버그"가 아니라 "알려진 범위 밖" 항목이다. 실패로 카운트하지 않고 별도 표기. |
| 4.14 | 참여자 목록 — 연결 상태/Free 태그/역할 배지 (US-203, US-210) | ✅ | `ParticipantsBottomSheet.tsx`의 `ParticipantRow`에서 모두 확인. |
| 4.15 | Now Playing "이전 곡" 버튼 동작 | ❌ 실패(사소) | `NowPlayingView.tsx` 93행의 "이전 곡"(⏮) 버튼에 `onPress` 핸들러가 아예 없다 — 탭해도 아무 동작을 하지 않는 장식용 버튼. `requestPrevTrack` 같은 대응 함수가 `SessionContext`에도 없음. 유저 스토리에 "이전 곡" 자체가 명시적으로 요구되진 않지만(US-401/404는 재생/일시정지/스킵만 언급), 버튼이 이미 화면에 노출된 이상 눌러도 반응 없는 것은 사용자 혼란을 준다. TODO 주석도 없어 "의도된 범위 밖"인지 "누락"인지 구분이 안 됨 — 구현 에이전트 확인 필요. |
| 4.16 | 세션 정원과 목업 참여자 수 정합성 | ❌ 실패(사소, 데모 데이터 한정) | `mockSessionSeed.ts`의 `buildDemoParticipants`가 정원 값과 무관하게 항상 호스트+2명(총 3명)을 시드한다. 기본 정원이 2명으로 확정된 지금, 기본값으로 세션을 만들면 즉시 "정원 2명에 참여자 3명"이라는 모순 상태로 시작한다. 실제 Firebase 연동 전에는 인메모리 목업이라 실사용 영향은 없으나, 데모/스크린샷 검증 시 정원 로직이 지켜지는 것처럼 오인시킬 수 있어 기록해둔다. 관련 파일: `apps/mobile/src/services/session/mockSessionSeed.ts`, `apps/mobile/src/services/session/sessionService.ts`(`createSession`). |
| 4.17 | 코드로 참여하기(US-202) | ⛔ 미구현(의도적, 문서화됨) | `HomeScreen.tsx`의 `handleJoinByCode`는 Alert로 "준비 중" 안내만 함 — 구현 로그에 명시된 대로 Firebase 없이는 원천적으로 검증 불가능한 항목이라 실패로 카운트하지 않음. |

## 5. 코드 품질 / 접근성 메모 (참고, 실패로 카운트하지 않음)

- `CreateSessionScreen.tsx`의 서비스 라디오(`RadioRow`)에 `accessibilityRole="radio"`/`accessibilityState={{selected}}`가 없다 — 스크린리더 사용자는 이게 라디오 버튼인지 알기 어렵다. 현재는 Spotify 외 모두 비활성이라 실사용 영향은 작지만, YouTube/혼합이 활성화되는 다음 라운드에서는 반드시 보강이 필요하다.
- eslint의 `react-native/no-inline-styles` 경고 12건은 전부 조건부 스타일(`opacity: disabled ? ... : ...` 등)로, 정적 스타일로 뽑아내기 다소 번거로운 패턴이라 관용적으로 허용 가능한 수준으로 판단한다(빌드/동작에 영향 없음).
- `PlaylistView.tsx`의 `TrackRow`가 `readOnly`(재생 완료 곡)일 때 `onLongPress`로 삭제도 함께 막는다(`!readOnly && onDelete(entry)`) — `00-ux-flow.md` 2.10b는 "재생 완료 섹션은 순서 변경 불가(읽기 전용)"라고만 명시했고 삭제 제한까지는 명시하지 않았다. 정책 위반은 아니지만(04-playlist.md는 "참여자 누구나 삭제 가능"이라고만 함) 구현이 임의로 범위를 넓힌 해석이므로, 의도된 것인지 리더/기획에 확인이 필요할 수 있다.

## 6. 종합

| 구분 | 개수 |
|---|---|
| ✅ 통과 | 20 |
| ❌ 실패 | 3 (4.12 재생 중 곡 삭제 시 자동 전환 누락 / 4.15 "이전 곡" 버튼 미동작 / 4.16 목업 참여자 수-정원 불일치) |
| ⛔ 미검증(환경 제약) | 3 (2.1 Android 빌드, 3.1 iOS 빌드, 4.2 실제 Spotify 로그인 동작) |
| 의도적 범위 밖(문서화됨, 실패 아님) | 4.13 순서변경, 4.17 코드 참여 |

**결론: 이번 라운드는 "완료"로 간주할 수 없다.** 정적 검증(tsc/eslint/jest)과 대부분의 UI/권한/배지 요구사항 반영은 견고하게 확인됐으나, 4.12(현재 재생 곡 삭제 시 자동 다음 곡 전환 누락)는 `04-playlist.md` 기능 목록에 명시된 요구사항을 실제로 위반하는 기능적 버그이므로 구현 라운드로 되돌려야 한다. 4.15/4.16은 경미하지만 함께 정리하는 것을 권고한다. Android/iOS 실기기·에뮬레이터 검증은 이 환경의 구조적 제약(JDK 부재, macOS 부재)으로 수행하지 못했으므로 별도 환경에서 반드시 재검증이 필요하다.

---

## Round 2 재검증 (2026-07-24)

> 검증 대상 커밋: `74ac205` ("Fix round-1 QA failures: track auto-advance, prev button, seed cap")
> 검증일: 2026-07-24
> 검증 담당: 검증(Verification) 서브에이전트
> 검증 방식: `git show --stat`/`git show <file>`로 diff를 직접 읽고 코드 추적(정적 리뷰) + `apps/mobile`에서 tsc/eslint/jest 독립 재실행. Android/iOS 실기기·에뮬레이터 재시도는 하지 않음(round 1과 동일한 환경 구조적 제약이 그대로 적용됨 — JDK/JAVA_HOME 미설정, macOS/Xcode 없음. 결론은 round 1을 그대로 인용).
> 범위: round 1에서 실패/메모로 남긴 6개 항목만 재검증. 전체 재검증 아님(정적 검증 3종과 가벼운 회귀 확인은 포함).

### 변경 파일 (커밋 74ac205)

`apps/mobile/src/screens/CreateSessionScreen.tsx`, `apps/mobile/src/screens/room/NowPlayingView.tsx`, `apps/mobile/src/screens/room/PlaylistView.tsx`, `apps/mobile/src/services/session/mockSessionSeed.ts`, `apps/mobile/src/services/session/sessionService.ts`, `apps/mobile/src/state/SessionContext.tsx`(+로그 파일 2개). Android/iOS 네이티브 프로젝트 파일은 이번 커밋도 건드리지 않음 — 딥링크 미등록 이슈(round 1 2.2/3.4)는 여전히 미해결 상태로 남아 있으나 이번 라운드 범위 밖이므로 재확인만 하고 실패로 카운트하지 않음.

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R2.1 | 4.12 재현 확인 — 현재 재생 곡 삭제 시 다음 곡 자동 전환 | ✅ 통과 | `SessionContext.tsx`의 새 `removeTrack`(구현: `wasCurrent`/`removedIndex`를 삭제 전에 캡처 → `sessionService.removeTrack`으로 플레이리스트 갱신 → 삭제된 곡이 현재 재생 곡이었을 경우에만 `playlistAfterRemoval`에서 `removedIndex + 1`(원래 배열 기준 다음 곡)을 찾아 `playedStatus: 'playing'`으로 전환하고 `playback.currentEntryId`를 그 곡으로 갱신, `triggerTuning()`도 호출)를 코드 레벨에서 추적 확인. 다음 곡이 없으면(`removedIndex + 1`이 범위를 벗어나면) `currentEntryId: null`, `isPlaying: false`로 명시적으로 "재생할 곡 없음" 상태를 만든다 — round 1에서 문제였던 "삭제된 entryId를 계속 가리켜 멈추는" 증상이 재현되지 않는다. 인덱스 로직도 정확함: `removedIndex`는 삭제 *전* 배열 기준 인덱스이고, `playlistAfterRemoval`은 그 곡이 이미 제거된 배열이므로 `removedIndex`가 가리키는 위치가 정확히 "삭제된 곡 바로 다음 곡"이 된다(off-by-one 없음). `NowPlayingView.tsx`가 `session.playback.currentEntryId` 기준으로 `currentEntry`를 재계산하므로 화면도 자동으로 다음 곡을 표시한다. |
| R2.2 | 4.15 재현 확인 — "이전 곡" 버튼 → `requestPrevTrack` 연결 및 비활성화 로직 | ✅ 통과 | `SessionContext.tsx`에 `requestPrevTrack` 신규 구현: `currentIndex`를 찾아 `currentIndex > 0`일 때만 이전 곡으로 전환(`playedStatus`를 현재 곡은 `pending`, 이전 곡은 `playing`으로 되돌리고 `playback`을 갱신), 이전 곡이 없으면(`currentIndex <= 0`) `prev`를 그대로 반환해 아무 동작도 하지 않음 — 안전한 가드. `NowPlayingView.tsx`는 `hasPrevTrack = currentIndex > 0`을 계산해 버튼에 `disabled={!hasPrevTrack}`, `accessibilityState={{disabled: !hasPrevTrack}}`, `opacity` 시각적 피드백까지 부여하고 `onPress={requestPrevTrack}`을 연결했다. 로직상 첫 곡에서는 버튼이 비활성화되고, 두 번째 곡 이후부터는 정상 동작하는 것으로 코드 추적상 확인됨. |
| R2.3 | 4.16 재현 확인 — 정원 초과 방지(기본 정원 2명 기준) | ✅ 통과 | `mockSessionSeed.ts`의 `buildDemoParticipants(host, capacity)`: `otherSlots = Math.max(0, Math.min(DEMO_OTHERS.length, capacity - 1))`. 기본 정원 `SESSION_CAPACITY_DEFAULT = 2`(round 1에서 확인된 상수, 이번 커밋도 값 변경 없음)로 계산하면 `otherSlots = min(2, 1) = 1` → 참여자 = 호스트 1명 + 1명 = 총 2명 = 정원과 정확히 일치. `sessionService.createSession`도 `capacity = params.capacity ?? SESSION_CAPACITY_DEFAULT`를 먼저 계산한 뒤 `buildDemoParticipants(params.host, capacity)`에 전달하고, 세션 상태의 `capacity` 필드에도 동일한 값을 쓰도록 수정되어 있어 "표시된 정원"과 "실제 시드 인원 계산에 쓰인 정원"이 서로 다른 값을 참조할 여지도 없앴다. `CreateSessionScreen.tsx`에서 `createSession({..., capacity})`로 스테퍼 값이 그대로 전달되는 것도 확인 — 정원을 12까지 늘리면 `otherSlots`가 `DEMO_OTHERS.length=2`에서 상한(clamp)되어 최대 호스트+2=3명까지만 시드되고 그 이상은 늘어나지 않는데, 이는 "정원 초과"가 아니라 "정원 미달"이므로 4.16이 지적한 모순(시드 인원 > 정원)은 어떤 정원 값에서도 발생하지 않는다. |
| R2.4 | Free 배너 가드 — `session.service === 'spotify'` | ✅ 통과 | `NowPlayingView.tsx` 53행: `{viewerIsFree && session.service === 'spotify' && (...)}`로 명시적 가드가 걸려 있음을 확인. round 1에서 지적한 "우연히 항상 참" 상태를 벗어나 앞으로 YouTube/혼합 세션이 추가돼도 로직이 올바르게 동작할 구조. |
| R2.5 | 재생완료곡(readOnly) 삭제 허용, 순서 변경만 제한 | ✅ 통과 | `PlaylistView.tsx`의 `TrackRow.onLongPress`가 `() => !readOnly && onDelete(entry)`에서 `() => onDelete(entry)`로 변경되어 `readOnly` 여부와 무관하게 항상 삭제 가능. `accessibilityHint`도 조건부(`readOnly ? undefined : ...`)에서 항상 "길게 누르면 삭제할 수 있어요"로 통일되어 스크린리더 사용자에게도 삭제 가능함이 일관되게 안내된다. 순서 변경(드래그 핸들 ⠿)은 `readOnly`일 때 `handlePlaceholder`(빈 자리)로 대체되어 여전히 노출되지 않음 — "순서 변경만 제한, 삭제는 허용"이라는 요구사항을 정확히 반영. (참고: 드래그앤드롭 자체는 round 1에서 이미 "의도적 미구현, TODO 문서화"로 확인된 항목이라 이번 라운드 평가 대상 아님.) |
| R2.6 | 접근성 — `RadioRow`에 `accessibilityRole`/`accessibilityState` | ✅ 통과 | `CreateSessionScreen.tsx`의 `RadioRow` 최상위 `View`에 `accessibilityRole="radio"`, `accessibilityState={{selected, disabled}}`가 추가됨을 확인. Spotify/YouTube/혼합 3개 라디오 행 모두 동일한 컴포넌트를 재사용하므로 셋 다 적용됨. |

### 정적 검증 재현 (독립 실행)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R2.7 | `npx tsc --noEmit` (apps/mobile) | ✅ | 0 errors, 출력 없음. |
| R2.8 | `npx eslint .` (apps/mobile) | ✅ | 0 errors, 13 warnings(round 1의 12건 + `NowPlayingView.tsx` 99행 `opacity: hasPrevTrack ? 1 : 0.4` 신규 1건 — 기존 패턴과 동일한 조건부 inline style이라 관용적으로 허용 가능한 수준, 동작에 영향 없음). |
| R2.9 | `npx jest` (apps/mobile) | ✅ | `__tests__/App.test.tsx` 1/1 통과. |

세 항목 모두 리더가 보고한 "tsc/eslint/jest 모두 통과" 주장과 독립적으로 재현되어 일치한다.

### 회귀 확인 (diff 범위 내 가벼운 확인)

이번 커밋이 건드리지 않은 파일(`RoleBadge.tsx`, `ParticipantsBottomSheet.tsx`, `SyncStatusBadge.tsx`, `CapacityStepper.tsx`)을 다시 열어 round 1에서 통과했던 로직이 그대로 남아 있는지 확인했다:

- 역할 배지: `RoleBadge.tsx`의 `role === 'regular'`일 때 `null` 반환 로직 그대로.
- 관리자 임명 권한: `ParticipantsBottomSheet.tsx`의 `canManage={viewerIsHost && item.role !== 'host'}` 그대로 — 방장만 관리자 임명/해제 메뉴를 볼 수 있는 조건 불변.
- 동기화 배지 4단계: `SyncStatusBadge.tsx`의 `synced`/`tuning`/`delayed`/`disconnected` 4개 케이스 분기 그대로.
- 정원 스테퍼: `CreateSessionScreen.tsx`에서 `CapacityStepper`는 이번 diff의 영향을 받지 않았고(변경분은 `RadioRow`뿐), `capacity` state → `createSession` 전달 흐름도 유지됨.

diff 범위 내에서 위 항목들이 깨진 흔적은 발견되지 않았다. (주의: 이는 정적 코드 리뷰 수준 확인이며, jest 스냅샷 테스트 1건 외에는 컴포넌트별 자동 회귀 테스트가 없어 런타임 회귀는 실기기/시뮬레이터 검증에서만 최종 확인 가능하다 — 이 제약은 round 1과 동일하게 유지된다.)

### Round 2 종합

| 구분 | 개수 |
|---|---|
| ✅ 통과 | 9 (R2.1~R2.9, round 1에서 지적된 6개 기능 항목 전부 + 정적 검증 3종) |
| ❌ 실패 | 0 |
| ⛔ 미검증(환경 제약, round 1과 동일하게 인용) | Android 실기기/에뮬레이터 빌드(JDK 부재), iOS 실기기/시뮬레이터 빌드(macOS 부재) — 재시도하지 않음, round 1 결론 그대로 유효 |
| 범위 밖으로 재확인만 함 (실패 아님) | 커스텀 URL 스킴(딥링크) 미등록 — round 1부터 이어지는 별도 TODO, 이번 커밋도 손대지 않음 |

**결론: 이번 라운드(커밋 74ac205)는 요청받은 6개 수정 항목(4.12, 4.15, 4.16, Free 배너 가드, 재생완료곡 삭제 허용, 라디오 접근성) 전부 코드 레벨에서 정확하게 수정된 것으로 확인된다.** 정적 검증(tsc/eslint/jest)도 독립적으로 재현해 모두 통과했고, 이번 diff가 건드리지 않은 인접 로직(역할 배지·관리자 권한·동기화 배지·정원 스테퍼)에서도 회귀 흔적을 발견하지 못했다. 따라서 **이번 6개 항목에 한해서는 "완료"로 간주해도 된다.**

다만 다음 두 가지는 여전히 유효한 제약/TODO로 남아 있으며, 이번 라운드의 "완료" 판정 범위 밖이라는 점을 분명히 해둔다:
1. Android(JDK 부재)/iOS(macOS 부재) 실기기·에뮬레이터 런타임 검증은 이 환경에서 구조적으로 불가능하다 — round 1과 동일하게 별도 환경에서 반드시 재검증이 필요하다. 이번 코드 리뷰는 어디까지나 정적 추적 수준의 확인이다.
2. 커스텀 URL 스킴(딥링크) 미등록, 순서 변경(드래그앤드롭) 미구현, 코드로 참여하기 미구현, Firestore 서버 측 권한 재검증 부재 등 round 1에서 이미 "범위 밖/다음 라운드 TODO"로 문서화된 항목들은 이번 라운드에서도 그대로 미해결이다 — 새로 발견된 문제는 아니므로 이번 판정에 영향을 주지 않지만, 다음 라운드 계획 시 리더가 계속 추적해야 한다.
