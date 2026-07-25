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

---

## Round 3 검증 (2026-07-25)

> 검증 대상 커밋: `22776fd` ("Implement playlist reorder and YouTube-only session screens")
> 검증일: 2026-07-25
> 검증 담당: 검증(Verification) 서브에이전트
> 검증 방식: `git show --stat`/`git show <file>`로 diff를 직접 읽고 코드 추적(정적 리뷰) + `apps/mobile`에서 tsc/eslint/jest 독립 재실행 + Android `assembleDebug` 독립 재현(증분 빌드 1회 + `clean assembleDebug` 완전 재빌드 1회) + `docs/design/00-ux-flow.md`/`02-key-ui-patterns.md`와의 대조.
> 범위: (1) 정적 검증 3종, (2) Android 빌드 재현, (3) `requestMoveTrack` 순서 변경 로직 코드 추적, (4) YouTube 화면의 정책 준수(광고 UI 비간섭), (5) 서비스별 화면 격리(Free 배너 등), (6) 회귀 확인.

### 변경 파일 (커밋 22776fd)

`apps/mobile/src/components/AddTrackModal.tsx`, `apps/mobile/src/screens/CreateSessionScreen.tsx`, `apps/mobile/src/screens/RoomScreen.tsx`, `apps/mobile/src/screens/room/PlaylistView.tsx`, `apps/mobile/src/state/SessionContext.tsx`(+로그), 신규: `apps/mobile/src/screens/room/YouTubeNowPlayingView.tsx`, `apps/mobile/src/services/youtube/youtubeMockSearch.ts`, `apps/mobile/src/services/youtube/youtubePlayerStub.ts`. `NowPlayingView.tsx`, `ParticipantsBottomSheet.tsx`, `RoleBadge.tsx`, `SyncStatusBadge.tsx`, `CapacityStepper.tsx`, `mockSessionSeed.ts`, `sessionService.ts`는 이번 커밋에서 건드리지 않았다(회귀 확인 절에서 별도로 다룸). 네이티브 프로젝트 파일(`android/`, `ios/`)도 이번 커밋에서 손대지 않았다.

### 1. 정적 검증 (독립 재현)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R3.1 | `npx tsc --noEmit` (apps/mobile) | ✅ 통과 | 0 errors, 출력 없음. |
| R3.2 | `npx eslint .` (apps/mobile) | ✅ 통과 | 0 errors, 16 warnings(round 2의 13개 + 이번 라운드 신규 3개: `CreateSessionScreen.tsx` 라디오 opacity, `PlaylistView.tsx` ▲/▼ opacity 2건 — 전부 기존과 동일한 관용적 `react-native/no-inline-styles` 조건부 스타일 패턴). 구현 로그의 "16 warnings" 주장과 정확히 일치. |
| R3.3 | `npx jest` (apps/mobile) | ✅ 통과 | `__tests__/App.test.tsx` 1/1 통과. |

### 2. Android 빌드 재현 (독립)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R3.4 | `./gradlew.bat assembleDebug --no-daemon` (JAVA_HOME=`D:\Android Studio\jbr`, ANDROID_HOME/ANDROID_SDK_ROOT=`E:\Android\Sdk`, GRADLE_USER_HOME=`E:\gradle-home`) — 증분 빌드 | ✅ 통과 | `BUILD SUCCESSFUL in 9s`, 169 actionable tasks(대부분 UP-TO-DATE, 이전 빌드 캐시 재사용). |
| R3.5 | `./gradlew.bat clean assembleDebug --no-daemon` — 완전 재빌드(캐시 배제, 더 엄격한 재현) | ✅ 통과 | `BUILD SUCCESSFUL in 2m 2s`, 177 actionable tasks(152 executed, 25 up-to-date). `app/build/outputs/apk/debug/app-debug.apk` 생성 확인(130,723,643 bytes). 구현 로그의 "BUILD SUCCESSFUL" 주장을 캐시에 의존하지 않는 방식으로 독립 재현했다 — 신뢰할 수 있음. |

**Android 결론**: 이번 커밋은 JS/TS 레이어만 변경했고 새 네이티브 의존성도 추가하지 않았으므로 빌드 성공은 예상된 결과였지만, `clean` 재빌드까지 통과를 실측으로 확인했다.

### 3. `requestMoveTrack` 순서 변경 로직 코드 추적

