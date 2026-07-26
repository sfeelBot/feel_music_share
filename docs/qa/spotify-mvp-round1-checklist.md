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

## Round 5 검증 (2026-07-26)

> 검증 대상 커밋: `7a888f2` ("Implement real YouTube playback via WebView + IFrame Player API") — YouTube 세션의 실제 영상 재생 연동. UI 골격뿐이던 `YouTubeNowPlayingView`/`youtubePlayerStub`를 `react-native-webview` 기반 IFrame Player 제어로 전면 교체.
> 검증일: 2026-07-26
> 검증 담당: 검증(Verification) 서브에이전트
> 검증 방식: `git show --stat`/`git diff`로 diff 직접 확인 + 신규/변경 파일(`youtubePlayerHtml.ts`, `youtubePlayerStub.ts`, `YouTubeNowPlayingView.tsx`, `SessionContext.tsx` 관련 함수)을 라인 단위로 코드 리뷰 + `docs/specs/03-youtube-integration.md`(8절)·`docs/design/02-key-ui-patterns.md`(2.2a/4절)·`docs/design/00-ux-flow.md`(2.10c)와 대조 + `apps/mobile`에서 tsc/eslint/jest 독립 재현 + Android `clean` → `assembleDebug --no-daemon` 완전 재빌드 독립 재현(캐시 미사용) + APK 내부 JS 번들 존재 확인(R2 이후 회귀 여부) + 인접 서비스 격리 가드(R3.17 관련 컴포넌트) 재확인 + Spotify 쪽 파일 변경 여부 diff 확인(회귀).
> 환경: Windows 11 Pro (10.0.26200), Node v24.15.0, npm 11.12.1, JAVA_HOME=`D:\Android Studio\jbr`, ANDROID_HOME/ANDROID_SDK_ROOT=`E:\Android\Sdk`, GRADLE_USER_HOME=`E:\gradle-home`. macOS/Xcode 여전히 없음 — iOS 실빌드/런타임은 이번에도 구조적으로 불가능. 실제 Android 기기/에뮬레이터도 이 세션에서는 사용하지 않음(빌드 성공 여부만 확인, 런타임 미검증은 아래 명시).

### 변경 파일 확인

`git diff 7a888f2^ 7a888f2 --stat`으로 직접 확인 — 신규: `apps/mobile/src/services/youtube/youtubePlayerHtml.ts`, `apps/mobile/__mocks__/react-native-webview.js`. 전면 교체: `apps/mobile/src/services/youtube/youtubePlayerStub.ts`. 수정: `apps/mobile/src/screens/room/YouTubeNowPlayingView.tsx`, `apps/mobile/jest.config.js`, `apps/mobile/package.json`/`package-lock.json`(`react-native-webview: ^14.0.1` 추가). `apps/mobile/src` 전체 diff에서 `youtube/` 폴더와 `YouTubeNowPlayingView.tsx` 외에는 어떤 파일도 변경되지 않았음을 확인(`git diff --stat -- apps/mobile/src | grep -v youtube` 결과 `YouTubeNowPlayingView.tsx` 한 줄만 남음) — Spotify 화면·공용 컴포넌트·`SessionContext.tsx`는 이번 커밋에서 전혀 건드리지 않았다는 구현 로그의 주장과 일치.

### 1. 정적 검증 (독립 재현)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R5.1 | `npx tsc --noEmit` (apps/mobile) | ✅ 통과 | 0 errors, 출력 없음. `React.ElementRef<typeof WebView>` 우회로 이전에 보고된 오버로드 오류(`No overload matches this call`)가 재현되지 않음을 확인. |
| R5.2 | `npx eslint .` (apps/mobile) | ✅ 통과 | 0 errors, 16 warnings — round 3/4와 정확히 동일한 개수, 전부 기존에 이미 확인된 조건부 inline-style 관용 패턴(`YouTubeNowPlayingView.tsx`의 `opacity: hasPrevTrack ? 1 : 0.4` 1건 포함, `NowPlayingView.tsx`의 동일 패턴과 종류가 같음 — 신규 유형 경고 없음). |
| R5.3 | `npx jest` (apps/mobile) | ✅ 통과 | `__tests__/App.test.tsx` 1/1 통과. `__mocks__/react-native-webview.js`(jest manual mock)가 정상 작동해 네이티브 모듈 부재로 인한 `TurboModuleRegistry` 예외 없이 전체 트리가 렌더링됨을 확인. |

세 항목 모두 구현 로그의 주장과 독립적으로 재현되어 일치한다.

### 2. Android 클린 빌드 재현 (독립)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R5.4 | `./gradlew.bat clean --no-daemon` | ✅ 통과 | `BUILD SUCCESSFUL in 1m 19s`. 로그에 `react_codegen_RNCWebViewSpec-*`(4개 ABI) clean 태스크가 정상 실행됨을 확인 — codegen 산출물이 실제로 존재했다는 뜻이라 이전 빌드(구현 에이전트 보고분)가 캐시 재사용이 아니라 실제로 webview 네이티브 모듈을 빌드했었음을 뒷받침. |
| R5.5 | `./gradlew.bat assembleDebug --no-daemon` (clean 직후, 캐시 미사용 완전 재빌드) | ✅ 통과 | `BUILD SUCCESSFUL in 3m 57s`, 203 actionable tasks(173 executed, 30 up-to-date). 로그에 `:react-native-webview:compileDebugKotlin`, `:react-native-webview:extractDebugAnnotations`, `:react-native-webview:bundleDebugAar`, `:react-native-webview:assembleDebug` 등이 모두 성공 실행됨을 확인 — settings.gradle의 autolinking이 신규 네이티브 모듈을 정상 인식한다는 구현 로그 주장을 캐시 없는 완전 재빌드로 독립 재현. |
| R5.6 | APK 내부 JS 번들 패키징 여부(2026-07-25 라운드에서 고쳤던 "Unable to load script" 회귀 여부) | ✅ 통과(회귀 없음) | `unzip -l app-debug.apk`로 `assets/index.android.bundle`(1,064,104 bytes) 존재 확인 — 0바이트/누락 아님, debug 변형도 번들이 계속 패키징되고 있음을 재확인. |

### 3. 정책 준수 — YouTube API Developer Policies / Required Minimum Functionality 대조 (코드 리뷰)

근거 문서: `docs/specs/03-youtube-integration.md` 5절/8-2절/8-3절, `docs/design/02-key-ui-patterns.md` 2.2a·4절, `docs/design/00-ux-flow.md` 2.10c.

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R5.7 | 표준 IFrame Player API 함수만 사용, DOM 조작·광고 스킵 코드 없음(Section III.I.5/6) | ✅ 통과 | `youtubePlayerHtml.ts`를 전체 라인 단위로 읽음 — 호출되는 함수는 `YT.Player` 생성자, `playVideo/pauseVideo/seekTo/loadVideoById/cueVideoById/getVideoData/getPlayerState`뿐이다. `document.querySelector`, DOM 노드 직접 조작, iframe `src` 재작성, 광고 자동 스킵/음소거 로직은 코드 어디에도 없음(전체 135줄 직접 확인). |
| R5.8 | 광고 감지는 정보성으로만 사용, 감지 로직 자체가 플레이어를 조작하지 않음 | ✅ 통과 | `detectAdPlaying()`은 `getVideoData().video_id`를 요청 videoId와 **비교만** 하고 `postToRN`으로 RN에 알릴 뿐, 감지 결과로 스스로 아무 플레이어 명령도 실행하지 않는다(순수 조회 함수). 이 휴리스틱은 공식 상태 코드 부재에 따른 실무적 판단이라는 점이 파일 헤더/스펙(8-1절)에 명시돼 있고, 정확도(오탐/미탐 가능성)는 실기기 검증 필요 사항으로 별도 관리되고 있어 "확인 필요"를 "확정"으로 과장하지 않는 서술 태도도 일관됨. |
| R5.9 | 커스텀 컨트롤은 플레이어 영역 **바깥**에 배치(레이어링 금지) | ✅ 통과 | `YouTubeNowPlayingView.tsx`의 JSX 트리를 직접 추적: `playerContainer`(WebView 렌더 영역)와 `controls`(⏮⏯⏭ 버튼)가 형제 `<View>` 요소로 순차 배치되며, `position: 'absolute'`/`zIndex` 등 오버레이 스타일이 둘 중 어디에도 없음(styles 객체 전체 확인). 광고 상태 배지(`SyncStatusBadge`)도 `controls` 아래에 별도 flow 요소로 렌더 — 플레이어 위에 겹치는 요소 없음. |
| R5.10 | 최소 200×200px 이상 유지 | ✅ 통과 | `playerContainer`/`webview` 스타일 모두 `minHeight: 200`, `width: '100%'` — 실기기 폭이 200px 미만일 가능성은 사실상 없으므로 정책 요구사항 충족. |
| R5.11 | 커스텀 재생 버튼이 실제 재생을 트리거(장식 버튼 금지) | ✅ 통과 | `handleTogglePlay`가 `requestPlay()/requestPause()`(세션 로컬 상태)와 함께 `youtubePlayerController.playVideo()/pauseVideo()`(실제 IFrame Player 명령)를 **동시에** 호출함을 확인 — STUB이 아니라 실제 커맨드가 나간다. |
| R5.12 | 광고 재생 중 서버발 seek 명령 무시(8-3절, 컨트롤러 레벨 방어) | ✅ 통과(코드 확인, 단 현재 미사용) | `WebViewYoutubePlayerController.seekTo()`가 `if (this.isAd) { return; }`로 조기 반환 — 정책 요구사항을 코드로 정확히 구현했다. 다만 `SessionContext.tsx`(이번 라운드에서 건드리지 않음)에는 아직 서버발 seek을 트리거하는 동기화 엔진 자체가 없어(Firebase 미연동), 이 가드가 실제로 호출되는 경로가 현재는 존재하지 않는다 — "방어 코드가 미리 준비돼 있으나 아직 아무도 호출하지 않는다"는 상태이며, 이는 이번 라운드 지시 범위(재생 연동)와 일관되고 결함은 아니다(다음 라운드에서 실제 동기화 엔진이 붙을 때 이 가드가 정말 동작하는지 재확인 필요). |
| R5.13 | 신규 5번째 동기화 상태를 만들지 않고 기존 "맞추는 중"을 재사용(02문서 2.2a) | ✅ 통과 | `effectiveSyncStatus`가 `isAdPlaying`일 때만 `{...syncStatus, state: 'tuning', reasonLabel: '광고 재생 중'}`으로 파생 — 새 상태 값을 추가하지 않고 기존 `SyncStatusBadge`의 `reasonLabel` 필드를 재사용하는 기존 패턴 그대로. |

### 4. YouTube ↔ 다른 서비스 격리 회귀 확인 (R3.17류 패턴 재점검)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R5.14 | `ParticipantsBottomSheet.tsx`의 `session.service === 'spotify'` 가드(R3.17에서 고친 부분)가 이번 라운드에서도 유지되는가 | ✅ 통과(회귀 없음) | `git diff 7a888f2^ 7a888f2`에 `ParticipantsBottomSheet.tsx`가 전혀 등장하지 않음 — 파일 자체가 변경되지 않았고, 직접 열람한 결과 `showFreeTierUi = session.service === 'spotify'` 가드가 그대로 남아 있음. |
| R5.15 | `NowPlayingView.tsx`(Spotify), `PlaylistView.tsx`, `AddTrackModal.tsx`, `RoomScreen.tsx`의 서비스 조건부 로직이 이번 커밋으로 손상되지 않았는가 | ✅ 통과(회귀 없음) | 위 파일들 전부 이번 커밋 diff에 등장하지 않음(2절 "변경 파일 확인" 참고) — `grep "service ==="`로 각 파일의 가드가 여전히 그대로 존재함을 재확인(`RoomScreen.tsx`의 `session.service === 'youtube'` 라우팅, `NowPlayingView.tsx`의 Free 배너 가드, `PlaylistView.tsx`/`AddTrackModal.tsx`의 서비스별 분기 등). |
| R5.16 | Spotify 세션 화면(재생 컨트롤, STUB 호출 패턴)이 이번 변경으로 영향받지 않았는가 | ✅ 통과(회귀 없음) | `NowPlayingView.tsx`는 여전히 `spotifyRemote.ts` STUB을 호출하지 않는 이전 상태 그대로(diff에 등장하지 않음) — YouTube 쪽만 실제 컨트롤러 연동으로 승격됐고 Spotify 쪽 동작 방식(로컬 상태만 갱신)은 변경되지 않아 두 서비스 간 동작 비대칭이 새로 생기지 않음(기존에도 있던 "Spotify는 원격 앱 제어, YouTube는 임베드 직접 제어"라는 구조적 차이가 그대로 유지될 뿐). |

