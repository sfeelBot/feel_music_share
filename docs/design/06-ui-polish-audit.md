# 06. UI 폴리시 감사 — 스와이프 삭제 명세 + 전체 UX 개선 목록

> 상태: 제안 단계 — 파트 A는 "바로 구현 가능한 수준"의 확정 명세로 작성했고, 파트 B는 **우선순위를 매기지 않은 채** 항목만 정리했다(우선순위 확정은 리더가 사용자 확인 후 진행).
> 작성: 디자인 서브에이전트, 2026-07-27
> 입력 자료: `apps/mobile/src/screens/room/PlaylistView.tsx`, `apps/mobile/src/screens/RoomScreen.tsx`, `apps/mobile/src/screens/room/NowPlayingView.tsx`, `apps/mobile/src/screens/room/YouTubeNowPlayingView.tsx`, `apps/mobile/src/screens/room/SessionSettingsView.tsx`, `apps/mobile/src/screens/HomeScreen.tsx`, `apps/mobile/src/screens/CreateSessionScreen.tsx`, `apps/mobile/src/screens/OnboardingScreen.tsx`, `apps/mobile/src/components/*.tsx`, `apps/mobile/src/theme/tokens.ts`, `apps/mobile/src/navigation/RootNavigator.tsx`, `apps/mobile/package.json`, `docs/design/00-ux-flow.md`, `docs/design/01-style-guide.md`, `docs/roadmap.md`.
> 범위: 코드는 건드리지 않았다 — 전부 문서 산출물이다. 실제 구현은 다음 라운드에 implementer가 담당한다.

---

## 파트 A. 스와이프 삭제 UX 명세

### A.1 현재 상태 (코드 확인 결과)

`PlaylistView.tsx`의 `TrackRow`/`MixedTrackRow`는 둘 다 다음과 같이 동작한다.

- 행 전체가 `TouchableOpacity`로 감싸져 있고, `onLongPress`(350ms)에 `onDelete(entry)`가 연결돼 있다. 즉 **현재 삭제 방법은 "길게 누르기 → `Alert.alert` 확인 다이얼로그 → 확인 시 `removeTrack(entryId)`"** 뿐이다(`confirmDelete`/`confirmDeleteMixed` 함수, `SessionContext.removeTrack(entryId: string)`).
- 스와이프 삭제는 전혀 구현돼 있지 않다.
- 순서 변경은 "다음 곡들" 섹션(재생 완료/현재 재생 중 제외)에서만 행 왼쪽의 ▲/▼ 버튼으로 이뤄진다(`requestMoveTrack(entryId, 'up'|'down')`). 재생 완료 섹션은 읽기 전용, 현재 재생 중인 곡은 ▶ 아이콘만 표시하고 순서 변경 버튼 자체가 없다.
- 순서 변경 버튼도 없고 읽기 전용도 아닌 경우를 위한 "⠿" 핸들 글리프(`handleGlyph`)가 스타일에 정의돼 있지만, 실제 렌더 분기(`isPlaying` → readOnly → `canReorder` → else)를 따라가 보면 지금 데이터 흐름에서는 이 else 분기에 도달하는 경우가 없다 — **사실상 죽은 코드(vestigial)**다. 원래 드래그 핸들 UI였던 흔적으로 보인다(`PlaylistView.tsx` 17~23행 주석 — "드래그 라이브러리를 새로 설치하는 대신 ▲/▼ 버튼을 쓴다"는 과거 판단 참고).
- **의존성 확인**: `apps/mobile/package.json`에 `react-native-gesture-handler`, `react-native-reanimated`가 **둘 다 없다**. `@react-navigation/native-stack`은 네이티브 화면 전환을 쓰므로 gesture-handler에 의존하지 않는다(순수 JS `Stack.Navigator`와 달리 native-stack은 필수 의존성이 아님) — 그래서 지금까지 두 라이브러리 없이도 앱이 동작해왔다. `ParticipantsBottomSheet.tsx` 주석에도 "드래그로 닫는 제스처는 제스처 라이브러리 미설치로 이번엔 구현하지 않음, TODO: gesture-handler 도입 시 추가"라고 명시돼 있어, 스와이프 삭제 도입 시 이 TODO도 함께 해소할 좋은 기회다(파트 B 3번 항목 참고).

### A.2 라이브러리 결정

