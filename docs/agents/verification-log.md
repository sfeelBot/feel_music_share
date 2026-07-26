# 검증(Verification) 작업 로그

작업 시작/종료 시 아래 형식으로 항목을 **추가**한다 (append-only, 기존 내용 삭제 금지).

```
## YYYY-MM-DD
- 검증 대상: ...
- 플랫폼: iOS / Android / 둘 다
- 결과: 통과 | 실패 | 부분 통과
- 상세: ...
```

## 2026-07-24
- 검증 대상: Spotify 전용 세션 MVP 핵심 화면 구현 (커밋 `e4057fe`, 온보딩~플레이리스트~참여자 바텀시트). 첫 검증 라운드 — `docs/qa/`에 선행 체크리스트 없음, 이번에 `docs/qa/spotify-mvp-round1-checklist.md` 신규 작성.
- 플랫폼: 둘 다 (단, 둘 다 실기기/에뮬레이터 빌드는 환경 제약으로 미검증 — 아래 상세 참고)
- 결과: 부분 통과 (기능 버그 3건 발견, 구현 라운드로 반려 권고)
- 상세:
  - 정적 검증 재현: `npx tsc --noEmit`(0 errors), `npx eslint .`(0 errors, 12 benign inline-style warnings), `npx jest`(1/1 pass) — 리더 사전 보고와 정확히 일치, 직접 재현 확인함.
  - Android: `cd android && ./gradlew.bat assembleDebug` 실행 시 `JAVA_HOME`/`java` 부재로 즉시 실패. Android SDK는 설치돼 있으나 JDK가 이 머신에 연결돼 있지 않아 빌드 성공 여부 자체를 판단 불가 — "미검증(환경 제약)"으로 기록, 임의로 통과 처리하지 않음. 네이티브 프로젝트 파일은 이번 커밋에서 변경되지 않음(코드 리뷰로만 확인).
  - iOS: Windows에는 Xcode가 없어 빌드/실행 자체가 구조적으로 불가능 — "실기기/CI 환경에서 별도 검증 필요"로 명시. 코드 리뷰 수준에서는 `Platform.OS` 분기나 iOS 전용 API 오남용을 발견하지 못함(애초에 `Platform` API 사용 자체가 없음).
  - 기능 요구사항 대조 결과 실패 3건: (1) `state/SessionContext.tsx`의 `removeTrack`이 현재 재생 중인 곡 삭제 시 다음 곡으로 자동 전환하지 않음(`04-playlist.md` 기능목록 2번 위반, 재현: 플레이리스트에서 현재 곡 롱프레스 삭제 → Now Playing이 "재생할 곡이 없어요"로 멈춤) — 가장 중요한 발견, 구현 라운드로 반려 필요. (2) `screens/room/NowPlayingView.tsx`의 "이전 곡"(⏮) 버튼에 onPress 핸들러 없음(장식용 버튼, TODO 표시도 없어 의도 불명). (3) `services/session/mockSessionSeed.ts`가 정원 값과 무관하게 항상 참여자 3명을 시드해 기본 정원(2명)과 충돌하는 목업 데이터 — 데모 한정 이슈.
  - 정원 스테퍼(2~12, 기본 2명)·역할 배지(방장/관리자/일반사용자)·관리자 임명은 방장 전용·Free 계정 배너(Spotify 세션 조건부)·동기화 상태 4단계 배지·선곡자 배지·참여 인원 vs 재생 인원 조건부 표시 등 기획/디자인 문서의 핵심 요구사항은 코드 레벨에서 모두 반영 확인함(상세는 체크리스트 4절 참고). 다만 Free 배너의 "Spotify 세션에서만" 조건은 서비스 타입을 직접 참조하는 가드 없이 "이번 라운드가 Spotify 세션만 있어서 우연히 참"인 상태라 YouTube 세션 추가 시 반드시 보강 필요.
  - 전체 항목: 통과 20 / 실패 3 / 미검증(환경 제약) 3 / 의도적 범위 밖(문서화됨) 2. "완료"로 간주하지 않음 — 구현 에이전트에게 반려 권고.

