import type {SpotifySearchTrack} from '../spotify/spotifyWebApi';

/**
 * YouTube 곡(영상) 검색 — 현재는 목업(STUB).
 *
 * 근거: `docs/specs/03-youtube-integration.md`가 조사한 대로 YouTube Data API v3 연동에는 API 키
 * 발급/쿼터 관리가 필요하고, 이번 라운드는 "YouTube 세션 생성/Now Playing 화면의 UI와 상태 흐름"만
 * 완성하는 것이 목표라 실제 API 연동은 범위 밖이다(리더 지시).
 *
 * 반환 타입은 `spotifyWebApi.ts`의 `SpotifySearchTrack`과 구조적으로 동일하다(둘 다 결국
 * `Track`으로 변환되는 검색 결과 항목이므로) — `AddTrackModal.tsx`가 서비스와 무관하게 같은
 * `results` 상태/렌더링 로직을 재사용할 수 있게 하기 위한 의도적 설계.
 *
 * TODO(다음 라운드): YouTube Data API v3 `search.list`(+ `videos.list`로 duration 보강) 호출로 교체.
 * 실제 연동 시 IFrame Player 재생 가능 여부(embeddable, region 제한 등)도 함께 필터링해야 한다
 * (`03-youtube-integration.md` 4절 참고).
 */

const MOCK_CATALOG: SpotifySearchTrack[] = [
  {serviceTrackId: 'youtube:video:mock1', title: '우리가 걷던 밤 (Official Video)', artist: '코스모스', durationMs: 231000},
  {serviceTrackId: 'youtube:video:mock2', title: '새벽의 파도 - Live Session', artist: '하늘소리', durationMs: 204000},
  {serviceTrackId: 'youtube:video:mock3', title: '여름, 그날 (Lyric Video)', artist: '잔잔한 파도', durationMs: 213000},
  {serviceTrackId: 'youtube:video:mock4', title: '밤의 드라이브', artist: '네온사인', durationMs: 198000},
  {serviceTrackId: 'youtube:video:mock5', title: '첫눈이 올 때', artist: '겨울보라', durationMs: 245000},
];

const MOCK_SEARCH_DELAY_MS = 300;

/** 목업 검색 — 제목/채널명에 쿼리가 포함된 항목만 대소문자 구분 없이 반환한다. */
export async function searchYoutubeTracksMock(query: string): Promise<SpotifySearchTrack[]> {
  if (!query.trim()) {
    return [];
  }
  await new Promise(resolve => setTimeout(resolve, MOCK_SEARCH_DELAY_MS));
  const normalized = query.trim().toLowerCase();
  return MOCK_CATALOG.filter(
    item => item.title.toLowerCase().includes(normalized) || item.artist.toLowerCase().includes(normalized),
  );
}
