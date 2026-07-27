# 11. YouTube 단일 플랫폼 전환 — 삭제/수정 범위 기획

> 상태: v1 (2026-07-28)
> 근거: `docs/decision-log.md` "2026-07-28 — Spotify 지원 완전 제거 + 혼합(Mixed) 세션 모드 제거" 결정
> 범위: `apps/mobile/src` 전체를 실제로 읽고(추측 없이) 파일 단위 삭제/수정 대상을 분류한다. 코드는 건드리지 않는다 — 실제 구현은 implementer 몫이다. 5절(인증 흐름)은 선택지만 제시하고 결정하지 않는다.
> 조사 방법: `apps/mobile/src` 산하 파일 62개(테스트 8개 포함) 전부를 `Read`로 직접 읽었고, `grep`으로 `spotify|Spotify`/`mixed|Mixed`/`accountTier|AccountTier|isPremium`/`SpotifySearchTrack`/`spotifyGreen|youtubeRed` 교차 검증했다.

## 배경

지금까지 이 앱은 Spotify 전용 / YouTube 전용 / 혼합(Mixed, 참여자마다 다른 플랫폼) 세 가지 세션 유형을 지원해왔다. 2026-07-28 결정으로 Spotify와 혼합 모드를 완전히 제거하고 YouTube 전용으로만 남긴다 — 세션 생성 시 "어떤 서비스로 할지" 선택하는 단계 자체가 사라진다.

이 작업의 실질적 난이도는 "Spotify 파일을 지운다"는 단순 삭제가 아니라, **"세션이 여러 서비스/플랫폼 중 하나일 수 있다"는 전제 위에 설계된 타입·상태·화면 분기를 걷어내는 것**에 있다. `MusicService`(`'spotify'|'youtube'|'mixed'`), `SessionState.playlists: Record<SingleMusicService, ...>`, `session.service`에 따른 화면 분기, `myPlatform`(혼합 세션 개인별 플랫폼) 같은 구조가 코드베이스 전반에 스며 있어, 이번 라운드는 "지우기"보다 "단순화"가 작업의 대부분을 차지한다.

## 1. 파일 단위 삭제/수정 인벤토리

### 1-A. 완전 삭제 대상 — Spotify 전용 (7개 파일 + 관련 없음)

| 파일 | 사유 |
|---|---|
| `apps/mobile/src/services/auth/spotifyAuth.ts` | Spotify OAuth(Authorization Code + PKCE) 로그인 전용 |
| `apps/mobile/src/services/spotify/spotifyRemote.ts` | Spotify App Remote SDK 추상화(STUB) — Spotify 재생 제어 전용 |
| `apps/mobile/src/services/spotify/spotifyWebApi.ts` | Spotify Web API 클라이언트(검색/프로필) — 단, `SpotifySearchTrack` 타입은 `youtubeSearch.ts`가 재사용 중이므로 **삭제 전에 그 타입을 다른 곳으로 옮겨야 한다**(1-B `services/youtube/youtubeSearch.ts` 참고, 순서 의존성 있음) |
| `apps/mobile/src/screens/SpotifyConnectScreen.tsx` | Spotify OAuth 로그인 화면 + Premium 안내 모달 |
| `apps/mobile/src/screens/room/NowPlayingView.tsx` | Spotify 전용 Now Playing 레이아웃(2.10a) + `MixedNowPlayingBody`(혼합 세션 2.10d 중 Spotify를 고른 참여자용)를 함께 담고 있는 파일 — 두 부분 다 삭제 대상이라 파일 전체 삭제. `YouTubeNowPlayingView.tsx`(2.10c)는 별도 파일이라 영향 없음(1-B에서 그 파일 자체의 mixed 분기만 제거) |

### 1-B. 완전 삭제 대상 — 혼합(Mixed) 모드 전용 (10개 파일)

| 파일 | 사유 |
|---|---|
| `apps/mobile/src/state/mixedMatching.ts` | 혼합 세션 매칭 계산(`resolveParticipantMatch`) |
| `apps/mobile/src/services/matching/trackMatcher.ts` | 매칭 휴리스틱(제목/아티스트/길이 스코어링) — YouTube 검색만 남는 세계에서는 "다른 플랫폼 후보와 비교해 매칭"할 대상 자체가 없어짐 |
| `apps/mobile/src/state/mixedTrackView.ts` | 혼합 세션 "내 매칭" 뷰 판정(`resolveMixedCurrentTrackForMe`) |
| `apps/mobile/src/state/matchQueueNavigation.ts` | 매칭 확인 큐 다음 항목 계산(`resolveQueueEntryId`) |
| `apps/mobile/src/components/MatchingQueueSheet.tsx` | 매칭 확인 큐 오케스트레이터(2.11a~2.11d) |
| `apps/mobile/src/components/MatchConfirmCard.tsx` | 매칭 확인 카드(2.11b) |
| `apps/mobile/src/components/MatchFailCard.tsx` | 매칭 실패 안내(2.11d) |
| `apps/mobile/src/components/MatchConfidenceBadge.tsx` | 일치율/신뢰도 배지 — `MatchConfirmCard`/`MatchCandidateList` 전용 |
| `apps/mobile/src/components/MatchCandidateList.tsx` | 대체 후보 목록(2.11c) |
| `apps/mobile/src/components/PlatformSelect.tsx` | 혼합 세션 개인 참여 플랫폼 선택(2.6c) — 호스트(`CreateSessionScreen`)/참여자(`HomeScreen`) 양쪽에서 쓰임, 둘 다 1-C에서 이 import를 제거 |

### 1-C. 테스트 파일 삭제 대상 (3개)

| 파일 | 사유 |
|---|---|
| `apps/mobile/__tests__/trackMatcher.test.ts` | 삭제되는 `services/matching/trackMatcher.ts` 대상 테스트 |
| `apps/mobile/__tests__/matchQueueNavigation.test.ts` | 삭제되는 `state/matchQueueNavigation.ts` 대상 테스트 |
| `apps/mobile/__tests__/mixedTrackView.test.ts` | 삭제되는 `state/mixedTrackView.ts` 대상 테스트 |

`__tests__/serviceSwitchPlaylistIsolation.test.ts`(서비스 전환/플레이리스트 격리 검증)와 `__tests__/joinSessionByCode.test.ts`(참여 흐름, `service: 'spotify'`/`service: 'mixed'` 케이스 포함), `__tests__/sessionPermissions.test.ts`(서비스 전환 권한 함수 테스트)는 **파일 자체는 남지만 대폭 재작성이 필요**하다 — 1-D에서 다룬다.