**`react-native-gesture-handler`의 `Swipeable`(Animated 기반, 레거시가 아니라 v2에서도 계속 제공되는 표준 컴포넌트)을 신규 의존성으로 추가한다.**

- `react-native-reanimated`는 **추가하지 않는다.** `Swipeable`은 gesture-handler 자체에 내장된 `Animated`(RN 코어) 기반 구현이라 reanimated 없이도 동작한다. `ReanimatedSwipeable`(reanimated 필요한 버전)은 더 부드러운 애니메이션을 제공하지만, 이번 목적(단순 좌스와이프 → 삭제 버튼 노출)에는 과한 의존성 추가다 — "새 네이티브 의존성은 꼭 필요한 만큼만 추가한다"는 기존 프로젝트 관례(`PlaylistView.tsx`/`ParticipantsBottomSheet.tsx` 주석에 반복 등장)를 그대로 따른다.
- 신규 의존성 1개(`react-native-gesture-handler`)만 추가되며, 이번 라운드에서 함께 처리하면 좋은 부수 효과: `ParticipantsBottomSheet`/`MatchingQueueSheet`의 "드래그로 닫기" TODO도 같은 라이브러리로 해소 가능(파트 B 3번, 이번 라운드 필수는 아님).
- **구현 시 필수 설정** (implementer가 놓치기 쉬운 부분, 미리 남겨둠):
  1. 앱 루트(예: `App.tsx` 또는 `index.js`)를 `GestureHandlerRootView`로 감싸야 한다(감싸지 않으면 iOS/Android 모두에서 제스처가 아예 반응하지 않는다).
  2. Android는 네이티브 코드가 포함된 라이브러리라 `pod install`(iOS)뿐 아니라 Android 쪽 재빌드(`assembleDebug`)도 필요 — 로드맵 "Android 검증 수준" 기준상 이번 라운드는 "주요 기능 추가"에 해당할 가능성이 높아 실기기/에뮬레이터 검증까지 요청하는 것을 권장(리더가 검증 에이전트에게 지시할 때 참고).
  3. `FlatList`/`ScrollView` 안에서 `Swipeable`을 쓸 때 세로 스크롤과 가로 스와이프 제스처가 충돌하지 않는지 확인 필요(일반적으로 `Swipeable`은 가로 팬만 인식하므로 기본 설정으로 충돌 없음 — 다만 실제 리스트에 넣어보고 QA 단계에서 재확인 권장).

### A.3 상호작용 명세 (단계별)

대상: `PlaylistView.tsx`의 `TrackRow`/`MixedTrackRow` 전체 — "다음 곡들"(현재 재생 중 포함) 섹션과 "재생 완료" 섹션 모두. **현재 롱프레스로 삭제 가능한 범위와 동일하게, 스와이프도 모든 행에서 동작한다**(현재 재생 중인 곡도 삭제 가능해야 스킵 대체 수단이 되므로 기존 동작을 유지).

1. **평상시(Idle)**: 행은 지금과 동일하게 보인다(제목/아티스트/선곡자 배지, 필요 시 매칭 상태 텍스트, ▲/▼ 버튼 또는 ▶/읽기전용 표시).
2. **왼쪽으로 드래그 시작**: 행 콘텐츠 전체가 손가락을 따라 왼쪽으로 이동하며, 오른쪽에서 빨간 "삭제" 액션 패널이 함께 드러난다(`renderRightActions`).
3. **일정 지점(threshold)을 넘기고 손을 뗌**: 액션 패널이 완전히 열린 상태로 스냅(고정)된다 — iOS Mail과 동일하게, 액션 패널 너비(A.6 참고)만큼만 열리고 그 이상은 열리지 않는다(`overshootRight={false}`로 바운스 억제, 과한 탄성은 스타일 가이드 4절 "급격한 바운스 지양" 원칙과도 맞음).
4. **threshold를 넘기지 못하고 손을 뗌**: 원위치로 스냅되며 닫힌다.
5. **열린 상태에서 "삭제" 버튼 탭**: 즉시(확인 다이얼로그 없이) 해당 행이 리스트에서 사라지고, 화면 하단에 되돌리기(Undo) 스낵바가 나타난다(A.4 참고).
6. **열린 상태에서 다른 곳(행 자체 또는 다른 행)을 탭**: 열려 있던 행이 원위치로 닫힌다(표준 `Swipeable` 동작 — 동시에 하나의 행만 열려 있도록 `SwipeableRow` 목록에서 ref로 관리하는 것을 권장, `react-native-gesture-handler` 공식 예제의 일반적인 패턴).
7. **롱프레스(기존 유지)**: 기존처럼 `Alert.alert` 확인 다이얼로그가 뜨고, "삭제" 선택 시 즉시 삭제된다(Undo 없음 — 이미 명시적으로 확인 절차를 거쳤으므로 불필요). 이 경로는 스와이프 제스처를 모르는 사용자, 또는 스크린리더 사용자를 위한 **접근 가능한 대체 경로**로 남긴다(A.7 참고).