### 5. 신규 발견 — WebView 재부착(ref attach) 경합 버그 (코드 정적 추적으로 확인, 실기기 불필요)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R5.17 | `currentEntryId`가 `null`(재생할 곡 없음) → 이후 다시 유효한 곡으로 바뀌는 경우, WebView가 정상적으로 재부착되어 명령을 받는가 | ❌ 실패 | **재현(코드 트레이스, 실기기 불필요):** ① YouTube 세션에서 플레이리스트의 모든 곡을 삭제 — `SessionContext.removeTrack`이 다음 곡도 없으므로 `playback.currentEntryId: null`로 전환(`SessionContext.tsx` 202행). `YouTubeNowPlayingView`는 `currentVideoId`가 `null`이 되어 `<WebView>` 대신 "재생할 영상이 없어요" `<Text>`를 렌더(126~140행) — 이 시점에 `webViewRef.current`는 `null`이다. ② "곡 추가" 모달로 새 곡을 추가 — `SessionContext.addTrack`(170~181행)은 플레이리스트에 append만 할 뿐 `playback.currentEntryId`를 갱신하지 않으므로 여전히 `null`. ③ Now Playing 탭을 벗어나지 않은 채 "다음 곡"(⏭) 버튼을 탭 — 이 버튼에는 `disabled` 가드가 전혀 없어(169~174행, `hasPrevTrack`과 달리 "다음 곡"은 항상 활성) 언제든 누를 수 있다. `requestNextTrack`(`SessionContext.tsx` 106~136행)은 `prev.playlist.findIndex(e => e.entryId === null)`이 `-1`을 반환하는 것을 이용해 `next = prev.playlist[-1 + 1] = prev.playlist[0]`으로 계산하므로, `currentEntryId`가 새로 추가된(또는 첫 번째) 곡으로 갱신되고 `isPlaying: true`가 된다. ④ 이제 `currentVideoId`가 truthy로 바뀌어 `<WebView>`가 **처음으로** JSX에 등장(마운트)한다. 하지만 WebView 부착 담당 effect(`YouTubeNowPlayingView.tsx` 71~74행)는 `useEffect(() => { youtubePlayerController._attachWebView(webViewRef.current); ... }, [])`로 **빈 의존성 배열**이라 컴포넌트 최초 마운트 시 단 한 번만 실행된다 — 그 시점(①)에는 WebView가 아직 렌더되지 않아 `webViewRef.current`가 `null`이었으므로, 컨트롤러는 `null`로 부착된 채 영구히 남는다. WebView가 나중에 실제로 마운트돼도(④) 이 effect는 재실행되지 않아 `youtubePlayerController`의 내부 `webViewRef`는 계속 `null`이다. ⑤ "곡 전환" effect(79~89행)는 `currentEntry`가 바뀐 것을 감지해 `loadVideoById`를 호출하지만, `WebViewYoutubePlayerController.run()`(`youtubePlayerStub.ts` 138~146행)이 `this.webViewRef`가 없으므로 명령을 `pendingCommands` 큐에 쌓기만 한다. 이후 WebView가 `ready` 메시지를 보내도 `flushPendingCommands()`(129~136행)는 `if (!this.webViewRef) { return; }`로 조기 종료해 큐를 영구히 비우지 못한다 — **결과적으로 새로 추가한 영상이 로드되지 않고, 화면은 계속 빈 검은 WebView(또는 최초 렌더 시 구운 빈 videoId(`''`) 상태)로 남는다.** 사용자가 Now Playing 탭을 벗어났다가(플레이리스트 탭 등) 다시 돌아오면 `YouTubeNowPlayingView`가 완전히 언마운트/재마운트되면서(`RoomScreen.tsx`가 탭에 따라 컴포넌트 자체를 조건부 렌더링, 55~64행) `_attachWebView(null)` cleanup → 새 마운트에서 재부착이 정상적으로 일어나 스스로 복구되지만, 그 전까지는 재생 명령이 전혀 반영되지 않는 상태로 조용히 멈춰 있다(에러 메시지·크래시 없이 무반응이라 사용자가 원인을 알기 어려움). |
| | 관련 파일 | | `apps/mobile/src/screens/room/YouTubeNowPlayingView.tsx`(71~74행 `useEffect(..., [])`), `apps/mobile/src/services/youtube/youtubePlayerStub.ts`(`run`/`flushPendingCommands`), `apps/mobile/src/state/SessionContext.tsx`(`requestNextTrack`의 `findIndex` 기반 `null → 0` 폴백, `addTrack`이 `currentEntryId`를 갱신하지 않는 부분). |
| | 권장 수정 방향(참고, 결정은 구현 에이전트 몫) | | (1) attach effect의 의존성을 `[Boolean(currentVideoId)]` 등으로 바꿔 WebView가 실제로 마운트/언마운트될 때마다 재부착되게 하거나, (2) `useRef` 대신 콜백 ref(`useCallback((node) => { youtubePlayerController._attachWebView(node); }, [])`)로 전환해 React가 ref를 갱신할 때마다 자동으로 `_attachWebView`가 호출되게 하는 편이 더 근본적인 해결책으로 보인다(콜백 ref는 매 마운트/언마운트마다 자동 호출되므로 별도 `useEffect` 동기화가 필요 없어짐). |

이 항목은 실기기 없이도 코드 정적 추적만으로 확정적으로 재현 가능한 로직 결함이라 "미검증"이 아니라 "실패"로 판정한다. 다만 도달 조건(현재 재생 곡을 포함해 플레이리스트를 전부 비운 뒤, 탭을 벗어나지 않고 새 곡을 추가하고 "다음 곡"을 누르는 특정 순서)이 일반적인 데모 플로우(항상 3곡이 시드된 상태로 시작)에서는 우연히 발생하지 않는 좁은 경로라는 점은 함께 기록해둔다 — 다만 "플레이리스트를 비웠다가 다시 채우는" 흐름 자체는 US-301/302(곡 추가/삭제)가 명시적으로 허용하는 정상 사용 패턴이라 엣지 케이스로 치부하고 넘기기는 어렵다고 판단했다.

### 6. 미검증 (환경 제약 / 실기기 필요 — 실패 아님)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R5.18 | iOS 실빌드/런타임 | ⛔ 미검증(환경 제약, 구조적, round 1~4와 동일) | 이번 커밋은 `ios/` 파일을 전혀 건드리지 않았다(`git diff --stat`에 ios 경로 없음). 신규 코드(`youtubePlayerHtml.ts`, `youtubePlayerStub.ts`, `YouTubeNowPlayingView.tsx`)를 검토한 결과 `Platform.OS` 분기나 iOS 전용 API 사용은 없음 — `react-native-webview`는 크로스플랫폼 패키지이고 사용된 prop(`allowsInlineMediaPlayback`, `mediaPlaybackRequiresUserAction`)도 iOS/Android 양쪽에서 지원되는 공식 prop이다(라이브러리 타입 정의상 플랫폼 제한 없음). 다만 이는 코드 리뷰 수준 확인이며, 실제 iOS 빌드(CocoaPods 설치 포함)·WKWebView 런타임 동작은 macOS/Xcode 부재로 이 환경에서 원천적으로 검증 불가능하다. |
| R5.19 | 광고 감지 휴리스틱(`getVideoData().video_id` 불일치 판정)의 실제 정확도 | ⛔ 미검증(실기기 필요, 지시사항상 이번 라운드 필수 아님) | 구현 에이전트가 스스로 명시한 미검증 항목과 동일 — 로직 자체(R5.7/R5.8)는 정책에 부합하게 구현돼 있으나, 실제 YouTube 광고 삽입 시 이 판정이 오탐/미탐 없이 동작하는지는 실기기에서만 확인 가능. |
| R5.20 | `mockSessionSeed.ts` 데모 시드가 실제 YouTube videoId가 아니라 실기기에서 `onError`로 이어질 가능성 | ⛔ 미검증(기존에 알려진 제약, 이번 라운드 범위 밖) | 코드로 재확인: `mockSessionSeed.ts`는 서비스와 무관하게 항상 `spotify:track:demoN` 형식이고(`extractYoutubeVideoId`가 접두사 불일치 시 원본 문자열을 그대로 videoId로 폴백), `youtubeMockSearch.ts`(AddTrackModal 경로)도 `youtube:video:mockN` 형식이라 실제 존재하는 YouTube 영상 ID가 아니다 — 둘 다 실기기에서는 `onError` 콜백으로 이어질 것으로 예상된다는 구현 로그의 자체 진단과 코드 상 일치함을 확인. YouTube Data API 실연동 전까지 근본 해결 불가(이번 라운드 명시적 범위 밖) — 실패로 카운트하지 않음. |
| R5.21 | WebView 자동재생(`autoplay`/`mediaPlaybackRequiresUserAction={false}`)이 실기기에서 사용자 제스처 없이 동작하는가 | ⛔ 미검증(실기기 필요) | HTML 템플릿에 `autoplay` playerVar와 WebView의 `mediaPlaybackRequiresUserAction={false}` prop이 모두 설정돼 있어 설정 자체는 정확하나(코드 레벨 확인 완료), Android/iOS 각 플랫폼의 실제 자동재생 정책(특히 iOS Safari/WKWebView는 무음소거 자동재생을 더 엄격히 제한하는 경향)은 실기기에서만 확인 가능. |

### Round 5 종합

| 구분 | 개수 |
|---|---|
| ✅ 통과 | 16 (R5.1~R5.16) |
| ❌ 실패 | 1 (R5.17 — WebView ref 재부착 경합 버그, 코드 정적 추적으로 확정 재현) |
| ⛔ 미검증(환경 제약/실기기 필요, 실패 아님) | 4 (R5.18 iOS 실빌드·런타임, R5.19 광고 감지 정확도, R5.20 데모 videoId 실존 여부, R5.21 자동재생 실기기 동작 — R5.19~R5.21은 구현 에이전트가 이미 스스로 명시한 항목과 동일, 이번 라운드 필수 검증 범위 아님) |

**결론: 이번 라운드(커밋 `7a888f2`)는 "완료"로 간주하지 않는다 — 구현 에이전트에게 R5.17(WebView ref 재부착 버그) 수정을 요청해 반려 권고한다.** 정책 준수(DOM 조작 없음, 표준 API만 사용, 컨트롤 비오버레이, 광고 중 seek 억제, 200px 최소 크기, 실재생 트리거) 항목은 코드 리뷰로 전부 통과 확인했고, 정적 검증 3종과 Android 클린 빌드도 캐시 없이 독립 재현에 성공했으며, 기존에 고쳐졌던 서비스 격리 가드(R3.17)나 Spotify 쪽 화면도 이번 커밋으로 인한 회귀가 없음을 확인했다 — 이 부분은 구현 로그의 주장을 신뢰할 수 있는 수준으로 뒷받침한다. 다만 새로 검토한 WebView 부착 로직(`_attachWebView`를 부르는 `useEffect(..., [])`)에서 "플레이리스트를 비웠다가 같은 탭에서 다시 채우고 다음 곡을 누르는" 정상적인 사용 흐름 하나가 재생 명령을 영구히 무반응 상태로 빠뜨리는 결함을 발견했다(R5.17, 실기기 없이 코드 트레이스만으로 확정 재현 가능). 도달 조건이 좁긴 하나 US-301/302가 허용하는 정상 플로우 조합이라 엣지 케이스로 넘기지 않고 실패로 판정했다. 나머지 미검증 항목(iOS 전체, 광고 감지 정확도, 데모 videoId 실존성, 자동재생 실기기 동작)은 이번 라운드 지시사항이 이미 "실기기 검증은 이번 라운드 필수 아님"으로 명시한 범위와 정확히 일치하므로 실패로 카운트하지 않았다.

---

## Round 6 재검증 (2026-07-26)

> 검증 대상: 작업 트리 변경분(미커밋, `docs/agents/implementation-log.md`의 "2026-07-26 (버그 수정: R5.17 WebView 재부착 경합)" 항목) — `apps/mobile/src/screens/room/YouTubeNowPlayingView.tsx` 1개 파일만 수정.
> 검증일: 2026-07-26
> 검증 담당: 검증(Verification) 서브에이전트
> 검증 방식: `git status`/`git diff`로 변경 범위를 독립적으로 직접 확인(리더의 1차 diff 판단에 기대지 않고 재확인) + `youtubePlayerStub.ts`(`_attachWebView`/`run`/`flushPendingCommands`)와 `RoomScreen.tsx`(탭 조건부 렌더링)까지 함께 열람해 시나리오별 코드 트레이스 + `apps/mobile`에서 tsc/eslint/jest 독립 재현 + Android `assembleDebug`(증분) 1회 + `clean` → `assembleDebug --no-daemon`(캐시 미사용 완전 재빌드) 1회, 총 2회 독립 재현 + 회귀 확인(diff 외 파일 무변경 재확인).
> 범위: 지시사항대로 R5.17 재현/해소 확인 + 정적 검증 + Android 빌드 + 회귀 확인에 집중. Round 1~5처럼 전체 체크리스트를 반복하지 않음.
> 환경: Windows 11 Pro (10.0.26200), Node v24.15.0, npm 11.12.1, JAVA_HOME=`D:\Android Studio\jbr`, ANDROID_HOME/ANDROID_SDK_ROOT=`E:\Android\Sdk`, GRADLE_USER_HOME=`E:\gradle-home`. macOS/Xcode 여전히 없음 — iOS 실빌드는 이번에도 구조적으로 불가능(이번 diff는 애초에 `ios/` 파일을 건드리지 않아 이번 라운드 지시 범위에도 포함되지 않음).

### 1. 변경 범위 독립 확인

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R6.1 | 실제로 수정된 파일이 `YouTubeNowPlayingView.tsx` 1개뿐인가 | ✅ 통과 | `git status --short apps/mobile`로 확인한 결과 코드 변경분은 `M apps/mobile/src/screens/room/YouTubeNowPlayingView.tsx` 한 줄뿐(그 외 `docs/agents/implementation-log.md` 문서 변경, 관련 없는 미추적 `google-services.json` 1개만 존재 — 코드 범위 밖). `git diff --stat HEAD -- apps/mobile/src apps/mobile/android apps/mobile/ios`도 동일 파일 1개, `1 file changed, 10 insertions(+), 1 deletion(-)`만 보고해 배경에 서술된 "이 한 파일만 수정" 주장과 정확히 일치한다. |
| R6.2 | diff 내용이 배경 설명(`isWebViewMounted` 신규 변수 + attach effect 의존성 `[]`→`[isWebViewMounted]`)과 정확히 일치하는가 | ✅ 통과 | `git diff`로 직접 확인: `const isWebViewMounted = Boolean(currentVideoId);` 신규 추가(주석 포함, 47~50행 부근), attach effect(`youtubePlayerController._attachWebView(webViewRef.current)` / cleanup `_attachWebView(null)`)의 마지막 줄이 `}, []);` → `}, [isWebViewMounted]);`로 정확히 변경됨. 그 외 로직(곡 전환 effect, `handleTogglePlay`, JSX 렌더링 등)은 diff에 전혀 등장하지 않아 순수하게 이 한 지점만 건드렸음을 확인. |