### 1-D. 부분 수정 대상 (구체적 범위)

#### `apps/mobile/src/types/domain.ts`
- **제거**: `MusicService`, `SingleMusicService`, `MixedParticipantPlatform`, `AccountTier`, `MixedConfidenceLevel`(`MatchConfidenceLevel`), `MatchConfirmState`, `ParticipantMatchStatus`, `MatchedTrackCandidate`, `ParticipantMatch`, `MixedPlaylistEntry`, `ServicePlaybackMemory`, `ServicePlaylistState`.
- **`ParticipantInfo`**: `accountTier: AccountTier` 필드 제거(5절 "Premium/Free 개념 제거" 참고), `platform?: MixedParticipantPlatform` 필드 제거.
- **`SessionState`**: `service: MusicService` 필드 제거(세션이 항상 YouTube이므로 이 필드 자체가 불필요 — 2절에서 상세), `playlists: Record<SingleMusicService, ServicePlaylistState>` → 단일 배열(예: `entries: PlaylistEntry[]`)로 교체, `mixedPlaylist: MixedPlaylistEntry[]` 필드 제거.
- **`Track`**: 그대로 둔다(서비스 중립적 구조라 영향 없음, 다만 상단 주석의 "Spotify track URI" 예시 문구는 YouTube 예시로 고쳐야 함).
- **`SyncStatusValue`**: 그대로 둔다(`reasonLabel`은 광고 재생 중 등 YouTube 자체 사유로도 계속 쓰임).
- **유지**: `ParticipantRole`, `PlaylistEntry`, `PlaybackState`, `SyncState`, `SyncStatusValue`, `SESSION_CAPACITY_*` 상수.

#### `apps/mobile/src/services/session/sessionService.ts`
- **제거**: `switchService`(전환할 다른 서비스가 없으므로 함수 자체가 무의미), `addMixedTrack`/`removeMixedTrack`/`reorderMixedPlaylist`/`setParticipantMatch`(혼합 전용), `emptyServicePlaylistState`/`ServicePlaylistState` 관련 헬퍼, `RtdbSessionMeta.service` 필드, `RtdbParticipant.platform`/`RtdbParticipant.accountTier` 필드(toRtdbParticipant/fromRtdbParticipant도 함께 단순화).
- **수정**: `createSession`/`joinSessionByCode` 시그니처에서 `service`/`hostPlatform`/`platform` 파라미터 제거, `host.accountTier`/`joiningUser.accountTier` 파라미터 제거. `addTrack`/`removeTrack`/`reorderPlaylist`가 `activePlaylistEntries`/`withActivePlaylistEntries` 간접 계층 없이 `session.entries`(가칭)를 직접 다루도록 단순화(2절 데이터 모델 변경과 연동).
- **유지**: `appointAdmin`/`revokeAdmin`(3단계 권한 체계는 서비스와 무관하게 유지), `getSession`/`getSessionByInviteCode`/`subscribeToSession`의 골격, RTDB 다중 경로 `update()` 패턴.

#### `apps/mobile/src/state/SessionContext.tsx`
- **제거**: `requestServiceSwitch`, `myPlatform`, `addMixedTrack`, `confirmMyMatch`, `selectMyMatchCandidate`, `manualMatchTrack`, `skipMyMatch`, `myPendingMatchEntryIds`. `createSession`/`joinSession` 파라미터에서 `service`/`hostPlatform`/`platform`/`accountTier` 제거. `requestNextTrack`/`requestPrevTrack`/`removeTrack`/`requestMoveTrack`의 `prev.service === 'mixed'` 분기 삭제(단일 경로만 남김).
- **유지**: `appointAdmin`/`revokeAdmin`/`resignAdmin`(권한 체계), `requestPlay`/`requestPause`, `syncStatus` 계산, `leaveSession`.

#### `apps/mobile/src/state/activeServicePlaylist.ts`
- **삭제 후보(권장)**: 이 파일의 존재 이유 자체가 "세션이 여러 서비스 플레이리스트 중 하나를 활성화해 놓고 있다"는 전제다. `SessionState.playlists`가 단일 배열로 바뀌면(2절) `activePlaylistEntries(session)`은 그냥 `session.entries`가 되고, `withActivePlaylistEntries`도 불필요해진다 — 파일 자체를 지우고 호출부(`SessionContext.tsx`/`PlaylistView.tsx`/`NowPlayingView.tsx` 계열)가 `session.entries`를 직접 참조하도록 바꾸는 편을 권장한다. 다만 이건 "간접 계층을 유지할지" 판단이 필요한 지점이라 구현 라운드에서 실제 diff 크기를 보고 결정해도 무방하다(엄격히 필수는 아님).

#### `apps/mobile/src/state/sessionPermissions.ts`
- **제거**: `canSwitchService`, `shouldShowServiceSwitch`, `oppositeService`, `serviceLabel`(전환할 다른 서비스가 없으므로 전부 무의미).
- **유지**: `canResignAdmin`, `roleDisplayLabel`(3단계 권한 체계는 서비스와 독립적).

#### `apps/mobile/src/screens/CreateSessionScreen.tsx`
- **제거**: 서비스 선택 라디오(`RadioRow` 3개), `INFO_BY_SERVICE` 딕셔너리, `step: 'form' | 'platform'` 2단계 흐름 전체, `hostPlatform`/`PlatformSelect` import.
- **결과**: 세션 이름 입력 + 정원 스테퍼(`CapacityStepper`)만 남는 단일 화면으로 축소(요청 산출물 3절과 동일 결론). `createSession()` 호출에서 `service`/`hostPlatform` 인자 제거.

#### `apps/mobile/src/screens/HomeScreen.tsx`
- **제거**: `step: 'code' | 'platform'` 2단계 흐름, `joiningPlatform`/`PlatformSelect` import, `joinSession` 결과의 `platform_required` 분기.
- **유지**: "+ 새 세션 만들기"/"# 코드로 참여하기" 골격, `profile`/`logout` 참조는 5절 인증 결정에 따라 달라짐(아래 5절 참고 — 이 화면은 인증 방식이 뭐로 정해지든 반드시 함께 손대야 하는 화면).

