import {authorize, refresh, type AuthConfiguration} from 'react-native-app-auth';
import {ENV} from '../../config/env';

/**
 * Spotify 로그인 진입점 (US-101, US-104).
 *
 * Authorization Code + PKCE 플로우를 사용한다 (Spotify가 모바일 앱에 권장하는 방식이며,
 * client secret을 앱에 내장할 필요가 없어 ToS/보안 관점에서도 적절함 —
 * docs/specs/02-spotify-integration.md 참고).
 *
 * NOTE: 이것은 Web API용 로그인이다 (검색, /v1/me 로 Premium 여부 확인 등).
 * 실제 로컬 Spotify 앱 재생 제어(App Remote SDK)는 별도의 인증 경로이며
 * services/spotify/spotifyRemote.ts 에서 다룬다 — 혼동하지 말 것.
 */

const spotifyAuthConfig: AuthConfiguration = {
  clientId: ENV.SPOTIFY_CLIENT_ID,
  redirectUrl: ENV.SPOTIFY_REDIRECT_URI,
  scopes: [...ENV.SPOTIFY_SCOPES],
  serviceConfiguration: {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
  },
  usePKCE: true,
};

export interface SpotifyAuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpirationDate: string;
}

export async function loginWithSpotify(): Promise<SpotifyAuthTokens> {
  const result = await authorize(spotifyAuthConfig);
  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    accessTokenExpirationDate: result.accessTokenExpirationDate,
  };
}

export async function refreshSpotifyToken(refreshToken: string): Promise<SpotifyAuthTokens> {
  const result = await refresh(spotifyAuthConfig, {refreshToken});
  return {
    accessToken: result.accessToken,
    // react-native-app-auth는 refresh 시 refreshToken을 새로 안 주는 경우가 있어 기존 값 유지
    refreshToken: result.refreshToken ?? refreshToken,
    accessTokenExpirationDate: result.accessTokenExpirationDate,
  };
}
