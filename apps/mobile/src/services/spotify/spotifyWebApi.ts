/**
 * Spotify Web API 클라이언트 (검색, 프로필/Premium 조회).
 *
 * 근거: docs/specs/02-spotify-integration.md 1)절 — Web API는 REST 기반이며, Authorization Code
 * + PKCE로 얻은 accessToken을 그대로 Authorization 헤더에 실어 클라이언트에서 직접 호출 가능하다
 * (client secret이 필요 없는 플로우이므로 서버를 거치지 않아도 안전).
 *
 * NOTE: 세션/플레이리스트/재생 동기화 상태는 Firebase(Firestore/RTDB + Cloud Functions)가 다루지만,
 * "Spotify 자체의 검색/프로필 조회"는 Spotify Web API를 직접 호출하는 것이 맞는 경로다 — 이 둘을
 * 혼동하지 말 것 (services/firebase/firebaseClient.ts, services/session/sessionService.ts 주석 참고).
 */

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export class SpotifyApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function spotifyFetch<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${SPOTIFY_API_BASE}${path}`, {
    headers: {Authorization: `Bearer ${accessToken}`},
  });
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new SpotifyApiError(response.status, text || `Spotify API 요청 실패: ${path}`);
  }
  return (await response.json()) as T;
}

export interface SpotifyProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  /** 'premium' | 'free' | 'open' 등 — Free/미로그인 등급은 전부 'free'로 취급 (02-spotify-integration.md 3절) */
  isPremium: boolean;
}

/** GET /v1/me — 로그인 사용자 프로필 + 구독 등급(Premium 여부) 조회. */
export async function fetchSpotifyProfile(accessToken: string): Promise<SpotifyProfile> {
  const me = await spotifyFetch<{
    id: string;
    display_name: string | null;
    images?: {url: string}[];
    product?: string;
  }>('/me', accessToken);

  return {
    id: me.id,
    displayName: me.display_name ?? me.id,
    avatarUrl: me.images?.[0]?.url,
    isPremium: me.product === 'premium',
  };
}

export interface SpotifySearchTrack {
  serviceTrackId: string;
  title: string;
  artist: string;
  albumArtUrl?: string;
  durationMs: number;
}

/**
 * Spotify Web API 검색 결과 개수 상한.
 *
 * 근거 (2026-07-27): Spotify 공식 문서(https://developer.spotify.com/documentation/web-api/reference/search,
 * https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)에 따르면
 * 2026-02 정책 변경으로 `/v1/search`의 `limit` 허용 범위가 0~50(기본 20)에서 0~10(기본 5)으로
 * 축소됐다 — Development Mode 앱이 `/v1/search` 자체에 접근 불가해진 것이 아니라(그 진단은 낡은
 * 정보에 근거한 오진이었음, docs/decisions-needed.md 참고), 범위를 초과한 `limit` 값이 400 Invalid
 * limit을 유발한 순수 파라미터 버그였다. 상한값인 10을 그대로 쓴다 — 검색 결과를 최대한 많이
 * 보여주는 편이 UX상 유리하고, 10개면 한 화면 스크롤 목록으로도 충분히 유용하다는 판단.
 */
const SPOTIFY_SEARCH_LIMIT = 10;

/** GET /v1/search?type=track — 곡 검색 (US-301). */
export async function searchSpotifyTracks(
  query: string,
  accessToken: string,
): Promise<SpotifySearchTrack[]> {
  if (!query.trim()) {
    return [];
  }
  const data = await spotifyFetch<{
    tracks?: {
      items: Array<{
        uri: string;
        name: string;
        artists: Array<{name: string}>;
        album?: {images?: {url: string}[]};
        duration_ms: number;
      }>;
    };
  }>(`/search?type=track&limit=${SPOTIFY_SEARCH_LIMIT}&q=${encodeURIComponent(query)}`, accessToken);

  return (data.tracks?.items ?? []).map(item => ({
    serviceTrackId: item.uri,
    title: item.name,
    artist: item.artists.map(a => a.name).join(', '),
    albumArtUrl: item.album?.images?.[0]?.url,
    durationMs: item.duration_ms,
  }));
}