#### `apps/mobile/src/screens/RoomScreen.tsx`
- **제거**: `NowPlayingView` import 및 `nowPlayingPlatform === 'youtube' ? <YouTubeNowPlayingView/> : <NowPlayingView/>` 분기, `nowPlayingPlatform`/`myPlatform` 계산.
- **결과**: Now Playing 탭이 항상 `YouTubeNowPlayingView`만 렌더링 — 조건부 분기 자체가 사라지므로 이 시점에 컴포넌트를 `NowPlayingView.tsx`로 재명명할지(파일명이 더는 "YouTube 전용"임을 강조할 필요가 없어짐) 여부는 순수 네이밍 판단이라 구현 라운드 재량으로 남긴다(기능에 영향 없음).

#### `apps/mobile/src/screens/room/YouTubeNowPlayingView.tsx`
- **제거**: `isMixed`/`mixedView`/`mixedEntry`/`myPlatform` 관련 전체 분기(약 30~40줄), `resolveMixedCurrentTrackForMe` import, `MatchingQueueSheet` import 및 렌더링, mixed 전용 상태 카드 분기(`mixedView.kind !== 'ready'` 블록).
- **유지**: WebView + IFrame Player 연동 골격, `activePlaylistEntries` 기반(또는 2절 변경 후 `session.entries` 기반) 현재 곡 판정, 광고 감지(`isAdPlaying`)/서비스 전환 후 복귀 시 `startSeconds` 복원 로직(서비스 전환 자체가 없어지므로 이 특정 TODO 배경 설명은 삭제하되, "세션 재입장 시 이어듣기"라는 일반화된 요구가 남아있다면 로직 자체는 재검토 — 없다면 단순화해 제거 가능. 상세 판단은 구현 라운드에서).
- **playableCount 계산**: 이미 `session.service === 'youtube'`이면 "Premium 여부와 무관"이라고 명시돼 있었으므로(비혼합 분기), 혼합 분기만 제거하면 원래도 단순한 로직만 남는다 — `accountTier` 참조가 완전히 없어짐(5절과 연동).

#### `apps/mobile/src/screens/room/PlaylistView.tsx`
- **제거**: `isMixed` 분기 전체(약 120줄 — `MixedTrackRow` 컴포넌트, 혼합 세션 렌더 블록, `matchBadge`/`myPendingMatchEntryIds`/`addMixedTrack`/`myPlatform` 참조, `MatchingQueueSheet` import).
- **수정**: `serviceChip`(YouTube/Spotify 라벨 분기) → 항상 YouTube 라벨 고정, 혹은 칩 자체를 제거하고 "세션 설정" 진입 동선만 남길지 판단 필요(디자인 재검토 권장 — 4절 화면 흐름 참고). `AddTrackModal` 호출의 `service={session.service}` 인자 제거(4절 참고).
- **유지**: `TrackRow`, 스와이프 삭제(Undo 스낵바), ▲/▼ 순서 변경 로직 전부(서비스와 무관).

#### `apps/mobile/src/screens/room/SessionSettingsView.tsx`
- **제거**: `ServiceSwitchRow`, `ServiceSwitchDialog`, `TransitionOverlay`, `MixedPlatformRow`, `shouldShowServiceSwitch`/`canSwitchService`/`oppositeService`/`serviceLabel` import 및 관련 상태(`dialogTarget`/`transitionTarget`/`TRANSITION_OVERLAY_MS`).
- **유지**: `RoleSection`(관리자 사임하기), `InviteCodeRow`(초대 코드 공유), `CapacityRow`(정원 읽기 전용 표시). 파일 크기가 절반 이상 줄어든다.

#### `apps/mobile/src/components/AddTrackModal.tsx`
- **제거**: `service: MusicService` prop, `accessToken` prop(YouTube는 API 키만 필요, accessToken 불필요), Spotify 분기(`searchSpotifyTracks`/`accessToken` 없으면 에러 처리), `import {searchSpotifyTracks, type SpotifySearchTrack} from '../services/spotify/spotifyWebApi'`.
- **결과**: 항상 `searchYoutubeTracks(query)`만 호출하는 단순 검색 모달. 헤더 타이틀 "영상 추가" 고정(현재도 서비스별 분기였으나 이제 단일값).
- **타입 의존성 주의**: 현재 `results` state가 `SpotifySearchTrack[]` 타입을 쓴다 — `spotifyWebApi.ts`가 삭제되므로 이 타입을 `youtubeSearch.ts`(또는 `types/domain.ts`)로 옮긴 뒤 import 경로를 갈아끼워야 한다(아래 `youtubeSearch.ts` 항목과 동일 이슈, 순서 의존).

#### `apps/mobile/src/services/youtube/youtubeSearch.ts`
- **필수 수정(단순 삭제 대상 아님에 주의)**: 현재 `import type {SpotifySearchTrack} from '../spotify/spotifyWebApi';`로 반환 타입을 재사용하고 있다 — `spotifyWebApi.ts`가 삭제되면 이 import가 깨진다. `SpotifySearchTrack` 인터페이스(`serviceTrackId`/`title`/`artist`/`albumArtUrl`/`durationMs`)를 이 파일 자체에 `YoutubeSearchTrack`(또는 서비스 중립적 이름, 예: `SearchResultTrack`)으로 옮겨 정의하고, `AddTrackModal.tsx`/(이미 삭제 대상인) `trackMatcher.ts`의 import를 갈아끼워야 한다. **이 타입 이동이 이번 라운드에서 유일하게 "Spotify 파일 삭제가 YouTube 전용 파일의 컴파일을 깨뜨리는" 지점**이다 — implementer가 놓치기 쉬우므로 별도로 강조한다.
- **그 외**: 함수 로직(`searchYoutubeTracks`/`parseIso8601DurationMs`) 자체는 무수정.

#### `apps/mobile/src/services/session/mockSessionSeed.ts`
- **제거**: `buildDemoMixedPlaylist`(혼합 전용, `opposite()` 헬퍼 포함), `buildDemoParticipants`/`buildDemoPlaylist`의 `service`/`hostPlatform`/`platform` 파라미터 및 관련 분기.
- **참고(범위 판단)**: `buildDemoParticipants`/`buildDemoPlaylist`는 이미 RTDB 1라운드(2026-07-27)에서 `sessionService.createSession`이 더 이상 호출하지 않게 되어 **현재 코드베이스 어디에서도 실제로 쓰이지 않는 죽은 코드**다(파일 자체 주석이 이를 명시). 이번 라운드에서 함께 정리(단순화 또는 완전 삭제)하는 게 자연스럽지만 엄격히는 이번 결정(YouTube 단일화)의 필수 범위가 아니다 — `buildDemoMixedPlaylist`만 혼합 모드 삭제로 인해 반드시 제거해야 하는 대상이고, 나머지 둘은 "겸사겸사 정리 권장" 수준으로 표시한다.
- **유지**: `RING_COLORS`/`ringColorForIndex`(현재 `sessionService.createSession`이 실제로 사용 중, 서비스와 무관).