## 2026-07-24 (Round 2)
- 검증 대상: Round 1 QA 실패 항목 수정 (커밋 `74ac205` "Fix round-1 QA failures: track auto-advance, prev button, seed cap") — `docs/qa/spotify-mvp-round1-checklist.md`의 4.12/4.15/4.16 실패 항목 및 5절 메모(Free 배너 가드, 재생완료곡 삭제 제한, 라디오 접근성) 재현 확인. `docs/qa/spotify-mvp-round1-checklist.md`에 "## Round 2 재검증 (2026-07-24)" 절 추가(append).
- 플랫폼: 둘 다 (코드 레벨 정적 리뷰 기준. 실기기/에뮬레이터 빌드는 round 1과 동일한 환경 구조적 제약 — JDK/JAVA_HOME 부재, macOS/Xcode 부재 — 로 재시도하지 않고 round 1 결론을 그대로 인용)
- 결과: 통과 (요청받은 6개 수정 항목 전부 코드 레벨에서 확인, 정적 검증 3종도 재현)
- 상세:
  - `SessionContext.tsx`의 `removeTrack`을 직접 추적: 삭제 전 `wasCurrent`/`removedIndex`를 캡처해두고, 현재 재생 곡이 삭제된 경우에만 원래 배열 기준 `removedIndex + 1`(=삭제 후 배열에서 정확히 다음 곡)을 찾아 `playedStatus: 'playing'`으로 전환 + `playback.currentEntryId` 갱신. off-by-one 없음, 다음 곡이 없으면 `currentEntryId: null`로 명시적 "재생할 곡 없음" 상태 처리 — 4.12 재현되지 않음(통과).
  - 신규 `requestPrevTrack`이 `currentIndex > 0`일 때만 동작(없으면 `prev` 그대로 반환)하고, `NowPlayingView.tsx`가 `hasPrevTrack = currentIndex > 0`으로 버튼 `disabled`/`accessibilityState`/`onPress={requestPrevTrack}`을 모두 연결 — 4.15 통과.
  - `mockSessionSeed.ts`의 `buildDemoParticipants(host, capacity)`가 `otherSlots = Math.max(0, Math.min(DEMO_OTHERS.length, capacity - 1))`로 계산, 기본 정원 2명 기준 호스트+1명=총 2명으로 정원과 정확히 일치(초과 없음). `sessionService.createSession`도 동일 `capacity` 값을 참여자 시드와 세션 상태 필드 양쪽에 일관되게 사용 — 4.16 통과.
  - `NowPlayingView.tsx` 53행에 `viewerIsFree && session.service === 'spotify'` 가드 확인 — Free 배너 가드 통과.
  - `PlaylistView.tsx`의 `TrackRow.onLongPress`가 `readOnly` 조건 없이 항상 `onDelete` 호출하도록 변경, 드래그 핸들(순서 변경 UI)은 `readOnly`일 때 여전히 빈 자리로 대체되어 "삭제는 허용, 순서 변경만 제한"이 정확히 반영됨 — 통과.
  - `CreateSessionScreen.tsx`의 `RadioRow`에 `accessibilityRole="radio"`, `accessibilityState={{selected, disabled}}` 추가 확인 — 통과.
  - 정적 검증 독립 재실행: `npx tsc --noEmit`(0 errors), `npx eslint .`(0 errors, 13 warnings — round 1의 12건 + `NowPlayingView.tsx` 신규 조건부 inline-style 1건, 전부 관용적 benign 패턴), `npx jest`(1/1 pass) — 리더 사전 보고와 일치.
  - 회귀 확인(diff 미포함 파일 재확인): `RoleBadge.tsx`(regular 배지 없음 로직), `ParticipantsBottomSheet.tsx`(`canManage = viewerIsHost && item.role !== 'host'`), `SyncStatusBadge.tsx`(4단계 분기), `CapacityStepper.tsx`/정원 흐름 — 모두 round 1과 동일하게 유지, 이번 커밋으로 인한 회귀 없음.
  - 미해결로 남아 있으나 이번 라운드 판정 범위 밖(round 1부터 이어지는 기지 TODO): Android/iOS 실기기 런타임 검증(환경 구조적 제약), 커스텀 URL 스킴(딥링크) 미등록, 드래그앤드롭 순서 변경 미구현, 코드로 참여하기 미구현, 서버 측 권한 재검증 부재.
  - 종합: 6개 수정 항목 전부 "통과"로 판정 — 이번 라운드는 "완료"로 간주 가능. 단, 실기기 검증 미비와 기지 TODO는 계속 추적 필요.

## 2026-07-25 (Round 3)
- 검증 대상: 플레이리스트 순서 변경 실구현(US-303, ▲/▼ 버튼) + YouTube 전용 세션 화면 신규(커밋 `22776fd` "Implement playlist reorder and YouTube-only session screens"). `docs/qa/spotify-mvp-round1-checklist.md`에 "## Round 3 검증 (2026-07-25)" 절 추가(append).
- 플랫폼: 둘 다 (Android는 이번 라운드 처음으로 `assembleDebug` 독립 재현 성공 — 증분 1회 + `clean assembleDebug` 완전 재빌드 1회 모두 `BUILD SUCCESSFUL`. iOS는 이전 라운드와 동일한 환경 구조적 제약(macOS/Xcode 부재)으로 코드 리뷰 수준까지만 확인, round 1 결론 인용)
- 결과: 부분 통과 (핵심 기능 3건은 견고하게 통과, 인접 컴포넌트에서 서비스 격리 실패 1건 신규 발견 — 구현 라운드로 반려 권고)
- 상세:
  - 정적 검증 독립 재실행: `npx tsc --noEmit`(0 errors), `npx eslint .`(0 errors, 16 warnings — 전부 기존과 동일한 관용적 inline-style 패턴), `npx jest`(1/1 pass) — 구현 로그 주장과 정확히 일치.
  - Android: `./gradlew.bat assembleDebug --no-daemon`(증분, 9s, 대부분 UP-TO-DATE) 및 `./gradlew.bat clean assembleDebug --no-daemon`(완전 재빌드, 2m 2s, 177 tasks 중 152 executed) 모두 `BUILD SUCCESSFUL` 확인, APK 생성(130,723,643 bytes) 확인 — 캐시에 의존하지 않는 독립 재현으로 구현 에이전트 주장을 신뢰 가능한 수준으로 검증함.
  - `SessionContext.tsx`의 `requestMoveTrack` 코드 추적: (a) `idx <= currentIndex`면 이동 대상에서 제외(재생 완료+현재 재생 곡 모두 방어), (b) `targetIdx <= currentIndex \|\| targetIdx >= playlist.length`로 배열 양끝 경계 방어, (c) `PlaylistView.tsx`가 `pending` 큐 로컬 인덱스로 첫/마지막 항목의 ▲/▼를 `disabled` 처리, (d) 현재 재생 곡(`isPlaying`)엔 기존 ▶ 글리프, 재생 완료 곡(`readOnly`)엔 기존 빈 자리(`handlePlaceholder`) 유지하고 이동 콜백 자체를 넘기지 않아 버튼이 아예 렌더링되지 않음 — 4개 조건 모두 통과.
  - YouTube 화면(`YouTubeNowPlayingView.tsx`) 대조: `docs/design/00-ux-flow.md` 2.10c, `docs/design/02-key-ui-patterns.md` 2.2a·4절 기준으로 (1) 플레이어 영역 위에 오버레이 없음(레이어링 금지 준수), (2) `minHeight: 200` + `width: '100%'`로 최소 크기 요건 충족, (3) 재생/일시정지 버튼이 `youtubePlayerController.playVideo()/pauseVideo()`를 실제로 호출(STUB이라 최종 재생 확인은 불가하나 배선 자체는 장식이 아님), (4) 광고 상태를 신규 상태로 만들지 않고 기존 "맞추는 중" 배지에 `reasonLabel`만 보강, (5) 조작성 커스텀 컨트롤(스킵/타이머) 없음 — 모두 통과.
  - 서비스별 격리: `NowPlayingView.tsx`(Spotify 전용, Free 배너 가드 유지)와 `YouTubeNowPlayingView.tsx`는 완전히 분리된 컴포넌트이고 `RoomScreen.tsx`의 `session.service === 'youtube'` 라우팅도 정확함 — Now Playing 레벨은 통과. **다만 `ParticipantsBottomSheet.tsx`가 `session.service`를 전혀 참조하지 않아, YouTube 세션에서도 `accountTier === 'free'`인 참여자에게 "Free · 재생 불가" 태그와 "참여 N명 · 재생 M명" 조건부 헤더를 그대로 노출하는 문제를 신규로 발견함** — round 1/2에서 `NowPlayingView`에 대해 이미 고쳤던 것과 동일한 종류의 결함이 인접 컴포넌트에 남아 있던 사례. 재현: YouTube 세션을 정원 3명 이상으로 생성(목업 참여자 "준호"가 `accountTier: 'free'`로 시드됨) → 참여자 바텀시트(⋮)를 열면 "준호"에게 "Free · 재생 불가" 태그와 함께 헤더가 "참여자 (N) · 재생 M명"으로 표시됨(YouTube는 US-103에 따라 이런 제약이 없어야 함). 관련 파일: `RoomScreen.tsx`, `ParticipantsBottomSheet.tsx`, `mockSessionSeed.ts`(`buildDemoParticipants`), `sessionService.ts`(`createSession`).
  - 회귀 확인(diff 미포함 파일): 역할 배지, 관리자 임명/사임 방장 전용, 정원 스테퍼, Free 배너 Spotify 전용 가드(`NowPlayingView.tsx` 자체는 변경 없음), 동기화 상태 4단계 — 모두 이전 라운드와 동일하게 유지, 회귀 없음.
  - 전체 항목: 통과 21 / 실패 1(R3.17, `ParticipantsBottomSheet` 서비스 격리 누락) / 미검증 0 / 의도된 범위 밖 2(YouTube 실제 영상 재생 여부 — WebView 미설치로 다음 라운드 TODO, 혼합 세션 — 이번 라운드 지시 범위 밖). "완료"로 간주하지 않음 — R3.17을 구현 에이전트에게 반려 권고. 나머지(순서 변경 US-303, YouTube 화면 정책 준수, Android clean 빌드)는 신뢰할 수 있는 수준으로 통과 확인됨.

