/**
 * 환경 설정값 (MVP 스캐폴딩 단계 — 전부 placeholder).
 *
 * TODO(다음 단계): react-native-config 또는 .env 기반 빌드 설정으로 전환하고, 아래 값을
 * 실제 발급받은 값으로 교체할 것. 필요한 값과 발급 절차는 프로젝트 루트의 `.env.example` 참고.
 *
 * - Spotify Developer Dashboard에서 Client ID / Redirect URI 발급 필요
 *   (docs/specs/02-spotify-integration.md 5) 절 — Spotify 개발자 앱 등록 필요)
 * - Firebase 콘솔에서 프로젝트 생성 후 각 플랫폼 설정 파일(google-services.json /
 *   GoogleService-Info.plist)과 웹 config 값 발급 필요 (CLAUDE.md 기술 스택 확정 — Firebase)
 */

export const ENV = {
  /** Spotify OAuth (Authorization Code + PKCE) 설정 — Web API 호출(검색, /v1/me로 Premium 확인)용. */
  SPOTIFY_CLIENT_ID: '4b076092ea1b4f8e9d41b7eaec85920a',
  SPOTIFY_REDIRECT_URI: 'feelmusicshare://spotify-auth-callback',
  SPOTIFY_SCOPES: [
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'playlist-read-private',
  ],

  /**
   * App Remote SDK 연결에 사용할 값. Web API OAuth와는 별개의 인증 경로다
   * (docs/specs/02-spotify-integration.md 1절 참고). 아직 미연동(services/spotify/spotifyRemote.ts 참고).
   */
  SPOTIFY_APP_REMOTE_REDIRECT_URI: 'feelmusicshare://spotify-remote-callback',

  /**
   * Firebase 프로젝트 설정 — 전부 placeholder. 실제 프로젝트가 Firebase 콘솔에서 생성된 뒤
   * `google-services.json`(Android) / `GoogleService-Info.plist`(iOS)를 각 네이티브 프로젝트에
   * 추가하고, 아래 값(JS 초기화용, RN Firebase는 네이티브 설정 파일을 우선 사용하므로 이 값은
   * 주로 문서화/웹 SDK 호환 목적)을 채워야 한다. 상세는 services/firebase/firebaseClient.ts 참고.
   */
  FIREBASE_PROJECT_ID: 'TODO_FIREBASE_PROJECT_ID',
  FIREBASE_API_KEY: 'TODO_FIREBASE_API_KEY',
  FIREBASE_APP_ID: 'TODO_FIREBASE_APP_ID',
  FIREBASE_DATABASE_URL: 'TODO_FIREBASE_REALTIME_DATABASE_URL',
} as const;
