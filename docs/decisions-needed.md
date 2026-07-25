# 사용자 결정/액션 대기 목록

> 이 파일은 **살아있는(live) 목록**입니다 — append-only 로그(`docs/agents/*-log.md`)와 달리, **실제로 결정이 내려지거나 액션이 완료되면** 해당 항목을 이 파일에서 삭제합니다. 결정 자체의 근거·논의 이력은 관련 `docs/specs/`·`docs/design/` 문서나 `docs/agents/leader-log.md`에 남으니, 여기서 지워져도 기록이 사라지는 건 아닙니다.
>
> **주의 — "추후 논의로 보류"는 삭제 대상이 아닙니다.** 사용자가 아직 결정하지 않고 "나중에 다시 얘기하자"고 미룬 항목은 실제 결정이 아니라 **보류 상태**입니다. 시간이 지났다고, 혹은 같은 주제가 다시 언급됐다고 임의로 지우지 않고 아래 "추후 논의로 보류된 항목" 절에 계속 남겨둡니다 — 이 절의 항목은 사용자가 진짜 결정을 내렸을 때만 제거합니다.
>
> 리더는 사용자 결정이 필요한 지점을 발견할 때마다 이 파일에 항목을 추가하고, 사용자가 실제 결정을 주면 해당 항목을 제거합니다. 보류/연기 의사만 받은 경우는 "추후 논의" 절로 옮겨 계속 유지합니다.

## 외부 계정 설정 필요 (사용자 액션)

1. **Spotify Developer 앱 등록** (developer.spotify.com/dashboard) — Client ID 발급 + 리다이렉트 URI 2개(`feelmusicshare://spotify-auth-callback`, `feelmusicshare://spotify-remote-callback`) 등록. 실제 Spotify 로그인 동작의 전제조건. (2026-07-25: 사용자가 곧 설정 후 공유 예정이라고 확인)
2. **Firebase 프로젝트 생성** (console.firebase.google.com) — 실시간 동기화 백엔드 연동의 전제조건. (2026-07-25: 사용자가 곧 설정 후 공유 예정이라고 확인)
3. **YouTube Data API v3 활성화** (Google Cloud Console) — YouTube 곡 검색·메타데이터 조회를 실제로 붙이려면 필요. 현재는 `apps/mobile/src/services/youtube/youtubeMockSearch.ts` 정적 목업으로 대체되어 있음.

## 추후 논의로 보류된 항목 (해결 전까지 계속 유지)

4. **iOS 배포 방향** — TestFlight / Ad Hoc 중 선택, 어느 쪽이든 유료 Apple Developer Program($99/년) 가입이 전제조건. (2026-07-24, 2026-07-25 두 차례 "추후 논의"로 보류 확인 — 아직 실제 결정 아님)
5. **YouTube 실기기 스파이크** — 실제 기기(가급적 안드로이드+iOS 둘 다) + YouTube Premium 계정으로 (a) WebView/IFrame Player 임베드 환경에서 실제로 광고가 뜨는지, (b) 재생/탐색 명령 응답 지연이 어느 정도인지 실측이 필요. YouTube가 MVP에 포함되기로 이미 결정됐으므로 이 실측은 "포함 여부 판단용"이 아니라 "제품 카피·사용자 기대치 문구를 정확히 쓰기 위한" 목적(`docs/specs/06-mvp-scope-and-tech-stack.md` 참고) — 구현 착수 전 권고 스파이크로 계속 남아있던 항목.