## 2026-07-26 (Round 4)
- 검증 대상: 표시 이름을 "SameWave"로 변경(Android strings.xml/app.json displayName/iOS Info.plist CFBundleDisplayName) + Android 실앱 아이콘(노을 그라디언트+겹치는 두 원) 5개 밀도 교체(커밋 `d22c6b3` "Apply SameWave display name and real app icon (Android)") + 배포 APK 파일명을 `SameWave-debug.apk`로 통일(커밋 `b6877b5` "Rename distributed APK to SameWave-debug.apk"). `docs/qa/spotify-mvp-round1-checklist.md`에 "## Round 4 검증 (2026-07-26)" 절 추가(append).
- 플랫폼: 둘 다 (Android는 `clean assembleDebug` 독립 재현 + `aapt2 dump badging` 재현 + APK 내부 mipmap PNG 바이트 비교까지 수행. iOS는 여전히 구조적 제약(macOS/Xcode 부재)으로 `Info.plist` XML 구조 육안 검토만 수행, round 1 결론 인용)
- 결과: 통과 (지시받은 검증 범위 내에서 완료로 간주 가능, 실패 0건)
- 상세:
  - 정적 검증 독립 재실행: `npx tsc --noEmit`(0 errors), `npx eslint .`(0 errors, 16 warnings — round 3과 완전히 동일), `npx jest`(1/1 pass) — 두 커밋 모두 `.ts`/`.tsx` 파일을 전혀 건드리지 않았음을 `git show --stat`으로 확인, 회귀 리스크 구조적으로 없음.
  - Android `clean assembleDebug --no-daemon` 완전 재빌드(캐시 배제) 독립 재현 성공: `BUILD SUCCESSFUL in 1m 50s`, APK 130,741,787 bytes 생성 확인.
  - `E:\Android\Sdk\build-tools\36.1.0\aapt2.exe dump badging`로 `application-label:'SameWave'`(모든 로케일 변형 포함) 직접 확인 — 구현 에이전트 주장 재현.
  - RN 내부 등록 키 3곳을 직접 파일 열람으로 대조: `app.json`의 `"name": "mobile"`, `MainActivity.kt`의 `getMainComponentName() = "mobile"`, `AppDelegate.mm`의 `moduleName = @"mobile"` — 셋 다 정확히 일치, 표시 이름 변경이 RN 컴포넌트 등록을 깨뜨리지 않았음을 확인.
  - 아이콘 검증: `unzip`으로 APK 내부 5개 밀도(mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi)의 `ic_launcher.png`/`ic_launcher_round.png`를 추출해 소스 리포 PNG와 `diff`로 바이트 단위 비교 — 5개 전부(라운드형 아이콘은 xxxhdpi로 대표 확인) 완전히 동일(IDENTICAL). xxxhdpi 아이콘을 직접 이미지로 열람해 노을 그라디언트+겹치는 두 원+작은 점+세로 바 디자인이 `docs/design/03-screen-mockups.html` 인라인 SVG와 시각적으로 일치함을 확인, 기본 안드로이드 아이콘이 아님을 확인. `mipmap-anydpi-v26` 폴더가 존재하지 않아 "적응형 아이콘 없음, legacy 교체가 전체 범위" 주장과도 일치.
  - iOS `Info.plist`: XML 구조(선언/DTD/dict 태그 짝)가 정상이고 `CFBundleDisplayName` 값만 교체됐으며 다른 키(URL scheme 등)는 손상되지 않음을 육안으로 확인 — 문법 수준 확인이며, macOS 전용 파서(plutil 등) 실행이나 실제 iOS 런타임 검증은 이 환경에서 불가능(round 1~3과 동일한 구조적 제약).
  - 배포 파일명 변경(`b6877b5`): `.github/workflows/android-debug-apk.yml`의 rename/upload-artifact/release-action 3곳, `README.md`, `docs/releases/ci-android-debug-apk.md` 모두 `SameWave-debug.apk`로 일관되게 변경됨을 diff로 확인, 릴리즈 태그(`android-debug-latest`)는 유지됨. YAML 프로그램적 파싱 검증은 이 환경에 `js-yaml` 등 파서가 없어 수행하지 못하고 육안 구조 검토로 대체(한계로 명시). 두 커밋이 아직 push되지 않아 실제 CI 실행에서 새 파일명 릴리즈 게시 확인은 미검증(push 이후 별도 확인 필요).
  - 전체 항목: 통과 17 / 실패 0 / 미검증(환경 제약·미push) 2(iOS 실런타임, 실제 CI 실행 확인) / 프로그램적 검증 미수행·육안 대체 1(YAML 파싱). round 3에서 미해결로 남은 R3.17(`ParticipantsBottomSheet` 서비스 미인지)은 이번 두 커밋의 변경 범위 밖이라 그대로 미해결 상태로 남아 있으며 이번 판정에 영향 없음 — 리더가 계속 추적 필요.

