/**
 * 환경 설정값 (MVP 스캐폴딩 단계 — 전부 placeholder).
 *
 * TODO(다음 단계): react-native-config 또는 .env 기반 빌드 설정으로 전환하고,
 * 실제 Spotify Developer Dashboard에서 발급받은 Client ID / Redirect URI로 교체할 것.
 * (docs/specs/02-spotify-integration.md 5) 절 — Spotify 개발자 앱 등록 필요)
 */

export const ENV = {
  /** 백엔드 REST API base URL. 로컬 개발 시 에뮬레이터/기기에서 접근 가능한 호스트로 교체 필요. */
  API_BASE_URL: 'http://localhost:4000',
  /** 백엔드 WebSocket base URL (재생 동기화 채널). */
  WS_BASE_URL: 'ws://localhost:4000/ws',

  /** Spotify OAuth (Authorization Code + PKCE) 설정 — Web API 호출(검색, Premium 확인)용. */
  SPOTIFY_CLIENT_ID: 'TODO_SPOTIFY_CLIENT_ID',
  SPOTIFY_REDIRECT_URI: 'feelmusicshare://spotify-auth-callback',
  SPOTIFY_SCOPES: ['user-read-email', 'user-read-private', 'user-read-playback-state'],

  /**
   * App Remote SDK 연결에 사용할 값. Web API OAuth와는 별개의 인증 경로다
   * (docs/specs/02-spotify-integration.md 1절 참고).
   */
  SPOTIFY_APP_REMOTE_REDIRECT_URI: 'feelmusicshare://spotify-remote-callback',
} as const;
