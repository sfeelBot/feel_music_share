import type {PlaylistEntry, SessionState, SingleMusicService} from '../types/domain';

/**
 * "지금 활성 서비스(Spotify 또는 YouTube)의 플레이리스트"를 가리키는 파생 로직을 한 곳에 모은
 * 헬퍼. 04-playlist.md "플레이리스트 구조" 절(서비스별 독립 보존)에 맞춰 `SessionState.playlist`
 * 단일 배열이 `SessionState.playlists: Record<SingleMusicService, ServicePlaylistState>`로
 * 바뀌면서(2026-07-26), 여러 화면(PlaylistView/NowPlayingView/YouTubeNowPlayingView)과
 * SessionContext.tsx가 각자 `session.service === 'mixed' ? ... : session.playlists[session.service]`
 * 같은 분기를 반복하게 되는 걸 막기 위해 추출했다(구현 로그 참고 — 최근 라운드들이 state/*.ts
 * 순수 함수 추출 패턴을 잘 써왔다는 작업 지시를 그대로 따름).
 *
 * 혼합 세션(session.service === 'mixed')에서 호출하면 빈 배열을 반환한다 — 혼합 세션은
 * `session.mixedPlaylist`를 대신 쓰며, 호출부가 이미 `isMixed` 분기를 갖고 있는 기존 패턴을
 * 그대로 유지한다(이 헬퍼가 "혼합이면 알아서 mixedPlaylist를 반환"하도록 만들지 않은 이유는
 * PlaylistEntry와 MixedPlaylistEntry가 04문서가 명시한 대로 "근본적으로 다른 구조"라 하나의
 * 반환 타입으로 합칠 수 없기 때문이다 — types/domain.ts MixedPlaylistEntry 주석과 동일한 판단).
 */
export function activePlaylistEntries(session: SessionState): PlaylistEntry[] {
  if (session.service === 'mixed') {
    return [];
  }
  return session.playlists[session.service].entries;
}

/**
 * `activePlaylistEntries`가 반환한 배열을 새 배열로 교체한 `session.playlists`를 만들어 반환한다
 * (SessionContext.tsx의 addTrack/removeTrack/requestMoveTrack/requestNextTrack/requestPrevTrack이
 * 공통으로 쓰는 "활성 서비스 슬롯만 갈아끼우기" 패턴). 혼합 세션에서 호출되면(호출부 버그 방지용
 * 방어 코드) 아무 것도 바꾸지 않고 기존 `playlists`를 그대로 반환한다 — 혼합 세션에서는 애초에
 * 호출되지 않아야 한다.
 */
export function withActivePlaylistEntries(
  session: SessionState,
  entries: PlaylistEntry[],
): SessionState['playlists'] {
  if (session.service === 'mixed') {
    return session.playlists;
  }
  const service: SingleMusicService = session.service;
  return {
    ...session.playlists,
    [service]: {...session.playlists[service], entries},
  };
}