### 2. 시나리오별 코드 트레이스 (독립 재추적)

`youtubePlayerStub.ts`의 `_attachWebView`(ref 설정 + null일 때 `ready=false`/`pendingCommands=[]`/`setAdPlaying(false)` 리셋)와 `run`/`flushPendingCommands`(webViewRef && ready일 때만 즉시 실행, 아니면 큐잉)까지 함께 열람해 리더가 이미 검토한 5개 시나리오를 독립적으로 재추적했다.

| # | 시나리오 | 결과 | 상세 |
|---|---|---|---|
| R6.3 | (a) 최초 마운트(곡 있음) | ✅ 해소 확인 | `isWebViewMounted`가 `true`로 최초 계산되고 effect가 첫 실행(mount)된다. React 규칙상 passive effect는 커밋(DOM 반영) 이후 실행되므로, effect 본문이 도는 시점엔 이미 `<WebView>`가 렌더링돼 `webViewRef.current`가 실제 인스턴스를 가리킨다 — `_attachWebView(webViewRef.current)`가 non-null로 정상 attach된다. |
| R6.4 | (b) 같은 세션 안에서 곡 전환(WebView 인스턴스 유지) | ✅ 해소 확인 | 곡이 바뀌어도 `currentVideoId`는 계속 truthy이므로 `isWebViewMounted`는 `true → true`로 값이 불변 — attach effect는 재실행되지 않는다(React는 `Object.is` 비교로 의존성 값이 같으면 effect를 스킵한다). 곡 전환 자체는 별도의 "곡 전환 배선" effect(`[currentEntry, currentVideoId, session?.playback.isPlaying]` 의존)가 담당해 `loadVideoById`/`cueVideoById`만 호출한다 — WebView 재부착 없이 정확히 필요한 것만 실행됨을 확인. |
| R6.5 | (c) 플레이리스트가 비어 `currentVideoId`가 `null`이 됨 | ✅ 해소 확인 | `isWebViewMounted`가 `true → false`로 바뀌어 effect가 재실행된다 — 새 effect 본문 실행 전에 **이전 effect의 cleanup이 먼저 실행**되어(React 공식 규칙) `_attachWebView(null)`이 호출된다. 이 시점 `_attachWebView`의 null 분기가 `ready=false`/`pendingCommands=[]`/`setAdPlaying(false)`로 컨트롤러 내부 상태까지 함께 리셋하는 것도 확인 — 다음 재마운트 시 stale한 `ready`/큐가 남아있지 않도록 방어돼 있다. 이후 새 effect 본문(`_attachWebView(webViewRef.current)`)이 실행되는데, 이 시점엔 `<WebView>`가 이미 언마운트돼 `webViewRef.current`가 `null`이므로 사실상 no-op — 상태와 정합적이다. |
| R6.6 | (d) 다시 곡이 추가됨(핵심 수정 지점) | ✅ 해소 확인 | `isWebViewMounted`가 `false → true`로 바뀌어 effect가 다시 재실행된다 — **이 재실행이 R5.17에서 누락됐던 지점**(구버전은 `[]`라 여기서 재실행 자체가 안 됐음). 새 effect 실행 시점엔 커밋이 끝나 `<WebView>`가 이미 새로 마운트된 뒤이므로 `webViewRef.current`가 새 인스턴스를 가리켜 정상 attach된다. 곡 전환 배선 effect도 동시에 `loadVideoById`를 호출하는데, 이 시점엔 아직 `ready=false`(방금 리셋됨 + 새 WebView가 아직 IFrame 로드 전)이므로 `run()`이 명령을 `pendingCommands`에 큐잉하고, 이후 WebView가 `'ready'` 브릿지 메시지를 보내면 `flushPendingCommands()`가 그때는 `webViewRef`가 (attach effect가 먼저 선언된 순서상 이미 세팅된) 새 인스턴스를 가리키므로 큐를 정상 flush한다 — R5.17에서 지적됐던 "큐가 영구히 비지 않는" 증상이 재현되지 않는다. |
| R6.7 | (e) 컴포넌트 전체 언마운트 | ✅ 해소 확인 | `RoomScreen.tsx`(56~64행)를 직접 열람해 확인 — `tab === 'nowPlaying' ? (... <YouTubeNowPlayingView/> ...) : <PlaylistView/>` 삼항 조건부 렌더링이라 플레이리스트 탭으로 전환하면 `YouTubeNowPlayingView` 컴포넌트 자체가 트리에서 완전히 제거(unmount)된다. 이 경우 attach effect의 cleanup(`_attachWebView(null)`)과 광고 상태 리스너 effect의 cleanup(`onAdStateChanged`가 반환한 unsubscribe)이 모두 정상 실행되어 참조/리스너 누수가 없음을 확인. |

**시나리오 결론**: 리더가 사전에 정리한 5개 시나리오 전부를 독립적으로 재추적한 결과, React의 effect 커밋 후 실행 보장 및 cleanup-먼저-실행 규칙에 근거해 R5.17이 실제로 해소됨을 확인했다. 특히 (d) 시나리오(재마운트 시 재부착)가 이번 수정의 핵심이며, `youtubePlayerStub.ts`의 `_attachWebView(null)`이 `ready`/`pendingCommands`까지 함께 리셋하는 방어 로직과 맞물려 stale 큐가 남을 여지도 없다.

### 3. 정적 검증 (독립 재현)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R6.8 | `npx tsc --noEmit` (apps/mobile) | ✅ 통과 | 0 errors, 출력 없음. |
| R6.9 | `npx eslint .` (apps/mobile) | ✅ 통과 | 0 errors, 16 warnings — round 3~5와 정확히 동일한 개수/파일/종류(`YouTubeNowPlayingView.tsx` 168행의 `opacity: hasPrevTrack ? 1 : 0.4` 1건 포함, 신규 경고 없음). 구현 로그의 "0 errors, 16 warnings(round 5와 동일)" 주장과 일치. |
| R6.10 | `npx jest` (apps/mobile) | ✅ 통과 | `__tests__/App.test.tsx` 1/1 통과. |

세 항목 모두 구현 에이전트의 주장("0 errors/16 warnings/1 pass")과 독립적으로 재현되어 정확히 일치한다.

### 4. Android 빌드 재현 (독립, 2회)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R6.11 | `./gradlew.bat assembleDebug --no-daemon`(지시사항 그대로, 증분) | ✅ 통과 | `BUILD SUCCESSFUL in 10s`, 203 actionable tasks(23 executed, 180 up-to-date) — `:app:createBundleDebugJsAndAssets`/`:app:assembleDebug` 모두 UP-TO-DATE. 이는 캐시가 stale하다는 뜻이 아니라, 구현 에이전트가 이미 이 파일을 수정한 뒤 자신의 환경에서 빌드를 성공시켰고 그 산출물이 그대로 재사용 가능한 상태임을 gradle의 입력 해시 비교가 확인해준 것 — 작업 트리 상태와 빌드 산출물이 정합적임을 뒷받침한다. |
| R6.12 | `clean` → `assembleDebug --no-daemon`(캐시 미사용 완전 재빌드, 더 엄격한 독립 재현) | ✅ 통과 | `clean`: `BUILD SUCCESSFUL in 9s`. 이어서 `assembleDebug`: `BUILD SUCCESSFUL in 1m 52s`, 203 actionable tasks(173 executed, 30 up-to-date) — `:app:packageDebug`/`:app:assembleDebug` 등 실제 실행(UP-TO-DATE 아님) 확인. `app/build/outputs/apk/debug/app-debug.apk`(133,490,480 bytes) 생성 확인. 구현 에이전트가 보고한 "assembleDebug 증분 23s" 주장을 캐시에 의존하지 않는 방식으로 독립 재현해 더 강하게 뒷받침했다. |

**Android 결론**: 이번 변경은 순수 JS/TS 레이어(네이티브 프로젝트 파일 무변경, R6.1에서 확인)라 네이티브 빌드 자체에 영향을 줄 수 없다는 구현 로그의 판단과 일치하며, 증분/클린 두 방식 모두 독립적으로 `BUILD SUCCESSFUL`을 확인했다.

### 5. 회귀 확인 (Round 5 통과 항목 대상)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R6.13 | 정책 준수(DOM 비조작, 표준 API만 사용, 컨트롤 비오버레이, 광고 중 seek 억제, 200px 최소 크기) — R5.7~R5.13 | ✅ 회귀 없음 | 이번 diff는 `youtubePlayerHtml.ts`/`youtubePlayerStub.ts`를 전혀 건드리지 않았고(R6.1에서 변경 파일 1개만 확인), `YouTubeNowPlayingView.tsx`의 JSX 렌더링 구조(`playerContainer`/`controls`의 형제 배치, `position: absolute` 미사용)와 `handleTogglePlay`도 diff에 등장하지 않아 그대로 유지됨을 직접 재확인했다. |
| R6.14 | 서비스 격리(`ParticipantsBottomSheet`의 `session.service === 'spotify'` 가드, `NowPlayingView`/`PlaylistView`/`AddTrackModal`/`RoomScreen`의 서비스 분기) — R5.14~R5.16 | ✅ 회귀 없음 | `git status --short apps/mobile`에 위 파일들이 전혀 등장하지 않아(R6.1) 물리적으로 변경되지 않았음을 재확인. |
| R6.15 | Spotify 세션 화면(재생 컨트롤 STUB 패턴)이 이번 수정으로 영향받지 않는가 | ✅ 회귀 없음 | `NowPlayingView.tsx`도 diff에 등장하지 않음 — 완전히 별개 컴포넌트라 영향 경로 자체가 없다. |

### Round 6 종합

| 구분 | 개수 |
|---|---|
| ✅ 통과 | 15 (R6.1~R6.15) |
| ❌ 실패 | 0 |
| ⛔ 미검증(환경 제약, 실패 아님) | iOS 실빌드/런타임 — 이번 diff가 애초에 `ios/` 및 `Platform.OS` 분기를 건드리지 않아 이번 라운드 지시 범위 밖(round 1~5 결론 그대로 인용) |

**결론: R5.17(WebView ref 재부착 경합 버그)은 이번 수정으로 해소된 것으로 확인되며, 이번 라운드는 "통과"로 판정한다.** 변경 범위는 배경 설명 그대로 `YouTubeNowPlayingView.tsx` 1개 파일(`isWebViewMounted` 파생 변수 추가 + attach effect 의존성 배열 변경)에 정확히 국한됨을 `git diff`로 독립 확인했고, 리더가 제시한 5개 시나리오((a) 최초 마운트, (b) 같은 세션 곡 전환, (c) 플레이리스트 비워짐, (d) 재추가 시 재부착[핵심], (e) 전체 언마운트) 전부를 `youtubePlayerStub.ts`의 `_attachWebView`/`run`/`flushPendingCommands` 내부 구현까지 함께 열람해 독립적으로 재추적한 결과, React의 "effect는 커밋 이후 실행" + "cleanup은 다음 effect보다 먼저 실행" 규칙에 근거해 각 시나리오 모두 WebView 인스턴스와 컨트롤러의 attach 상태가 항상 정합적으로 유지됨을 확인했다. 정적 검증(tsc/eslint/jest) 3종은 구현 에이전트의 주장과 정확히 일치하게 독립 재현됐고, Android 빌드는 증분·클린 완전 재빌드 2가지 방식 모두 독립적으로 `BUILD SUCCESSFUL`을 확인했다(클린 재빌드로 캐시 의존 가능성도 배제). Round 5에서 이미 통과했던 정책 준수·서비스 격리 항목들도 diff 범위 밖임을 재확인해 회귀가 없음을 뒷받침했다. iOS 실기기 검증은 이번에도 구조적 제약(macOS/Xcode 부재)으로 수행하지 못했으나, 이번 diff 자체가 `ios/` 파일이나 `Platform.OS` 분기를 전혀 건드리지 않으므로 이번 라운드의 "통과" 판정 범위 밖이라는 점을 명시한다.

---

## Round 7 검증 (혼합 모드)