### A.4 삭제 확인(confirm) 여부 — 판단 근거

**스와이프 → 탭 삭제 경로에는 confirm 다이얼로그를 넣지 않는다.** 대신 Undo(되돌리기)를 넣는다.

근거:
- iOS Mail, Gmail, Slack, Todoist 등 이 패턴이 표준인 앱들이 공통적으로 "스와이프해서 액션 버튼을 드러내는 것 자체가 이미 의도적인 2단계 동작(드래그 + 탭)"이라는 점을 신뢰하고, 그 뒤에 별도 모달 확인을 넣지 않는다. 스와이프 도중 `Alert.alert`(블로킹 네이티브 다이얼로그)가 끼어들면 제스처 흐름이 뚝 끊겨 이 패턴을 쓰는 의미(빠르고 유려한 삭제)가 사라진다.
- 실수로 삭제됐을 때의 되돌리기 수단(Undo)이 확인 다이얼로그보다 사용자 경험상 더 낫다 — "삭제할까요?"를 매번 묻는 것은 마찰이고, Undo는 실수했을 때만 비용을 지불한다.
- 반면 **길게 누르기(롱프레스) 경로는 기존 `Alert.alert` confirm을 그대로 유지**한다 — 이미 구현·검증된 경로를 굳이 바꿀 필요가 없고, 스와이프를 모르는 사용자에게는 오히려 확인 다이얼로그가 있는 편이 더 안전하다(두 경로가 서로 다른 안전장치를 제공하는 것은 정상 — Gmail도 리스트 스와이프는 즉시+Undo, 상세 화면 안의 삭제 버튼은 확인 다이얼로그를 쓰는 식으로 문맥별로 다르다).

**Undo 스낵바 세부:**
- 삭제 즉시 해당 곡은 화면에서 사라지고, 하단(플레이리스트 탭의 "+ 곡 추가" 버튼 위)에 "'{곡 제목}'을(를) 삭제했어요 · 실행 취소" 형태의 스낵바가 약 4초간 노출된다.
- "실행 취소"를 탭하면 곡이 원래 위치(원래 인덱스)로 되돌아온다.
- **구현 방식 권장(구현 부담 최소화)**: 실제 `removeTrack(entryId)` 호출을 스낵바가 사라지는 시점까지 지연시키는 "지연 삭제(deferred delete)" 방식을 권장한다 — 탭 즉시 로컬 상태(예: `pendingDeleteEntryIds: Set<string>`)로 해당 항목을 화면에서만 필터링해 숨기고, 4초 타이머가 만료되면 그때 실제 `removeTrack`을 호출한다. Undo를 누르면 `pendingDeleteEntryIds`에서 제거하기만 하면 되므로 "삭제된 곡을 원래 위치에 다시 끼워넣는" 복원 로직이 따로 필요 없다(현재 `SessionContext`에는 특정 인덱스에 되돌려 넣는 API가 없다 — 새로 만들지 않아도 되는 쪽이 더 단순하다).
  - **주의(구현자에게 남기는 경고)**: `PlaylistView`는 탭 전환 시(`RoomScreen.tsx`의 `tab === 'playlist' ? <PlaylistView/> : ...`) **조건부 렌더링으로 언마운트**된다. Undo 타이머가 끝나기 전에 사용자가 "Now Playing" 탭으로 전환하면 컴포넌트가 언마운트되면서 타이머가 무의미해질 수 있다 — 반드시 **언마운트 시(`useEffect` cleanup) 대기 중인 삭제를 즉시 커밋(실제 `removeTrack` 호출)** 하도록 구현해야 한다(그렇지 않으면 "숨겼지만 실제로는 삭제되지 않은 곡"이 다시 나타나는 버그가 생긴다).

