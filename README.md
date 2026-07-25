# feel_music_share

**Samewave** — 실시간 음악 공유 앱 (iOS / Android)

> `feel_music_share`는 개발 코드네임이고, 마케팅 명칭은 **Samewave**로 확정됐습니다(2026-07-25, `docs/design/04-app-naming.md` 참고). 패키지명 등 내부 코드는 당분간 그대로 유지합니다.

장거리 연인·친구가 동일한 음악을 실시간·저지연으로 함께 듣는 환경을 제공합니다. Spotify와 YouTube(Premium)를 모두 지원하며, 참여자 전원이 플레이리스트에 곡을 추가·삭제·순서변경할 수 있고 누가 선곡했는지 표시됩니다.

- **핵심 가치**: 실시간성·저지연 (재생 동기화 오차 최소화)
- **음악 서비스**: Spotify (전용 세션), YouTube (전용 세션), 혼합(Mixed, 참여자별로 서로 다른 서비스 사용) 3가지 세션 유형
- **협업 플레이리스트**: 전원 곡 추가/삭제/순서변경 가능, 선곡자 표시
- **세션 관리**: 최대 12명(기본값 2명), 방장/관리자/일반사용자 3단계 권한
- **기술 스택**: React Native(모바일) + Firebase(실시간 동기화/백엔드)

## 다운로드 (Android)

`main` 브랜치의 `apps/mobile/`에 변경이 push될 때마다 GitHub Actions가 Android **debug APK**를 자동 빌드해서 [GitHub Releases](https://github.com/sfeelBot/feel_music_share/releases/latest)에 항상 최신 상태로 게시합니다 (고정 태그 `android-debug-latest`, 릴리즈가 갱신될 때마다 첨부 파일이 최신 빌드로 교체됩니다).

- 릴리즈 페이지: **https://github.com/sfeelBot/feel_music_share/releases/latest**
- APK 직접 다운로드 링크: **https://github.com/sfeelBot/feel_music_share/releases/latest/download/feel-music-share-debug.apk**

설치 방법: 위 링크에서 `feel-music-share-debug.apk`를 Android 기기(또는 에뮬레이터)로 내려받은 뒤 실행합니다. 스토어 앱이 아니므로 최초 설치 시 안드로이드가 "출처를 알 수 없는 앱" 설치 차단 경고를 띄울 수 있습니다 — 설정에서 해당 앱(예: 파일 관리자/브라우저)의 "알 수 없는 앱 설치 허용"을 켜야 설치가 진행됩니다.

> **주의 — 초기 개발 단계 빌드입니다.** 이 APK는 서명 전용 debug 키로 빌드된 것이며, Firebase 프로젝트와 Spotify Developer 앱이 아직 실제로 연결되지 않았습니다. 즉 Spotify 로그인, 세션 생성/참여, 실시간 재생 동기화 등 핵심 기능은 아직 동작하지 않습니다. 현재는 화면 UI·플로우를 미리 살펴보는 용도로만 사용해주세요. 빌드 워크플로 정의는 [`.github/workflows/android-debug-apk.yml`](.github/workflows/android-debug-apk.yml)에 있습니다. iOS 빌드는 아직 이 파이프라인 범위에 포함되어 있지 않습니다.

## 사용 방법 (현재 구현된 흐름)

앱을 처음 실행하면 아래 순서로 진행됩니다 (상세 화면 흐름은 [`docs/design/00-ux-flow.md`](docs/design/00-ux-flow.md) 참고):

1. **온보딩**: 최초 실행 시 3컷 소개 카드로 앱 목적을 안내합니다.
2. **Spotify 연동**: Spotify OAuth 로그인을 통해 계정을 연결합니다 (Premium 계정 필요 — 현재 빌드에서는 실제 로그인이 동작하지 않습니다).
3. **세션 생성/참여**: 새 세션을 만들거나(정원 설정, 최대 12명) 초대 코드로 기존 세션에 참여합니다.
4. **협업 플레이리스트**: 세션 참여자 전원이 곡을 검색해 추가/삭제/순서변경할 수 있고, 각 곡에 누가 선곡했는지 표시됩니다.
5. **Now Playing**: 현재 재생 중인 곡, 참여자 목록, 재생 동기화 상태를 확인하고 방장/관리자 권한에 따라 세션을 관리합니다.

## 디자인

화면 목업(폰 프레임 갤러리, 라이트/다크 모드 대응): [feel_music_share — 화면 목업](https://claude.ai/code/artifact/fc3c834b-38c2-4218-88a1-ea3c0be4fb4b)

## 문서

- 기획: [`docs/specs/`](docs/specs/)
- 디자인: [`docs/design/`](docs/design/)
- 운영 방식(하네스 엔지니어링): [`CLAUDE.md`](CLAUDE.md)