> 검증 대상 커밋: `dbd275c` ("Implement mixed (cross-platform) session mode") — Spotify 전용/YouTube 전용에 이은 세 번째 세션 유형(혼합) 실제 구현. 27개 파일, 신규 컴포넌트 6개(`MatchConfidenceBadge`/`MatchConfirmCard`/`MatchCandidateList`/`MatchFailCard`/`MatchingQueueSheet`/`PlatformSelect`) + 신규 유틸 4개(`trackMatcher.ts`/`mixedMatching.ts`/`mixedTrackView.ts`/`playlistSequencing.ts`) + 신규 테스트 3종.
> 검증일: 2026-07-26
> 검증 담당: 검증(Verification) 서브에이전트
> 검증 방식: `docs/agents/implementation-log.md`(2026-07-26 혼합 세션 항목 전체, 스코프 판단 8개), `docs/specs/09-cross-platform-mixed-mode.md`(결정 갱신 절, 특히 결정 2), `docs/specs/04-playlist.md`(혼합 모드 플레이리스트 구조), `docs/design/00-ux-flow.md`(2.6c/2.10d/2.11a~d), `docs/design/02-key-ui-patterns.md`(5절)를 정독 → `git show --stat`/`git diff dbd275c^ dbd275c`로 전체 변경분을 라인 단위로 직접 읽고 코드 트레이스(리더의 1차 확인을 신뢰하되 독립 재확인) → 두 정책 항목(매칭 pending 시작, R3.17류 개별 가드) 데이터 모델→서비스→컨텍스트→UI까지 end-to-end 추적 → 전체 플로우(세션 생성→매칭→확인→Now Playing) 코드 트레이스 → 데이터 모델·소비처 일관성 확인 → 기존 Spotify/YouTube 전용 세션 회귀 여부(diff 대조) → 단위 테스트 3종 내용 검토 → `apps/mobile`에서 tsc/eslint/jest 독립 재현 → Android `clean` → `assembleDebug --no-daemon` 완전 재빌드 독립 재현(캐시 배제) + APK 생성 확인.
> 환경: Windows 11 Pro (10.0.26200), Node v24.15.0, npm 11.12.1, JAVA_HOME=`D:\Android Studio\jbr`, ANDROID_HOME/ANDROID_SDK_ROOT=`E:\Android\Sdk`, GRADLE_USER_HOME=`E:\gradle-home`. macOS/Xcode 여전히 없음 — iOS는 지시사항대로 코드 리뷰 수준까지만 수행(구조적 제약, round 1~6과 동일).

### 1. 핵심 정책 2건 — 독립 재확인 (신뢰하되 검증)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R7.1 | "매칭 자동 실행 후 조용히 재생하는 방식은 채택하지 않는다"(09문서 결정 2) — `confirmState`가 항상 `pending`으로 시작하는가, 곡을 추가한 사람 본인도 예외 없는가 | ✅ 통과 | `sessionService.ts`의 `addMixedTrack`(155~202행)을 직접 읽음 — 추가한 사람(`addedBy`) 본인의 매칭도 `matches[participant.participantId] = {status: 'matched', track: adderMatch, confirmState: 'pending', ...}`(171~177행)로 예외 없이 `pending`으로 시작한다. 다른 참여자는 `status: 'searching', confirmState: 'pending'`(179~184행)으로 시작. `mixedMatching.ts`의 `resolveParticipantMatch`도 성공(`matched`)/실패(`failed`) 두 경로 모두 `confirmState: 'pending'`을 반환(24행, 32행) — 매칭 성공 여부와 무관하게 항상 pending. `SessionContext.tsx`의 `confirmMyMatch`/`manualMatchTrack`만이 `confirmState`를 `'confirmed'`/`'manual'`로 바꾸며, 둘 다 참여자의 명시적 액션(확정하기/직접 검색하기)에서만 호출된다 — 자동/타이머/백그라운드 경로로 `confirmState`가 바뀌는 코드는 존재하지 않음(전체 파일 `grep confirmState`로 재확인, 대입 지점이 정확히 이 두 함수뿐임을 확인). 유일한 예외는 `mockSessionSeed.buildDemoMixedPlaylist`(139~191행)의 데모 시드 데이터로, `confirmState: 'confirmed'`로 미리 채워져 있다 — 그러나 이는 앱 최초 진입 시 화면을 채우는 고정 픽스처(기존 Spotify/YouTube 세션의 데모 플레이리스트도 항상 이런 식이었음)이지 사용자의 실제 조작 결과가 아니며, 구현 로그가 이 예외를 명시적으로 문서화하고 있어 은폐된 것이 아니다. |
| R7.2 | pending 상태가 실제로 재생(Now Playing 표시)에 반영되지 않는지 — 데이터가 pending인데 UI가 이를 무시하고 재생 화면을 보여주는 정책 위반이 없는가 | ✅ 통과 | `state/mixedTrackView.ts`의 `resolveMixedCurrentTrackForMe`(25~57행)를 추적: `match.confirmState === 'pending'`이면 무조건 `{kind: 'awaitingConfirm', ...}`을 반환하고(43~45행), 이는 `kind: 'ready'`가 아니다. `NowPlayingView.tsx`(`MixedNowPlayingBody`, 242행 `view.kind === 'ready' ? (...실제 재생 UI...) : <MixedMatchStatusCard .../>`)와 `YouTubeNowPlayingView.tsx`(181행 `mixedView.kind !== 'ready' ? (...상태 카드...) : (...WebView...)`) 둘 다 `kind !== 'ready'`일 때 앨범아트/WebView 재생 영역 대신 "이 곡의 매칭을 아직 확인하지 않았어요 [확인하러 가기]" 상태 카드를 렌더한다 — 진행바(progress)도 `view.kind === 'ready'`일 때만 렌더돼(NowPlayingView.tsx 262행) pending 상태에서는 진행률 표시조차 나타나지 않는다. `__tests__/mixedTrackView.test.ts`의 "returns awaitingConfirm when matched but not yet confirmed" 케이스로 이 분기가 단위 테스트로도 커버됨을 확인. 데이터 상태(pending)와 UI 상태(비-ready) 사이에 우회 경로가 없음을 확인했다. |

### 2. R3.17류 재발 방지 — Free 계정 가드 개별화 (독립 재확인)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R7.3 | `ParticipantsBottomSheet.tsx`의 `isPlayable`/`shouldShowFreeTag`가 세션 전체 가드가 아니라 참여자 개별 판단인가 | ✅ 통과 | 46~64행 직접 확인 — `isPlayable`은 `session.service === 'mixed'`일 때 `!(participant.platform === 'spotify' && participant.accountTier === 'free')`로 참여자 개인 기준, `shouldShowFreeTag`도 동일 패턴(60~62행). 비-혼합 세션 분기(spotify/youtube)는 기존 로직과 동치임을 별도 확인(아래 R7.16). |
| R7.4 | `NowPlayingView.tsx`(혼합 분기)의 Free 배너가 `myPlatform === 'spotify'` 개별 판단인가 | ✅ 통과 | `MixedNowPlayingBody`의 `showFreeBanner = viewerIsFree && myPlatform === 'spotify'`(205~206행) — "나"의 매칭 플랫폼 기준, `session.service === 'spotify'` 같은 세션 전체 가드를 쓰지 않음. `playableCount`도 `!(p.platform === 'spotify' && p.accountTier === 'free')`(208~209행)로 참여자별 판단. |
| R7.5 | `YouTubeNowPlayingView.tsx`(혼합 분기)도 동일 패턴인가 | ✅ 통과 | `playableCount = isMixed ? session.participants.filter(p => !(p.platform === 'spotify' && p.accountTier === 'free')).length : ...`(139~141행) — `NowPlayingView.tsx`/`ParticipantsBottomSheet.tsx`와 정확히 동일한 조건식. 세 파일 모두 `p.platform === 'spotify' && p.accountTier === 'free'`라는 동일한 개별 판단 리터럴을 쓰고 있어(문자 그대로 일치) 세 곳이 서로 다른 기준으로 미묘하게 어긋날 위험도 낮다고 판단. |

### 3. 전체 플로우 코드 트레이스

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R7.6 | (a) 혼합 세션 생성 → 호스트 플랫폼 선택(2.6c) → 세션 진입 | ✅ 통과 | `CreateSessionScreen.tsx`: `service==='mixed'`일 때 "세션 만들기" 버튼(`handlePrimaryButtonPress`, 67~74행)이 `finalizeCreate()`를 바로 호출하지 않고 `setStep('platform')`으로 전환 → `PlatformSelect`(2.6c 목업과 동일한 라디오 2개 + 안내 배너) → "확인하고 입장" 눌러야 비로소 `finalizeCreate(hostPlatform)` 호출 → `createSession({..., hostPlatform})` → `RoomScreen`으로 `navigation.replace`. 00-ux-flow.md 2.6 "혼합 선택: 호스트 자신도 참여자이므로 2.6c를 거친 뒤..." 서술과 정확히 일치. |
| R7.7 | (b) 곡 추가 → 매칭 큐 배지 → `MatchingQueueSheet` → 확정/후보선택/직접검색/스킵 네 갈래 | ⚠ 부분 실패(버그 발견, 아래 4절 참고) | 네 갈래 액션 자체(각 컴포넌트→SessionContext 함수 호출)는 배선이 정확함을 확인했으나, `MatchingQueueSheet`의 큐 "다음 항목으로 이동" 로직(`goToNextInQueue`)에 인덱싱 결함이 있어 여러 건이 쌓였을 때 일부 항목을 건너뛰거나 시트가 조기 종료되는 버그를 코드 트레이스로 확정 재현했다 — 상세는 4절(R7.13) 참고. 정책 위반(자동 확정)은 아니지만 "여러 개면 다음/이전으로 넘기는 큐 형태"(00-ux-flow.md 2.11a)라는 명시적 요구 동작이 깨져 있어 부분 실패로 판정. |
| R7.8 | (c) Now Playing에서 내 매칭이 pending/failed일 때 상태 카드 + "확인하러 가기"로 큐가 열리는가 | ✅ 통과 | `NowPlayingView.tsx`의 `MixedMatchStatusCard`(324~362행): `view.kind`가 `searching`/`awaitingConfirm`/`failed`/`none`에 따라 메시지 분기, `searching`/`none` 제외하고 "확인하러 가기 →"(awaitingConfirm) 또는 "직접 검색하기 →"(failed) 버튼이 `onOpenMatching`(→ `setMatchingVisible(true)` → `<MatchingQueueSheet visible .../>`)을 호출. `YouTubeNowPlayingView.tsx`(181~204행)도 동일 패턴. 다만 이 화면에서 열리는 큐도 R7.7/R7.13의 스킵 버그 영향을 받는다(별개 진입점일 뿐 같은 컴포넌트). |
| R7.9 | (d) 참여자 아바타 서비스 아이콘 오버레이 + 동기화 배지 "나: Spotify/YouTube" 표시 | ✅ 통과 | `Avatar.tsx`에 `platform` prop 추가 시 아바타 우하단에 🟢/🎧 오버레이(43~49행), `NowPlayingView.tsx`/`YouTubeNowPlayingView.tsx`가 혼합 세션에서 `platform={p.platform}`을 넘김. `suffix` 문자열에 `· 나: ${myPlatform === 'youtube' ? 'YouTube' : 'Spotify'}`가 `SyncStatusBadge`의 `suffix`로 전달됨(NowPlayingView.tsx 214행, YouTubeNowPlayingView.tsx 146행) — 00-ux-flow.md 2.10d 목업("🟢 동기화됨 ▶ 나: YouTube")과 동일한 문구 패턴. |

### 4. 신규 발견 — 매칭 확인 큐 인덱싱 버그 (코드 정적 추적으로 확정 재현, 실기기 불필요)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R7.13 | `MatchingQueueSheet.tsx`의 `goToNextInQueue`가 한 건을 처리(확정/직접검색/스킵)한 뒤 다음 대기 항목을 올바르게 보여주는가 | ❌ 실패 | **원인(코드 트레이스)**: `goToNextInQueue`(62~65행)는 `setCursor(prev => prev < myPendingMatchEntryIds.length - 1 ? prev + 1 : prev)`로 커서를 "처리 전" `myPendingMatchEntryIds`(길이 N, 이 배열엔 지금 막 처리하려는 항목이 아직 포함돼 있음 — React 클로저가 이번 렌더 시점 값을 캡처)를 기준으로 +1한다. 그런데 `onConfirm`(126~137행)/`handleManualSelect`(67~71행)/`onSkip`(112~115행) 콜백은 모두 "①`confirmMyMatch`/`manualMatchTrack`/`skipMyMatch` 호출 → ②`goToNextInQueue()` 호출"을 **같은 이벤트 핸들러 안에서 동기적으로 실행**한다 — React는 이벤트 핸들러 안의 `setState` 호출들을 한 번에 배칭하므로, `setCursor`가 계산에 쓰는 `myPendingMatchEntryIds.length`는 아직 "방금 처리한 항목이 빠지지 않은" 이전 렌더의 값이다. 처리 직후 다음 렌더에서 `myPendingMatchEntryIds`(`SessionContext.tsx` 530~543행 `useMemo`)는 방금 처리한 항목이 실제로 제거된 **더 짧은 배열**로 재계산되는데, 커서는 이미 "처리 전 길이" 기준으로 +1 된 상태라 **한 칸 더 앞서가 버린다** — 결과적으로 큐의 다음 항목이 통째로 건너뛰어진다.
| | 구체적 최소 재현(기본 정원 2명 데모로도 도달 가능) | | 혼합 세션에서 곡을 2개 연달아 추가(둘 다 확정하기 전) → 내 `myPendingMatchEntryIds = [entryA, entryB]`(길이 2) → 매칭 큐를 열면 커서 0, entryA 카드 표시 → "확정하기" 탭 → `confirmMyMatch('A')` + `goToNextInQueue()`가 같은 핸들러에서 실행 → `goToNextInQueue` 계산 시점의 `myPendingMatchEntryIds.length`는 아직 2(A 포함) → `0 < 2-1(=1)` 참 → `setCursor(1)`. 두 state 갱신이 배칭되어 함께 커밋된 뒤 재렌더 → `myPendingMatchEntryIds`가 재계산되어 A가 빠진 `[entryB]`(길이 1)만 남음 → `entryId = myPendingMatchEntryIds[1]` = `undefined`(배열 길이가 1이라 인덱스 1은 범위 밖) → `if (!entry || !myMatch) { onClose(); return null; }`(87~90행) 분기로 떨어져 **시트가 즉시 닫혀버린다** — entryB는 실제로는 여전히 미확인(pending) 상태로 남아 있지만(정책 위반은 아님 — `confirmState`는 그대로 pending), 사용자는 같은 시트 세션에서 entryB를 볼 기회조차 갖지 못한 채 닫힌다. `MatchingQueueSheet`가 `visible` prop이 바뀔 때만 커서를 0으로 리셋하므로(43~48행 `useEffect`), 사용자가 시트를 다시 열어야만 entryB가 보인다. |
| | 3건 이상일 때의 증상(스킵) | | 대기 항목이 3개(A,B,C) 이상이면 매번 "한 칸 더 앞서가는" 패턴이 반복돼, A를 처리하면 B를 건너뛰고 C가 표시되며, C를 처리하면 (남은 게 B 하나뿐인데) 인덱스가 범위를 벗어나 시트가 조기 종료된다 — 정확한 인덱스 산출은 위 로직을 N=3으로 대입해 재계산 가능(문서 분량상 N=2 케이스로 대표 기술). |
| | 영향받는 세 액션 | | "확정하기"(`onConfirm`, MatchConfirmCard), "직접 검색하기"로 트랙을 고른 뒤(`handleManualSelect`), "이 곡 없이 넘어가기"(`onSkip`, MatchFailCard) — 셋 다 `goToNextInQueue()`를 호출하는 동일 패턴이라 전부 같은 결함을 공유한다. 반면 "다른 결과 보기"에서 후보를 선택하는 `selectMyMatchCandidate` 경로(120~123행)는 `goToNextInQueue()`를 호출하지 않고 카드로 되돌아가도록 설계돼 있어(00-ux-flow.md 2.11c "선택 즉시 확정하지 않고 다시 확인시킨다") 이 버그의 영향을 받지 않는다 — 설계 의도와 일치하는 유일한 예외임을 확인. |
| | 정책 위반 여부 | | **정책(09문서 결정 2, "절대 조용히 확정되지 않는다") 자체는 위반되지 않는다** — 건너뛰어진 항목의 `confirmState`는 여전히 `pending`으로 남고(데이터 상태를 임의로 바꾸는 코드가 없음, 위 R7.1 참고), 재생에도 반영되지 않는다(R7.2). 다만 "여러 건을 한 큐에서 순서대로 확인한다"는 00-ux-flow.md 2.11a의 명시적 요구 동작("여러 개면 다음/이전으로 넘기는 큐 형태")이 깨져 있고, 특히 정확히 2건이 쌓인 흔한 경우(기본 정원 2명 데모에서 곡 2개를 연달아 추가하는 자연스러운 시나리오) 시트가 사용자에게 아무 설명 없이 조기 종료되는 것은 눈에 띄는 UX 결함이다. |
| | 권장 수정 방향(참고, 결정은 구현 에이전트 몫) | | `goToNextInQueue`가 커서를 증가시키지 않고 그대로 유지하도록 바꾸는 편이 더 근본적으로 맞다 — 처리된 항목이 배열에서 빠지면 다음 항목이 자연스럽게 같은 인덱스로 밀려 들어오기 때문에(`useEffect`가 이미 `myPendingMatchEntryIds.length` 변화에 반응해 커서를 클램프하는 로직도 존재, 50~52행), 별도로 +1할 필요가 없다. 또는 "처리한 entryId"를 커서가 아니라 값 자체로 추적(예: 다음에 표시할 entryId를 미리 계산해 `myPendingMatchEntryIds`에서 현재 entryId를 제외한 배열의 첫 항목으로 정하는 방식)하는 편이 인덱스 연산 자체를 없애 더 견고하다. |

