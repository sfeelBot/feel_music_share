import {
  SESSION_CAPACITY_DEFAULT,
  type MusicService,
  type ParticipantInfo,
  type PlaylistEntry,
  type SessionState,
  type Track,
} from '../../types/domain';
import {generateId, generateInviteCode} from '../../utils/id';
import {buildDemoParticipants, buildDemoPlaylist} from './mockSessionSeed';

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
}): SessionState {
  const participants: ParticipantInfo[] = buildDemoParticipants(params.host);
  const playlist: PlaylistEntry[] = buildDemoPlaylist(participants);
  const firstEntry = playlist[0];

  const session: SessionState = {
    sessionId: generateId('session'),
    inviteCode: generateInviteCode(),
    sessionName: params.sessionName.trim() || '우리 둘의 플레이리스트',
    service: params.service,
    hostParticipantId: params.host.participantId,
    capacity: params.capacity ?? SESSION_CAPACITY_DEFAULT,
    participants,
    playlist,
    playback: {
      currentEntryId: firstEntry?.entryId ?? null,
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