#### `apps/mobile/src/components/Avatar.tsx`
- **제거**: `platform?: MixedParticipantPlatform` prop과 `platformBadge` 오버레이 렌더링(혼합 세션 전용 — 참여 플랫폼이 항상 YouTube 하나뿐이라 아이콘으로 구분할 대상이 없어짐).
- **유지**: `initial`/`ringColor`/`size`/`crown` prop 전부.

#### `apps/mobile/src/components/ParticipantsBottomSheet.tsx`
- **제거**: `isPlayable`/`shouldShowFreeTag` 함수의 `session.service === 'spotify'`/`'mixed'` 분기(YouTube 케이스만 남음 → 사실상 "항상 재생 가능/Free 태그 없음"으로 상수화 가능), `isMixed`/`pendingMatchCount` 계산, `Avatar`에 넘기던 `platform={isMixed ? participant.platform : undefined}` 인자.
- **유지**: 참여자별 연결 상태(`connectionStatus`/`delaySeconds`) 표시, 방장 전용 관리자 임명/해제 메뉴, "세션 설정" 진입 링크.

#### `apps/mobile/src/components/Buttons.tsx`
- **제거**: `SpotifyButton`(오직 `SpotifyConnectScreen.tsx`에서만 쓰임, 그 화면이 삭제되므로 함께 제거).
- **유지**: `PrimaryButton`/`SecondaryButton`.

#### `apps/mobile/src/screens/OnboardingScreen.tsx`
- **내용 수정 필요(기계적 삭제로 안 끝나는 지점)**: 3번째 컷("투명성 카드")의 카피 "재생은 각자의 Spotify 앱에서 이뤄져요. feel_music_share는 그걸 맞춰주는 역할이에요 / 우리 서버가 음악을 직접 스트리밍하지 않아요. 각자 기기의 Spotify가 로컬로 재생하고..."는 **YouTube 단일 앱에서는 사실이 아니다** — YouTube는 WebView + IFrame Player로 앱 안에서 직접 재생하므로 "각자 기기의 외부 앱이 로컬로 재생한다"는 투명성 서사 자체가 성립하지 않는다. 이 카피는 디자인 에이전트와 함께 재작성이 필요한 콘텐츠 변경이지, 단순 문자열 치환이 아니다(4절에서 다시 다룸).
- **마지막 CTA**(`goToSpotifyConnect`/"Spotify로 시작하기")는 5절 인증 흐름 결정에 따라 대상이 바뀐다.

#### `apps/mobile/src/screens/SplashScreen.tsx`
- 5절 인증 흐름 결정에 의존 — 현재 `useAuth().status`(Spotify OAuth 상태)로 Home/Onboarding을 분기한다. `AuthContext.tsx`가 삭제/대체되면 이 분기 기준 자체를 다시 설계해야 한다(아래 5절 참고).

#### `apps/mobile/src/navigation/RootNavigator.tsx`
- **제거**: `<Stack.Screen name="SpotifyConnect" .../>` 등록, `import SpotifyConnectScreen`.

#### `apps/mobile/src/navigation/types.ts`
- **제거**: `RootStackParamList`의 `SpotifyConnect: undefined;` 항목.

#### `apps/mobile/src/config/env.ts`
- **제거**: `SPOTIFY_CLIENT_ID`, `SPOTIFY_REDIRECT_URI`, `SPOTIFY_SCOPES`, `SPOTIFY_APP_REMOTE_REDIRECT_URI`.
- **유지**: `FIREBASE_*`, `YOUTUBE_API_KEY`.

#### `apps/mobile/src/theme/tokens.ts`
- **정리 권장(필수는 아님)**: `brandColors.spotifyGreen`은 `SpotifyButton`/`SpotifyConnectScreen`/`PlaylistView` 서비스 칩에서만 쓰였다 — 세 곳 다 삭제/수정 대상이므로 이 상수도 사용처가 없어진다(제거하거나 주석에 "미사용" 표시). `brandColors.youtubeRed`는 계속 쓰인다(동기화 배지 등과 색을 공유하지 않도록 하는 규칙 자체는 유지).

#### 테스트 재작성 대상
- **`__tests__/serviceSwitchPlaylistIsolation.test.ts`**: `switchService` 자체가 삭제되므로 이 테스트 파일 전체가 대상을 잃는다 — **파일째 삭제**가 맞다(재작성이 아니라 삭제 대상으로 재분류. 서비스가 하나뿐이면 "서비스별 플레이리스트 격리"라는 검증 시나리오 자체가 성립하지 않는다).
- **`__tests__/joinSessionByCode.test.ts`**: `service: 'spotify'`/`service: 'mixed'`/`platform`/`platform_required` 관련 3개 테스트 케이스(혼합 세션 참여 2건 포함) 제거, 나머지 케이스(`service` 인자 제거하고)는 유지 및 재작성.
- **`__tests__/sessionPermissions.test.ts`**: `canSwitchService`/`oppositeService`/`serviceLabel`/`shouldShowServiceSwitch` 관련 describe 블록 전부 제거, `canResignAdmin`/`roleDisplayLabel` 블록만 유지.
- **`__tests__/playlistSequencing.test.ts`**, **`__tests__/youtubePlayerHtml.test.ts`**: 무수정(아래 1-E).

### 1-E. 완전히 그대로 두는 파일 (영향 없음 확인 완료)

아래 파일들은 `spotify|Spotify`/`mixed|Mixed` grep에 전혀 걸리지 않거나, 걸리더라도 주석상의 "이건 Spotify와 별개다"라는 대비 설명일 뿐 실제 코드/타입 의존이 없음을 직접 확인했다:

- `apps/mobile/src/utils/clock.ts`, `apps/mobile/src/utils/id.ts`, `apps/mobile/src/utils/format.ts`
- `apps/mobile/src/theme/ThemeContext.tsx`
- `apps/mobile/src/hooks/useDragToDismiss.ts` (`ParticipantsBottomSheet.tsx`가 계속 쓰므로 유지 — `MatchingQueueSheet.tsx` 삭제와 무관하게 존속)
- `apps/mobile/src/services/firebase/firebaseClient.ts`
- `apps/mobile/src/services/firebase/firebaseAuth.ts`, `apps/mobile/src/state/FirebaseAuthContext.tsx` (주석에 "Spotify OAuth와 별개 신원 시스템"이라는 설명이 있을 뿐, 실제 코드 의존 없음 — 다만 5절 결정에 따라 이 모듈의 역할이 커질 수 있으므로 주석 갱신은 필요할 수 있음)
- `apps/mobile/src/services/youtube/youtubePlayerHtml.ts`, `apps/mobile/src/services/youtube/youtubePlayerStub.ts` (주석에 Spotify와의 비교 설명만 있음 — `youtubePlayerStub.ts`의 `spotify:track:demoN` 폴백 예시 문구는 코드 동작에 영향 없는 주석)
- `apps/mobile/src/components/RoleBadge.tsx`, `apps/mobile/src/components/SyncStatusBadge.tsx`, `apps/mobile/src/components/PickerBadge.tsx`, `apps/mobile/src/components/BackButton.tsx`, `apps/mobile/src/components/ReconnectingOverlay.tsx`, `apps/mobile/src/components/CapacityStepper.tsx`
- `apps/mobile/src/state/playlistSequencing.ts` (주석에 "혼합"이라는 한국어 단어가 한 번 등장하지만 — `session.mixedPlaylist`와 `session.playlists[activeService].entries`가 "같은 불변식을 공유한다"는 설명일 뿐 — 코드 자체는 제네릭 `SequencedEntry[]`를 다루는 순수 함수라 아무 타입도 직접 참조하지 않음. 단, 파일 헤더 주석의 "혼합 세션 추가로 이 로직이 두 번째로 필요해져서" 배경 설명은 더는 정확하지 않으므로 주석 정리는 권장)
- `apps/mobile/__tests__/App.test.tsx`, `apps/mobile/__tests__/playlistSequencing.test.ts`, `apps/mobile/__tests__/youtubePlayerHtml.test.ts`

## 2. 데이터 모델 변경

### `MusicService` 타입 자체가 필요한가?

**필요 없다고 판단한다.** 세션이 항상 YouTube 하나뿐이면 "이 세션의 서비스가 무엇인지"를 굳이 필드/타입으로 들고 다닐 이유가 없다 — 화면 곳곳의 `session.service === 'youtube'`/`session.service === 'mixed'` 분기가 전부 죽은 코드가 된다(현재 61곳 이상의 `.service` 참조가 이 패턴). `SessionState`에서 `service` 필드를 완전히 제거하고, `MusicService`/`SingleMusicService`/`MixedParticipantPlatform` 타입 3종을 전부 삭제하는 안을 제안한다.

- **장점**: 화면 코드에서 서비스 분기가 통째로 사라져 diff가 커지는 대신 코드는 훨씬 단순해진다. "지금 YouTube가 아니면 어떻게 되는가"라는 불필요한 케이스를 영원히 걱정하지 않아도 된다.
- **트레이드오프**: 향후(가정) 다시 다른 서비스를 추가하고 싶어지면 이 필드를 되살려야 한다 — 다만 이는 `spotify-mixed-legacy` 브랜치(2026-07-28 보존됨)에 이미 참고 구현이 남아있으므로, "타입을 살려두되 값만 고정" 방식보다 필요할 때 그 브랜치를 참고해 재도입하는 편이 지금 당장의 코드 단순성과 더 잘 맞는다고 판단했다.

### `SessionState`/`ServicePlaylistState`/`ParticipantInfo` 단순화 설계

```ts
// AS-IS (Spotify+YouTube+Mixed 3종)
interface SessionState {
  service: MusicService; // 'spotify' | 'youtube' | 'mixed'
  playlists: Record<SingleMusicService, ServicePlaylistState>; // {spotify: {...}, youtube: {...}}
  mixedPlaylist: MixedPlaylistEntry[];
  playback: PlaybackState;
  participants: ParticipantInfo[]; // participant.platform?, participant.accountTier
  // ...
}

// TO-BE (YouTube 단일)
interface SessionState {
  entries: PlaylistEntry[]; // 서비스별 분기 없이 세션당 플레이리스트 하나
  playback: PlaybackState;  // 변경 없음
  participants: ParticipantInfo[]; // platform/accountTier 필드 제거
  // sessionId/inviteCode/sessionName/hostParticipantId/capacity 등은 변경 없음
}
```

- **`playlists: Record<SingleMusicService, ServicePlaylistState>` → `entries: PlaylistEntry[]`**: 서비스가 하나뿐이면 "서비스별로 독립된 플레이리스트를 보존한다"는 `ServicePlaylistState`/`ServicePlaybackMemory`의 존재 이유(US-105c "전환 후 돌아오면 이어서 쓸 수 있다") 자체가 사라진다 — 애초에 전환이라는 개념이 없기 때문이다. `lastPlayback` 스냅샷 메커니즘 전체를 함께 제거할 수 있다.
- **`mixedPlaylist: MixedPlaylistEntry[]` 필드**: 완전 제거. `MixedPlaylistEntry`/`ParticipantMatch`/`MatchedTrackCandidate` 등 관련 타입 전부(1절에서 이미 나열) 함께 제거.
- **`ParticipantInfo.platform?: MixedParticipantPlatform`**: 완전 제거(혼합 세션 개인별 참여 플랫폼 — 개념 자체가 없어짐).
- **`ParticipantInfo.accountTier: AccountTier`**: 5절에서 다루는 "Premium/Free 개념 제거" 결정에 따라 함께 제거 대상(사용자 요청 명시 사항).

### RTDB 스키마 (`docs/specs/10-rtdb-schema-and-security-rules.md`) 영향

이 문서가 설계한 `/sessions/{id}/meta.service`, `/sessions/{id}/playlists/{spotify,youtube}`, `/sessions/{id}/mixedPlaylist` 구조는 위 데이터 모델 변경과 그대로 대응된다 — `meta.service` 필드 제거, `playlists/{service}` 대신 `playlists/{entryId}`(서비스 키 계층 한 단계 제거), `/mixedPlaylist` 최상위 경로 전체 삭제. 보안 규칙(`.write` 조건)도 `$service` 와일드카드 계층이 사라지므로 한 단계 얕아진다.

다만 작업 지시가 명시한 대로, **RTDB는 아직 세션 생성/조회/참여 1라운드만 실연동됐고 `playlists`/`mixedPlaylist`/`playback`은 여전히 로컬 캐시(인메모리) 상태다**(`sessionService.ts` 상단 주석 — "부분 마이그레이션 상태"). 따라서 이번 라운드에서 실제 RTDB 스키마/규칙 JSON을 다시 배포할 필요는 없다 — `10-rtdb-schema-and-security-rules.md`는 "다음 라운드(2-A/2-B/3)가 실제로 그 경로에 쓰기 시작할 때"를 대비해 위 단순화된 구조로 문서만 갱신해두는 수준(미래 라운드 대비 설계 갱신)으로 충분하다고 판단한다. 이 문서 갱신 자체는 이번 계획 문서의 범위 밖이라 별도 후속 작업으로 남긴다.

