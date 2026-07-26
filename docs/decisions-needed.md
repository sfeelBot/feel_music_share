# 사용자 결정/액션 대기 목록

> 이 파일은 **살아있는(live) 목록**입니다 — append-only 로그(`docs/agents/*-log.md`)와 달리, **실제로 결정이 내려지거나 액션이 완료되면** 해당 항목을 이 파일에서 삭제합니다. 결정 자체의 근거·논의 이력은 관련 `docs/specs/`·`docs/design/` 문서나 `docs/agents/leader-log.md`에 남으니, 여기서 지워져도 기록이 사라지는 건 아닙니다.
>
> **주의 — "추후 논의로 보류"는 삭제 대상이 아닙니다.** 사용자가 아직 결정하지 않고 "나중에 다시 얘기하자"고 미룬 항목은 실제 결정이 아니라 **보류 상태**입니다. 시간이 지났다고, 혹은 같은 주제가 다시 언급됐다고 임의로 지우지 않고 아래 "추후 논의로 보류된 항목" 절에 계속 남겨둡니다 — 이 절의 항목은 사용자가 진짜 결정을 내렸을 때만 제거합니다.
>
> 리더는 사용자 결정이 필요한 지점을 발견할 때마다 이 파일에 항목을 추가하고, 사용자가 실제 결정을 주면 해당 항목을 제거합니다. 보류/연기 의사만 받은 경우는 "추후 논의" 절로 옮겨 계속 유지합니다.

## 외부 계정 설정 필요 (사용자 액션)

1. **Spotify Developer 앱 등록** (developer.spotify.com/dashboard) — (2026-07-26) **Client ID는 발급받아 공유 완료**, `apps/mobile/src/config/env.ts`에 반영 완료(커밋 `229a2bc`). **아직 확인 필요**: 리다이렉트 URI 2개(`feelmusicshare://spotify-auth-callback`, `feelmusicshare://spotify-remote-callback`)를 Dashboard에 등록했는지 — 이게 안 돼 있으면 로그인 콜백이 앱으로 돌아오지 못해 로그인이 끝까지 안 된다. 사용자 확인 대기 중.
2. **Firebase 연동** — (2026-07-26 진행 상황) 프로젝트 생성은 완료(`feel-music-share`). **아직 남은 것**:
   - ① **`google-services.json` 재등록 필요** — 2026-07-26에 사용자가 저장소 루트에 공유한 파일을 확인한 결과, Firebase 콘솔에 등록된 패키지 이름이 `come.mobile`로 오타가 나 있음(실제 앱 `applicationId`는 `com.mobile`, `apps/mobile/android/app/build.gradle` 확인). 이 상태로는 Google Services Gradle 플러그인이 매칭 실패로 빌드가 깨진다 — Firebase 콘솔에서 잘못 등록된 앱을 정리하고 패키지 이름 **정확히 `com.mobile`**로 재등록 후 새 `google-services.json`을 다시 공유해야 함.
   - ② **Realtime Database vs Firestore 중 무엇을 쓸지 결정 필요** — 아직 콘솔에서 둘 다 활성화(=데이터베이스 생성)되어 있지 않은 상태임을 2026-07-26 스파이크로 확인(`docs/spikes/firebase-rtdb-vs-firestore.md`, REST API 요청으로 Firestore는 `SERVICE_DISABLED`, RTDB는 인스턴스 없음을 검증). 스파이크의 참고용 권고: 재생 동기화 상태는 RTDB, 플레이리스트는 Firestore가 구조적으로 더 적합(하이브리드 고려 가능) — 단순화 우선이면 RTDB 단일 구성도 대안. 최종 선택은 사용자 몫. 콘솔에서 최소 하나를 "데이터베이스 만들기"로 활성화하면 후속 스파이크로 실제 지연시간 실측도 가능해짐.
   - 이 2가지(패키지명 재등록 + DB 선택/활성화)가 채워져야 실제 코드 연동(현재 `firebaseClient.ts`는 빈 스텁)을 시작할 수 있다. Dart/Flutter용 `flutterfire_cli`는 이 프로젝트(React Native)에는 해당 없음 — 웹 콘솔에서 직접 등록하면 됨. **상세 절차·다음 단계 전체 설명은 [`docs/firebase-integration-guide.md`](firebase-integration-guide.md) 참고**.
3. **YouTube Data API v3 활성화** (Google Cloud Console) — YouTube 곡 검색·메타데이터 조회를 실제로 붙이려면 필요. 현재는 `apps/mobile/src/services/youtube/youtubeMockSearch.ts` 정적 목업으로 대체되어 있음.

## 추후 논의로 보류된 항목 (해결 전까지 계속 유지)

4. **iOS 배포 방향** — TestFlight / Ad Hoc 중 선택, 어느 쪽이든 유료 Apple Developer Program($99/년) 가입이 전제조건. (2026-07-24, 2026-07-25 두 차례 "추후 논의"로 보류 확인 — 아직 실제 결정 아님)

## 다음 라운드 예정 — 구현 후 실기기 확인 필요 (지금 당장 사용자가 할 일 아님, 참고용)

5. **YouTube 실기기 검증**: 지금은 `YouTubeNowPlayingView.tsx`/`youtubePlayerStub.ts`가 전부 자리표시자(placeholder)라 실제 재생 자체가 없다. 다음 구현 라운드에서 `react-native-webview` + YouTube IFrame Player를 실제로 붙인 뒤, 아래 순서로 진행될 예정이다 — **지금 사용자가 먼저 조사할 필요는 없고, 구현이 끝나면 실기기(가능하면 사용자 폰) 설치 → 확인 → 보고 순서로 자연스럽게 이어진다.**
   - (a) **광고 노출 확인**: 실제 임베드 환경에서 영상 재생 시 프리롤/미드롤 광고가 뜨는지 육안 확인 — Premium이어도 서드파티 WebView 임베드에서 무광고가 보장되는지 공식 문서로 확답을 못 찾았기 때문(`docs/specs/03-youtube-integration.md` 7절).
   - (b) **명령 응답 지연 실측**: 재생/일시정지/탐색 명령을 내린 뒤 실제 화면 반영까지 걸리는 시간 측정 — 동기화 드리프트 보정 설계(`05-sync-architecture.md`)에 반영할 참고 수치를 얻기 위함.
   - 목적은 "YouTube를 포함할지 말지 판단"이 아니라(이미 포함하기로 결정됨) "제품 카피·사용자 기대치 문구를 정확히 쓰기 위한 실측"이다(`docs/specs/06-mvp-scope-and-tech-stack.md` 참고).