> 대상: `apps/mobile/src/state/SessionContext.tsx`의 `requestMoveTrack`(약 227~257행), `apps/mobile/src/screens/room/PlaylistView.tsx`의 `TrackRow`.

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R3.6 | (a) 현재 재생 중인 곡의 인덱스(`currentIndex`)보다 앞선/자신 항목은 이동 대상이 될 수 없는가 | ✅ 통과 | `const currentIndex = prev.playlist.findIndex(e => e.entryId === prev.playback.currentEntryId);` 계산 후 `if (idx < 0 \|\| idx <= currentIndex) { return prev; }`로 대상 자체가 `currentIndex` 이하(재생 완료 곡 + 현재 재생 중인 곡 포함)면 즉시 무시. `idx`를 찾지 못한 경우(이미 삭제된 entryId)도 함께 방어. |
| R3.7 | (b) 배열 경계(맨 앞/맨 뒤)를 벗어나는 이동을 막는가 | ✅ 통과 | `targetIdx = direction === 'up' ? idx - 1 : idx + 1` 계산 후 `if (targetIdx <= currentIndex \|\| targetIdx >= prev.playlist.length) { return prev; }`로 두 방향 모두 방어. 위로 이동 시 `targetIdx <= currentIndex`면(현재 재생 곡 자리를 침범하려 하면) 차단, 아래로 이동 시 `targetIdx >= length`면(배열 끝을 넘어가면) 차단. `idx`가 이미 pending 큐의 첫/마지막이면 각각 `targetIdx`가 `currentIndex`/`length`와 같아져 정확히 여기서 막힌다 — off-by-one 없음. |
| R3.8 | (c) `PlaylistView.tsx`의 `TrackRow`에서 첫 곡은 ▲, 마지막 곡은 ▼가 비활성화되는가 | ✅ 통과 | `pending.map((entry, index) => <TrackRow ... canMoveUp={index > 0} canMoveDown={index < pending.length - 1} ...>)` — `pending` 배열(재생 완료·현재 재생 제외한 "다음 곡들" 큐) 안에서의 로컬 인덱스를 기준으로 계산하므로 큐의 첫 항목은 `canMoveUp=false`, 마지막 항목은 `canMoveDown=false`가 된다. `TrackRow` 내부에서 `disabled={!canMoveUp}`/`disabled={!canMoveDown}` + `opacity` 시각적 피드백 + `accessibilityState={{disabled}}`까지 부여됨을 확인. |
| R3.9 | (d) 재생 완료 섹션(`readOnly`)과 현재 재생 중인 곡에는 버튼 자체가 안 보이는가(기존 아이콘 유지) | ✅ 통과 | `TrackRow`의 렌더 분기: `isPlaying`이면 기존 `▶` 재생중 글리프, `readOnly`(재생 완료)면 기존 `handlePlaceholder`(빈 자리, ⠿ 핸들 자리를 비워둠), 그 외(`canReorder = !isPlaying && !readOnly && (onMoveUp \|\| onMoveDown)`)일 때만 새 ▲/▼ 버튼 렌더링. `PlaylistView`가 현재 재생 곡(`currentEntry`)에는 `onMoveUp`/`onMoveDown`을 아예 넘기지 않고 `isPlaying`만 넘기며, 재생 완료 곡(`played.map`)에는 `readOnly`만 넘기고 이동 콜백을 넘기지 않아 이중으로 안전하다(설령 `isPlaying`/`readOnly` 플래그가 깨져도 콜백 자체가 없으면 `canReorder`가 거짓). |

**순서 변경 결론**: 요구된 (a)~(d) 4개 조건 모두 코드 레벨에서 정확히 구현되어 있음을 확인했다. `sessionService.reorderPlaylist`(기존 함수, 이번에 처음 실사용)도 `orderedEntryIds`를 `Map` 조회로 재구성해 존재하지 않는 id는 자동으로 걸러내는 안전한 구현임을 함께 확인했다(`apps/mobile/src/services/session/sessionService.ts` 95~103행).

