# 사용자 결정/액션 대기 목록

> 이 파일은 **살아있는(live) 목록**입니다 — append-only 로그(`docs/agents/*-log.md`)와 달리, **실제로 결정이 내려지거나 액션이 완료되면** 해당 항목을 이 파일에서 삭제합니다. 결정 자체의 근거·논의 이력은 관련 `docs/specs/`·`docs/design/` 문서나 `docs/agents/leader-log.md`에 남으니, 여기서 지워져도 기록이 사라지는 건 아닙니다.
>
> **주의 — "추후 논의로 보류"는 삭제 대상이 아닙니다.** 사용자가 아직 결정하지 않고 "나중에 다시 얘기하자"고 미룬 항목은 실제 결정이 아니라 **보류 상태**입니다. 시간이 지났다고, 혹은 같은 주제가 다시 언급됐다고 임의로 지우지 않고 아래 "추후 논의로 보류된 항목" 절에 계속 남겨둡니다 — 이 절의 항목은 사용자가 진짜 결정을 내렸을 때만 제거합니다.
>
> 리더는 사용자 결정이 필요한 지점을 발견할 때마다 이 파일에 항목을 추가하고, 사용자가 실제 결정을 주면 해당 항목을 제거합니다. 보류/연기 의사만 받은 경우는 "추후 논의" 절로 옮겨 계속 유지합니다.

## 외부 계정 설정 필요 (사용자 액션)

1. **Spotify Developer 앱 — Extended Quota Mode 신청 필요 (긴급도 상향, 2026-07-27)** (developer.spotify.com/dashboard) — (2026-07-26) User Management에 테스트 계정 추가 후 **로그인 자체는 실기기에서 성공 확인됨**. 하지만 (2026-07-27 실기기 확인) 곡 검색 시도 시 `{"error": {"status": 400, "message": "Invalid limit"}}` 오류 발생 — 리더가 코드(`spotifyWebApi.ts`의 `limit=15`)를 직접 검토하고 Spotify 공식 커뮤니티/이슈 트래커로 원인을 확인한 결과 **코드 문제가 아니다**. 2024년 11월 27일 Spotify API 정책 변경 이후, **Development Mode 앱은 `/v1/search`를 포함한 카탈로그 엔드포인트 자체에 접근할 수 없게 됐고**, 이때 반환되는 오류 메시지가 실제 원인(접근 권한 없음)과 무관하게 "Invalid limit"로 오해의 소지가 있게 나온다(Spotify 측의 알려진 오류 메시지 이슈, 출처: [music-assistant/support#5360](https://github.com/music-assistant/support/issues/5360)). **순수 클라이언트 측 우회 방법은 없다** — Spotify Dashboard에서 해당 앱의 **Extended Quota Mode 신청**(앱 정보 제출 후 Spotify 심사)이 필요하다. 심사에 시간이 걸릴 수 있으니 최대한 빨리 신청 권장 — 이게 없으면 Spotify 세션에서 곡 검색 기능 자체가 동작하지 않는다.
2. **Firebase 연동 — 남은 건 DB 선택뿐** — (2026-07-27) 패키지명 오타 재등록 완료, `google-services.json`(정정본) 배치 + Google Services Gradle 플러그인 연결까지 완료(커밋 `2a6f51d`, 빌드 성공으로 패키지명 매칭 확인됨). **아직 남은 것**: **Realtime Database vs Firestore 중 무엇을 쓸지 결정 필요** — 아직 콘솔에서 둘 다 활성화(=데이터베이스 생성)되어 있지 않은 상태임을 2026-07-26 스파이크로 확인(`docs/spikes/firebase-rtdb-vs-firestore.md`, REST API 요청으로 Firestore는 `SERVICE_DISABLED`, RTDB는 인스턴스 없음을 검증). 스파이크의 참고용 권고: 재생 동기화 상태는 RTDB, 플레이리스트는 Firestore가 구조적으로 더 적합(하이브리드 고려 가능) — 단순화 우선이면 RTDB 단일 구성도 대안. 최종 선택은 사용자 몫. 콘솔에서 최소 하나를 "데이터베이스 만들기"로 활성화하면 (a) `@react-native-firebase` SDK 설치+`firebaseClient.ts` 실제 초기화, (b) 후속 스파이크로 실제 지연시간 실측 둘 다 다음 라운드로 진행 가능해짐. **상세 절차는 [`docs/firebase-integration-guide.md`](firebase-integration-guide.md) 참고**.
3. **YouTube Data API v3 활성화** (Google Cloud Console) — YouTube 곡 검색·메타데이터 조회를 실제로 붙이려면 필요. 현재는 `apps/mobile/src/services/youtube/youtubeMockSearch.ts` 정적 목업으로 대체되어 있음.

## 추후 논의로 보류된 항목 (해결 전까지 계속 유지)

4. **iOS 배포 방향** — TestFlight / Ad Hoc 중 선택, 어느 쪽이든 유료 Apple Developer Program($99/년) 가입이 전제조건. (2026-07-24, 2026-07-25 두 차례 "추후 논의"로 보류 확인 — 아직 실제 결정 아님)

## 다음 라운드 예정 — 구현 후 실기기 확인 필요 (지금 당장 사용자가 할 일 아님, 참고용)

5. **YouTube 실기기 검증**: 지금은 `YouTubeNowPlayingView.tsx`/`youtubePlayerStub.ts`가 전부 자리표시자(placeholder)라 실제 재생 자체가 없다. 다음 구현 라운드에서 `react-native-webview` + YouTube IFrame Player를 실제로 붙인 뒤, 아래 순서로 진행될 예정이다 — **지금 사용자가 먼저 조사할 필요는 없고, 구현이 끝나면 실기기(가능하면 사용자 폰) 설치 → 확인 → 보고 순서로 자연스럽게 이어진다.**
   - (a) **광고 노출 확인**: 실제 임베드 환경에서 영상 재생 시 프리롤/미드롤 광고가 뜨는지 육안 확인 — Premium이어도 서드파티 WebView 임베드에서 무광고가 보장되는지 공식 문서로 확답을 못 찾았기 때문(`docs/specs/03-youtube-integration.md` 7절).
   - (b) **명령 응답 지연 실측**: 재생/일시정지/탐색 명령을 내린 뒤 실제 화면 반영까지 걸리는 시간 측정 — 동기화 드리프트 보정 설계(`05-sync-architecture.md`)에 반영할 참고 수치를 얻기 위함.
   - 목적은 "YouTube를 포함할지 말지 판단"이 아니라(이미 포함하기로 결정됨) "제품 카피·사용자 기대치 문구를 정확히 쓰기 위한 실측"이다(`docs/specs/06-mvp-scope-and-tech-stack.md` 참고).