## 3. 화면 흐름 변경 (`docs/design/00-ux-flow.md` 기준)

### 통째로 사라지는 화면/단계

- **2.6 세션 생성의 서비스 선택 라디오** ("Spotify / YouTube / 혼합" 3지선다) — 서비스 선택 자체가 없어짐.
- **2.6a Spotify 앱 설치 유도**, **2.6c 혼합 세션 참여 플랫폼 선택**(호스트·참여자 양쪽) — 대상 개념 소멸.
- **매칭 확인 화면 체인 4종**: 2.11a(매칭 시도 중 배지) / 2.11b(매칭 확인 카드) / 2.11c(대체 후보 목록) / 2.11d(매칭 실패 안내) — 혼합 모드 전용.
- **Spotify 연동 안내 + OAuth 로그인 화면**(2.3, `SpotifyConnectScreen`) — 5절 인증 흐름 결정에 따라 다른 것으로 대체되거나 완전히 없어짐.
- **2.10a Now Playing(Spotify 전용 레이아웃)**, **2.10d(혼합 세션 변형)** — 2.10c(YouTube 전용 레이아웃) 하나만 남는다.
- **2.13a/2.13b 서비스 전환 확인 다이얼로그/전환 중 오버레이** — 전환할 대상 서비스가 없으므로 소멸.
- **Free 계정 안내 배너/모달**(Now Playing 상단, `SpotifyConnectScreen`의 Premium 모달) — 5절 "Premium/Free 개념 제거" 결정에 따라 소멸.

### 단순화되는 화면

- **`CreateSessionScreen`(2.6)**: 서비스 선택 없이 "세션 이름 + 정원"만 입력하는 화면으로 축소(요청 산출물이 명시한 결론과 동일). 안내 배너(`INFO_BY_SERVICE`)는 YouTube 고정 문구 하나로 단순화하거나 제거.
- **`SessionSettingsView`(2.13)**: "음악 서비스: 전환하기" 항목 전체 제거 — 남는 항목은 내 역할(+ 관리자 사임하기)/초대 코드/정원 3개뿐. 02-key-ui-patterns.md 10절("세 가지 상태" 표)도 서비스 전환 UI 자체가 없으므로 해당 절 자체가 무의미해짐(디자인 문서 쪽 후속 정리는 디자인 에이전트 몫).
- **`PlaylistView`(2.10b)**: 상단 "서비스 칩 상시 노출" 정책(YouTube/Spotify 라벨 전환) → 칩이 있다면 "YouTube 플레이리스트"로 고정되거나, 서비스가 하나뿐이라 칩 자체의 존재 의미(세션 설정 단축 진입점)만 남기고 시각적으로 단순화할지는 디자인 재검토가 필요하다.
- **`ParticipantsBottomSheet`(2.12)**: Free 계정 표시/재생 가능 인원 조건부 헤더가 사라지고 "참여자 (N)"로 고정. 참여자 아바타의 플랫폼 아이콘 오버레이도 사라진다.
- **온보딩(2.2) 3번째 컷**: "투명성 카드" 콘텐츠를 YouTube in-app 재생 방식에 맞게 다시 써야 한다(1-D `OnboardingScreen.tsx` 항목 참고 — 디자인 에이전트 협업 필요, 단순 삭제 아님).
- **1. 전체 플로우 개요(mermaid)**: `I0`(서비스 선택 분기)/`J1b`(참여 시 세션 유형 분기)/`O`(매칭 체인 서브그래프)/`Q~X`(서비스 전환 서브그래프) 노드가 전부 제거되고 그래프가 크게 단순해진다 — 이 mermaid 다이어그램 자체의 재작성은 디자인 에이전트 몫으로 넘긴다.

## 4. 설정/의존성 정리

| 항목 | 위치 | 조치 |
|---|---|---|
| `SPOTIFY_CLIENT_ID`/`SPOTIFY_REDIRECT_URI`/`SPOTIFY_SCOPES`/`SPOTIFY_APP_REMOTE_REDIRECT_URI` | `apps/mobile/src/config/env.ts` | 제거 |
| `react-native-app-auth` | `apps/mobile/package.json` | **제거 가능 — grep으로 확인**: `services/auth/spotifyAuth.ts` 단 한 곳에서만 `authorize`/`refresh`를 import한다. 다른 OAuth 용도(예: Google 로그인)로 재사용되는 곳 없음. 단, 5절 인증 흐름 결정에서 "다른 OAuth 로그인(예: Google)을 새로 도입"하는 선택지를 고르면 이 패키지를 다시 쓰게 될 수 있다 — 그 경우 삭제를 보류하고 재검토. |
| Android `manifestPlaceholders { appAuthRedirectScheme: "feelmusicshare" }` | `apps/mobile/android/app/build.gradle` (defaultConfig, 128~138행) | `react-native-app-auth` 제거가 확정되면 함께 제거 — `net.openid.appauth.RedirectUriReceiverActivity`의 intent-filter data scheme 치환용이라 라이브러리 없이는 무의미 |
| iOS `CFBundleURLTypes`(scheme `feelmusicshare`) | `apps/mobile/ios/mobile/Info.plist` (23~38행) | 마찬가지로 `react-native-app-auth` 콜백 수신용 — 라이브러리 제거 시 함께 제거. 단, 5절에서 "다른 OAuth 로그인"을 채택하면 스킴 자체는 재사용/재등록될 수 있음 |
| `com.google.gms.google-services` 플러그인 | `apps/mobile/android/app/build.gradle` (7행) | **영향 없음** — Firebase 연동용, Spotify와 무관 |
| `@react-native-firebase/*` 의존성 | `package.json` | **영향 없음** |
| `react-native-gesture-handler` | `package.json` | **영향 없음(유지 확인)** — `MatchingQueueSheet.tsx`(삭제 대상)뿐 아니라 `ParticipantsBottomSheet.tsx`(드래그로 닫기)와 `PlaylistView.tsx`(스와이프 삭제, `Swipeable`)도 이 패키지를 쓴다. 혼합 모드 삭제와 무관하게 계속 필요 |
| `react-native-webview` | `package.json` | **영향 없음** — YouTube IFrame Player 전용, 계속 필요 |