이 항목은 실기기 없이도 React state batching 규칙(이벤트 핸들러 내 동기 `setState` 호출은 한 번에 배칭된다)에 근거해 코드 정적 추적만으로 확정적으로 재현 가능한 로직 결함이라 "미검증"이 아니라 "실패"로 판정한다(Round 5의 R5.17과 동일한 검증 방법론).

### 5. 데이터 모델 일관성

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R7.10 | `types/domain.ts`의 `MixedPlaylistEntry`/`ParticipantMatch` 등 신규 타입이 소비처와 정확히 맞물리는가 | ✅ 통과 | `MixedPlaylistEntry.matches: Record<string, ParticipantMatch>`가 `sessionService.setParticipantMatch`/`addMixedTrack`, `SessionContext.tsx`의 매칭 관련 함수들, `mixedTrackView.ts`, `MatchingQueueSheet.tsx`/`ParticipantsBottomSheet.tsx`(pendingMatchCount 계산) 전부에서 동일한 키(`participantId`) 규약으로 일관되게 소비됨을 확인. `MatchedTrackCandidate`도 `trackMatcher.ts`(`rankCandidates` 반환 타입) → `mixedMatching.ts` → `sessionService.addMixedTrack`(adderMatch 인자) → UI 컴포넌트(`MatchConfirmCard`/`MatchCandidateList`) 전체 경로에서 필드 이름이 어긋나지 않음(`service`/`serviceTrackId`/`title`/`artist`/`albumArtUrl`/`durationMs`/`matchScore`/`confidenceLevel` 8개 필드 전부 대조 완료). |
| R7.11 | `playlist`/`mixedPlaylist` 분기가 `requestNextTrack`/`requestPrevTrack`/`removeTrack`/`requestMoveTrack`(`state/playlistSequencing.ts`) 전부에서 세션 타입별로 올바르게 라우팅되는가 | ✅ 통과 | `SessionContext.tsx`의 네 함수 모두 `if (prev.service === 'mixed') { ...prev.mixedPlaylist 사용... } ... prev.playlist 사용...` 구조로 명시적으로 분기(148~332행 전체 직접 확인). `playlistSequencing.ts`의 `advanceToNext`/`advanceToPrev`/`nextAfterRemoval`/`reorderWithinQueue`는 제네릭(`T extends SequencedEntry`)이라 `PlaylistEntry`/`MixedPlaylistEntry` 양쪽에 그대로 재사용 가능 — 타입 안전성도 확인(`entryId`/`playedStatus` 필드만 요구). 두 배열이 뒤섞이거나 혼합 세션에서 `session.playlist`(항상 빈 배열)를 잘못 참조하는 경로는 발견되지 않았다. |

### 6. 기존 세션 유형(Spotify 전용/YouTube 전용) 회귀 확인 — diff 대조

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R7.14 | `NowPlayingView.tsx`/`YouTubeNowPlayingView.tsx`/`PlaylistView.tsx`의 비-혼합(Spotify/YouTube 전용) 코드 경로가 이번 변경으로 손상되지 않았는가 | ✅ 통과(회귀 없음) | `git diff dbd275c^ dbd275c`로 세 파일 전부 직접 대조 — `NowPlayingView.tsx`는 함수 최상단에 `if (isMixed) { return <MixedNowPlayingBody .../>; }` 얼리 리턴 한 블록만 추가되고, 그 아래 기존 Spotify 전용 본문(currentEntry/progressRatio/컨트롤/avatarStack 등)은 원문과 100% 동일(diff에서 `-` 없이 `+`만 추가된 새 함수로 확인). `YouTubeNowPlayingView.tsx`도 `isMixed ? ... : ...` 삼항으로 기존 `currentEntry`/`session.playlist` 참조 경로가 그대로 보존됨을 확인. `PlaylistView.tsx`도 `if (isMixed) { return (...) }` 분기 이후 기존 Spotify/YouTube 전용 렌더 블록(서비스 칩 포함)이 그대로 남아 있음. |
| R7.15 | `AddTrackModal.tsx`/`Avatar.tsx` 변경이 기존 호출부와 하위호환되는가 | ✅ 통과(회귀 없음) | `AddTrackModal`은 `headerTitle?: string` 옵셔널 prop 1개만 추가(기존 타이틀 로직은 `headerTitle ?? (기존 삼항)`으로 폴백) — 기존 Spotify/YouTube 전용 호출부(`PlaylistView.tsx`의 비-혼합 분기)는 `headerTitle`을 넘기지 않아 동작 변화 없음. `Avatar`도 `platform?: MixedParticipantPlatform` 옵셔널 prop 1개만 추가, 기존 비-혼합 호출부는 `platform`을 넘기지 않아(`NowPlayingView.tsx` 비-혼합 분기, 154행 `<Avatar initial=... crown=... />`에 platform 없음) 서비스 배지 오버레이가 렌더되지 않음 — 시각적 변화 없음. |
| R7.16 | `ParticipantsBottomSheet.tsx`의 리팩터링(`showFreeTierUi` boolean → `isPlayable`/`shouldShowFreeTag` 함수)이 기존 Spotify/YouTube 세션에서 동일하게 동작하는가 | ✅ 통과(회귀 없음, 동치 확인) | 기존 로직: `showFreeTierUi = session.service === 'spotify'`, `playableCount = participants.filter(accountTier==='premium').length`, 헤더는 `!showFreeTierUi \|\| playableCount===participants.length`일 때만 단순 표기. 새 로직: `isPlayable`이 spotify 세션에서 `accountTier==='premium'`과 동치, youtube 세션에서 항상 `true`(→ `playableCount===participants.length`가 항상 참 → 헤더가 항상 단순 표기, 옛 로직의 `!showFreeTierUi`가 youtube에서 항상 참이었던 것과 동일한 결과). `shouldShowFreeTag`도 spotify에서 `accountTier==='free'`(동치), youtube에서 항상 `false`(동치). 두 조건식을 대수적으로 대조해 세 서비스 유형(spotify/youtube/mixed) 전부에서 옛 동작과 새 동작이 spotify/youtube 케이스에 한해 정확히 일치함을 확인했다 — R3.17에서 고쳤던 가드가 이번 리팩터링으로 다시 깨지지 않았음을 뒷받침. |
| R7.17 | `RoomScreen.tsx`의 Now Playing 라우팅(`session.service === 'youtube'` → `nowPlayingPlatform === 'youtube'`)이 비-혼합 세션에서 동치인가 | ✅ 통과(회귀 없음, 동치 확인) | `nowPlayingPlatform = session.service === 'mixed' ? myPlatform ?? 'spotify' : session.service` — 비-혼합 세션에서는 `nowPlayingPlatform === session.service`이므로 옛 조건식과 완전히 동일한 결과. |
| R7.18 | `CreateSessionScreen.tsx`의 혼합 라디오 활성화가 기존 Spotify/YouTube 라디오 선택 로직을 건드리지 않았는가 | ✅ 통과(회귀 없음) | 기존 두 `RadioRow`(Spotify/YouTube)는 `disabled={false}`로 이전 라운드부터 이미 동일했고 이번 diff에서 변경 없음(혼합 `RadioRow` 한 줄만 `disabled` 값이 `true`→`false`로 바뀜). `INFO_BY_SERVICE` 맵도 spotify/youtube 문구는 그대로, mixed 문구만 신규 추가. |

### 7. 단위 테스트 내용 검토

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R7.19 | `trackMatcher.test.ts` — 실제로 의미 있는 케이스를 검증하는가 | ✅ 통과(내용 충실) | 5개 테스트: 완전 일치(≥95점, high), 에디션 표기(`(Live)`/`- Topic`) 허용 + 7초 길이 오차 허용(≥70점), 완전 무관 곡 저점수(low), **동명이곡 오매칭 방지**(같은 제목·다른 아티스트가 같은 제목·같은 아티스트보다 낮은 점수인지 직접 비교) — 지시사항이 특히 요구한 "동명이곡 오매칭 방지" 케이스가 형식적 통과가 아니라 실제 점수 비교(assert)로 검증됨을 확인. `rankCandidates`가 내림차순 정렬 + 플랫폼 태그를 정확히 붙이는지도 검증. 부실하지 않음. |
| R7.20 | `playlistSequencing.test.ts` | ✅ 통과(내용 충실) | `advanceToNext`(다음 곡 전환 + playedStatus 갱신), 끝에서 `null` 반환, `advanceToPrev`(대칭 동작), `nextAfterRemoval`(삭제된 곡 뒤 항목 반환 + 끝이면 undefined), `reorderWithinQueue`(현재 재생 중인 곡 경계를 넘어가는 이동은 원본 배열을 그대로 반환해 차단되는지까지 명시적으로 검증 — `blocked = ...; expect(blocked).toBe(list)`로 참조 동일성까지 확인) 5개 모두 실질적인 동작 검증. |
| R7.21 | `mixedTrackView.test.ts` | ✅ 통과(내용 충실) | `resolveMixedCurrentTrackForMe`의 5개 분기(none/searching/awaitingConfirm/ready/failed)를 모두 개별 케이스로 커버 — 특히 "matched이지만 confirmState가 pending이면 awaitingConfirm이지 ready가 아니다"(R7.1/R7.2가 검증한 정책 핵심)를 단위 테스트 수준에서도 직접 assert하고 있어, 이번 라운드의 가장 중요한 정책 요구사항이 회귀 테스트로 고정됨을 확인. |

