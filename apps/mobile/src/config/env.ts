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
   * Firebase 프로젝트 설정. `FIREBASE_PROJECT_ID` / `FIREBASE_API_KEY` / `FIREBASE_APP_ID`는
   * 여전히 placeholder다 — `@react-native-firebase`는 네이티브 브릿지 방식이라
   * `google-services.json`(Android) / `GoogleService-Info.plist`(iOS)만 있으면 앱 시작 시
   * 기본 Firebase 앱이 네이티브 레이어에서 자동 초기화되므로, 이 세 값은 JS 코드에서 실제로
   * 쓰이지 않는다(주로 문서화/웹 SDK 병행 시 대비 목적). 상세는 services/firebase/firebaseClient.ts 참고.
   *
   * `FIREBASE_DATABASE_URL`은 예외다 — 위 세 값과 달리 **실제로 JS 코드에서 사용된다**.
   * 이 RTDB 인스턴스(`feel-music-share`)는 `asia-southeast1` 리전이고,
   * `@react-native-firebase/database`의 `getDatabase()`는 인자 없이 호출하면 기본 리전
   * (`us-central1`)을 가정하므로 비기본 리전 인스턴스에는 연결되지 않는다(공식 문서 근거).
   * 그래서 `getDatabase(getApp(), FIREBASE_DATABASE_URL)` 형태로 이 URL을 명시적으로 전달해야
   * 한다 (2026-07-27, Firebase 콘솔에서 RTDB 활성화 후 확정).
   */
  FIREBASE_PROJECT_ID: 'TODO_FIREBASE_PROJECT_ID',
  FIREBASE_API_KEY: 'TODO_FIREBASE_API_KEY',
  FIREBASE_APP_ID: 'TODO_FIREBASE_APP_ID',
  FIREBASE_DATABASE_URL: 'https://feel-music-share-default-rtdb.asia-southeast1.firebasedatabase.app/',

  /**
   * YouTube Data API v3 키 (`services/youtube/youtubeSearch.ts`가 `search.list`/`videos.list` 호출에
   * 사용). Google Cloud Console에서 "API 제한: YouTube Data API v3만" 체크로 제한돼 있고
   * "애플리케이션 제한"은 걸려 있지 않다(RN이 REST를 직접 호출하는 방식이라 앱 제한을 걸면 정상
   * 요청까지 막힐 수 있어 의도적으로 비워둠, `docs/external-service-setup-guide.md` 참고).
   * PKCE 공개 클라이언트 식별자인 `SPOTIFY_CLIENT_ID`, Firebase 클라이언트 설정 값들과 같은
   * 성격의 "클라이언트 임베드 전제 키"라 저장소에 커밋해도 안전하다 — API 스코프 제한이 실질적
   * 방어선이다(2026-07-27, 리더 안내).
   */
  YOUTUBE_API_KEY: 'AIzaSyDf6Y7iMR0qMXnERoBRBueNB46jr_KZY3U',
} as const;