### A.5 순서 변경(▲/▼) 방식과의 공존 검토

**결론: 이번 라운드에는 기존 ▲/▼ 버튼 방식을 그대로 유지한다. 드래그 앤 드롭 재정렬로 바꾸지 않는다.**

이유:
1. 스와이프 삭제(가로 제스처)와 ▲/▼ 버튼(단순 탭)은 애초에 서로 다른 입력 축을 쓰므로 **기능적으로 완전히 공존 가능**하다 — `Swipeable`은 가로 드래그만 가로채고, 세로 방향의 버튼 탭이나 리스트 스크롤에는 관여하지 않는다. `Swipeable`로 행을 감싸도 그 안의 ▲/▼ `TouchableOpacity`는 지금처럼 동작한다.
2. 반면 진짜 "길게 눌러 드래그"로 순서를 바꾸는 iOS 네이티브 리스트 방식(예: `react-native-draggable-flatlist`)을 도입하려면:
   - `PlaylistView.tsx`가 지금 `ScrollView` + `.map()`으로 두 섹션("다음 곡들"/"재생 완료")을 그리는 구조인데, 드래그 재정렬 라이브러리는 대부분 `FlatList` 기반이라 **구조 자체를 바꿔야 한다**(단순 라이브러리 교체가 아니라 리스트 렌더링 방식 리팩터).
   - 같은 행에 "가로 스와이프(삭제)"와 "세로 드래그(순서변경, 보통 롱프레스로 시작)"가 동시에 존재하면 제스처 인식기끼리 충돌 방지 설정이 추가로 필요하다(불가능하지는 않지만 한 라운드에 두 가지 신규 제스처를 동시에 넣는 것은 리스크가 커진다).
   - ▲/▼ 버튼은 이미 구현·QA 통과된 상태이고, 사용자가 이번에 명시적으로 문제 삼은 것은 "삭제 방법"이지 "순서 변경 방법"이 아니다.
3. 따라서 **이번 라운드 범위는 삭제만** 바꾸고, 드래그 재정렬 전환은 별도 라운드의 후보로 파트 B에 항목화해뒀다(파트 B, 항목 "PB-04").

### A.6 시각 스펙

스타일 가이드(`01-style-guide.md`) 기준 색상·타이포·모서리 반경을 그대로 재사용한다(신규 색상 슬롯 추가하지 않음).

| 요소 | 값 | 근거 |
|---|---|---|
| 삭제 액션 배경색 | `syncColors.mutedRed` (`#E4573D`, 다크모드는 `theme.mutedRedBg`가 아니라 배경 자체가 액션 패널이므로 solid `#E4573D` 유지) | 01문서 2절 "Error/끊김" 색을 그대로 재사용 — 새 색 슬롯을 만들지 않는다(01문서 원칙: 의미가 겹치지 않는 한 새 색 슬롯을 만들지 않는다) |
| 삭제 아이콘/텍스트 색 | `#FFFFFF` | 빨강 배경 위 대비 확보 |
| 삭제 액션 라벨 | "삭제" (텍스트) — 아이콘은 이번 라운드에서 신규 아이콘셋을 추가하지 않으므로 이모지(🗑) 또는 텍스트만 사용 | 파트 B에서 지적하는 "이모지 아이콘 의존" 이슈(PB-11)와 같은 맥락 — 이번 라운드는 텍스트만으로도 충분히 명확하므로 아이콘 세트 도입까지 확장하지 않는다 |
| 액션 패널 폭 | 84px | 아이콘/라벨이 편안히 들어가는 최소폭(iOS Mail 단일 액션 폭 관례 참고, 임의값이므로 구현 단계에서 시각 확인 후 미세조정 가능) |
| 행(row) 높이 | 파트 B 항목 PB-01(56px 상당 → 64px)과 함께 적용 — 스와이프 액션 버튼도 늘어난 행 높이에 맞춰 세로로 꽉 채운다 | 스와이프 버튼이 작으면 오탭 위험이 커지므로 행 높이 개선과 세트로 처리하는 것을 권장 |
| 애니메이션 | `Swipeable` 기본 easing 그대로 사용(과한 커스텀 없음), `overshootRight={false}` | 01문서 4절 "급격한 바운스 지양" |
| 삭제 후 리스트 애니메이션 | 최소한 높이가 0으로 줄며 사라지는 정도의 레이아웃 애니메이션(`LayoutAnimation.configureNext` 등) 권장 | 파트 B PB-13과 연동 — 필수는 아니지만 스와이프 삭제가 "즉시 툭 사라지는" 느낌이면 폴리시 효과가 반감된다 |

