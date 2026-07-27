import {ENV} from '../../config/env';
import type {SpotifySearchTrack} from '../spotify/spotifyWebApi';

/**
 * YouTube 곡(영상) 검색 — YouTube Data API v3 실연동.
 *
 * 근거: `docs/specs/03-youtube-integration.md`가 조사한 대로 YouTube Data API v3에는 공식 재생
 * 상태 동기화 API가 없어 재생 제어는 여전히 IFrame Player(`youtubePlayerStub.ts`)에 의존하지만,
 * "검색"만큼은 Data API v3 `search.list`로 충분히 커버된다 — 이전 라운드까지는 API 키 미발급으로
 * `youtubeMockSearch.ts` 정적 목업을 썼으나(2026-07-27 API 키 발급 완료, `docs/external-service-
 * setup-guide.md` 참고) 이번 라운드에서 실제 호출로 교체한다.
 *
 * 반환 타입은 `spotifyWebApi.ts`의 `SpotifySearchTrack`과 구조적으로 동일하게 유지한다 — 둘 다
 * 결국 `Track`으로 변환되는 검색 결과 항목이라 `AddTrackModal.tsx`가 서비스와 무관하게 같은
 * `results` 상태/렌더링 로직을 재사용한다는 기존 설계를 그대로 따른다.
 *
 * 참고(재생 가능 여부 필터링 미포함): `region 제한`/`embeddable` 여부까지 검색 단계에서 거르는 건
 * `videos.list`에 `status` part를 추가로 요청해야 하는 별도 작업이라 이번 라운드 범위 밖으로 남긴다
 * (`03-youtube-integration.md` 4절) — 재생 시도 시 IFrame Player의 `onError`가 최종 방어선이다.
 */

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export class YoutubeApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function youtubeFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${YOUTUBE_API_BASE}${path}`);
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new YoutubeApiError(response.status, text || `YouTube API 요청 실패: ${path}`);
  }
  return (await response.json()) as T;
}

/**
 * YouTube Data API v3 검색 결과 개수 상한.
 *
 * 근거 (2026-07-27): Spotify 검색(`spotifyWebApi.ts`의 `SPOTIFY_SEARCH_LIMIT`)과 같은 수준(10)으로
 * 맞췄다 — 두 서비스의 검색 화면(`AddTrackModal.tsx`)이 같은 리스트 UI를 재사용하므로 결과 개수가
 * 서비스마다 들쭉날쭉하면 UX 일관성이 떨어진다는 판단. 쿼터 측면에서도 `search.list` 1회가 이미
 * 100유닛(하루 기본 할당량 10,000유닛 기준 최대 100회/일)이라 `maxResults`를 5~10 사이에서 늘려도
 * 쿼터 소모량 자체는 변하지 않는다(호출 1회당 비용은 고정, 반환 개수와 무관).
 */
const YOUTUBE_SEARCH_LIMIT = 10;

interface YoutubeSearchListResponse {
  items: Array<{
    id: {videoId: string};
    snippet: {
      title: string;
      channelTitle: string;
      thumbnails?: {default?: {url: string}; medium?: {url: string}; high?: {url: string}};
    };
  }>;
}

interface YoutubeVideosListResponse {
  items: Array<{
    id: string;
    contentDetails: {duration: string};
  }>;
}

/**
 * ISO 8601 duration(예: `PT4M13S`, `PT1H2M3S`, `PT45S`)을 밀리초로 변환한다.
 * 매칭 실패(형식이 예상과 다른 경우)는 0으로 폴백한다 — 곡 추가 자체를 막을 정도로 치명적이지
 * 않고, `trackMatcher.ts`의 duration 점수 계산이 오차를 이미 완만한 단계 함수로 흡수하기 때문.
 */
export function parseIso8601DurationMs(duration: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration);
  if (!match) {
    return 0;
  }
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
}

/**
 * 영상(제목/영상) 검색 — `search.list`(part=snippet, type=video)로 videoId 목록을 얻은 뒤,
 * `videos.list`(part=contentDetails)로 각 영상의 duration을 보강해 합친다.
 * `search.list`는 duration을 반환하지 않으므로 2회 호출이 필수다.
 */
export async function searchYoutubeTracks(query: string): Promise<SpotifySearchTrack[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const searchData = await youtubeFetch<YoutubeSearchListResponse>(
    `/search?part=snippet&type=video&maxResults=${YOUTUBE_SEARCH_LIMIT}&q=${encodeURIComponent(
      trimmed,
    )}&key=${ENV.YOUTUBE_API_KEY}`,
  );

  const items = searchData.items ?? [];
  if (items.length === 0) {
    return [];
  }

  const videoIds = items.map(item => item.id.videoId);
  const videosData = await youtubeFetch<YoutubeVideosListResponse>(
    `/videos?part=contentDetails&id=${videoIds.join(',')}&key=${ENV.YOUTUBE_API_KEY}`,
  );
  const durationByVideoId = new Map(
    (videosData.items ?? []).map(item => [item.id, parseIso8601DurationMs(item.contentDetails.duration)]),
  );

  return items.map(item => ({
    serviceTrackId: `youtube:video:${item.id.videoId}`,
    title: item.snippet.title,
    artist: item.snippet.channelTitle,
    albumArtUrl: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url,
    durationMs: durationByVideoId.get(item.id.videoId) ?? 0,
  }));
}
