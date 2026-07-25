# 사용자 결정/액션 대기 목록

> 이 파일은 **살아있는(live) 목록**입니다 — append-only 로그(`docs/agents/*-log.md`)와 달리, 결정이 내려지거나 액션이 완료되면 해당 항목을 **이 파일에서 삭제**합니다. 결정 자체의 근거·논의 이력은 관련 `docs/specs/`·`docs/design/` 문서나 `docs/agents/leader-log.md`에 남으니, 여기서 지워져도 기록이 사라지는 건 아닙니다.
>
> 리더는 사용자 결정이 필요한 지점을 발견할 때마다 이 파일에 항목을 추가하고, 사용자가 답을 주면 해당 항목을 제거합니다.

## 외부 계정 설정 필요 (사용자 액션)

1. **Spotify Developer 앱 등록** (developer.spotify.com/dashboard) — Client ID 발급 + 리다이렉트 URI 2개(`feelmusicshare://spotify-auth-callback`, `feelmusicshare://spotify-remote-callback`) 등록. 실제 Spotify 로그인 동작의 전제조건. (2026-07-25: 사용자가 곧 설정 후 공유 예정이라고 확인)
2. **Firebase 프로젝트 생성** (console.firebase.google.com) — 실시간 동기화 백엔드 연동의 전제조건. (2026-07-25: 사용자가 곧 설정 후 공유 예정이라고 확인)
