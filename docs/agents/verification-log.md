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

