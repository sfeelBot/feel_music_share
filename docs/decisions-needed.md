# 사용자 결정/액션 대기 목록

> 이 파일은 **살아있는(live) 목록**입니다 — append-only 로그(`docs/agents/*-log.md`)와 달리, 결정이 내려지거나 액션이 완료되면 해당 항목을 **이 파일에서 삭제**합니다. 결정 자체의 근거·논의 이력은 관련 `docs/specs/`·`docs/design/` 문서나 `docs/agents/leader-log.md`에 남으니, 여기서 지워져도 기록이 사라지는 건 아닙니다.
>
> 리더는 사용자 결정이 필요한 지점을 발견할 때마다 이 파일에 항목을 추가하고, 사용자가 답을 주면 해당 항목을 제거합니다.

## 결정 필요

1. **관리자 임명 취소/사임 절차** — 방장이 임명한 관리자를 다시 해제할 수 있는지, 관리자 스스로 사임할 수 있는지. (`docs/specs/04-playlist.md` "권한 체계" 확인 필요 항목)
2. **관리자 인원 상한** — 세션당 관리자 수를 제한할지, 무제한으로 둘지.
3. **호스트 마이그레이션 시 권한 승계** — 방장이 세션을 나가 다른 사람이 방장이 될 때, 기존 관리자 목록을 그대로 유지할지 새 방장이 재구성할 수 있게 할지.
4. **세션 정원 사후 변경 가능 여부** — 세션 생성 시 정한 정원(기본 2명, 최대 12명)을 생성 후에도 바꿀 수 있게 할지.
5. **iOS 배포 방향** — TestFlight / Ad Hoc / 보류 중 선택. 셋 다 유료 Apple Developer Program($99/년) 가입이 전제조건. (2026-07-24 대화에서 "추후 논의"로 잠정 보류)

## 외부 계정 설정 필요 (사용자 액션)

6. **Spotify Developer 앱 등록** (developer.spotify.com/dashboard) — Client ID 발급 + 리다이렉트 URI 2개(`feelmusicshare://spotify-auth-callback`, `feelmusicshare://spotify-remote-callback`) 등록. 실제 Spotify 로그인 동작의 전제조건.
7. **Firebase 프로젝트 생성** (console.firebase.google.com) — 실시간 동기화 백엔드 연동의 전제조건.