### A.7 접근성(스와이프의 대체 경로)

- 스와이프 제스처는 발견성(discoverability)이 낮고 VoiceOver/TalkBack 사용자에게는 기본적으로 어렵다. **롱프레스 → `Alert.alert` 확인 다이얼로그** 경로를 절대 제거하지 않고 그대로 남겨 대체 수단으로 유지한다(A.3의 7번).
- `Swipeable`의 오른쪽 액션 버튼에는 `accessibilityLabel="{곡 제목} 삭제"`, `accessibilityRole="button"`을 반드시 지정한다.
- 색상만으로 "위험한 동작"임을 표시하지 않는다(01문서 5절 접근성 원칙과 동일) — 빨간 배경 + "삭제" 텍스트를 항상 병행(이미 A.6에 반영됨).

### A.8 구현 체크리스트 (implementer 전달용 요약)

- [ ] `react-native-gesture-handler` 신규 설치(+ iOS pod install, Android 재빌드)
- [ ] 앱 루트를 `GestureHandlerRootView`로 감싸기
- [ ] `TrackRow`/`MixedTrackRow`를 `Swipeable`로 감싸고 `renderRightActions`에 삭제 버튼 렌더링
- [ ] 여러 행 중 하나만 열리도록 관리(다른 행 열 때 이전 행 자동 닫힘)
- [ ] 탭 시 지연 삭제(pending set) + 4초 Undo 스낵바 + 언마운트 시 즉시 커밋
- [ ] 기존 롱프레스 + `Alert.alert` 확인 경로는 그대로 유지(제거 금지)
- [ ] `accessibilityLabel` 지정
- [ ] (선택, 권장) 행 높이를 PB-01과 함께 56→64px로 확대
- [ ] (선택, 권장) 삭제 시 리스트 레이아웃 애니메이션 추가

---

## 파트 B. 앱 전체 UI/UX 개선 목록 (우선순위 미확정 — 리더가 사용자 확인 후 정렬)

각 항목은 (문제) → (해결안, 구체적으로) → (난이도: 작음/중간/큼) 순서로 정리했다. **순서 자체는 우선순위가 아니라 화면/영역별로 묶은 것**이며, 순번(PB-xx)은 참조 편의를 위한 것일 뿐 중요도 순이 아니다.

### B.1 내비게이션 / 제스처 관행