## 2026-07-26 (Round 5)
- 검증 대상: YouTube 세션 실제 영상 재생 연동 — WebView + IFrame Player API(커밋 `7a888f2` "Implement real YouTube playback via WebView + IFrame Player API"). `docs/qa/spotify-mvp-round1-checklist.md`에 "## Round 5 검증 (2026-07-26)" 절 추가(append).
- 플랫폼: 둘 다 (Android는 `clean` → `assembleDebug --no-daemon` 완전 재빌드 독립 재현 성공, react-native-webview 네이티브 모듈 컴파일/autolinking 정상 확인. iOS는 이번 커밋이 `ios/` 파일을 전혀 건드리지 않았고 코드 리뷰상 Platform 분기·iOS 전용 API도 없어 회귀 리스크는 낮으나, macOS/Xcode 부재로 실빌드·런타임은 여전히 구조적으로 미검증 — round 1~4와 동일한 제약)
- 결과: 부분 통과 (정책 준수·정적 검증·회귀 확인은 전부 통과, 신규 코드에서 실기기 없이도 코드 트레이스만으로 확정 재현 가능한 로직 버그 1건 발견 — 구현 라운드로 반려 권고)

## 2026-07-26 (Round 6, R5.17 재검증)
- 검증 대상: Round 5에서 발견한 R5.17(YouTube WebView ref 재부착 경합 버그) 수정 재검증 — `apps/mobile/src/screens/room/YouTubeNowPlayingView.tsx` 1개 파일(`isWebViewMounted` 파생 변수 추가 + attach effect 의존성 `[]`→`[isWebViewMounted]`), 미커밋 작업 트리 변경분(`docs/agents/implementation-log.md`의 "2026-07-26 (버그 수정: R5.17 WebView 재부착 경합)" 항목 대상). `docs/qa/spotify-mvp-round1-checklist.md`에 "## Round 6 재검증 (2026-07-26)" 절 추가(append).
- 플랫폼: 둘 다 (Android는 `assembleDebug --no-daemon` 증분 1회 + `clean` → `assembleDebug --no-daemon` 완전 재빌드 1회, 총 2회 독립 재현 성공. iOS는 이번 diff가 `ios/` 파일·`Platform.OS` 분기를 전혀 건드리지 않아 이번 라운드 지시 범위 밖 — macOS/Xcode 부재로 실빌드는 이번에도 구조적으로 미검증, round 1~5 결론 그대로 인용)
- 결과: 통과
- 상세:
  - 변경 범위를 `git status`/`git diff`로 독립 재확인 — 배경 설명대로 코드 변경은 `YouTubeNowPlayingView.tsx` 1개 파일(10 insertions, 1 deletion)뿐임을 확인, 다른 파일은 diff에 등장하지 않음.
  - 리더가 정리한 5개 시나리오(최초 마운트 / 같은 세션 곡 전환 / 플레이리스트 비워짐 / 재추가 시 재부착[핵심] / 전체 언마운트) 전부를 `youtubePlayerStub.ts`의 `_attachWebView`/`run`/`flushPendingCommands`까지 함께 열람해 독립적으로 재추적 — React의 "effect는 커밋 이후 실행" + "cleanup은 다음 effect 실행보다 먼저" 규칙에 근거해 각 시나리오에서 WebView 인스턴스와 컨트롤러 attach 상태가 항상 정합적임을 확인. 특히 (d) 재추가 시나리오(R5.17의 핵심 재현 지점)에서 이제 effect가 재실행되어 새 WebView 인스턴스가 정상 attach됨을 확인, `_attachWebView(null)`이 `ready`/`pendingCommands`까지 리셋하는 방어 로직도 함께 확인.
  - 정적 검증 독립 재실행: `npx tsc --noEmit`(0 errors), `npx eslint .`(0 errors, 16 warnings — round 3~5와 정확히 동일), `npx jest`(1/1 pass) — 구현 에이전트의 "0 errors/16 warnings/1 pass" 주장과 정확히 일치.
  - Android `assembleDebug --no-daemon` 증분 빌드(`BUILD SUCCESSFUL in 10s`, 대부분 UP-TO-DATE) + `clean` → `assembleDebug --no-daemon` 완전 재빌드(`BUILD SUCCESSFUL in 1m 52s`, APK 133,490,480 bytes 생성) 2회 모두 독립 재현 성공 — 캐시 의존 가능성도 클린 재빌드로 배제.
  - 회귀 확인: Round 5에서 통과했던 정책 준수(DOM 비조작·표준 API·컨트롤 비오버레이·광고 중 seek 억제·200px 최소 크기)와 서비스 격리 가드(`ParticipantsBottomSheet`의 `session.service === 'spotify'` 등) 관련 파일이 이번 diff에 전혀 등장하지 않음을 재확인 — 회귀 없음.
  - 전체 항목: 통과 15(R6.1~R6.15) / 실패 0 / 미검증 iOS 실빌드(이번 diff의 지시 범위 밖, 구조적 제약 그대로 인용). R5.17은 코드 레벨에서 확실히 해소된 것으로 판정하며, 이번 라운드는 "완료"로 간주할 수 있다.
