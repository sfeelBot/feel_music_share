import {
  SESSION_CAPACITY_DEFAULT,
  type MatchedTrackCandidate,
  type MixedParticipantPlatform,
  type MixedPlaylistEntry,
  type MusicService,
  type ParticipantInfo,
  type ParticipantMatch,
  type PlaylistEntry,
  type SessionState,
  type Track,
} from '../../types/domain';
import {generateId, generateInviteCode} from '../../utils/id';
import {buildDemoMixedPlaylist, buildDemoParticipants, buildDemoPlaylist} from './mockSessionSeed';

/**
 * 세션(방) 데이터 액세스 레이어 — 현재는 인메모리 STUB.
 *
 * TODO(Firebase 연동, 우선순위 높음): 아래 각 함수는 실제로는 Firestore/Realtime Database 읽기·쓰기와
 * Cloud Functions 호출로 교체되어야 한다. 이 라운드에서는 백엔드가 없으므로 모듈 스코프의 in-memory
 * Map으로 대체했다 — 앱을 재시작하면 데이터가 사라진다(의도된 제약, 영속화는 다음 단계).
 *
 * 예상되는 실제 연동 지점(다음 라운드 작업 시 참고):
 * - createSession → Firestore `sessions/{sessionId}` 문서 생성 + Cloud Function이 inviteCode 발급
 * - subscribeToSession → Firestore `onSnapshot` 또는 RTDB `onValue` 리스너 (state/SessionContext.tsx에서 구독)
 * - addTrack/removeTrack/reorderPlaylist → `sessions/{sessionId}/playlist/{entryId}` 서브컬렉션 쓰기,
 *   서버(Cloud Functions)가 검증 후 커밋 → 리스너로 전파
 * - appointAdmin/revokeAdmin → Cloud Function 호출(권한 검증은 반드시 서버에서 — 04-playlist.md
 *   "디자인 에이전트 전달 사항" 6번, 클라이언트 UI 비활성화만으로는 우회 방지 불가)
 * - 재생 명령(play/pause/seek/nextTrack) → Cloud Function이 서버 기준 시각(serverTimestamp)을 찍어
 *   playback 문서를 갱신 (05-sync-architecture.md 모델 A)
 */

const sessions = new Map<string, SessionState>();

export function createSession(params: {
  sessionName: string;
  service: MusicService;
  capacity?: number;
  host: {participantId: string; displayName: string; accountTier: 'premium' | 'free'};
  /** 혼합 세션일 때만 의미 있음 — 호스트가 2.6c에서 선택한 개인 참여 플랫폼. */
  hostPlatform?: MixedParticipantPlatform;
}): SessionState {
  const capacity = params.capacity ?? SESSION_CAPACITY_DEFAULT;
  const isMixed = params.service === 'mixed';
  const participants: ParticipantInfo[] = buildDemoParticipants(
    params.host,
    capacity,
    params.service,
    params.hostPlatform ?? 'spotify',
  );
  const playlist: PlaylistEntry[] = isMixed ? [] : buildDemoPlaylist(participants);
  const mixedPlaylist: MixedPlaylistEntry[] = isMixed ? buildDemoMixedPlaylist(participants) : [];
  const firstEntryId = isMixed ? mixedPlaylist[0]?.entryId : playlist[0]?.entryId;

  const session: SessionState = {
    sessionId: generateId('session'),
    inviteCode: generateInviteCode(),
    sessionName: params.sessionName.trim() || '우리 둘의 플레이리스트',
    service: params.service,
    hostParticipantId: params.host.participantId,
    capacity,
    participants,
    playlist,
    mixedPlaylist,
    playback: {
      currentEntryId: firstEntryId ?? null,
      positionMs: 92000, // 목업(1:32)과 맞춘 데모 초기값
      isPlaying: true,
      serverTimestamp: Date.now(),
      updatedByParticipantId: params.host.participantId,
    },
  };

  sessions.set(session.sessionId, session);
  return session;
}

export function getSession(sessionId: string): SessionState | undefined {
  return sessions.get(sessionId);
}

export function addTrack(sessionId: string, track: Track, addedBy: ParticipantInfo): PlaylistEntry[] {
  const session = sessions.get(sessionId);
  if (!session) {
    return [];
  }
  const entry: PlaylistEntry = {
    entryId: generateId('entry'),
    track,
    addedByParticipantId: addedBy.participantId,
    addedByDisplayName: addedBy.displayName,
    addedAt: Date.now(),
    playedStatus: 'pending',
  };
  session.playlist = [...session.playlist, entry];
  return session.playlist;
}

export function removeTrack(sessionId: string, entryId: string): PlaylistEntry[] {
  const session = sessions.get(sessionId);
  if (!session) {
    return [];
  }
  session.playlist = session.playlist.filter(item => item.entryId !== entryId);
  return session.playlist;
}

export function reorderPlaylist(sessionId: string, orderedEntryIds: string[]): PlaylistEntry[] {
  const session = sessions.get(sessionId);
  if (!session) {
    return [];
  }
  const byId = new Map(session.playlist.map(entry => [entry.entryId, entry]));
  session.playlist = orderedEntryIds.map(id => byId.get(id)).filter((e): e is PlaylistEntry => !!e);
  return session.playlist;
}

