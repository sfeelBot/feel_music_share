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
import {buildDemoMixedPlaylist, buildDemoParticipants, buildDemoPlaylist, ringColorForIndex} from './mockSessionSeed';

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

/**
 * 초대 코드로 세션을 조회한다(참여 여부와 무관하게 읽기 전용) — "코드로 참여하기"(HomeScreen.tsx)의
 * 사전 조회에도, joinSessionByCode 내부에도 함께 쓰인다. 초대 코드는 항상 대문자로 발급되므로
 * (utils/id.ts generateInviteCode) 사용자가 소문자로 입력해도 매칭되도록 정규화한다.
 *
 * TODO(Firebase 연동): `sessions/{sessionId}` 컬렉션을 inviteCode로 조회하려면 별도 인덱스(또는
 * `inviteCodes/{code} -> sessionId` 매핑 문서)가 필요하다 — 지금은 in-memory Map 전체를 순회한다
 * (세션 수가 적은 데모 스코프에서는 문제 없음).
 */
export function getSessionByInviteCode(inviteCode: string): SessionState | undefined {
  const normalized = inviteCode.trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }
  return Array.from(sessions.values()).find(s => s.inviteCode === normalized);
}

export type JoinSessionFailureReason = 'not_found' | 'capacity_full' | 'platform_required';

export type JoinSessionResult =
  | {ok: true; session: SessionState; participant: ParticipantInfo}
  | {ok: false; reason: JoinSessionFailureReason};

/**
 * 초대 코드로 기존 세션에 참여자를 추가한다 ("코드로 참여하기", 00-ux-flow.md 참여 흐름).
 *
 * TODO(Firebase 연동, 중요 — 데모 스코프 한계): 세션이 이 앱 프로세스의 in-memory Map(`sessions`)에만
 * 존재하므로, 이 함수는 **같은 기기(같은 앱 인스턴스)에서 방금 만든 세션에 한해서만** 실제로 참여를
 * 성립시킬 수 있다. 다른 기기에서 만든 세션은 애초에 이 프로세스 메모리에 없어 찾을 수 없다 —
 * Firestore/RTDB 연동 후에는 이 함수가 실제 원격 문서를 조회/갱신하도록 교체되어야 한다.
 *
 * 판단 근거(정원 초과 처리, 구현 로그에도 동일하게 남김): 04-playlist.md의 정원(capacity) 정책은
 * "세션 생성 시점 고정"이라고만 정의하고, 정원이 꽉 찬 세션에 참여를 시도할 때의 동작은 명세하지
 * 않았다. 참여 자체를 거부하고 사유를 명확히 안내하는 쪽으로 판단했다(대기열 등록 같은 추가 기능은
 * 스펙에 없으므로 만들지 않았다) — 이미 참여 중인 사람이 같은 코드로 재입장하는 경우는 새 인원이
 * 아니므로 정원 검사 없이 그대로 통과시킨다(예: 앱 재시작 후 같은 코드로 다시 들어오는 경우 대비).
 *
 * 혼합(mixed) 세션은 참여자 본인의 플랫폼 선택이 필요하다(PlatformSelect.tsx, 00-ux-flow.md 2.6c와
 * 동일한 개념을 참여자 쪽에도 적용). `platform` 인자 없이 호출되면 아직 선택 전이라는 뜻으로
 * `platform_required`를 반환한다 — 참여 자체를 미리 실패시키지 않고, 호출한 쪽(SessionContext.tsx)이
 * 플랫폼을 물어본 뒤 다시 호출하도록 한다(참고: 이 경우 참여자는 아직 세션에 추가되지 않는다).
 */
export function joinSessionByCode(
  inviteCode: string,
  joiningUser: {participantId: string; displayName: string; accountTier: 'premium' | 'free'},
  platform?: MixedParticipantPlatform,
): JoinSessionResult {
  const session = getSessionByInviteCode(inviteCode);
  if (!session) {
    return {ok: false, reason: 'not_found'};
  }

  const existing = session.participants.find(p => p.participantId === joiningUser.participantId);
  if (existing) {
    return {ok: true, session, participant: existing};
  }

  if (session.participants.length >= session.capacity) {
    return {ok: false, reason: 'capacity_full'};
  }

  if (session.service === 'mixed' && !platform) {
    return {ok: false, reason: 'platform_required'};
  }

  const participant: ParticipantInfo = {
    participantId: joiningUser.participantId,
    displayName: joiningUser.displayName,
    ringColor: ringColorForIndex(session.participants.length),
    role: 'regular',
    accountTier: joiningUser.accountTier,
    connectionStatus: 'connected',
    delaySeconds: 0,
    platform: session.service === 'mixed' ? platform : undefined,
  };
  session.participants = [...session.participants, participant];
  return {ok: true, session, participant};
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

/**
 * 세션의 활성 음악 서비스를 전환한다 (00-ux-flow.md 2.13a/2.13b, US-105b/US-105c).
 * 혼합 세션(service==='mixed')은 호출측(state/SessionContext.tsx)이 이미 걸러야 한다 — 이 함수는
 * Spotify↔YouTube 전환만 다룬다.
 *
 * 참고(구현 유의): 지금 데이터 모델은 서비스별로 별도 플레이리스트를 보관하지 않는다 —
 * `session.playlist`는 활성 서비스가 무엇이든 공유하는 단일 배열이다. 그래서 이 함수는 `service`
 * 플래그만 바꾸고 `playlist`는 건드리지 않는데, 이는 우연히 "전환해도 곡이 사라지지 않는다"(2.13a
 * 안내 카피)와 같은 결과를 내지만, 04-playlist.md가 요구하는 "서비스별 플레이리스트 독립 보존"을
 * 데이터 수준까지 실제로 구현한 것은 아니다(서비스별로 다른 트랙 목록을 각각 유지하는 것과는 다름).
 * TODO(Firebase 연동): 서비스별 독립 플레이리스트 저장 구조로 데이터 모델을 확장해야 한다.
 *
 * TODO(Firebase 연동): Cloud Function 호출로 교체하고, 권한 재검증은 반드시 서버에서 강제해야 한다
 * (appointAdmin/revokeAdmin과 동일한 원칙 — 04-playlist.md "디자인 에이전트 전달 사항" 6번).
 */
export function switchService(sessionId: string, newService: 'spotify' | 'youtube'): SessionState | undefined {
  const session = sessions.get(sessionId);
  if (!session || session.service === 'mixed') {
    return session;
  }
  session.service = newService;
  return session;
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