- 상세:
  - 정적 검증 독립 재실행: `npx tsc --noEmit`(0 errors), `npx eslint .`(0 errors, 16 warnings — round 3/4와 완전히 동일), `npx jest`(1/1 pass, `__mocks__/react-native-webview.js` manual mock 정상 작동) — 구현 로그 주장과 일치.
  - Android: `./gradlew.bat clean --no-daemon`(1m 19s, `react_codegen_RNCWebViewSpec-*` clean 태스크 확인) 후 `./gradlew.bat assembleDebug --no-daemon`(캐시 미사용 완전 재빌드, 3m 57s, 203 tasks 중 173 executed) 모두 `BUILD SUCCESSFUL` — `react-native-webview` 컴파일/autolinking을 캐시 없이 독립 재현. APK 내부 `assets/index.android.bundle`(1,064,104 bytes) 존재도 재확인해 2026-07-25 라운드에서 고친 "Unable to load script" 회귀가 없음을 확인.
  - 정책 준수(`docs/specs/03-youtube-integration.md` 8절, `docs/design/02-key-ui-patterns.md` 2.2a/4절, `docs/design/00-ux-flow.md` 2.10c) 코드 리뷰: `youtubePlayerHtml.ts`가 표준 IFrame Player API 함수만 호출하고 DOM 조작/광고 스킵 코드가 전혀 없음을 전체 라인 확인, 커스텀 컨트롤이 플레이어 영역 바깥에 배치되고(오버레이 스타일 없음) 최소 200px 높이 유지, 커스텀 재생 버튼이 실제 `playVideo()/pauseVideo()`를 호출, `seekTo()`가 광고 재생 중이면 조기 반환(단 현재는 이 가드를 호출하는 동기화 엔진 자체가 아직 없어 미사용 상태 — 결함 아님, 다음 라운드 재확인 필요), 광고 상태는 신규 상태를 만들지 않고 기존 "맞추는 중" 배지에 `reasonLabel`만 보강 — 모두 통과.
  - 회귀 확인: 이번 커밋의 `apps/mobile/src` diff가 `youtube/` 서비스 폴더와 `YouTubeNowPlayingView.tsx`로만 한정됨을 `git diff --stat`으로 확인 — `ParticipantsBottomSheet.tsx`(R3.17에서 고친 `session.service === 'spotify'` 가드), `NowPlayingView.tsx`(Spotify 전용 Free 배너 가드), `PlaylistView.tsx`/`AddTrackModal.tsx`(서비스별 분기), `RoomScreen.tsx`(라우팅), `SessionContext.tsx` 모두 이번 커밋에서 변경되지 않았고 직접 열람으로 기존 가드가 그대로 남아 있음을 재확인 — 회귀 없음.
  - **신규 발견(실패)**: `YouTubeNowPlayingView.tsx`의 WebView 부착 effect(`useEffect(() => { youtubePlayerController._attachWebView(webViewRef.current); ... }, [])`)가 빈 의존성 배열이라 컴포넌트 최초 마운트 시 1회만 실행된다. 재현: ① 현재 재생 곡을 포함해 플레이리스트를 전부 삭제(`currentEntryId: null`, WebView가 "재생할 영상이 없어요" placeholder로 대체돼 언마운트) → ② 탭을 벗어나지 않고 새 곡 추가(`addTrack`은 `currentEntryId`를 갱신하지 않아 여전히 `null`) → ③ "다음 곡" 버튼(disabled 가드 없음)을 탭하면 `requestNextTrack`이 `findIndex(null)`의 `-1` 폴백으로 `playlist[0]`을 새 현재 곡으로 선택 → ④ WebView가 이 시점에 처음 마운트되지만, 부착 effect는 이미 1회 실행이 끝난 뒤라 재실행되지 않아 컨트롤러의 내부 `webViewRef`는 계속 `null`로 남는다 → ⑤ 이후 `loadVideoById` 명령이 `pendingCommands` 큐에 쌓이기만 하고 `flushPendingCommands`가 `webViewRef`가 없어 영구히 실행되지 않는다 — 새로 추가한 영상이 로드되지 않고 화면이 조용히 멈춘다(크래시/에러 메시지 없음). Now Playing 탭을 벗어났다가 돌아오면 컴포넌트 전체가 재마운트되며 자연 복구된다. 이 결함은 실기기 없이 코드 정적 추적만으로 확정 재현 가능하며, US-301/302가 허용하는 정상 사용 흐름(플레이리스트 비우기 → 다시 채우기)에서 발생하므로 엣지 케이스로 넘기지 않고 실패로 판정했다. 권장 수정 방향: attach effect의 의존성을 WebView 마운트 여부에 연동하거나, `useRef`+`useEffect` 대신 콜백 ref로 전환.
  - 미검증(환경 제약/실기기 필요, 실패 아님 — 구현 에이전트가 이미 스스로 명시한 항목과 대부분 일치): iOS 실빌드/런타임(구조적 제약), 광고 감지 휴리스틱의 실기기 정확도, `mockSessionSeed`/`youtubeMockSearch`의 videoId가 실제 존재하지 않아 실기기에서 `onError` 예상(기존에 알려진 제약, 이번 라운드 범위 밖), WebView 자동재생의 실기기 동작.
  - 전체 항목: 통과 16 / 실패 1(R5.17, WebView ref 재부착 버그) / 미검증(환경 제약·실기기 필요) 4. "완료"로 간주하지 않음 — R5.17을 구현 에이전트에게 반려 권고. 나머지(정책 준수, 정적 검증, Android 클린 빌드, 서비스 격리 회귀 없음)는 신뢰할 수 있는 수준으로 통과 확인됨.