### 8. 정적 검증 및 빌드 (독립 재현)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R7.22 | `npx tsc --noEmit` (apps/mobile) | ✅ 통과 | 0 errors, 출력 없음. |
| R7.23 | `npx eslint .` (apps/mobile) | ✅ 통과 | 0 errors, 22 warnings — 전부 `react-native/no-inline-styles`(기존 16개 + 이번 라운드 신규 6개: `AddTrackModal.tsx`/`Avatar.tsx`/`MatchConfidenceBadge.tsx`/`MatchConfirmCard.tsx`/`MatchFailCard.tsx`/`RoomScreen.tsx` 등에서 발생, 전부 기존과 동일한 관용적 조건부 스타일/고정 상수 스타일 패턴이며 신규 유형 경고 없음). 구현 로그의 "0 errors, 22 warnings" 주장과 정확히 일치. |
| R7.24 | `npx jest` (apps/mobile) | ✅ 통과 | 4 suites / 16 tests 전부 통과(`App.test.tsx`, `trackMatcher.test.ts`, `playlistSequencing.test.ts`, `mixedTrackView.test.ts`) — 구현 로그 주장과 정확히 일치. |
| R7.25 | `package.json`/`package-lock.json` 변경 없음(신규 네이티브 의존성 없음) | ✅ 통과 | `git diff 7a888f2 dbd275c -- apps/mobile/package.json apps/mobile/package-lock.json` 결과 빈 출력 — 변경 없음 확인. |
| R7.26 | Android `clean` → `assembleDebug --no-daemon`(캐시 미사용 완전 재빌드) | ✅ 통과 | `clean`: `BUILD SUCCESSFUL in 9s`. 이어서 `assembleDebug --no-daemon`: **`BUILD SUCCESSFUL in 1m 51s`**, 203 actionable tasks(173 executed, 30 up-to-date) — `app-debug.apk`(133,517,424 bytes) 생성 확인. 새 네이티브 의존성이 없다는 R7.25와 일치하게 순수 JS/TS 변경만으로 빌드가 정상 성공함을 캐시 배제 방식으로 재확인. |
| R7.27 | iOS 코드 리뷰 수준 확인(구조적 제약, macOS 부재) | ✅ 통과(리뷰 수준) | `git diff dbd275c^ dbd275c --stat -- apps/mobile/ios apps/mobile/android` 결과 두 네이티브 디렉터리 모두 빈 출력 — 이번 라운드는 네이티브 프로젝트 파일을 전혀 건드리지 않았다. 신규 컴포넌트/유틸 전체(`grep -rn "Platform.OS"`)에서 iOS/Android 분기 코드도 발견되지 않아 크로스플랫폼 순수 RN 코드로만 구성됨을 확인 — iOS 쪽 구조적 리스크는 낮다고 판단하나 실제 iOS 빌드/런타임 검증은 이번에도 수행하지 못했다(round 1~6과 동일한 환경 제약). |

### 9. 알려진 제약 (실패로 잡지 않음, 지시사항에 이미 문서화됨)

| # | 항목 |
|---|---|
| R7.28 | Spotify App Remote SDK 미연동 STUB — 혼합 세션에서도 Spotify 쪽 실제 재생은 안 됨(기존 라운드부터 있던 제약). |
| R7.29 | YouTube mock 검색 결과의 videoId가 실존하지 않아 실기기에서는 `onError`로 이어질 것으로 예상(기존 YouTube 라운드 로그에 이미 기록됨). |
| R7.30 | 매칭 신뢰도 가중치/임계값(`trackMatcher.ts`의 `MATCH_WEIGHTS`/`MATCH_CONFIDENCE_THRESHOLDS`)은 실측 전 잠정값 — TODO 주석으로 명시돼 있고, 값 자체의 정확도는 이번 검증 대상이 아니다. |
| R7.31 | "코드로 참여하기"가 여전히 Alert 스텁 — 참여자 쪽 플랫폼 선택(2.6c) 플로우는 연결되지 않음(호스트만 실제 연결됨), 기존부터 있던 제약. |
| R7.32(참고, 실패 아님) | `MatchConfirmCard`의 "확정하기" 버튼이 일치율 등급(낮음/중간)과 무관하게 항상 1차 강조(primary) 스타일로 고정 — `02-key-ui-patterns.md` 5.3절은 낮음 등급일 때 "확정하기"를 outline(2차)으로 낮추고 "다른 결과 보기"/"직접 검색하기"를 강조할 것을 제안하지만, 이 문서 자체가 "제안"이라고 명시했고(09문서 결정 2는 "확인 필요 문구 강조"만 요구, 확정 자체를 차단하라고는 하지 않음) `MatchConfidenceBadge`가 "낮음 · 확인 필요" 라벨로 이미 시각적 경고를 하고 있어 정책 위반은 아니다 — 다음 라운드에서 다듬을 여지가 있는 개선 후보로만 기록한다. |

### Round 7 종합

| 구분 | 개수 |
|---|---|
| ✅ 통과 | 25 (R7.1~R7.6, R7.8~R7.12, R7.14~R7.27 중 실패 제외 전부 — 상세는 위 표) |
| ⚠ 부분 실패(정책 위반 아님, 명시적 요구 동작 결함) | 1 (R7.7, R7.13에서 근거 상세) |
| ❌ 실패 | 1 (R7.13 — `MatchingQueueSheet`의 큐 인덱싱 버그, 코드 정적 추적으로 확정 재현) |
| 참고(실패 아님) | R7.32 — 일치율 등급별 버튼 강조 미구현, 스펙상 "제안" 수준이라 정책 위반 아님 |
| ⛔ 미검증(환경 제약, 실패 아님) | iOS 실빌드/런타임 — 이번 라운드도 네이티브 파일 무변경, 코드 리뷰 수준까지만 수행(round 1~6과 동일한 구조적 제약) |

**결론: 이번 라운드(커밋 `dbd275c`)는 "완료"로 간주하지 않는다 — 구현 에이전트에게 R7.13(`MatchingQueueSheet` 큐 인덱싱 버그) 수정을 요청해 반려 권고한다.**

이번 검증에서 가장 중요하게 다룬 두 정책 항목 — (1) "매칭이 참여자별로 절대 조용히 확정되지 않는다"(09문서 결정 2)와 (2) "R3.17류 세션 전체 가드가 혼합 세션에 새어 들어가지 않는다" — 은 데이터 모델(`confirmState` 대입 지점 전수 조사)부터 UI 렌더 분기(`kind !== 'ready'`일 때 재생 영역 대신 상태 카드)까지 독립적으로 추적한 결과 모두 실제로 지켜지고 있음을 확인했다(R7.1/R7.2, R7.3~R7.5). 데이터 모델 일관성(R7.10/R7.11), 기존 Spotify/YouTube 전용 세션 회귀 없음(R7.14~R7.18, diff 대조 및 조건식 동치 증명으로 확인), 단위 테스트 3종의 실질적 내용(R7.19~R7.21), 정적 검증·Android 클린 빌드(R7.22~R7.27) 모두 구현 로그의 주장과 정확히 일치하게 독립 재현됐다 — 이 부분들은 구현 로그를 신뢰할 수 있는 수준으로 뒷받침한다.

다만 전체 플로우를 끝까지 코드로 따라가는 과정에서(작업 지시 2번 "b" 항목), `MatchingQueueSheet.tsx`의 큐 진행 로직에서 React state batching을 고려하지 않은 인덱스 연산 결함을 발견했다(R7.13) — "확정하기"/"직접 검색하기"/"이 곡 없이 넘어가기" 세 액션 모두 다음 대기 항목으로 넘어갈 때 커서를 한 칸 더 앞서가게 계산해, 대기 항목이 정확히 2건(기본 정원 2명 데모에서 곡을 2개 연달아 추가하는 흔한 시나리오로도 도달 가능)이면 첫 항목 처리 직후 두 번째 항목을 보여주지 못한 채 시트가 조기 종료되고, 3건 이상이면 항목이 통째로 건너뛰어진다. 정책(자동 조용한 확정 금지)은 위반하지 않지만 — 건너뛰어진 항목은 데이터상 여전히 `pending`으로 남아 재확인 가능하다 — 00-ux-flow.md 2.11a가 명시한 "여러 개면 다음/이전으로 넘기는 큐 형태"라는 핵심 기능 동작이 깨져 있어 실패로 판정했다. 나머지 항목(iOS 전체, Spotify/YouTube 재생 스텁, YouTube mock videoId, 매칭 가중치 실측 전 잠정값, 코드 참여 미연결)은 지시사항이 이미 "실패로 잡지 말 것"으로 명시한 기존 제약과 정확히 일치하므로 실패로 카운트하지 않았다.

## Round 8 재검증 (2026-07-26)

> 검증 대상 커밋: `095e3cf` ("Fix R7.13 matching queue premature-close/skip bug") — Round 7의 유일한 실패 항목(R7.13, `MatchingQueueSheet.tsx`의 큐 인덱싱 버그)에 대한 수정. 범위가 좁아(Round 5→6 재검증과 동일한 성격) 전체 체크리스트를 반복하지 않고 R7.13 재현/해소 확인 + 정적 검증 + Android 빌드 + 회귀 확인에 집중한다.
> 검증일: 2026-07-26
> 검증 담당: 검증(Verification) 서브에이전트
> 검증 방식: `git show 095e3cf`로 diff를 라인 단위 직접 확인 → `MatchingQueueSheet.tsx`/`matchQueueNavigation.ts` 현재 전체 파일을 다시 읽고 `SessionContext.tsx`의 `confirmMyMatch`/`skipMyMatch`/`manualMatchTrack`/`myPendingMatchEntryIds`(useMemo) 코드를 대조해 "처리 → 배열에서 실제로 빠짐 → 다음 렌더에서 `resolveQueueEntryId`가 올바른 다음 entryId를 가리킴"을 end-to-end로 재추적 → `matchQueueNavigation.test.ts` 7건 내용 검토 → `apps/mobile`에서 tsc/eslint/jest 독립 재현 → Android `assembleDebug --no-daemon` 독립 재현 → `git diff c8b89f8 095e3cf --stat`로 변경 범위가 주장대로 국소적인지 확인.
> 환경: Windows 11 Pro (10.0.26200), JAVA_HOME=`D:\Android Studio\jbr`, ANDROID_HOME/ANDROID_SDK_ROOT=`E:\Android\Sdk`, GRADLE_USER_HOME=`E:\gradle-home`. macOS/Xcode 여전히 없음 — 이번 라운드도 diff가 네이티브 파일을 건드리지 않아(아래 R8.7) iOS 실빌드는 구조적 제약으로 미검증.

### 1. diff 및 변경 범위

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R8.1 | `git show 095e3cf` diff가 구현 로그가 주장한 범위(`MatchingQueueSheet.tsx` 수정, `matchQueueNavigation.ts`/테스트 신규, `implementation-log.md`)와 정확히 일치하는가 | ✅ 통과 | `git show 095e3cf`로 4개 파일 diff를 직접 확인 — `apps/mobile/src/components/MatchingQueueSheet.tsx`(29줄, 수정), `apps/mobile/src/state/matchQueueNavigation.ts`(45줄, 신규), `apps/mobile/__tests__/matchQueueNavigation.test.ts`(59줄, 신규), `docs/agents/implementation-log.md`(35줄, 추가). `git diff c8b89f8 095e3cf --stat`(부모 커밋 c54ee43까지 포함한 범위)로도 `CLAUDE.md` 1줄(무관한 리더 규칙 추가, 095e3cf 자체가 아니라 사이에 낀 c54ee43) 외에 동일 4개 파일만 변경됨을 재확인 — 지시사항이 우려한 "다른 화면/혼합 모드 코드 변경"은 전혀 없음. |
| R8.2 | 숫자 `cursor` state와 관련 `useEffect` 2개가 실제로 전부 제거됐는가 | ✅ 통과 | `MatchingQueueSheet.tsx` 현재 전체(1~156행) 재확인 — `useState(0)` cursor 선언, `visible` 변경 시 `setCursor(0)` 리셋 `useEffect`, `myPendingMatchEntryIds.length` 변화에 반응해 커서를 클램프하던 `useEffect` 모두 사라짐. 남은 `useEffect`는 `visible`일 때 `setMode('card')`로 되돌리는 것 하나뿐(모드 전환용, cursor와 무관). `grep -rn "cursor" apps/mobile/src apps/mobile/__tests__`로 재확인한 결과 실제 코드에 `cursor` 변수는 하나도 남지 않았고, 남은 3건은 전부 주석(옛 버그 설명)뿐임을 확인. |