### 4. YouTube 화면 요구사항 대조 (00-ux-flow.md 2.10c, 02-key-ui-patterns.md 2.2a·4절)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R3.10 | 플레이어 영역 위에 커스텀 오버레이를 겹치지 않는가(4.2-1 "레이어링 금지") | ✅ 통과 | `YouTubeNowPlayingView.tsx`의 `playerPlaceholder`(WebView 자리, `minHeight: 200`)는 자체적으로 안내 텍스트만 담고 있고, ⏮⏯⏭ 컨트롤·동기화 배지·참여자 아바타는 모두 `playerPlaceholder` **바깥**(아래쪽, 별도 `View`/`Text` 요소)에 순차 배치되어 있다. `position: 'absolute'` 등으로 플레이어 영역 위에 겹치는 요소는 코드 전체에서 발견되지 않았다. |
| R3.11 | 최소 200×200px 크기 준수 | ✅ 통과(부분) | `playerPlaceholder`가 `width: '100%', minHeight: 200`로 스타일링됨 — 세로는 명시적으로 200px 이상 보장, 가로는 `100%`라 어떤 실사용 화면 폭에서도 200px를 초과한다(모바일 화면 최소 폭이 200px 미만인 기기는 사실상 없음). 실기기 렌더링 확인은 아니므로 "정적 스타일 검토로 정책 요건을 만족" 수준으로 판단. |
| R3.12 | 재생/일시정지 버튼이 장식이 아니라 `youtubePlayerController` 실제 호출로 이어지는가 | ✅ 통과 | `handleTogglePlay`가 `requestPlay()/requestPause()`(세션 로컬 상태 갱신)와 함께 `youtubePlayerController.playVideo()/pauseVideo()`를 **함께** 호출함을 확인(`YouTubeNowPlayingView.tsx` 58~66행). STUB 구현체(`youtubePlayerStub.ts`)는 현재 no-op이지만, 인터페이스 호출 배선 자체는 실제로 되어 있어 "장식용 버튼"은 아니다 — 실제 재생 트리거 여부는 `react-native-webview` 연동 후에나 최종 확인 가능(다음 라운드 범위, 문서화된 TODO). |
| R3.13 | 광고 상태를 신규 5번째 상태로 만들지 않고 기존 "맞추는 중" 배지에 보조 텍스트로만 반영하는가 | ✅ 통과 | `effectiveSyncStatus = isAdPlaying ? {...syncStatus, state: 'tuning', reasonLabel: '광고 재생 중'} : syncStatus` — `SyncStatusBadge`의 4단계 상태 체계(색/아이콘)를 그대로 재사용하고 텍스트만 보강. `isAdPlaying()`은 항상 `false`를 반환하는 STUB이며 "감지 불확실 시 단정 표시 안 함" 원칙(2.2a)에 따라 임의로 참 값을 지어내지 않았다. |
| R3.14 | 광고 스킵/카운트다운 등 조작성 커스텀 컨트롤을 만들지 않았는가(4.2-2) | ✅ 통과 | `playerPlaceholder` 내부에는 안내 텍스트만 있고 스킵 버튼·타이머 등 조작 요소가 없다. |

**YouTube 화면 결론**: 문서가 요구하는 정책 원칙(비레이어링, 최소 크기, 실제 재생 트리거, 상태 재사용, 조작 컨트롤 금지)을 코드 레벨에서 정확히 지키고 있다. 다만 R3.12는 STUB이 no-op이라 "실제로 영상이 재생되는지"까지는 이번 라운드에서 검증 불가능한 범위(WebView 미설치, 리더 지시로 다음 라운드 TODO로 이미 문서화됨) — 이는 실패가 아니라 이번 라운드 의도된 범위 제한이다.

### 5. 서비스별 격리 확인

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R3.15 | `NowPlayingView.tsx`(Spotify 전용)와 `YouTubeNowPlayingView.tsx`가 완전히 분리된 컴포넌트인가 | ✅ 통과 | 두 파일은 서로 import하지 않는 독립 컴포넌트다. Free 계정 배너(`viewerIsFree && session.service === 'spotify'` 가드, round 2에서 확인된 그대로)는 `NowPlayingView.tsx`에만 존재하고 `YouTubeNowPlayingView.tsx`에는 관련 코드 자체가 없다(컴포넌트 분리 자체가 가드 역할). |
| R3.16 | `RoomScreen.tsx`의 라우팅 조건(`session.service === 'youtube'`)이 정확한가 | ✅ 통과 | `session.service === 'youtube' ? <YouTubeNowPlayingView .../> : <NowPlayingView .../>` — `youtube`가 아니면(현재는 `spotify`만 실제로 생성 가능, `mixed`는 세션 생성 자체가 막혀 있음) 전부 `NowPlayingView`로 향하므로 현재 도달 가능한 두 케이스(`spotify`/`youtube`)에서 오작동 여지가 없다. |
| R3.17 | **(신규 발견) `ParticipantsBottomSheet.tsx`의 Free 태그/조건부 헤더가 YouTube 세션에도 새어 나가는가** | ❌ 실패 | `RoomScreen.tsx`는 탭(`nowPlaying`/`playlist`)과 무관하게 `ParticipantsBottomSheet`를 **서비스 구분 없이 하나만** 렌더링하고 `participants={session.participants}`만 전달한다(`session.service`를 넘기지 않음). `ParticipantsBottomSheet.tsx`(41~45행)는 `accountTier === 'premium'` 기준으로 `playableCount`를 계산해 헤더를 "참여자 (N)" vs "참여자 (N) · 재생 M명"으로 분기하고, 각 참여자 행(112~114행)도 `accountTier === 'free'`면 무조건 "Free · 재생 불가" 태그를 노출한다 — `session.service`를 전혀 참조하지 않는다. `mockSessionSeed.buildDemoParticipants`도 `service`와 무관하게 두 번째 데모 참여자("준호")를 `accountTier: 'free'`로 항상 시드하고, `sessionService.createSession`은 `params.service`를 시딩 로직에 전달하지 않는다. **재현**: 세션 생성 화면에서 서비스로 "YouTube"를 선택하고 기본 정원(2명) 이상으로 세션을 만든 뒤(정원 3 이상이면 "준호"가 시드됨) 우측 상단 "⋮"로 참여자 바텀시트를 열면, "준호" 항목에 "Free · 재생 불가" 태그가 표시되고 헤더도 "참여자 (N) · 재생 M명"으로 표시된다. 그러나 YouTube 세션은 Premium 여부로 재생 가능 인원이 갈리지 않는다(US-103, `YouTubeNowPlayingView.tsx`가 스스로 `suffix = '${session.participants.length}명 함께 듣는 중'`로 Premium/Free 구분 없이 전체 인원만 보여주도록 별도 처리한 것과 정면으로 모순). round 1/2에서 지적·수정됐던 "Free 배너가 우연히 항상 참이던" 것과 동일한 종류의 문제가 `ParticipantsBottomSheet`에는 아직 남아 있다 — `NowPlayingView.tsx`만 가드를 추가했을 뿐, 같은 화면 그룹에서 재사용되는 참여자 바텀시트는 놓친 것으로 보인다. 관련 파일: `apps/mobile/src/screens/RoomScreen.tsx`(56~73행), `apps/mobile/src/components/ParticipantsBottomSheet.tsx`(41~45, 112~114행), `apps/mobile/src/services/session/mockSessionSeed.ts`(`buildDemoParticipants`), `apps/mobile/src/services/session/sessionService.ts`(`createSession`). |

