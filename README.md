# feel_music_share

**실시간 음악 공유 앱** (iOS / Android)

장거리 연인·친구가 동일한 음악을 실시간·저지연으로 함께 듣는 환경을 제공합니다. Spotify와 YouTube(Premium)를 모두 지원하며, 참여자 전원이 플레이리스트에 곡을 추가·삭제·순서변경할 수 있고 누가 선곡했는지 표시됩니다.

- **핵심 가치**: 실시간성·저지연 (재생 동기화 오차 최소화)
- **음악 서비스**: Spotify (전용 세션), YouTube (전용 세션), 혼합(Mixed, 참여자별로 서로 다른 서비스 사용) 3가지 세션 유형
- **협업 플레이리스트**: 전원 곡 추가/삭제/순서변경 가능, 선곡자 표시
- **세션 관리**: 최대 12명(기본값 2명), 방장/관리자/일반사용자 3단계 권한
- **기술 스택**: React Native(모바일) + Firebase(실시간 동기화/백엔드)

## 디자인

화면 목업(폰 프레임 갤러리, 라이트/다크 모드 대응): [feel_music_share — 화면 목업](https://claude.ai/code/artifact/fc3c834b-38c2-4218-88a1-ea3c0be4fb4b)

## 문서

- 기획: [`docs/specs/`](docs/specs/)
- 디자인: [`docs/design/`](docs/design/)
- 운영 방식(하네스 엔지니어링): [`CLAUDE.md`](CLAUDE.md)