## 2026-07-26 (Round 7, 혼합(Mixed) 세션 모드)
- 검증 대상: 혼합(Mixed) 세션 모드 실제 구현 (커밋 `dbd275c`, 27개 파일 — Spotify 전용/YouTube 전용에 이은 세 번째 세션 유형, 신규 컴포넌트 6개 + 신규 유틸 4개 + 신규 테스트 3종). `docs/qa/spotify-mvp-round1-checklist.md`에 "## Round 7 검증 (혼합 모드)" 절 추가(append).
- 플랫폼: 둘 다 (Android는 `clean` → `assembleDebug --no-daemon` 완전 재빌드로 독립 재현, `BUILD SUCCESSFUL in 1m 51s` + APK 133,517,424 bytes 생성 확인. iOS는 이번 커밋이 네이티브 파일을 전혀 건드리지 않고 `Platform.OS` 분기도 없어 구조적 리스크는 낮다고 판단하나, macOS/Xcode 부재로 코드 리뷰 수준까지만 수행 — round 1~6과 동일한 환경 제약, 지시사항에 명시된 처리 방식 그대로).
- 결과: 부분 통과 (핵심 정책 2건은 독립 재확인 완료, 기능 버그 1건 발견 — 구현 라운드로 반려 권고)
- 상세:
  - **핵심 정책 재확인(리더 확인을 신뢰하되 독립 검증)**: (1) "매칭이 참여자별로 절대 조용히 확정되지 않는다"(09문서 결정 2) — `sessionService.addMixedTrack`/`mixedMatching.resolveParticipantMatch`의 `confirmState` 대입 지점을 전수 조사해, 성공/실패·추가자 본인 여부와 무관하게 항상 `pending`으로 시작하고, `confirmMyMatch`/`manualMatchTrack`(참여자의 명시적 액션)만이 이를 바꿈을 확인. 유일한 예외는 데모 시드(`buildDemoMixedPlaylist`)로, 기존 라운드들의 데모 픽스처 관행과 동일하며 구현 로그에 명시돼 은폐되지 않음. (2) 데이터가 `pending`인 것이 실제로 재생 UI에도 반영되는지까지 추적 — `state/mixedTrackView.ts`의 `resolveMixedCurrentTrackForMe`가 `confirmState==='pending'`이면 `kind:'awaitingConfirm'`(≠'ready')을 반환하고, `NowPlayingView.tsx`/`YouTubeNowPlayingView.tsx` 둘 다 `kind!=='ready'`일 때 재생 영역 대신 상태 카드를 렌더함을 확인 — 데이터-UI 우회 경로 없음.
  - **R3.17류 재발 방지**: `ParticipantsBottomSheet.tsx`(`isPlayable`/`shouldShowFreeTag`), `NowPlayingView.tsx`(혼합 분기), `YouTubeNowPlayingView.tsx`(혼합 분기) 세 곳 모두 `p.platform === 'spotify' && p.accountTier === 'free'`라는 동일한 참여자 개별 판단 리터럴을 쓰고 있어 세션 전체 가드가 새어 들어가는 패턴이 재발하지 않았음을 확인. 기존 Spotify/YouTube 전용 세션에서도 새 `isPlayable`/`shouldShowFreeTag` 함수가 옛 `showFreeTierUi` boolean 로직과 조건식 수준에서 동치임을 대수적으로 증명해 회귀 없음을 확인.
  - **전체 플로우 코드 트레이스**: (a) 혼합 세션 생성→호스트 플랫폼 선택(2.6c)→세션 진입 통과. (b) 곡 추가→매칭 큐 배지→네 갈래 액션 배선 자체는 정확하나, `MatchingQueueSheet.tsx`의 큐 "다음 항목" 로직에서 신규 버그 발견(아래 참고). (c) Now Playing 상태 카드("확인하러 가기") 통과. (d) 아바타 서비스 아이콘 오버레이 + "나: Spotify/YouTube" 배지 통과.
  - **데이터 모델 일관성**: `MixedPlaylistEntry`/`ParticipantMatch`/`MatchedTrackCandidate` 등 신규 타입이 `trackMatcher.ts`→`mixedMatching.ts`→`sessionService.ts`→`SessionContext.tsx`→UI 컴포넌트 전체 경로에서 필드명이 어긋나지 않음을 확인. `requestNextTrack`/`requestPrevTrack`/`removeTrack`/`requestMoveTrack` 전부 `session.service==='mixed'`로 명시적 분기, 공유 순수 함수(`state/playlistSequencing.ts`)가 제네릭으로 양쪽 타입에 안전하게 재사용됨을 확인.
  - **기존 세션 유형 회귀 확인**(`git diff`로 세부 대조): `NowPlayingView.tsx`/`YouTubeNowPlayingView.tsx`/`PlaylistView.tsx`의 비-혼합 코드 경로가 원문과 100% 동일하게 보존됨(얼리 리턴/삼항 분기만 추가), `AddTrackModal.tsx`/`Avatar.tsx`의 신규 prop은 전부 옵셔널이라 기존 호출부에 영향 없음, `RoomScreen.tsx`의 라우팅 조건식도 비-혼합 세션에서 옛 조건식과 동치임을 확인 — 회귀 없음.
  - **단위 테스트 내용 검토**: `trackMatcher.test.ts`(동명이곡 오매칭 방지를 실제 점수 비교 assert로 검증, 에디션 표기·길이 오차 허용 케이스 포함), `playlistSequencing.test.ts`(경계 이동 차단을 참조 동일성까지 확인), `mixedTrackView.test.ts`(정책 핵심인 "matched+pending→awaitingConfirm, ≠ready" 분기를 직접 assert) 모두 형식적 통과가 아니라 실질적 내용을 갖춘 테스트로 확인.
  - 정적 검증 독립 재실행: `npx tsc --noEmit`(0 errors), `npx eslint .`(0 errors, 22 warnings — 기존 16개+신규 6개, 전부 관용적 `react-native/no-inline-styles`), `npx jest`(4 suites/16 tests 전부 통과) — 구현 로그 주장과 정확히 일치. `package.json`/`package-lock.json` 변경 없음(신규 네이티브 의존성 없음)도 재확인.
  - **신규 발견(실패)**: `MatchingQueueSheet.tsx`의 `goToNextInQueue`가 "처리 전"(방금 처리한 항목이 아직 포함된) `myPendingMatchEntryIds.length`를 기준으로 커서를 +1 계산하는데, React가 같은 이벤트 핸들러 안의 `setState` 호출들을 배칭하는 특성상 실제로는 처리한 항목이 배열에서 빠진 "더 짧아진" 배열에 그 커서를 그대로 적용하게 되어 매번 한 칸 더 앞서가 버린다. 대기 항목이 정확히 2건이면(기본 정원 2명 데모에서 곡 2개를 연달아 추가하는 흔한 시나리오로 도달 가능) 첫 항목 처리 직후 인덱스가 배열 범위를 벗어나 시트가 조기 종료돼 두 번째 항목을 아예 보여주지 못하고, 3건 이상이면 항목이 통째로 건너뛰어진다. "확정하기"/"직접 검색하기"/"이 곡 없이 넘어가기" 세 액션 모두 동일한 결함을 공유("다른 결과 보기"의 후보 선택 경로는 설계상 큐를 넘기지 않아 영향 없음). 정책 위반(자동 조용한 확정)은 아니다 — 건너뛰어진 항목은 데이터상 여전히 `pending`으로 남아 재확인 가능하다 — 하지만 00-ux-flow.md 2.11a가 명시한 "여러 개면 다음/이전으로 넘기는 큐 형태"라는 요구 동작이 깨져 있어 실기기 없이 React state batching 규칙에 근거한 코드 정적 추적으로 확정 재현해 실패로 판정했다(Round 5의 R5.17과 동일한 검증 방법론).
  - 참고(실패 아님): `MatchConfirmCard`의 "확정하기" 버튼이 일치율 등급과 무관하게 항상 1차 강조 스타일 — `02-key-ui-patterns.md` 5.3절은 낮음 등급일 때 outline으로 낮출 것을 "제안"했으나 확정을 차단하라고 요구하지는 않았고, 신뢰도 배지가 이미 "확인 필요" 경고를 표시하므로 정책 위반은 아님. 다음 라운드 개선 후보로만 기록.
  - 알려진 제약(실패로 잡지 않음, 이미 문서화됨): Spotify App Remote SDK 미연동, YouTube mock videoId 비실존, 매칭 가중치 실측 전 잠정값, "코드로 참여하기" 미연결 — 지시사항에 명시된 범위 그대로.
  - 전체 항목: 통과 25 / 부분 실패 1(R7.7, 아래 R7.13과 동일 근거) / 실패 1(R7.13 — `MatchingQueueSheet` 큐 인덱싱 버그) / 참고 1(R7.32, 실패 아님) / 미검증 iOS 실빌드(환경 제약, 코드 리뷰 수준으로 대체). "완료"로 간주하지 않음 — R7.13을 구현 에이전트에게 반려 권고. 핵심 정책 2건(조용한 확정 금지, R3.17류 가드)과 기존 세션 유형 회귀 없음은 신뢰할 수 있는 수준으로 통과 확인됨.