**서비스별 격리 결론**: Now Playing 화면(핵심 화면)의 격리는 견고하게 확인됐으나, 참여자 바텀시트는 여전히 서비스 인지가 없어 YouTube 세션에서 잘못된 정보(존재하지 않는 재생 제약)를 노출한다 — 이번 라운드 지시 범위("Free 배너 안 새어 들어가는지 검증")를 문자 그대로는 통과했다고 볼 수도 있으나(대상이 명시적으로 "Free 배너"였음), 같은 성격의 문제가 인접 컴포넌트에 남아 있어 실패로 기록한다.

### 6. 회귀 확인 (diff 범위 내 가벼운 확인)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R3.18 | 역할 배지(방장/관리자/일반사용자 배지 없음) | ✅ 통과 | `RoleBadge.tsx`는 이번 커밋에서 변경되지 않았고, `ParticipantsBottomSheet.tsx`에서의 사용(`<RoleBadge role={participant.role} />`)도 그대로 유지. |
| R3.19 | 관리자 임명/사임 — 방장 전용 | ✅ 통과 | `ParticipantsBottomSheet.tsx`의 `canManage={viewerIsHost && item.role !== 'host'}`(RoomScreen.tsx에서 `viewerIsHost={isHost}` 그대로 전달) 로직 불변. |
| R3.20 | 정원 스테퍼(2~12, 기본 2명) | ✅ 통과 | `CreateSessionScreen.tsx`에서 `CapacityStepper` 관련 코드는 이번 diff의 영향을 받지 않았다(변경분은 서비스 라디오 `useState`/`onPress` 배선뿐) — `capacity` state와 `createSession` 전달 흐름 유지 확인. |
| R3.21 | Free 배너 Spotify 전용 가드(`NowPlayingView.tsx`) | ✅ 통과 | 이번 커밋에서 `NowPlayingView.tsx`는 전혀 변경되지 않았다 — round 2에서 확인된 `session.service === 'spotify'` 가드가 그대로 유효. (단, R3.17에서 지적한 대로 같은 취지의 가드가 `ParticipantsBottomSheet.tsx`에는 애초부터 없었다.) |
| R3.22 | 동기화 상태 배지 4단계 | ✅ 통과 | `SyncStatusBadge.tsx`는 이번 커밋에서 변경되지 않았다. `YouTubeNowPlayingView.tsx`도 동일한 4단계 배지 컴포넌트를 그대로 재사용(신규 상태 추가 없음, R3.13과 동일 근거). |

### Round 3 종합

| 구분 | 개수 |
|---|---|
| ✅ 통과 | 21 (R3.1~R3.16, R3.18~R3.22) |
| ❌ 실패 | 1 (R3.17 — `ParticipantsBottomSheet`의 Free 태그/조건부 헤더가 YouTube 세션에도 새어 들어감, 서비스 인지 부재) |
| ⛔ 미검증 | 0 (이번 라운드는 Android clean 빌드까지 독립 재현 성공, iOS는 구조적 제약으로 아래 별도 결론 인용) |
| 의도된 범위 밖(실패 아님) | R3.12의 실제 영상 재생 여부(WebView 미설치, 다음 라운드 TODO로 문서화됨), 혼합(Mixed) 세션(이번 라운드 지시 범위 밖) |