### 2. R7.13 재현/해소 — 시나리오별 end-to-end 재추적

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R8.3 | (a) 대기 항목 정확히 2건 — 첫 항목 처리 후 시트가 조기 종료되지 않고 두 번째 항목이 실제로 보이는가 | ✅ 통과 | `MatchingQueueSheet.tsx` 58행 `const entryId = resolveQueueEntryId(myPendingMatchEntryIds);`가 매 렌더마다 그 시점의 `myPendingMatchEntryIds`(별도 state 없이 `SessionContext.tsx` 530~543행 `useMemo`가 매번 재계산)에서 직접 계산된다 — cursor라는 중간 state가 없으므로 "처리 전 길이를 참조하는 산술"이 구조적으로 존재하지 않는다. `myPendingMatchEntryIds = ['A','B']`(길이 2) 상태에서 카드에 A 표시 → "확정하기" 탭 → `confirmMyMatch('A')` 호출(436~452행, `confirmState: 'confirmed'`로 setSession) → 다음 렌더에서 `useMemo`가 재계산되어 A는 `confirmState==='pending'` 필터를 통과하지 못해 빠지고 `['B']`(길이 1)만 남음 → `resolveQueueEntryId(['B'])` = `'B'`(`pendingIds.find(id => !skippedIds.has(id))`, skippedIds는 기본 빈 Set이라 항상 첫 항목) → `entry`/`myMatch` 둘 다 정의됨 → 82행 `if (!entry \|\| !myMatch)` 가드 미발동 → B 카드가 정상 렌더됨. `matchQueueNavigation.test.ts`의 "shows the second entry after the first is processed..." 테스트가 이 배열 전이(`['a','b']` → `['b']`)를 정확히 시뮬레이션해 통과(직접 재실행 확인, 아래 R8.6). Round 7이 재현했던 "정확히 2건일 때 조기 종료" 버그는 재현되지 않는다. |
| R8.4 | (b) 대기 항목 3건 이상 — 항목이 건너뛰어지지 않고 순서대로 다 보이는가 | ✅ 통과 | 동일한 방식으로 `['A','B','C']` → A 처리 → `useMemo` 재계산으로 `['B','C']` → `resolveQueueEntryId` = `'B'`(건너뛰지 않음) → B 처리 → `['C']` → `'C'` → C 처리 → `[]` → `undefined`. 각 단계가 항상 "그 시점의 실제 배열"만 참조하고 이전 렌더의 길이를 기억해두는 state가 전혀 없으므로, Round 7이 지적한 "매번 한 칸 더 앞서가는" 누적 오차가 발생할 수 있는 지점 자체가 없다. `matchQueueNavigation.test.ts`의 "walks through all entries in order without skipping any when N=3" 테스트로 `'a'→'b'→'c'→undefined` 순서가 정확히 나옴을 확인(아래 R8.6). |
| R8.5 | (c) 확정/스킵/수동교체 3가지 처리 경로 전부 동일하게 동작하는가 | ✅ 통과 | 세 콜백(`onConfirm`, 128~131행 / `onSkip`, 109~112행 / `handleManualSelect`, 62~66행) 전부 "처리 함수 호출 → `setMode('card')`"만 하고 `entryId`/`cursor` 관련 state는 전혀 건드리지 않는다 — 다음에 보여줄 항목은 셋 다 동일하게 다음 렌더에서 `resolveQueueEntryId(myPendingMatchEntryIds)`가 계산하므로 세 경로가 서로 다른 로직을 타지 않는다(이전엔 셋 다 개별적으로 `goToNextInQueue()`를 호출했던 것과 대조적으로, 이제는 각자 자기 처리 함수만 호출하고 "다음 항목 계산"이라는 책임 자체가 컴포넌트 렌더 로직으로 완전히 옮겨감). `skipMyMatch`(512~528행, `skipped: true`로 setSession)는 `myPendingMatchEntryIds` 필터의 `status === 'failed' && !match.skipped` 조건에서 제외되어 동일하게 배열에서 빠짐, `manualMatchTrack`(482~508행, `confirmState: 'manual'`)도 `confirmState === 'pending'` 조건을 통과 못해 동일하게 빠짐 — 세 처리 경로 모두 "처리 결과가 `myPendingMatchEntryIds`에서 실제로 제거됨"이라는 동일한 메커니즘을 공유함을 확인. |
| R8.6 | 큐가 완전히 비면(`!entry \|\| !myMatch`) 정상적으로 자동 닫히는가(회귀 없음) | ✅ 통과 | 82~85행 `if (!entry \|\| !myMatch) { onClose(); return null; }`는 이번 diff에서 전혀 수정되지 않은 코드(diff에 해당 라인 변경 없음, `git show` 재확인) — `resolveQueueEntryId([])`가 `undefined`를 반환하면(빈 배열 가드가 함수 최상단에 명시적으로 존재, `matchQueueNavigation.ts` 36~38행) `entryId`가 `undefined`가 되고 `entry`도 자연히 `undefined`가 되어 동일한 가드로 떨어진다 — Round 7 이전부터 있던 자동 종료 로직 자체는 이번 변경의 영향을 받지 않았음을 코드 대조로 확인. |

### 3. `skippedIds` 미사용 확인 (실패 아님, 사실관계만 확인)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R8.7 | `resolveQueueEntryId`의 `skippedIds` 파라미터가 실제로는 UI에서 쓰이지 않는다는 구현 로그의 주장이 사실인가 | ✅ 사실 확인(정책 위반 아님) | `MatchingQueueSheet.tsx` 58행 `resolveQueueEntryId(myPendingMatchEntryIds)` — 두 번째 인자를 넘기지 않아 항상 기본값(`new Set()`)이 쓰인다. 컴포넌트 전체(1~156행)를 다시 읽고 "다음"이라는 문자열과 `Set` 타입 사용처를 grep했지만 `skippedIds`를 채우는 state나 버튼은 존재하지 않는다 — 헤더의 `(N/M)` 카운터는 표시 전용이고 미처리 항목을 넘겨보는 별도 버튼도 없다. 지시사항이 명시한 대로 이는 향후 확장(스펙에 아직 없는 "다음" 버튼)을 대비해 순수 함수 시그니처에만 미리 반영해둔 것이며, 사용되지 않는 매개변수가 있다고 해서 실패로 잡지 않는다 — TypeScript 기본 인자(`= new Set()`)라 미사용이어도 tsc/eslint 에러가 되지 않음(실제 R8.9/R8.10에서 0 errors로 확인). |
| R8.8(참고, 실패 아님) | 헤더 카운터(`(N/M)`)가 `skippedIds`를 쓰지 않는 현재 구조에서 항상 "(1/N)"으로만 표시되는 부작용이 있는가 | 참고 사항으로 기록 | `entryId`가 항상 `resolveQueueEntryId`의 `firstUnseen`(= skippedIds가 비어 있으므로 항상 `pendingIds[0]`)이기 때문에, `myPendingMatchEntryIds.indexOf(entryId as string)`은 수학적으로 항상 `0`이 되어 헤더는 항상 "(1/남은 개수)"로만 표시된다(예: 3건 중 첫 항목 처리 후 "1/2"로, "2/3"이 아님). 데이터 정확성이나 정책에는 영향이 없고(남은 개수 자체는 정확), Round 7의 R7.13이 지적한 실패 항목도 아니며 지시사항이 요구한 검증 범위(재현/해소 확인)에도 해당하지 않아 실패로 카운트하지 않는다 — 다만 "지금 보고 있는 게 원래 몇 번째 항목이었는지"를 사용자에게 보여주고 싶다면 `indexOf` 계산 자체가 항상 0이라 다음 라운드에서 다듬을 여지가 있는 사소한 UX 참고사항으로만 남긴다. |

### 4. `matchQueueNavigation.test.ts` 7건 내용 검토

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R8.9 | 7개 테스트가 위 시나리오들을 의미 있게 검증하는가 | ✅ 통과(내용 충실) | (1) 빈 배열 → `undefined`(자동 종료 조건과 대응), (2) 넘겨본 것 없을 때 첫 항목 표시, (3) **N=2 최소 재현**(`['a','b']`→`'a'`, 처리 후 `['b']`→`'b'`, R8.3과 동일 시나리오), (4) **N=3 순서 보존**(`'a'→'b'→'c'→undefined`, R8.4와 동일 시나리오), (5) `skippedIds`로 아직 처리 안 한 항목을 건너뛰어 보는 시맨틱(`['a','b','c']`+`skipped={'a'}`→`'b'`), (6) 전부 넘겨봤을 때 첫 항목으로 wrap-around, (7) "처리돼서 빠짐"과 "그냥 넘겨봄"이 동시에 섞인 경우(`pending=['a','c']`, `skipped={'a'}`→`'c'`) — 형식적 스모크 테스트가 아니라 지시사항이 요구한 (a)/(b) 시나리오를 각각 전용 테스트로 직접 커버하고 있으며, 주석도 각 테스트가 어떤 실제 시나리오를 시뮬레이션하는지 명확히 설명함. |

### 5. 정적 검증 및 빌드 (독립 재현)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R8.10 | `npx tsc --noEmit` (apps/mobile) | ✅ 통과 | 0 errors, 출력 없음. |
| R8.11 | `npx eslint .` (apps/mobile) | ✅ 통과 | **0 errors, 22 warnings** — 전부 Round 7과 동일한 파일/동일한 `react-native/no-inline-styles` 경고(개수·목록 라인 단위로 대조, 이번 변경으로 신규 경고 없음). 구현 로그 주장과 정확히 일치. |
| R8.12 | `npx jest` (apps/mobile) | ✅ 통과 | **5 suites / 23 tests 전부 통과**(`matchQueueNavigation.test.ts` 7건 신규 포함, 기존 `App.test.tsx`/`mixedTrackView.test.ts`/`playlistSequencing.test.ts`/`trackMatcher.test.ts` 4개 스위트 16건 그대로 회귀 없음). 구현 로그 주장(5 suites/23 tests)과 정확히 일치. |
| R8.13 | Android `assembleDebug --no-daemon` | ✅ 통과 | `JAVA_HOME=D:\Android Studio\jbr`, `ANDROID_HOME`/`ANDROID_SDK_ROOT=E:\Android\Sdk`, `GRADLE_USER_HOME=E:\gradle-home`로 `cd apps/mobile/android && ./gradlew.bat assembleDebug --no-daemon` → **BUILD SUCCESSFUL in 44s**, 203 actionable tasks(23 executed, 180 up-to-date — 순수 JS/TS 변경이라 대부분 UP-TO-DATE, 새 네이티브 의존성 없음). |
| R8.14 | iOS 코드 리뷰 수준(구조적 제약) | ✅ 통과(리뷰 수준) | diff가 `apps/mobile/ios`/`apps/mobile/android` 네이티브 디렉터리를 전혀 건드리지 않음(R8.1) — 순수 JS/TS 컴포넌트·상태 로직 변경만이라 iOS 쪽 구조적 리스크는 낮다고 판단하나, 실제 iOS 빌드/런타임 검증은 이번에도 macOS 부재로 수행하지 못했다(Round 1~7과 동일한 구조적 제약, 신규 아님). |

### 6. 회귀 확인 — Round 7의 다른 통과 항목에 영향 없는가

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R8.15 | 정책 준수(R7.1/R7.2, "매칭이 절대 조용히 확정되지 않는다") 회귀 여부 | ✅ 통과(회귀 없음) | 이번 diff는 `confirmState`를 대입하는 코드(`confirmMyMatch`/`manualMatchTrack`/`skipMyMatch`, `SessionContext.tsx`)를 전혀 건드리지 않았다 — `git show 095e3cf`에 `SessionContext.tsx` 변경 자체가 없음(diff 4개 파일 목록에 포함되지 않음, R8.1). 매칭 확정은 여전히 사용자의 명시적 탭(확정하기/직접 검색하기)에서만 발생하며, 큐 네비게이션 로직 교체는 "다음에 무엇을 보여줄지"만 바꿨을 뿐 "언제 confirmState가 바뀌는지"는 전혀 건드리지 않았다. |
| R8.16 | 서비스 격리(R7.3~R7.5, 참여자 개별 Free 계정 가드) 회귀 여부 | ✅ 통과(회귀 없음) | 이번 diff에 `ParticipantsBottomSheet.tsx`/`NowPlayingView.tsx`/`YouTubeNowPlayingView.tsx`가 전혀 포함되지 않음(R8.1의 4개 파일 목록과 무관) — 해당 가드 로직은 이번 변경의 영향 범위 밖. |
| R8.17 | `selectMyMatchCandidate`(2.11c, 후보 선택 시 카드로 되돌아가는 예외 경로, R7.7이 확인한 "goToNextInQueue를 호출하지 않는 유일한 예외") 동작 유지 여부 | ✅ 통과(회귀 없음) | 117~120행 `onSelect={candidate => { selectMyMatchCandidate(entryId as string, candidate); setMode('card'); }}` — 이전에도 `goToNextInQueue()`를 호출하지 않고 `setMode('card')`만 했던 유일한 경로였고, 이번 diff에서도 이 블록은 변경되지 않았다(diff에 해당 라인 없음). `selectMyMatchCandidate`가 `confirmState`를 바꾸지 않으므로(후보만 교체, `matches/[participant]` 확정 여부는 그대로 pending) `myPendingMatchEntryIds`에서 빠지지 않아 여전히 같은 entryId가 카드로 되돌아옴 — 00-ux-flow.md 2.11c 설계 의도와 일치, 이번 수정으로 영향받지 않음을 재확인. |

### Round 8 종합

| 구분 | 개수 |
|---|---|
| ✅ 통과 | 17 (R8.1~R8.6, R8.7, R8.9~R8.17) |
| 참고(실패 아님) | R8.8 — 헤더 카운터가 항상 "(1/남은 개수)"로만 표시되는 부작용, 데이터 정확성·정책과 무관한 사소한 UX 참고사항 |
| ⛔ 미검증(환경 제약, 실패 아님) | iOS 실빌드/런타임 — 이번 라운드도 네이티브 파일 무변경, 코드 리뷰 수준까지만 수행(Round 1~7과 동일한 구조적 제약) |

**결론: 통과.** R7.13(대기 항목 정확히 2건일 때 조기 종료, 3건 이상일 때 항목 건너뜀)의 근본 원인이었던 숫자 `cursor` state와 그에 의존한 "처리 전 길이" 산술이 diff에서 실제로 완전히 제거됐고, 대체된 `resolveQueueEntryId`가 매 렌더 그 시점의 실제 `myPendingMatchEntryIds`만 참조하는 구조이므로 React state batching 여부와 무관하게 항상 올바른 다음 항목을 가리킨다는 것을 코드 트레이스(R8.3~R8.6)와 단위 테스트 내용 검토(R8.9)로 확인했다. 정적 검증(R8.10~R8.12)과 Android 빌드(R8.13)는 구현 로그의 주장과 정확히 일치하게 독립 재현됐고, 변경 범위가 주장대로 4개 파일에 국한돼(R8.1) Round 7의 다른 통과 항목(정책 준수, 서비스 격리, 2.11c 예외 경로)에 회귀가 없음도 확인했다(R8.15~R8.17).

**혼합 모드 라운드 전체에 대한 판단**: Round 7의 25개 통과 항목(정책 2건, 서비스 격리 3건, 전체 플로우 트레이스 대부분, 데이터 모델 일관성, 기존 세션 회귀 없음, 단위 테스트 3종, 정적 검증/빌드)은 이미 통과였고, 유일한 실패였던 R7.13이 이번 Round 8에서 해소됐다 — 따라서 **혼합 모드(Round 7 + Round 8) 전체를 "완료"로 결론지어도 된다.** 남은 항목은 모두 실패가 아니라 이미 문서화된 환경적 제약(iOS 실빌드, Spotify/YouTube 재생 스텁, YouTube mock videoId, 매칭 가중치 잠정값, 코드 참여 미연결)이거나 사소한 UX 참고사항(R7.32, R8.8)뿐이다.

