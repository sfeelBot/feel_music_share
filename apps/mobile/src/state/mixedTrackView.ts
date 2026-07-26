import type {SessionState} from '../types/domain';

/**
 * 혼합 세션에서 "나"의 관점으로 지금 재생 중인 곡이 실제로 재생 가능한 상태인지를 판정한다
 * (00-ux-flow.md 2.10d "매칭 미확인/실패 상태와의 관계"). NowPlayingView/YouTubeNowPlayingView가
 * 공유하는 순수 함수라 두 파일에서 중복 없이 재사용하고, 단위 테스트도 쉽다.
 */
export type MixedCurrentTrackView =
  | {kind: 'none'}
  | {kind: 'searching'; entryTitle: string; entryArtist: string}
  | {kind: 'awaitingConfirm'; entryTitle: string; entryArtist: string}
  | {kind: 'failed'; entryTitle: string; entryArtist: string; skipped: boolean}
  | {
      kind: 'ready';
      title: string;
      artist: string;
      durationMs: number;
      albumArtUrl?: string;
      serviceTrackId: string;
    };

/** view.kind !== 'ready'인 경우만 — Now Playing이 재생 영역 대신 상태 카드를 보여줄 때 쓰는 좁혀진 타입. */
export type MixedTrackNeedsAttentionView = Exclude<MixedCurrentTrackView, {kind: 'ready'}>;

export function resolveMixedCurrentTrackForMe(
  session: SessionState,
  myParticipantId: string | null,
): MixedCurrentTrackView {
  if (!myParticipantId) {
    return {kind: 'none'};
  }
  const entry = session.mixedPlaylist.find(e => e.entryId === session.playback.currentEntryId);
  if (!entry) {
    return {kind: 'none'};
  }
  const match = entry.matches[myParticipantId];
  if (!match || match.status === 'searching') {
    return {kind: 'searching', entryTitle: entry.title, entryArtist: entry.artist};
  }
  if (match.status === 'failed') {
    return {kind: 'failed', entryTitle: entry.title, entryArtist: entry.artist, skipped: match.skipped};
  }
  if (match.confirmState === 'pending') {
    return {kind: 'awaitingConfirm', entryTitle: entry.title, entryArtist: entry.artist};
  }
  if (!match.track) {
    return {kind: 'none'};
  }
  return {
    kind: 'ready',
    title: match.track.title,
    artist: match.track.artist,
    durationMs: match.track.durationMs,
    albumArtUrl: match.track.albumArtUrl,
    serviceTrackId: match.track.serviceTrackId,
  };
}