| # | 영역 | 문제 | 해결안 | 난이도 |
|---|---|---|---|---|
| PB-01 | `PlaylistView.tsx` (`trackRow`) | 트랙 행이 `paddingVertical: 10`으로 좁고, 제목+아티스트+선곡자 배지(+혼합 세션은 매칭 상태 텍스트까지 최대 4줄)가 들어가 빽빽하다. 스와이프 액션(파트 A)이 들어갈 여유도 부족. | `trackRow`의 `paddingVertical`을 10→14로, `minHeight: 64`를 명시적으로 지정. 좌우 패딩은 컨테이너(`container` `paddingHorizontal:16`)와 통일해 16으로 맞춤(현재도 16이라 이 부분은 이미 일치 — 행 내부 패딩만 조정). | 작음 |
| PB-02 | `SessionSettingsView.tsx` | `Modal(presentationStyle="fullScreen")`로 구현돼 있어 시각적으로는 "새 화면"처럼 보이지만, iOS 표준 엣지 스와이프 백 제스처(뒤로가기)가 동작하지 않는다(Modal은 네이티브 스택 push가 아니므로) — `←` 버튼을 눌러야만 닫힌다. | `RootStackParamList`에 `SessionSettings` 라우트를 신규 추가해 실제 스택 화면으로 전환한다. `session`/`viewerRole`/`myPlatform` 등은 이미 `SessionContext`에서 읽으므로 route param 전달 없이도 화면 내부에서 `useSession()`으로 바로 조회 가능 — 리팩터 범위가 생각보다 작다. `RoomScreen.tsx`의 `setSettingsVisible(true)`를 `navigation.navigate('SessionSettings')`로 교체. | 중간 |
| PB-03 | `ParticipantsBottomSheet.tsx`, `MatchingQueueSheet.tsx` | 하단 시트 관행(그래버 핸들, 배경 탭으로 닫기)은 이미 잘 지켜지고 있으나 "아래로 드래그해서 닫기" 제스처가 없다(코드 주석에 이미 TODO로 명시돼 있음: "제스처 라이브러리 미설치"). | 파트 A에서 `react-native-gesture-handler`가 어차피 새로 들어오므로, 같은 라운드에 `PanGestureHandler`(또는 `Swipeable`과 별개로 세로 팬)로 드래그 다운 닫기를 추가. | 중간 |
| PB-04 | `PlaylistView.tsx` 순서 변경 | 파트 A.5에서 검토한 대로, 현재 ▲/▼ 버튼 방식은 기능하지만 iOS/음악 앱 사용자에게 익숙한 "핸들을 눌러 드래그"에 비해 손이 더 많이 간다(여러 칸 이동 시 버튼을 여러 번 눌러야 함). | `PlaylistView.tsx`를 `ScrollView`+`.map()`에서 `FlatList` 기반으로 리팩터한 뒤 `react-native-draggable-flatlist` 같은 라이브러리로 드래그 재정렬 도입 검토(파트 A에서 이번 라운드 범위 밖으로 명시적으로 뺀 항목 — 별도 라운드 권장). | 큼 |
| PB-05 | `RoomScreen.tsx` 탭 전환 | "Now Playing"/"플레이리스트"가 세그먼트 버튼 탭으로만 전환되고, 좌우 스와이프로는 전환되지 않는다. `00-ux-flow.md` 2.10절 원안은 "스와이프/탭 전환 모두" 제안했는데 탭만 구현됨. YouTube 등 미디어 앱은 인접 화면 간 스와이프 전환이 흔한 패턴. | `OnboardingScreen.tsx`가 이미 쓰고 있는 `ScrollView horizontal pagingEnabled` 패턴(신규 의존성 불필요)을 재사용해 두 뷰를 가로 페이지로 감싸고, 세그먼트 탭은 그 스크롤 위치를 프로그래밍적으로 제어하도록 연결. **주의**: `YouTubeNowPlayingView`의 WebView는 마운트/언마운트에 매우 민감하게 다뤄지고 있어(주석 다수), 스와이프 도입 시 WebView가 실수로 리마운트되지 않도록 조심스러운 검증이 필요. | 중간 |
| PB-06 | `AddTrackModal.tsx` | 닫기 방식이 "닫기" 텍스트 링크(우상단)인 반면, `SessionSettingsView.tsx`는 "←" 화살표 아이콘이라 화면마다 "이 오버레이를 닫는 방법"의 표현이 다르다. | 전체 화면 오버레이(모달)류는 좌상단 "←" 아이콘으로, 부분 시트류는 하단 "닫기" 텍스트 또는 배경 탭으로 통일하는 규칙을 세우고 `AddTrackModal`을 "←" 아이콘으로 교체. | 작음 |

### B.2 터치 타겟 크기 / 피드백

| # | 영역 | 문제 | 해결안 | 난이도 |
|---|---|---|---|---|
| PB-07 | `CreateSessionScreen.tsx`, `SessionSettingsView.tsx`, `HomeScreen.tsx`(혼합 참여 단계) 등 화면 헤더의 "←" 뒤로가기 버튼 | `back: {width: 28, fontSize: 20}`만 있고 `hitSlop`이나 최소 44×44 히트 영역이 없다 — Apple HIG 최소 터치 타겟(44×44pt) 미달. 여러 화면에서 동일 패턴이 각자 하드코딩돼 있다. | 공통 `components/BackButton.tsx`를 신설해 `hitSlop={{top:12,bottom:12,left:12,right:12}}`(사실상 ~52×44 히트 영역)를 기본 내장하고, 각 화면의 개별 구현을 이 컴포넌트로 교체. | 작음~중간(컴포넌트 자체는 작음, 여러 파일 치환이 필요해 전체로는 중간) |
| PB-08 | `RoomScreen.tsx` 헤더 "⋮", `ParticipantsBottomSheet.tsx` 각 행 "⋮" 메뉴 트리거 | `fontSize:20`에 좌우 padding만 6~8px 있고 세로 여백은 사실상 텍스트 줄 높이뿐이라 44pt에 못 미칠 가능성이 높다. | `hitSlop`을 최소 `{top:10,bottom:10,left:10,right:10}` 추가. | 작음 |
| PB-09 | `CapacityStepper.tsx`의 +/− 버튼 | `36×36`으로 44×44 권장치보다 작다. | 버튼 크기를 40~44로 확대하거나, 시각 크기는 유지한 채 `hitSlop`으로 보완. | 작음 |
| PB-10 | 앱 전역 (`TouchableOpacity` 사용처 전부) | Android 표준 피드백인 리플(ripple) 효과가 전혀 없다 — 전부 iOS 스타일의 흐림(opacity) 피드백만 쓴다. Android 사용자에게는 플랫폼 관행과 어긋나는 손맛이다. | 공통 `AppPressable` 래퍼(내부적으로 `Pressable` 사용, Android는 `android_ripple`, iOS는 `opacity` 트랜지션으로 분기)를 만들고, 점진적으로 기존 `TouchableOpacity`를 교체. 파일 수가 많아 한 번에 전체 교체는 비현실적 — 이번에 손대는 화면(PlaylistView 등)부터 우선 적용 권장. | 큼(전체 앱 기준) / 부분 적용은 중간 |