/** 방장 전용 — 관리자 임명 (04-playlist.md "권한 체계" 절, 2026-07-24 확정: 임명권은 방장 보유). */
export function appointAdmin(sessionId: string, participantId: string): ParticipantInfo[] {
  const session = sessions.get(sessionId);
  if (!session) {
    return [];
  }
  session.participants = session.participants.map(p =>
    p.participantId === participantId && p.role === 'regular' ? {...p, role: 'admin'} : p,
  );
  return session.participants;
}

export function revokeAdmin(sessionId: string, participantId: string): ParticipantInfo[] {
  const session = sessions.get(sessionId);
  if (!session) {
    return [];
  }
  session.participants = session.participants.map(p =>
    p.participantId === participantId && p.role === 'admin' ? {...p, role: 'regular'} : p,
  );
  return session.participants;
}

/* ------------------------------------------------------------------------------------------------
 * 혼합(Mixed) 세션 플레이리스트/매칭 (04-playlist.md "혼합 모드 플레이리스트 구조",
 * 09-cross-platform-mixed-mode.md "결정 2", 2026-07-26 구현)
 *
 * `addMixedTrack`는 곡을 추가한 참여자의 매칭만 즉시 채워 넣고(그 사람은 이미 자신의 플랫폼에서
 * 직접 골랐으므로), 나머지 참여자의 매칭은 'searching' 상태로 비워둔 채 반환한다 — 각 참여자의
 * 검색은 네트워크 호출(Spotify Web API 실검색 또는 YouTube 목업 검색)이 필요해 비동기이므로,
 * 실제 검색/랭킹은 `services/matching/trackMatcher.ts`를 호출하는 SessionContext.tsx 쪽에서
 * 수행하고, 결과가 나올 때마다 `setParticipantMatch`로 하나씩 반영한다(참여자별 독립 진행 —
 * 09문서 결정 2-3, "한 사람의 확인이 다른 참여자에게 영향을 주지 않는다"는 원칙을 매칭 계산
 * 단계에서도 그대로 지킨다 — 한 참여자의 검색이 끝났다고 다른 참여자를 기다리게 하지 않음).
 * ---------------------------------------------------------------------------------------------- */

export function addMixedTrack(
  sessionId: string,
  entryId: string,
  common: {title: string; artist: string; durationMs: number; thumbnailUrl?: string},
  addedBy: ParticipantInfo,
  adderMatch: MatchedTrackCandidate,
): MixedPlaylistEntry[] {
  const session = sessions.get(sessionId);
  if (!session) {
    return [];
  }
  const matches: Record<string, ParticipantMatch> = {};
  session.participants.forEach(participant => {
    if (participant.participantId === addedBy.participantId) {
      // 추가한 사람 본인은 이미 자신의 플랫폼에서 특정 트랙을 직접 골랐다 — 검색을 다시 돌리지
      // 않고 그 선택을 그대로 "매칭됨(확인 대기)" 상태로 반영한다.
      matches[participant.participantId] = {
        status: 'matched',
        track: adderMatch,
        confirmState: 'pending',
        candidates: [],
        skipped: false,
      };
    } else {
      matches[participant.participantId] = {
        status: 'searching',
        confirmState: 'pending',
        candidates: [],
        skipped: false,
      };
    }
  });

  const entry: MixedPlaylistEntry = {
    entryId,
    title: common.title,
    artist: common.artist,
    representativeThumbnailUrl: common.thumbnailUrl,
    representativeDurationMs: common.durationMs,
    addedByParticipantId: addedBy.participantId,
    addedByDisplayName: addedBy.displayName,
    addedAt: Date.now(),
    playedStatus: 'pending',
    matches,
  };
  session.mixedPlaylist = [...session.mixedPlaylist, entry];
  return session.mixedPlaylist;
}

export function removeMixedTrack(sessionId: string, entryId: string): MixedPlaylistEntry[] {
  const session = sessions.get(sessionId);
  if (!session) {
    return [];
  }
  session.mixedPlaylist = session.mixedPlaylist.filter(item => item.entryId !== entryId);
  return session.mixedPlaylist;
}

export function reorderMixedPlaylist(sessionId: string, orderedEntryIds: string[]): MixedPlaylistEntry[] {
  const session = sessions.get(sessionId);
  if (!session) {
    return [];
  }
  const byId = new Map(session.mixedPlaylist.map(entry => [entry.entryId, entry]));
  session.mixedPlaylist = orderedEntryIds.map(id => byId.get(id)).filter((e): e is MixedPlaylistEntry => !!e);
  return session.mixedPlaylist;
}

/** 참여자 한 명의 매칭 상태를 통째로 교체한다(검색 완료 반영, 확정, 후보 교체, 수동 교체, 건너뛰기 공용). */
export function setParticipantMatch(
  sessionId: string,
  entryId: string,
  participantId: string,
  match: ParticipantMatch,
): MixedPlaylistEntry[] {
  const session = sessions.get(sessionId);
  if (!session) {
    return [];
  }
  session.mixedPlaylist = session.mixedPlaylist.map(entry =>
    entry.entryId === entryId ? {...entry, matches: {...entry.matches, [participantId]: match}} : entry,
  );
  return session.mixedPlaylist;
}
