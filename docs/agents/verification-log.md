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

