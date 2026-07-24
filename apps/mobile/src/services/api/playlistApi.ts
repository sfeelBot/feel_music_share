import {apiRequest} from './client';
import type {PlaylistEntry, Track} from '../../types/domain';

/**
 * 협업 플레이리스트 CRUD (docs/specs/04-playlist.md).
 * 변경 결과는 REST 응답과 별개로 WebSocket을 통해 다른 참여자에게도 브로드캐스트된다
 * (services/realtime/socket.ts 의 'playlist_update' 참고).
 */

export function searchSpotifyTracks(
  sessionId: string,
  query: string,
  accessToken: string,
): Promise<Track[]> {
  return apiRequest<Track[]>(
    `/sessions/${sessionId}/playlist/search?q=${encodeURIComponent(query)}`,
    {accessToken},
  );
}

export function addTrack(
  sessionId: string,
  track: Track,
  accessToken: string,
): Promise<PlaylistEntry[]> {
  return apiRequest<PlaylistEntry[]>(`/sessions/${sessionId}/playlist`, {
    method: 'POST',
    body: {track},
    accessToken,
  });
}

export function removeTrack(
  sessionId: string,
  entryId: string,
  accessToken: string,
): Promise<PlaylistEntry[]> {
  return apiRequest<PlaylistEntry[]>(`/sessions/${sessionId}/playlist/${entryId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function reorderPlaylist(
  sessionId: string,
  orderedEntryIds: string[],
  accessToken: string,
): Promise<PlaylistEntry[]> {
  return apiRequest<PlaylistEntry[]>(`/sessions/${sessionId}/playlist/reorder`, {
    method: 'PATCH',
    body: {orderedEntryIds},
    accessToken,
  });
}