### B.3 리스트/카드 밀도

| # | 영역 | 문제 | 해결안 | 난이도 |
|---|---|---|---|---|
| PB-01 | (위 B.1 표에도 있음, 밀도 이슈이기도 함) `PlaylistView.tsx` 트랙 행 | 상동 | 상동 | 작음 |
| PB-11 | `NowPlayingView.tsx`/`YouTubeNowPlayingView.tsx` 앨범 아트 자리 | `160×160` 고정 정사각형에 실제 아트워크 없이 "♪" 아이콘만 있어 화면 상단이 휑하다. | 이건 UI 폴리시보다는 데이터 연동(앨범 아트 URL fetch) 문제라 이번 감사의 본질적 범위와는 결이 다르다 — 단순 언급만 하고 별도 데이터 연동 라운드에서 다룰 것을 권장. | (범위 밖 — 참고용) |
| PB-12 | 앱 전역 아이콘 | 버튼/배지 아이콘이 전부 이모지(🔴🟢👑🛡⚙⋮▶⏸🅢🅜)로 돼 있다. 폰트/OS별 렌더링 편차가 있고, 네이티브 앱 완성도 느낌이 아이콘 폰트/SVG 대비 떨어진다. | `react-native-vector-icons` 또는 SVG 아이콘 세트 도입 검토 — 다만 신규 의존성 + 전체 아이콘 교체 작업이라 규모가 크다. 이번 라운드 범위 밖, 브랜딩이 더 성숙한 뒤 별도 논의 권장(01문서 6절 "확정 여부 안내"와 같은 결의 사안). | 큼(범위 밖 후보) |

### B.4 일관성

