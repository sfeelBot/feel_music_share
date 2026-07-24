import {apiRequest} from './client';

/**
 * 앱 자체 사용자 식별 (US-101, US-102).
 * 모바일에서 Spotify PKCE 로그인으로 얻은 access token을 백엔드로 전달하면,
 * 백엔드가 Spotify Web API(/v1/me)로 구독 등급(Premium 여부)을 확인하고
 * 세션/플레이리스트 REST·WebSocket 호출에 쓸 내부 사용자 정보를 돌려준다.
 */
export interface AppUser {
  spotifyUserId: string;
  displayName: string;
  avatarUrl?: string;
  isPremium: boolean;
}

export function fetchAppUser(spotifyAccessToken: string): Promise<AppUser> {
  return apiRequest<AppUser>('/auth/session', {
    method: 'POST',
    accessToken: spotifyAccessToken,
  });
}