## 2026-07-26 (Round 8, R7.13 재검증)
- 검증 대상: Round 7의 유일한 실패 항목 R7.13(`MatchingQueueSheet.tsx`의 큐 인덱싱 버그, 대기 항목 정확히 2건일 때 조기 종료·3건 이상일 때 항목 건너뜀) 수정 (커밋 `095e3cf`). 숫자 `cursor` state와 관련 `useEffect` 2개를 완전히 제거하고 신규 순수 함수 `state/matchQueueNavigation.ts`의 `resolveQueueEntryId()`로 대체 — 매 렌더마다 실제 `myPendingMatchEntryIds`에서 직접 다음 항목을 계산하도록 구조 자체를 바꿔 stale-length 경합을 원천 제거. `docs/qa/spotify-mvp-round1-checklist.md`에 "## Round 8 재검증" 절 추가(append). 범위가 좁아 R7.13 재현/해소 확인 + 정적 검증 + Android 빌드 + 회귀 확인에 집중(Round 5→6 재검증과 동일한 성격).
- 플랫폼: 둘 다 (Android는 `assembleDebug --no-daemon`으로 `BUILD SUCCESSFUL in 44s` 독립 재현. iOS는 이번 diff가 네이티브 파일을 전혀 건드리지 않아 구조적 리스크는 낮으나 macOS/Xcode 부재로 코드 리뷰 수준까지만 수행 — Round 1~7과 동일한 환경 제약).
- 결과: 통과
- 상세:
  - `git show 095e3cf` diff를 직접 확인 — `MatchingQueueSheet.tsx`(수정, 29줄), `state/matchQueueNavigation.ts`(신규, 45줄), `__tests__/matchQueueNavigation.test.ts`(신규, 59줄), `implementation-log.md`(35줄) 4개 파일에 정확히 국한됨. `grep -rn "cursor"`로 코드에 숫자 cursor state가 하나도 남지 않았음을 재확인(남은 3건은 전부 주석).
  - **시나리오 재현/해소 end-to-end 추적**: (a) 대기 정확히 2건 — `myPendingMatchEntryIds=['A','B']`에서 A 확정 → `SessionContext.tsx`의 `confirmMyMatch`가 `confirmState:'confirmed'`로 설정 → `myPendingMatchEntryIds` `useMemo`가 재계산되어 `['B']`로 줄어듦 → `resolveQueueEntryId(['B'])`가 `'B'`를 반환해 두 번째 카드가 정상 표시됨(조기 종료 재현 안 됨). (b) 대기 3건 이상 — 동일한 방식으로 A→B→C 순서대로 전부 표시됨을 확인(건너뜀 재현 안 됨). (c) 확정/스킵/수동교체 세 콜백 모두 "처리 함수 호출 → `setMode('card')`"만 하고 다음 항목 계산 책임을 컴포넌트 렌더 로직(공통 `resolveQueueEntryId` 호출 1곳)으로 완전히 옮겨 세 경로가 동일하게 동작함을 확인. (d) `if (!entry || !myMatch) { onClose(); ... }` 자동 종료 가드는 이번 diff에서 전혀 수정되지 않았고 `resolveQueueEntryId([])`가 `undefined`를 반환하는 것으로 자연스럽게 이어져 회귀 없음.
  - `resolveQueueEntryId`의 `skippedIds` 파라미터가 실제로 UI에서 쓰이지 않는다는 구현 로그 주장을 코드로 확인(컴포넌트가 인자 없이 호출) — 향후 확장 대비 설계로 판단해 실패로 잡지 않음. 다만 그 결과 헤더의 `(N/M)` 카운터가 `indexOf`가 항상 0을 반환해 매번 "(1/남은 개수)"로만 표시되는 부작용을 참고사항으로만 기록(데이터 정확성·정책과 무관, 실패 아님).
  - `matchQueueNavigation.test.ts` 7건 내용 검토 — N=2/N=3 재현 시나리오, skippedIds 시맨틱(건너뛰기/wrap-around/처리와 넘겨봄 혼합), 빈 배열 등을 각각 전용 테스트로 의미 있게 커버함을 확인(형식적 스모크 테스트 아님).
  - 정적 검증 독립 재현: `npx tsc --noEmit`(0 errors), `npx eslint .`(0 errors, 22 warnings — Round 7과 정확히 동일), `npx jest`(5 suites/23 tests 전부 통과, 신규 7건 포함 회귀 없음) — 구현 로그 주장과 정확히 일치. Android `assembleDebug --no-daemon` → BUILD SUCCESSFUL in 44s.
  - **회귀 확인**: diff가 `SessionContext.tsx`/`ParticipantsBottomSheet.tsx`/`NowPlayingView.tsx`/`YouTubeNowPlayingView.tsx`를 전혀 건드리지 않아 Round 7이 통과시킨 정책 준수(조용한 확정 금지)와 서비스 격리(R3.17류 개별 가드)에 영향 없음. 2.11c의 후보 선택 예외 경로(`selectMyMatchCandidate`, R7.7이 확인한 "goToNextInQueue를 호출하지 않는 유일한 예외")도 이번 diff에서 변경되지 않아 그대로 유지됨을 확인.
  - 전체 항목: 통과 17 / 참고 1(R8.8, 헤더 카운터가 항상 "1/남은개수"로 표시되는 사소한 UX 참고사항, 실패 아님) / 미검증 iOS 실빌드(환경 제약, 신규 아님). **"완료"로 간주한다** — R7.13이 구조적으로 해소됐고 다른 회귀도 발견되지 않음. Round 7의 25개 통과 항목 + 이번 R7.13 해소를 합쳐 **혼합 모드(Round 7 + Round 8) 전체를 "완료"로 결론짓는다.**