---

## Round 9 검증 (Spotify Premium 안내 모달)

> 검증 대상 커밋: `977298c` ("Wire up "no Premium?" link with an info modal instead of a dead button") — 실기기에서 발견된 버그(`SpotifyConnectScreen.tsx`의 "Premium이 없으신가요? →" 링크에 `onPress` 핸들러 없음) 수정. 이번까지 정식 verifier 라운드가 없었고 리더 자체 diff 리뷰만 거친 상태에서 처음 검증. 단일 화면 소규모 변경이라 전체 체크리스트를 반복하지 않고 지시된 항목(diff 확인, 정책 준수, 배선/에러 핸들링, 다크모드, 정적 검증, Android 빌드)에 집중한다.
> 검증일: 2026-07-26
> 검증 담당: 검증(Verification) 서브에이전트
> 검증 방식: `git show 977298c`로 diff 라인 단위 확인 → `SpotifyConnectScreen.tsx` 현재 전체 파일 재확인 → `docs/specs/04-playlist.md` "Free 계정(무료 등급) 처리" 절(해석 A 확정 문구) 직접 재확인 → `grep`으로 이 파일 및 관련 컴포넌트(`AuthContext.tsx`, `Buttons.tsx`, `theme/tokens.ts`)에서 새로운 `isPremium` 게이팅 로직이 추가됐는지 저장소 전체 검색 → `apps/mobile`에서 tsc/eslint/jest 독립 재현 → Android `assembleDebug --no-daemon` 독립 재현.
> 환경: Windows 11 Pro (10.0.26200), JAVA_HOME=`D:\Android Studio\jbr`, ANDROID_HOME/ANDROID_SDK_ROOT=`E:\Android\Sdk`, GRADLE_USER_HOME=`E:\gradle-home`. macOS/Xcode 없음 — 이번 diff도 네이티브 파일을 건드리지 않아 iOS 실빌드는 구조적 제약으로 미검증. 실기기 Spotify OAuth 콜백 자체도 실기기 부재로 미검증(지시사항이 명시한 검증 범위 밖).

### 1. diff 확인 및 변경 범위

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R9.1 | `git show 977298c` diff가 구현 로그가 주장한 범위(`SpotifyConnectScreen.tsx` 단일 파일 수정 + `implementation-log.md`)와 정확히 일치하는가 | 통과 | `git show 977298c --stat` — `apps/mobile/src/screens/SpotifyConnectScreen.tsx`(79줄 변경, 신규 컴포넌트/네비게이션 라우트 없음), `docs/agents/implementation-log.md`(13줄 추가) 2개 파일뿐. 새 네비게이션 라우트(`RootStackParamList` 변경) 없음을 확인 — `navigation/types.ts`가 diff에 없음. |

### 2. 정책 준수 — Free 계정 세션 참여 항상 허용(해석 A)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R9.2 | `docs/specs/04-playlist.md` "Free 계정(무료 등급) 처리" 절의 확정 정책 재확인 | 통과 | 84행 "Free 계정 사용자는 곡 재생(동기화 재생 대상)이 불가능하다"(재생 제어만 제한), 87~88행 "해석 A(제안) → 확정" / "해석 B: 세션 진입 자체를 Premium 계정으로 제한한다 (2026-07-24 폐기 — 채택하지 않음)"를 문서에서 직접 확인. 모달 본문 문구("로그인하고 세션에 참여해서 플레이리스트에 곡을 추가·삭제·순서변경할 수 있어요. 다만 곡 재생(동기화 재생)에는 참여할 수 없어요")가 이 확정 문구와 표현·의미 모두 정확히 일치. |
| R9.3 | 이 화면(`SpotifyConnectScreen.tsx`)에 새로운 차단 로직이나 `isPremium` 체크로 로그인/네비게이션을 막는 코드가 추가됐는가 | 통과(위반 없음) | 파일 전체(1~151행)를 재확인 — `isPremium`, `accountTier`, `product` 등 등급 판별 관련 식별자가 이 파일에 전혀 등장하지 않는다. `login()`은 `handleContinueLogin`(37~40행)에서 조건 없이 바로 호출되고, 로그인 버튼(65~70행) 자체도 애초에 조건 없이 항상 활성 상태(`disabled` prop 미지정, `status === 'signing_in'`일 때만 `loading` 표시). `navigation.replace('Home')`(31~35행 `useEffect`)도 `status === 'signed_in'`이면 등급과 무관하게 항상 실행됨 — Free/Premium을 가리는 어떤 조건문도 로그인·화면 전환 경로에 없음. |
| R9.4 | 저장소 전체에서 이번 diff로 인해 새로 추가된 `isPremium` 게이팅이 있는가(다른 화면으로 로직이 우회 이전됐을 가능성 배제) | 통과(신규 게이팅 없음) | `grep -rn "isPremium\|premium" apps/mobile/src`로 전체 재검색 — `isPremium`/`accountTier` 판별 로직은 `HomeScreen.tsx`(경고 배너), `NowPlayingView.tsx`(`viewerIsFree`, 재생 컨트롤 제한), `CreateSessionScreen.tsx`(참여자 tier 태깅), `ParticipantsBottomSheet.tsx`(재생 인원 카운트) 등 기존에 이미 존재하던 위치에만 있고, 전부 이번 커밋 diff(977298c)에 포함되지 않은 파일이다(R9.1의 2개 파일 목록과 무관). 즉 이번 변경이 등급 판별 로직 자체를 건드리거나 새로 추가하지 않았고, 순수하게 "링크 탭 → 안내 → 기존 login() 재사용"만 배선했음을 확인. |

### 3. 로그인 재사용 및 에러 핸들링

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R9.5 | "로그인 계속하기" 버튼이 새로운 인증 로직 없이 기존 `useAuth().login()`을 그대로 재사용하는가 | 통과 | `SpotifyConnectScreen.tsx` 28행 `const {status, error, login} = useAuth();`, 37~40행 `handleContinueLogin`이 `setFreeInfoVisible(false)` 후 `login()`만 호출 — 새 인자·새 옵션 없이 화면 상단 "Spotify로 로그인" 버튼(66~70행)이 호출하는 것과 동일한 함수 참조. `AuthContext.tsx`를 확인한 결과 이번 diff에 `AuthContext.tsx`/`spotifyAuth.ts`는 전혀 포함되지 않음(R9.1) — 내부 OAuth 로직(`loginWithSpotify`)은 완전히 건드리지 않았다. |
| R9.6 | `Linking.openURL` 호출에 에러 핸들링이 있어 실패해도 모달이 깨지지 않는가 | 통과 | 42~46행 `handleOpenPremiumPage`가 `Linking.openURL(SPOTIFY_PREMIUM_URL).catch(() => { /* 무시 */ })`로 `.catch`를 명시적으로 붙여 rejection을 흡수한다 — unhandled promise rejection이나 컴포넌트 크래시로 이어지지 않는다. `freeInfoVisible` state는 이 핸들러에서 전혀 건드리지 않으므로(닫기 로직 없음) 브라우저 오픈 실패 시에도 모달이 열린 채로 유지되어 사용자가 "닫기"로 직접 빠져나갈 수 있다 — 의도된 동작. |

### 4. 다크모드 대응

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R9.7 | 모달 카드/텍스트가 하드코딩 색상 대신 테마 토큰을 사용하는가 | 통과 | 모달 카드 배경 84행 `{backgroundColor: theme.bgElevated}`, 제목 85행 `{color: theme.text}`, 본문 86행 `{color: theme.textSecondary}`, 닫기 텍스트 105행 `{color: theme.textSecondary}` 전부 `useTheme()`(27행)에서 가져온 토큰 사용. `theme/tokens.ts`를 확인한 결과 `bgElevated`/`text`/`textSecondary` 모두 라이트(72/77행)·다크(95/100행) 테마 양쪽에 값이 정의되어 있어 다크모드에서도 정상적으로 다른 값이 적용됨을 확인. 오버레이 배경(`rgba(0,0,0,0.5)`, 137행)은 반투명 스크림이라 테마와 무관하게 고정값이어도 무방(라이트/다크 공통으로 자연스러운 관용적 패턴, 기존 다른 모달류와 일치). 1차 버튼(`SpotifyButton`)은 브랜드 그린 고정색이라 테마 무관, 2차 버튼(`SecondaryButton`)은 컴포넌트 내부(`Buttons.tsx` 26~46행)에서 이미 `theme.border`/`theme.bgElevated`/`theme.text`를 자체적으로 사용하므로 추가 확인 불필요. |

### 5. 정적 검증 및 빌드 (독립 재현)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R9.8 | `npx tsc --noEmit` (apps/mobile) | 통과 | 0 errors, 출력 없음. 구현 로그 주장과 일치. |
| R9.9 | `npx eslint .` (apps/mobile) | 통과 | **0 errors, 22 warnings** — 전부 Round 8과 동일한 파일·동일한 `react-native/no-inline-styles` 경고(줄 단위 목록 대조 완료). `SpotifyConnectScreen.tsx`는 경고 목록에 전혀 등장하지 않음 — 이 파일에서 새로 발생한 경고 없음. 구현 로그 주장과 정확히 일치. |
| R9.10 | `npx jest` (apps/mobile) | 통과 | **5 suites / 23 tests 전부 통과**(`App.test.tsx`, `trackMatcher.test.ts`, `playlistSequencing.test.ts`, `mixedTrackView.test.ts`, `matchQueueNavigation.test.ts`) — Round 8 이후 상태 그대로 회귀 없음. 구현 로그가 "4 suites/16 tests"로 적었던 것은 Round 8 이전 스냅샷을 기준으로 한 것으로 보이며(실제로는 Round 8에서 이미 5 suites/23 tests로 확장됨) 실질적 회귀는 아님 — 전부 통과이므로 결과에 영향 없음. |
| R9.11 | Android `assembleDebug --no-daemon` | 통과 | `JAVA_HOME=D:\Android Studio\jbr`, `ANDROID_HOME`/`ANDROID_SDK_ROOT=E:\Android\Sdk`, `GRADLE_USER_HOME=E:\gradle-home`로 `cd apps/mobile/android && ./gradlew.bat assembleDebug --no-daemon` → **BUILD SUCCESSFUL in 10s**, 203 actionable tasks(23 executed, 180 up-to-date — 순수 JS/TS 변경이라 네이티브 재빌드 거의 없음, 신규 네이티브 의존성 없음). |
| R9.12 | iOS 코드 리뷰 수준(구조적 제약) | 통과(리뷰 수준) | diff가 `apps/mobile/ios`/`apps/mobile/android` 네이티브 디렉터리를 전혀 건드리지 않음(R9.1) — 순수 JS/TS 컴포넌트 변경만이라 iOS 쪽 구조적 리스크는 낮다고 판단하나, 실제 iOS 빌드/런타임 검증은 이번에도 macOS 부재로 수행하지 못했다(Round 1~8과 동일한 구조적 제약, 신규 아님). |

### 6. 실기기 미검증 항목 (지시사항 범위 밖, 명시적으로 기록)

| # | 항목 | 결과 | 상세 |
|---|---|---|---|
| R9.13 | 실기기/에뮬레이터에서 (1) 링크 탭 시 모달이 실제로 뜨는지, (2) "로그인 계속하기" 탭 시 모달이 닫히고 기존 Spotify OAuth 플로우(시스템 브라우저)가 정상 시작되는지, (3) "Spotify Premium 알아보기" 탭 시 외부 브라우저로 spotify.com/premium이 열리는지, (4) "닫기" 탭 시 모달만 닫히고 원래 화면으로 안전하게 복귀하는지, (5) 다크모드 육안 대비 | 미검증(환경 제약) | 지시사항이 명시한 대로 실기기 없이는 Spotify OAuth 콜백 자체를 검증할 수 없어 이번 라운드 범위 밖으로 남긴다. 코드 트레이스로는(R9.3, R9.5~R9.7) 배선이 논리적으로 올바름을 확인했으나, 실제 런타임 동작(모달 애니메이션, 브라우저 전환, 딥링크 복귀)은 실기기/에뮬레이터에서 별도로 재확인이 필요하다 — 실패가 아니라 미검증으로 분류. |

### Round 9 종합

| 구분 | 개수 |
|---|---|
| 통과 | 12 (R9.1~R9.12) |
| 미검증(환경 제약, 실패 아님) | R9.13 — 실기기 OAuth 콜백/브라우저 전환/딥링크 복귀/다크모드 육안 확인, 지시사항이 명시한 검증 범위 밖 |
| 실패 | 없음 |

**결론: 통과.** 커밋 `977298c`는 지시된 범위(diff 확인, 정책 준수, 로그인 재사용, 에러 핸들링, 다크모드 토큰, 정적 검증, Android 빌드) 전 항목에서 통과했다. 특히 정책 준수(R9.2~R9.4)를 저장소 전체 검색까지 포함해 확인한 결과, `docs/specs/04-playlist.md`가 2026-07-24 확정한 해석 A(참여 자체는 항상 허용, 재생 제어만 제한) 정책과 정확히 일치하며 이 화면에 새로운 `isPremium` 차단 로직이 추가되지 않았음을 코드로 확인했다. 정적 검증(R9.8~R9.10)과 Android 빌드(R9.11)는 구현 로그의 주장과 사실상 일치(테스트 스위트 수 표기 차이는 Round 8 스냅샷 반영 누락일 뿐 회귀 아님)하게 독립 재현됐다. 실기기 OAuth 콜백 자체(R9.13)는 지시사항이 명시한 대로 미검증으로 남긴다 — 이는 실패가 아니라 환경 제약이며, 이 화면의 배선/네비게이션/정책 준수까지가 이번 검증 범위였다.