## 5. 인증(로그인) 흐름 재검토 — 선택지 제시 (결정하지 않음)

### 문제 정의

현재 `AuthContext.tsx`(Spotify OAuth)가 앱의 유일한 "로그인" 개념이다. `status: 'signed_out'|'signing_in'|'signed_in'|'error'`, `profile.displayName`/`profile.isPremium`이 `HomeScreen`/`CreateSessionScreen`/`SplashScreen`/`RoomScreen`(Now Playing 상단 Free 배너 등) 전반에서 "지금 로그인한 사람이 누구인지" + "Premium인지"를 판단하는 유일한 근거로 쓰이고 있다. Spotify가 사라지면 이 판단 근거 자체가 사라진다.

한편 `FirebaseAuthContext.tsx`(Firebase Auth 익명 인증, `uid`)는 이미 존재하고 실제로 세션 생성/참여의 `participantId`로 쓰이고 있다(RTDB 보안 규칙이 "본인 여부"를 검증하는 유일한 수단, 2026-07-27 결정). 다만 이 `uid`는 "위조 불가능한 세션 내 고유 식별자"일 뿐, **표시 이름(displayName)이나 아바타 같은 "이 사람이 누구인가"에 대한 사람이 읽을 수 있는 정보를 전혀 담지 않는다.**

### 선택지

**(a) 닉네임 입력만 받는 간단한 온보딩으로 대체**
- 앱 시작 시 `FirebaseAuthProvider`가 익명 `uid`를 자동 발급(이미 동작 중)하고, 최초 1회(또는 매번) 닉네임 입력 화면 하나만 거쳐 로컬(AsyncStorage 등)에 닉네임을 저장 — 그 값을 `ParticipantInfo.displayName`으로 계속 재사용.
- 장점: 구현이 가장 단순하다. "로그인"이라는 개념 자체를 없애 앱 진입 마찰이 최소화된다(장거리 연인·친구 소규모 세션이라는 실사용 맥락과 잘 맞음).
- 단점: 앱을 지웠다 다시 설치하면(또는 다른 기기) 완전히 새 신원이 된다 — 익명 인증 자체가 기기/설치 단위라 "내 계정"이라는 연속성이 없다. 닉네임 변경/프로필 개념이 아예 없어 향후 확장(예: "이전에 만든 세션 목록" 같은 기능)의 발판이 약하다.

**(b) Firebase 익명 인증을 신원 기반으로 삼되 최초 1회 닉네임/아바타 설정 화면 추가**
- (a)와 메커니즘은 비슷하지만, "로그인은 아니지만 최초 진입 시 프로필을 한 번 설정한다"는 것을 온보딩의 정식 단계로 명시하고(2.2 온보딩 다음, 2.3 자리를 대체), 닉네임 외에 아바타 색/이니셜 커스터마이징 등을 함께 받는 화면으로 설계.
- 장점: (a)와 구현 난이도는 비슷하면서, "이 앱에도 최소한의 온보딩 의례가 있다"는 느낌을 준다. 향후 아바타 이미지 업로드 등으로 자연스럽게 확장 가능한 자리를 미리 만들어둠.
- 단점: (a)와 동일하게 기기 간 연속성 없음. 화면을 하나 더 만드는 비용이 (a)보다 약간 더 든다.

**(c) 기타 — 실제 OAuth 로그인(예: Google Sign-In)으로 대체**
- Firebase Auth의 Google 로그인 제공업체를 활성화해 "구글 계정으로 로그인"을 앱의 정식 로그인 수단으로 채택. `uid`는 익명이 아니라 실제 Google 계정에 연결된 값이 되고, `displayName`/프로필 사진도 Google 계정에서 바로 가져올 수 있음.
- 장점: 기기를 바꿔도 같은 계정으로 로그인하면 신원이 유지된다(익명 인증의 근본적 한계 해소). "진짜 로그인"이라는 사용자 기대에 부합. Firebase Auth가 익명 계정을 나중에 Google 계정으로 승격(link)하는 것도 지원해 (a)/(b)에서 시작했다가 나중에 이쪽으로 마이그레이션하는 경로도 있음.
- 단점: 구현 비용이 셋 중 가장 크다 — Google Cloud Console OAuth 클라이언트 등록(Android는 SHA-1 지문 등록 필요), `@react-native-google-signin/google-signin` 등 신규 네이티브 의존성 추가, iOS/Android 양쪽 빌드 재검증 필요. "장거리 연인·친구가 가볍게 세션 하나 열고 닫는" 이 앱의 실사용 맥락에서 Google 계정 로그인 마�찰이 오히려 온보딩 이탈을 늘릴 수 있다는 리스크도 있음(사용자 결정 시 고려 요망).

### 함께 제거 대상 — Premium/Free 개념

`AccountTier`(`'premium'|'free'`) 타입, `ParticipantInfo.accountTier` 필드, `profile.isPremium` 판정, Now Playing 상단 Free 계정 안내 배너(`NowPlayingView.tsx` — 이미 파일째 삭제 대상), `ParticipantsBottomSheet`의 Free 태그/재생 가능 인원 조건부 헤더, `SpotifyConnectScreen`의 Premium 필요 안내 모달 전부는 **Spotify Premium 여부에서 유래한 개념이라 YouTube 단일 앱에서는 의미가 없다** — 위 (a)/(b)/(c) 중 무엇을 고르든 공통으로 제거 대상이다(YouTube는 US-103에 따라 애초에 Premium 여부로 재생 가능 인원이 갈리지 않으므로, 이 개념이 없어져도 기능적 손실이 없다).

### 어느 화면이 이 결정에 직접 의존하는가

`SplashScreen.tsx`(현재 `useAuth().status`로 Home/Onboarding 분기), `HomeScreen.tsx`/`CreateSessionScreen.tsx`(현재 `useAuth().profile`로 `displayName`/`accountTier` 조달), `RootNavigator.tsx`(`SpotifyConnect` 라우트를 대체할 새 라우트가 필요할 수 있음), `OnboardingScreen.tsx`(마지막 CTA 대상) — 이 5개 화면은 5절 결정이 나기 전까지 최종 형태를 확정할 수 없다. 6절 로드맵에서 이 부분을 별도 라운드로 분리한 이유이기도 하다.

## 6. 단계별 구현 로드맵 제안

파일 개수가 많고(삭제 17개 + 테스트 3개 삭제/2개 재작성 + 부분 수정 약 20개) 여러 라운드로 나누지 않으면 한 커밋에서 리뷰가 사실상 불가능하다. 아래 4라운드를 제안한다.