**iOS**: 이번 라운드도 Windows 환경의 구조적 제약(Xcode/macOS 부재)으로 실기기·시뮬레이터 빌드는 수행할 수 없었다. 이번 커밋은 `Platform.OS` 분기나 iOS 전용 API를 사용하지 않았고(신규 파일 `YouTubeNowPlayingView.tsx`/`youtubePlayerStub.ts`/`youtubeMockSearch.ts`도 표준 RN 컴포넌트·순수 JS만 사용), `android/`·`ios/` 네이티브 프로젝트 파일도 건드리지 않았다 — round 1의 결론("코드 리뷰 수준에서는 플랫폼 분기 버그나 iOS 전용 API 오남용을 발견하지 못했으나, 실제 iOS 런타임 검증은 별도로 필요")을 그대로 인용한다.

**결론: 이번 라운드(커밋 22776fd)는 "완료"로 간주할 수 없다.** 정적 검증(tsc/eslint/jest) 3종은 모두 독립 재현되어 통과했고, Android는 증분 빌드뿐 아니라 `clean assembleDebug` 완전 재빌드까지 성공을 실측 확인했다. 순서 변경(`requestMoveTrack`) 로직은 요구된 4개 조건(현재곡 이전 이동 금지, 배열 경계 방어, 첫/마지막 버튼 비활성화, 재생중/완료 곡 버튼 미노출) 모두 코드 레벨에서 정확하게 구현되어 있고, YouTube Now Playing 화면도 문서가 요구하는 정책(레이어링 금지, 최소 크기, 실제 재생 트리거 배선, 상태 재사용, 조작 컨트롤 금지)을 코드상 지키고 있다.

다만 서비스별 격리 확인 과정에서 **`ParticipantsBottomSheet`가 YouTube 세션에서도 Free 계정 배지·"재생 M명" 조건부 헤더를 잘못 노출하는 문제(R3.17)를 새로 발견했다** — 이는 round 1/2에서 `NowPlayingView`에 대해 이미 한 번 지적·수정됐던 것과 정확히 같은 종류의 "서비스 조건 없는 accountTier 기반 UI"가 인접 컴포넌트에 남아 있던 사례다. 사용자에게 실제로 존재하지 않는 제약("Free 계정은 YouTube 세션에서도 재생 불가")을 암시하는 정보성 오류이므로, 다음 구현 라운드에서 `ParticipantsBottomSheet`(및 필요시 `mockSessionSeed`/`createSession`의 시딩 로직)에 `session.service` 인지를 추가해야 한다. 이 항목 하나를 제외한 나머지(순서 변경 US-303, YouTube 화면 정책 준수, Now Playing 레벨 격리, Android 빌드, 회귀)는 모두 견고하게 통과했다.

---

## Round 4 검증 (2026-07-26)

> 검증 대상 커밋: `d22c6b3` ("Apply SameWave display name and real app icon (Android)"), `b6877b5` ("Rename distributed APK to SameWave-debug.apk")
> 검증일: 2026-07-26
> 검증 담당: 검증(Verification) 서브에이전트
> 검증 방식: `git show --stat`/`git show <file>`로 diff 직접 확인 + `apps/mobile`에서 tsc/eslint/jest 독립 재실행 + Android `clean assembleDebug` 완전 재빌드 독립 재현 + `aapt2 dump badging`으로 실제 패키징된 라벨 확인 + `unzip`으로 APK 내부 mipmap PNG를 추출해 소스 리포 파일과 바이트 단위 비교 + RN 내부 등록 키 3곳 직접 열람 대조.
> 환경: Windows 11 Pro (10.0.26200), Node v24.15.0, npm 11.12.1, JAVA_HOME=`D:\Android Studio\jbr`, ANDROID_HOME/ANDROID_SDK_ROOT=`E:\Android\Sdk`, GRADLE_USER_HOME=`E:\gradle-home`, build-tools `36.1.0`(aapt2 포함). macOS/Xcode 여전히 없음 — iOS 실빌드는 이번에도 구조적으로 불가능.

### 변경 파일

- `d22c6b3`: `apps/mobile/android/app/src/main/res/values/strings.xml`, `apps/mobile/app.json`, `apps/mobile/ios/mobile/Info.plist`, `apps/mobile/android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/{ic_launcher,ic_launcher_round}.png`(총 10개 PNG), `apps/mobile/package.json`/`package-lock.json`(sharp devDependency 추가), `docs/agents/implementation-log.md`. `.ts`/`.tsx` 앱 로직 파일은 전혀 포함되지 않음(코드 로직 변경 없음, `git show --stat`으로 직접 확인).
- `b6877b5`: `.github/workflows/android-debug-apk.yml`, `README.md`, `docs/releases/ci-android-debug-apk.md`, `docs/agents/deployment-log.md`. 마찬가지로 앱 코드 파일 없음.