| # | 영역 | 문제 | 해결안 | 난이도 |
|---|---|---|---|---|
| PB-13 | 앱 전역 | `theme/tokens.ts`가 `spacing`(4/8/12/16/24/32)과 `radius`(8/12/20/999) 토큰을 정의해뒀지만 **앱 어디에서도 단 한 번도 import되지 않는다**(grep으로 확인 — `brand`/`brandColors`/`matchColors`/`syncColors`/`roleColors`/`pickerColors`는 다들 쓰는데 `spacing`/`radius`만 미사용). `radius`는 우연히 대체로 스케일(8/12/20/999)과 맞아떨어지지만, `spacing`은 화면마다 16/20/24, 심지어 9/14/6 같은 스케일 밖 숫자가 섞여 있다(예: `SessionSettingsView.tsx` `body` padding 20·`card` padding 14 vs `PlaylistView.tsx` `container` padding 16 vs `AddTrackModal.tsx` `container` padding 20). 스타일 가이드에서 실제 구현으로 드리프트가 생긴 사례. | 이번에 손대는 파일(`PlaylistView.tsx` 등)부터 `spacing`/`radius`를 실제로 import해서 하드코딩 숫자를 대체하기 시작. 전체 일괄 치환은 회귀 위험이 있으니 점진적으로. | 중간(전체 일괄 치환 시) / 작음(이번에 손대는 파일만) |
| PB-14 | 뒤로가기 화살표 구현 중복 | "←" 글리프를 `CreateSessionScreen.tsx`, `SessionSettingsView.tsx`, `HomeScreen.tsx` 등 화면마다 각자 `Text`로 구현하고 있다 — PB-07(터치 타겟 확대)을 적용하려면 여러 파일을 동시에 고쳐야 하는 구조적 원인이기도 하다. | PB-07과 함께 `components/BackButton.tsx` 공통화로 해소. | 작음~중간(PB-07과 통합 처리) |
| PB-15 | Modal 오버레이 패턴 3종 혼재 | (a) 전체화면 슬라이드(`AddTrackModal`, `SessionSettingsView`), (b) 하단 시트(`ParticipantsBottomSheet`, `MatchingQueueSheet`), (c) 다이얼로그(`SessionSettingsView` 내부의 `ServiceSwitchDialog`는 `Modal`이 아니라 절대 위치 `View`로 직접 구현 — 상위가 이미 Modal이라 Modal-in-Modal을 피하려 이렇게 만든 것으로 추정). 기능적으로는 각자 맥락에 맞지만 구현 패턴이 3갈래로 나뉜 것 자체가 다음 화면을 만들 implementer에게 "어떤 패턴을 따라야 하는지" 혼란을 줄 수 있다. | PB-02(SessionSettingsView를 실제 스택 화면으로 전환)와 연동해서 처리하면 (c)의 Modal-in-Modal 회피 이유 자체가 사라져 자연스럽게 정리된다. | PB-02에 통합 |

### B.5 애니메이션 / 전환

| # | 영역 | 문제 | 해결안 | 난이도 |
|---|---|---|---|---|
| PB-16 | 앱 전역 | `LayoutAnimation`/`Animated`/`useAnimatedStyle` 사용이 **전무하다**(grep 결과 0건). 리스트 항목 추가/삭제, 토스트 등장/소멸, 탭 전환 등이 전부 애니메이션 없이 즉시 나타났다 사라진다. React Navigation의 기본 스택 전환과 `Modal`의 기본 slide만이 유일한 모션이다. | 우선순위가 낮은 곳부터가 아니라, **이번 스와이프 삭제 작업과 세트로 처리하는 것을 권장**(파트 A.6 마지막 행 참고) — 삭제된 행이 레이아웃상 즉시 사라지면 스와이프의 유려함이 반감된다. `LayoutAnimation.configureNext`(Android는 `UIManager.setLayoutAnimationEnabledExperimental(true)` 별도 필요) 정도의 최소 적용만으로도 체감 개선이 크다. | 중간(스와이프 삭제와 동시 진행 시 자연스러움) |
| PB-17 | `RoomScreen.tsx` 토스트, 매칭 배지 등 | 토스트/배지가 페이드 없이 즉시 표시·숨김된다. | `Animated.timing`으로 opacity 200ms 정도의 페이드 인/아웃만 추가해도 체감 품질이 오른다. | 작음 |

---

## 참고: 파트 B 항목 요약(빠른 스캔용)

| 분류 | 항목 수 | 항목 |
|---|---|---|
| 내비게이션/제스처 | 6 | PB-01, PB-02, PB-03, PB-04, PB-05, PB-06 |
| 터치 타겟/피드백 | 4 | PB-07, PB-08, PB-09, PB-10 |
| 밀도 | 2(+1 범위 밖) | PB-01(중복), PB-11(범위 밖), PB-12(범위 밖 후보) |
| 일관성 | 3 | PB-13, PB-14, PB-15 |
| 애니메이션 | 2 | PB-16, PB-17 |

> 리더 안내: 위 표는 **심각도/난이도로 이미 정렬돼 있지 않다**. 사용자와 우선순위를 확인할 때 참고할 수 있도록 (a) 파트 A(스와이프 삭제)는 이번 라운드에 바로 구현 가능한 완결된 명세이고, (b) 파트 B는 그중 PB-01(행 높이/패딩)·PB-07/PB-08/PB-09(터치 타겟 hitSlop)·PB-14(BackButton 공통화)가 **난이도 "작음"이면서 파트 A 작업과 같은 파일(`PlaylistView.tsx`)을 만지는 김에 함께 처리하기 좋은 항목**이라는 점만 참고 정보로 덧붙인다 — 최종 우선순위/범위 결정은 리더가 사용자에게 확인받아 진행할 것.