### 라운드 1 — 데이터 모델 + 세션 서비스 계층 (컴파일 안 되는 상태 시작점)
- `types/domain.ts` 타입 정리(2절), `services/session/sessionService.ts`/`state/SessionContext.tsx`/`state/activeServicePlaylist.ts`/`state/sessionPermissions.ts` 정리.
- **이 라운드가 끝나도 앱은 컴파일되지 않는다** — 화면들(`CreateSessionScreen` 등)이 여전히 삭제된 타입/함수를 참조하기 때문이다. 이는 불가피하다: 데이터 모델을 먼저 안정시키지 않으면 화면 쪽 수정이 "무엇을 향해" 단순화해야 하는지 기준이 없다. implementer가 여러 커밋으로 나누더라도 이 라운드의 "마지막" 커밋 전까지는 컴파일 실패 상태가 여러 번 나올 수 있음을 리더가 미리 인지해야 한다.
- 왜 먼저인가: 나머지 모든 라운드(화면/인증/설정)가 이 타입/함수 시그니처에 의존한다 — 가장 하위 계층이라 먼저 고정해야 위 계층 작업이 반복(재작업) 없이 진행된다.

### 라운드 2 — 화면 UI (Spotify/혼합 전용 화면·컴포넌트 삭제 + 나머지 화면 단순화)
- 1-A/1-B의 완전 삭제 대상 파일 전부 삭제, 1-D의 화면/컴포넌트(`CreateSessionScreen`/`HomeScreen`/`RoomScreen`/`YouTubeNowPlayingView`/`PlaylistView`/`SessionSettingsView`/`AddTrackModal`/`Avatar`/`ParticipantsBottomSheet`/`Buttons`) 수정.
- **주의(순서 의존)**: `services/youtube/youtubeSearch.ts`의 `SpotifySearchTrack` 타입 이전(1-D 항목)을 `spotifyWebApi.ts` 삭제와 **같은 커밋 또는 그 직전 커밋**에서 처리해야 한다 — 그렇지 않으면 YouTube 검색 자체가 컴파일 에러로 깨진다.
- `HomeScreen.tsx`/`CreateSessionScreen.tsx`는 `useAuth()`(5절 결정 전) 호출부를 일단 남겨두고 진행할지, 라운드 3과 합쳐서 진행할지 판단 필요 — 아래 라운드 3 참고.
- 이 라운드가 끝나면 라운드 1의 컴파일 실패가 대부분 해소되지만, `useAuth()`/`AuthContext.tsx` 관련 호출부는 5절 결정이 나기 전까지 여전히 Spotify OAuth 스캐폴딩을 그대로 쓰는 상태로 남을 수 있다(과도기적으로 허용 가능 — "로그인 개념"이 무엇으로 바뀌는지와 무관하게 화면 레이아웃 단순화는 먼저 끝낼 수 있기 때문).

### 라운드 3 — 인증 흐름 재설계 (5절 사용자 결정 이후 착수)
- 5절 (a)/(b)/(c) 중 사용자 결정이 내려진 뒤 시작 — **이 라운드는 리더가 사용자 결정을 받아오기 전까지 시작할 수 없다**(기획 범위 제한 — planner가 임의로 확정하지 않음).
- `AuthContext.tsx`/`SpotifyConnectScreen.tsx` 대체, `SplashScreen.tsx`/`RootNavigator.tsx`/`navigation/types.ts`의 로그인 관련 라우팅 재설계, `HomeScreen.tsx`/`CreateSessionScreen.tsx`의 프로필 조달 방식 교체, `AccountTier`/Premium/Free 관련 잔여 코드 최종 제거.
- `OnboardingScreen.tsx` 콘텐츠 재작성(3절 "투명성 카드" 문제)도 이 라운드에 포함 — 디자인 에이전트와 협업 필요.

### 라운드 4 — 설정/의존성 정리 + 테스트/문서 최종 정리
- `config/env.ts`/`package.json`(`react-native-app-auth` 제거 여부는 라운드 3의 5절 결정에 따라 확정)/`android/app/build.gradle`/`ios/mobile/Info.plist` 정리(4절).
- `theme/tokens.ts`(`spotifyGreen` 정리), `services/session/mockSessionSeed.ts`(죽은 코드 정리), 테스트 파일 3종 삭제 + 2종 재작성(1-D 테스트 항목) + `serviceSwitchPlaylistIsolation.test.ts` 삭제.
- `docs/specs/10-rtdb-schema-and-security-rules.md`의 스키마 단순화 반영(2절 — 미래 라운드 대비 설계 갱신 수준).
- 전체 `grep -r "spotify\|Spotify\|mixed\|Mixed"` 재확인으로 잔여 참조 없음 검증 — verifier에게 넘기기 전 최종 청소.

### 왜 이 순서인가 (요약)
데이터 모델(1) → 화면(2) → 인증(3) → 설정 정리(4) 순서는 "가장 많은 다른 코드가 의존하는 것부터 고정한다"는 원칙을 따른다. 인증(5절)을 화면 라운드보다 뒤로 뺀 이유는 순수하게 **사용자 결정이 아직 없기 때문**이다 — 화면 레이아웃 단순화(라운드 2)는 어떤 로그인 방식을 고르든 결과가 같지만, 라운드 3은 결정 내용에 따라 완전히 다른 코드가 만들어지므로 먼저 진행할 수 없다. 설정/의존성 정리(4)를 마지막에 둔 이유는 `react-native-app-auth` 제거 여부 자체가 라운드 3의 결정(옵션 c를 고르면 이 라이브러리를 다른 형태로 재사용할 수도 있음)에 달려있어, 그 전에 지우면 되돌리는 수고가 생길 수 있기 때문이다.

## 요약 — 리더에게 전달할 것

1. 위 1~4절은 그대로 implementer에게 라운드별로 위임 가능한 수준의 구체성으로 작성했다.
2. **5절(인증 흐름)은 사용자 결정이 필요하다** — (a) 닉네임만 입력받는 온보딩, (b) 익명 인증 + 최초 1회 프로필 설정 화면, (c) 실제 OAuth(Google 등) 로그인 세 가지 중 선택, 또는 리더가 별도로 정리할 제4의 안. `docs/decisions-needed.md`에 항목 추가를 권장한다.
3. 라운드 1(데이터 모델)은 5절 결정과 무관하게 즉시 착수 가능하다 — 리더가 바로 implementer에게 위임해도 무방하다.