### 1. 정적 검증 (독립 재현)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R4.1 | `npx tsc --noEmit` (apps/mobile) | ✅ 통과 | 0 errors, 출력 없음. |
| R4.2 | `npx eslint .` (apps/mobile) | ✅ 통과 | 0 errors, 16 warnings — round 3과 정확히 동일한 16건(전부 기존에 이미 확인된 조건부 inline style 관용 패턴, 신규 경고 없음). 이번 라운드가 텍스트/이미지 리소스만 건드렸다는 점과 일치. |
| R4.3 | `npx jest` (apps/mobile) | ✅ 통과 | `__tests__/App.test.tsx` 1/1 통과. |

세 항목 모두 구현 로그의 "tsc/eslint/jest pass" 주장과 독립적으로 재현되어 일치한다.

### 2. Android 클린 빌드 재현 (독립)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R4.4 | `./gradlew.bat clean assembleDebug --no-daemon` (증분/캐시 재사용 없는 완전 재빌드) | ✅ 통과 | `BUILD SUCCESSFUL in 1m 50s`, 177 actionable tasks(152 executed, 25 up-to-date). `app/build/outputs/apk/debug/app-debug.apk` 생성 확인(130,741,787 bytes). 구현 에이전트가 증분 빌드로만 보고했던 것과 달리 캐시를 배제한 클린 빌드로 독립 재현 — 신뢰할 수 있음. |

### 3. 표시 이름 검증 (aapt2 dump badging, 재현)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R4.5 | `aapt2.exe dump badging app-debug.apk`의 `application-label` | ✅ 통과 | `E:\Android\Sdk\build-tools\36.1.0\aapt2.exe`로 실행한 결과 `application-label:'SameWave'`(모든 로케일 변형 포함, 예: `application-label-en-GB:'SameWave'` 등) 및 `application: label='SameWave' ...`, `launchable-activity: name='com.mobile.MainActivity' label='SameWave'`로 일관되게 확인됨. 구현 에이전트의 주장을 이 환경에서 직접 재현했다. `package: name='com.mobile'`도 함께 확인(패키지 ID는 변경 대상이 아니었고 실제로 변경되지 않음). |

### 4. RN 내부 등록 키 일치 확인 (직접 파일 열람)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R4.6 | `apps/mobile/app.json`의 `"name"` | ✅ 통과 | `{"name": "mobile", "displayName": "SameWave"}` — `name`은 여전히 `"mobile"`, `displayName`만 변경됨을 직접 확인. |
| R4.7 | `apps/mobile/android/app/src/main/java/com/mobile/MainActivity.kt`의 `getMainComponentName()` | ✅ 통과 | `override fun getMainComponentName(): String = "mobile"` — 변경 없이 그대로 `"mobile"`. |
| R4.8 | `apps/mobile/ios/mobile/AppDelegate.mm`의 `moduleName` | ✅ 통과 | `self.moduleName = @"mobile";` — 변경 없이 그대로 `"mobile"`. |

**결론**: 세 곳(`app.json.name`, `MainActivity.kt.getMainComponentName()`, `AppDelegate.mm.moduleName`) 모두 `"mobile"`로 정확히 일치한다. 표시 이름 변경이 RN 컴포넌트 등록 키를 깨뜨리지 않았음을 직접 파일 열람으로 확인했다 — 만약 하나라도 어긋났다면 앱이 "no component found" 류의 크래시로 아예 실행되지 않았을 것인데, 실제로 R4.4의 클린 빌드 성공 및 R4.5의 정상적인 badging 출력(패키지/액티비티 정보가 이상 없이 나옴)이 간접적으로도 이 일치를 뒷받침한다.

### 5. 아이콘 실제 적용 확인

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R4.9 | APK 내 5개 밀도(`mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi`) `ic_launcher.png` 바이트 크기가 소스 리포 PNG와 일치하는가 | ✅ 통과 | `unzip -l`로 확인한 APK 내부 크기: hdpi 5223, mdpi 3207, xhdpi 6962, xxhdpi 11553, xxxhdpi 15495 bytes — 커밋 `d22c6b3`의 `git show --stat` diff에 표시된 "Bin ... -> N bytes"의 N값과 5개 밀도 전부 정확히 일치. 나아가 5개 밀도 전부(`ic_launcher.png`)를 `unzip -p`로 추출해 소스 리포 파일(`apps/mobile/android/app/src/main/res/mipmap-*/ic_launcher.png`)과 `diff`로 바이트 단위 비교한 결과 **5개 전부 완전히 동일(IDENTICAL)**. `ic_launcher_round.png`도 xxxhdpi에서 동일하게 바이트 단위로 일치 확인. |
| R4.10 | 실제 디자인(노을 그라디언트 + 겹치는 두 원)이 적용됐는가(안드로이드 기본 아이콘이 아닌지) | ✅ 통과 | xxxhdpi `ic_launcher.png`를 추출해 이미지를 직접 열람한 결과, 노을(주황→보라) 그라디언트 배경 위에 두 개의 겹치는 원(하나는 그라디언트 채움, 하나는 반투명 스크린 블렌드), 우측 상단의 작은 점 원, 중앙의 세로 바 아이콘, 하단 가로선까지 `docs/design/03-screen-mockups.html`의 인라인 SVG(`duskBg` 선형 그라디언트, `circleGradA` 방사형 그라디언트, `<circle cx="76" cy="94" r="44">`/`<circle cx="118" cy="94" r="44">`/`<circle cx="150" cy="46" r="7">`)와 시각적으로 정확히 일치한다. 기본 React Native 초록 로봇/틀 아이콘이 아님을 명확히 확인. |
| R4.11 | `mipmap-anydpi-v26`(적응형 아이콘) 리소스 존재 여부 | ✅ 확인 | `apps/mobile/android/app/src/main/res/` 하위에 `mipmap-anydpi-v26` 폴더 자체가 없음을 확인 — 커밋 메시지의 "No adaptive icon resources exist, so legacy icon replacement is the complete scope" 주장과 일치. Legacy 5-density 교체만으로 아이콘 교체 범위가 완결된다는 판단이 맞다. |