## 2026-07-26 (Round 9, Spotify Premium 안내 모달)
- 검증 대상: 실기기에서 발견된 버그 수정 — `SpotifyConnectScreen.tsx`의 "Premium이 없으신가요? →" 링크에 `onPress` 핸들러가 없어 눌러도 아무 반응이 없던 문제(커밋 `977298c` "Wire up "no Premium?" link with an info modal instead of a dead button"). 새 네비게이션 라우트 대신 같은 화면에 안내 `Modal`을 추가해 "로그인 계속하기"(기존 `login()` 재사용) / "Spotify Premium 알아보기"(`Linking.openURL`) / 닫기 3버튼을 배선. 지금까지 리더 자체 diff 리뷰만 거쳤고 정식 verifier 라운드는 처음. `docs/qa/spotify-mvp-round1-checklist.md`에 "## Round 9 검증 (Spotify Premium 안내 모달)" 절 추가(append). 단일 화면 소규모 변경이라 전체 체크리스트를 반복하지 않고 diff/정책 준수/배선/다크모드/정적 검증/Android 빌드에 집중.
- 플랫폼: 둘 다 (Android는 `assembleDebug --no-daemon`으로 `BUILD SUCCESSFUL in 10s` 독립 재현. iOS는 이번 diff도 네이티브 파일을 전혀 건드리지 않아 구조적 리스크는 낮으나 macOS/Xcode 부재로 코드 리뷰 수준까지만 수행 — Round 1~8과 동일한 환경 제약. 실기기 Spotify OAuth 콜백 자체는 지시사항에 따라 "미검증(환경 제약)"으로만 기록, 이번 라운드 검증 범위 밖.)
- 결과: 통과
- 상세:
  - `git show 977298c` diff를 직접 확인 — `SpotifyConnectScreen.tsx`(79줄 변경, 신규 컴포넌트/네비게이션 라우트 없음) + `implementation-log.md`(13줄 추가) 2개 파일에 정확히 국한됨(`navigation/types.ts` 변경 없음, 새 라우트 없음 확인).
  - **정책 준수(가장 중요한 확인 항목)**: `docs/specs/04-playlist.md` "Free 계정(무료 등급) 처리" 절을 직접 재확인 — 2026-07-24 확정된 "해석 A"(참여 자체는 항상 허용, 동기화 재생 제어만 제한)와 "해석 B"(세션 진입 자체 제한, 폐기됨) 문구를 원문으로 대조. 모달 본문 문구가 이 확정 정책과 표현·의미 모두 정확히 일치. 화면 코드 전체(1~151행)에 `isPremium`/`accountTier` 등 등급 판별 식별자가 전혀 없고, `login()` 호출과 `navigation.replace('Home')` 모두 등급과 무관하게 조건 없이 실행됨을 확인 — 새로운 차단 로직 없음. 저장소 전체(`grep -rn "isPremium|premium" apps/mobile/src`)에서도 등급 게이팅 로직이 이번 diff에 포함되지 않은 기존 파일들(`HomeScreen.tsx`, `NowPlayingView.tsx` 등)에만 있음을 재확인해, 로직이 다른 곳으로 우회 이전됐을 가능성도 배제.
  - "로그인 계속하기"가 새 인증 로직 없이 기존 `useAuth().login()`을 그대로 재사용함을 확인(화면 상단 기존 로그인 버튼과 동일 함수 참조, `AuthContext.tsx`/`spotifyAuth.ts`는 diff에 포함되지 않음). `Linking.openURL(...).catch(() => {})`로 명시적 에러 핸들링이 있어 브라우저 오픈 실패 시에도 모달이 깨지지 않고 "닫기"로 정상 빠져나갈 수 있음을 확인.
  - 다크모드: 모달 카드/제목/본문/닫기 텍스트가 전부 `theme.bgElevated`/`theme.text`/`theme.textSecondary` 토큰을 사용하며, `theme/tokens.ts`에 라이트·다크 양쪽 값이 정의돼 있음을 확인. 오버레이 스크림(`rgba(0,0,0,0.5)`)은 관용적으로 고정값이어도 무방.
  - 정적 검증 독립 재현: `npx tsc --noEmit`(0 errors), `npx eslint .`(0 errors, 22 warnings — Round 8과 정확히 동일한 파일/경고, `SpotifyConnectScreen.tsx`는 경고 목록에 없음), `npx jest`(5 suites/23 tests 전부 통과, 회귀 없음 — 구현 로그가 "4 suites/16 tests"로 적은 것은 Round 8 이전 스냅샷 반영 누락으로 보이나 실질적 회귀는 아님). Android `assembleDebug --no-daemon` → BUILD SUCCESSFUL in 10s.
  - 실기기 Spotify OAuth 콜백(모달 애니메이션, 브라우저 전환, 딥링크 복귀, 다크모드 육안 대비)은 지시사항에 따라 이번 라운드 범위 밖으로 남기고 "미검증(환경 제약)"으로만 기록 — 실패로 카운트하지 않음.
  - 전체 항목: 통과 12 / 미검증(환경 제약, 실패 아님) 1(실기기 OAuth 콜백/브라우저 전환/딥링크 복귀/다크모드 육안 확인) / 실패 0. **"완료"로 간주한다.**

