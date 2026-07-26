import {describe, expect, it} from '@jest/globals';
import {resolveMixedCurrentTrackForMe} from '../src/state/mixedTrackView';
import type {MixedPlaylistEntry, SessionState} from '../src/types/domain';

function makeSession(entry: MixedPlaylistEntry): SessionState {
  return {
    sessionId: 's1',
    inviteCode: 'ABC123',
    sessionName: 'test',
    service: 'mixed',
    hostParticipantId: 'me',
    capacity: 2,
    participants: [],
    playlists: {
      spotify: {entries: [], lastPlayback: {currentEntryId: null, positionMs: 0}},
      youtube: {entries: [], lastPlayback: {currentEntryId: null, positionMs: 0}},
    },
    mixedPlaylist: [entry],
    playback: {
      currentEntryId: entry.entryId,
      positionMs: 0,
      isPlaying: true,
      serverTimestamp: Date.now(),
      updatedByParticipantId: 'me',
    },
  };
}

const baseEntry: Omit<MixedPlaylistEntry, 'matches'> = {
  entryId: 'e1',
  title: '우리가 걷던 밤',
  artist: '코스모스',
  representativeDurationMs: 225000,
  addedByParticipantId: 'me',
  addedByDisplayName: '나',
  addedAt: Date.now(),
  playedStatus: 'playing',
};

describe('resolveMixedCurrentTrackForMe', () => {
  it('returns none when there is no current entry', () => {
    const session = makeSession({...baseEntry, matches: {}});
    session.playback.currentEntryId = null;
    expect(resolveMixedCurrentTrackForMe(session, 'me')).toEqual({kind: 'none'});
  });

  it('returns searching when my match has not resolved yet', () => {
    const session = makeSession({...baseEntry, matches: {me: {status: 'searching', confirmState: 'pending', candidates: [], skipped: false}}});
    expect(resolveMixedCurrentTrackForMe(session, 'me').kind).toBe('searching');
  });

  it('returns awaitingConfirm when matched but not yet confirmed', () => {
    const session = makeSession({
      ...baseEntry,
      matches: {
        me: {
          status: 'matched',
          confirmState: 'pending',
          candidates: [],
          skipped: false,
          track: {
            service: 'youtube',
            serviceTrackId: 'v1',
            title: '우리가 걷던 밤 (Live)',
            artist: '코스모스',
            durationMs: 230000,
            matchScore: 90,
            confidenceLevel: 'high',
          },
        },
      },
    });
    expect(resolveMixedCurrentTrackForMe(session, 'me').kind).toBe('awaitingConfirm');
  });

  it('returns ready with the confirmed track once confirmed', () => {
    const session = makeSession({
      ...baseEntry,
      matches: {
        me: {
          status: 'matched',
          confirmState: 'confirmed',
          candidates: [],
          skipped: false,
          track: {
            service: 'spotify',
            serviceTrackId: 'spotify:track:x',
            title: '우리가 걷던 밤',
            artist: '코스모스',
            durationMs: 225000,
            matchScore: 100,
            confidenceLevel: 'high',
          },
        },
      },
    });
    const view = resolveMixedCurrentTrackForMe(session, 'me');
    expect(view.kind).toBe('ready');
    if (view.kind === 'ready') {
      expect(view.serviceTrackId).toBe('spotify:track:x');
    }
  });

  it('returns failed when the search failed and was not skipped', () => {
    const session = makeSession({
      ...baseEntry,
      matches: {me: {status: 'failed', confirmState: 'pending', candidates: [], skipped: false}},
    });
    const view = resolveMixedCurrentTrackForMe(session, 'me');
    expect(view.kind).toBe('failed');
    if (view.kind === 'failed') {
      expect(view.skipped).toBe(false);
    }
  });
});