### 6. iOS Info.plist 검증 (구조적 제약, 문법 검토만)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R4.12 | `Info.plist` XML 구조가 깨지지 않았는가 | ✅ 통과(문법 수준) | 파일 전체를 직접 열람한 결과 `<?xml ...?>`/`<!DOCTYPE plist ...>`/`<plist>` 선언과 `<dict>` 태그 짝이 정상이며, `CFBundleDisplayName` 키의 값만 `Feel Music Share` → `SameWave`로 교체되고 그 외 키(`CFBundleURLSchemes`의 `feelmusicshare`, `CFBundleIdentifier` 등)는 전혀 손상되지 않았다. XML 파서 도구(plutil 등)로의 실제 유효성 검사는 macOS 전용 도구라 이 환경에서 수행 불가 — 육안 구조 검토 수준의 확인이다. |
| R4.13 | 실제 iOS 빌드/런타임 검증 | ⛔ 미검증(환경 제약, 구조적, round 1~3과 동일) | Windows 환경에는 Xcode/macOS가 없어 iOS 빌드 자체가 원천적으로 불가능하다. round 1의 결론("코드 리뷰 수준에서는 플랫폼 분기 버그나 iOS 전용 API 오남용을 발견하지 못했으나, 실제 iOS 런타임 검증은 별도로 필요")을 그대로 인용한다. 이번 커밋은 `Info.plist`의 표시용 문자열 하나만 바꿨고 `Platform.OS` 분기나 iOS 전용 API를 추가하지 않았으므로(해당 커밋에 `.ts`/`.tsx` 변경 자체가 없음) 회귀 리스크는 낮다고 판단하나, 이는 여전히 "미검증"이지 "통과 확인"이 아니다. |

### 7. 배포 파일명 변경 검증 (`b6877b5`)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R4.14 | `android-debug-apk.yml`의 rename/upload-artifact/release-action 경로가 전부 `SameWave-debug.apk`로 통일됐는가 | ✅ 통과 | `git show b6877b5`로 diff 직접 확인: `cp ... /tmp/release-assets/SameWave-debug.apk`, `upload-artifact`의 `path`, `release-action`의 `artifacts` 3곳 모두 새 파일명으로 변경됨. 릴리즈 태그 `android-debug-latest`는 diff에 등장하지 않음 — 유지 주장과 일치. |
| R4.15 | YAML 구조가 문법적으로 손상되지 않았는가 | ✅ 통과(육안 검토) | 이 환경에 `js-yaml` 등 YAML 파서가 전역/로컬 어디에도 설치돼 있지 않아 프로그램적 파싱 검증은 수행하지 못했다(`node -e "require('js-yaml')"` 시도 결과 `MODULE_NOT_FOUND`). 대신 워크플로 전체 파일을 열람해 들여쓰기·`defaults.run.working-directory: apps/mobile` 기준 상대 경로(`android/app/build/outputs/apk/debug/app-debug.apk`)가 여전히 올바르게 해석되는 구조인지 육안으로 확인 — 문제 없음. **프로그램적 YAML 검증은 미수행**임을 명시한다(round 1~3에서도 이 워크플로 자체는 별도 파이프라인 검증 범위가 아니었음). |
| R4.16 | `README.md`/`docs/releases/ci-android-debug-apk.md`의 파일명 언급 일관성 | ✅ 통과 | 두 파일 모두 `feel-music-share-debug.apk` 언급이 `SameWave-debug.apk`로 교체됐고, 다운로드 링크 URL(`.../releases/latest/download/SameWave-debug.apk`)도 함께 갱신됨을 diff로 확인. 저장소 경로(`sfeelBot/feel_music_share`)는 그대로 유지됨(의도된 대로). |
| R4.17 | 실제 CI 실행에서 새 파일명으로 릴리즈가 게시되는지 | ⛔ 미검증(구조적) | 이 두 커밋이 아직 원격에 push되지 않은 상태(로컬 검증 단계)이므로 GitHub Actions 실행 자체가 발생하지 않았다 — 문서에도 "push 이후 다음 워크플로 실행에서 확인 필요"로 스스로 명시돼 있어 이번 라운드의 미검증 범위와 일치한다. |

### 8. 회귀 확인 (diff 범위 — 코드 로직 변경 없음 확인)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R4.18 | 두 커밋에 `.ts`/`.tsx` 파일 변경이 전혀 없는가 | ✅ 통과 | `git show --stat d22c6b3`, `git show --stat b6877b5` 각각에서 `grep -E "\.tsx|\.ts$"` 결과 0건 — 두 커밋 모두 앱 로직 코드를 전혀 건드리지 않았다. 따라서 round 1~3에서 통과 확인된 기능 항목(정원 스테퍼, 역할 배지, 관리자 임명/사임, Free 배너 서비스 가드, 동기화 배지, 재정렬, YouTube 화면)의 코드는 물리적으로 변경되지 않았으므로 회귀 리스크는 구조적으로 없다고 판단한다(정적 검증 3종 결과도 round 3과 완전히 동일한 경고 수로 재확인되어 이를 뒷받침). |
| R4.19 | round 3에서 발견된 미해결 이슈(R3.17: `ParticipantsBottomSheet` 서비스 미인지)가 이번 라운드에서 재발/악화되지 않았는가 | ✅ 확인(참고) | `ParticipantsBottomSheet.tsx`는 이번 두 커밋에서 전혀 변경되지 않았다 — R3.17은 여전히 미해결 상태로 남아 있으나 이번 라운드 지시 범위 밖이며 새로 악화되지도 않았다. 다음 구현 라운드에서 계속 추적 필요(리더에게 재확인 요청). |

### Round 4 종합

| 구분 | 개수 |
|---|---|
| ✅ 통과 | 17 (R4.1~R4.12, R4.14~R4.16, R4.18~R4.19) |
| ❌ 실패 | 0 |
| ⛔ 미검증(환경 제약/미push, 실패 아님) | 2 (R4.13 iOS 실런타임 검증, R4.17 실제 CI 실행 확인 — push 전이라 발생 자체가 불가능) |
| 프로그램적 검증 미수행(육안 검토로 대체, 참고) | R4.15 YAML 파서 부재 |

**결론: 이번 라운드(커밋 `d22c6b3`, `b6877b5`)는 지시받은 검증 범위 내에서 "완료"로 간주할 수 있다.** 정적 검증(tsc/eslint/jest) 3종은 round 3과 완전히 동일한 결과(0 errors, 16 warnings, 1/1 테스트)로 재현되어 회귀가 없음을 뒷받침했고, Android는 `clean assembleDebug` 완전 재빌드까지 독립 재현에 성공했다. 표시 이름은 `aapt2 dump badging`으로 `application-label:'SameWave'`를 직접 확인했고, RN 내부 등록 키 3곳(`app.json.name`/`MainActivity.getMainComponentName()`/`AppDelegate.moduleName`)이 전부 `"mobile"`로 일치해 앱 실행이 깨질 위험이 없음을 확인했다. 아이콘은 5개 밀도 전부 APK 내부 PNG와 소스 리포 PNG가 바이트 단위로 완전히 동일함을 확인했고, xxxhdpi 아이콘을 직접 시각 검토해 디자인 문서의 노을 그라디언트+겹치는 두 원 디자인이 실제로 반영됐음(기본 안드로이드 아이콘이 아님)을 확인했다. 배포 파일명 변경(`SameWave-debug.apk`)도 워크플로/문서 3곳 모두 일관되게 반영됨을 확인했다.

다만 다음 항목은 "통과"가 아니라 명시적으로 "미검증"으로 남긴다: (1) iOS는 이 환경의 구조적 제약(macOS/Xcode 부재)으로 실빌드·런타임 검증이 원천적으로 불가능하며 — `Info.plist` 변경은 문법 수준(육안 구조 검토)에서만 이상 없음을 확인했다. (2) 두 커밋이 아직 원격에 push되지 않아 실제 GitHub Actions 실행에서 새 파일명(`SameWave-debug.apk`)으로 릴리즈가 정상 게시되는지는 push 이후 별도 확인이 필요하다. (3) YAML 문법의 프로그램적 파싱 검증은 이 환경에 파서가 없어 육안 검토로만 대체했다. 이 세 가지는 실패가 아니라 구조적/시점적 제약에 따른 미검증이며, round 1~3에서 이미 별도로 열려 있던 이슈(R3.17 `ParticipantsBottomSheet` 서비스 미인지, 딥링크 관련 사항 등)는 이번 두 커밋의 변경 범위 밖이라 그대로 미해결 상태로 남아 있고 이번 판정에 영향을 주지 않는다.
