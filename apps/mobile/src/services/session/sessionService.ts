import {get, onValue, ref, serverTimestamp, set, update} from '@react-native-firebase/database';
import {
  SESSION_CAPACITY_DEFAULT,
  type ParticipantInfo,
  type PlaylistEntry,
  type SessionState,
  type Track,
} from '../../types/domain';
import {getFirebaseDatabase} from '../firebase/firebaseClient';
import {generateId, generateInviteCode} from '../../utils/id';
import {ringColorForIndex} from './mockSessionSeed';

/**
 * 세션(방) 데이터 액세스 레이어.
 *
 * ## 1라운드(2026-07-27) — 세션 생성/조회/참여를 RTDB로 교체
 *
 * 근거: docs/specs/10-rtdb-schema-and-security-rules.md(트리 스키마·보안 규칙 설계),
 * docs/decision-log.md 2026-07-27 "RTDB 보안 규칙 인증 방식 + 호스트 마이그레이션 선출 규칙"
 * (시나리오 A: Firebase Auth 익명 인증 채택).
 *
 * **부분 마이그레이션 상태다(정상, 10번 문서 로드맵의 의도된 설계)**: `createSession` /
 * `getSessionByInviteCode` / `joinSessionByCode`는 아래에서 실제 RTDB(`/sessions/{id}/meta`,
 * `/sessions/{id}/participants`, `/inviteCodes/{code}`)를 읽고 쓴다. 그 외
 * (addTrack/removeTrack/reorderPlaylist/appointAdmin/revokeAdmin)는 이번 라운드 범위가 아니라서
 * 손대지 않았다 — 여전히 모듈 스코프 in-memory `sessions` Map을 그대로 읽고 쓴다. 이 Map은 이제
 * "실제 서버 데이터"가 아니라 **아직 RTDB로 옮기지 않은 필드(entries/playback)를 위한 로컬 캐시**로
 * 그 의미가 바뀌었다 — createSession/joinSessionByCode가 이 Map에도 계속 세션을 채워 넣어(RTDB
 * 쓰기와 별개로) 아래 함수들이 계속 동작하도록 한다. 다음 라운드가 이 함수들을 하나씩 RTDB로
 * 옮기면서 이 Map은 점점 쓸모가 줄어들다 마지막 라운드 이후 완전히 제거될 것으로 예상한다.
 *
 * **데모 참여자/데모 플레이리스트 시드를 제거했다(중요, 의도적 변경, 2026-07-27부터 유지)**: 새로
 * 만든 세션은 호스트 1명 + 빈 플레이리스트로 시작한다 — 다른 참여자는 초대 코드로 실제 입장할 때
 * 추가된다.
 *
 * **RTDB에 없는 필드(entries/playback)의 기본값**: `getSessionByInviteCode`로 조회한 세션(특히
 * 이 프로세스가 만들지 않은, 다른 기기가 만든 세션)은 로컬 캐시가 없으므로 빈 플레이리스트 + 정지
 * 상태(`playback.isPlaying: false`)로 기본값이 채워진다 — 이 필드들이 실제로 RTDB에 반영되는 건
 * 다음 라운드의 몫이다.
 *
 * ## 2라운드(2026-07-28) — YouTube 단일 플랫폼 전환(데이터 모델 단순화)
 *
 * 근거: docs/decision-log.md 2026-07-28 "Spotify 지원 완전 제거 + 혼합(Mixed) 세션 모드 제거",
 * docs/specs/11-youtube-only-migration-plan.md(라운드 1). 세션이 항상 YouTube 하나뿐이므로
 * `switchService`(전환할 다른 서비스가 없음)와 혼합(Mixed) 전용 함수(`addMixedTrack`/
 * `removeMixedTrack`/`reorderMixedPlaylist`/`setParticipantMatch`) 전부를 제거했다.
 * `SessionState.playlists: Record<service, ...>`/`mixedPlaylist` 대신 단일 `entries: PlaylistEntry[]`
 * 배열로 교체되어(`types/domain.ts` 참고), `addTrack`/`removeTrack`/`reorderPlaylist`가
 * `state/activeServicePlaylist.ts`의 간접 계층 없이 `session.entries`를 직접 다룬다 — 그 간접
 * 계층 자체가 "여러 서비스 중 활성 서비스 하나"라는 전제 위에 있었으므로 함께 삭제했다.
 *
 * 예상되는 다음 라운드 연동 지점(참고):
 * - addTrack/removeTrack/reorderPlaylist → `sessions/{sessionId}/playlists/{entryId}`
 * - appointAdmin/revokeAdmin → `sessions/{sessionId}/participants/{pid}/role` (방장만 — 보안 규칙)
 * - 재생 명령(play/pause/seek/nextTrack) → `sessions/{sessionId}/playback`, `serverTimestamp`는
 *   반드시 `ServerValue.TIMESTAMP`(05-sync-architecture.md 모델 A)
 */

const sessions = new Map<string, SessionState>();

/** RTDB `/sessions/{id}/meta`의 원시 형태. */
interface RtdbSessionMeta {
  sessionName: string;
  hostParticipantId: string;
  capacity: number;
  inviteCode: string;
  createdAt: number;
}

/**
 * RTDB `/sessions/{id}/participants/{pid}`의 원시 형태. 클라이언트 타입(`ParticipantInfo`)은
 * `avatarUrl?`을 `undefined`로 생략 가능하게 두지만, RTDB는 `undefined` 값을 쓸 수 없어(에러)
 * 명시적으로 `null`을 쓴다. 아래 toRtdbParticipant/fromRtdbParticipant가 두 형태를 서로 변환한다.
 */
interface RtdbParticipant {
  displayName: string;
  avatarUrl: string | null;
  ringColor: string;
  role: ParticipantInfo['role'];
  connectionStatus: ParticipantInfo['connectionStatus'];
  delaySeconds: number;
  joinedAt: unknown; // 쓰기 시점엔 serverTimestamp() placeholder, 읽기 시점엔 number(ms)
}

function toRtdbParticipant(p: ParticipantInfo): RtdbParticipant {
  return {
    displayName: p.displayName,
    avatarUrl: p.avatarUrl ?? null,
    ringColor: p.ringColor,
    role: p.role,
    connectionStatus: p.connectionStatus,
    delaySeconds: p.delaySeconds,
    joinedAt: serverTimestamp(),
  };
}

function fromRtdbParticipant(participantId: string, raw: RtdbParticipant): ParticipantInfo {
  return {
    participantId,
    displayName: raw.displayName,
    avatarUrl: raw.avatarUrl ?? undefined,
    ringColor: raw.ringColor,
    role: raw.role,
    connectionStatus: raw.connectionStatus,
    delaySeconds: raw.delaySeconds,
  };
}

function resolveSessionName(rawName: string): string {
  return rawName.trim() || '우리 둘의 플레이리스트';
}

/**
 * RTDB에서 읽은 meta+participants와, 이 프로세스의 로컬 캐시(있다면)를 합쳐 완전한
 * `SessionState`를 만든다. entries/playback은 아직 RTDB에 없으므로 캐시값을 재사용하고, 캐시가
 * 없으면(다른 기기가 만든 세션을 처음 조회하는 경우) 빈/정지 기본값을 쓴다.
 */
function buildSessionStateFromRtdb(
  sessionId: string,
  meta: RtdbSessionMeta,
  participantsRaw: Record<string, RtdbParticipant> | null,
  cached: SessionState | undefined,
): SessionState {
  const participants = participantsRaw
    ? Object.entries(participantsRaw).map(([pid, raw]) => fromRtdbParticipant(pid, raw))
    : [];

  return {
    sessionId,
    inviteCode: meta.inviteCode,
    sessionName: meta.sessionName,
    hostParticipantId: meta.hostParticipantId,
    capacity: meta.capacity,
    participants,
    entries: cached?.entries ?? [],
    playback:
      cached?.playback ?? {
        currentEntryId: null,
        positionMs: 0,
        isPlaying: false,
        // 로컬 전용 기본값(placeholder)이다 — RTDB에 쓰이지 않으므로 05-sync-architecture.md가
        // 경고하는 "Date.now()를 서버 타임스탬프로 오기록"하는 문제와 무관하다(다음 라운드에서
        // playback이 실제로 RTDB로 옮겨지면 이 기본값 자체가 사라진다).
        serverTimestamp: Date.now(),
        updatedByParticipantId: meta.hostParticipantId,
      },
  };
}

/**
 * 세션(방)을 새로 만든다. `/sessions/{id}/meta` + `/sessions/{id}/participants/{hostId}` +
 * `/inviteCodes/{code}` 세 경로를 RTDB 다중 경로 원자적 `update()` 한 번으로 커밋한다 — 순서대로
 * 여러 `set()`을 호출하지 않는다(10번 문서 "제약/리스크" 3번, 중간 실패 시 고아 세션 방지).
 * `createdAt`/`joinedAt`은 `ServerValue.TIMESTAMP`(`serverTimestamp()`)로 기록한다 — 절대
 * `Date.now()`를 쓰지 않는다(05-sync-architecture.md 서버 기준 시계 모델 전제).
 *
 * **주의(현재 알려진 상태, 회귀 아님)**: RTDB 보안 규칙이 아직 배포 전(기본 잠금 상태)이라 위
 * `update()` 호출은 지금 시점에는 실제로 거부된다 — 규칙 배포는 이 라운드 범위 밖의 별도
 * 액션이다(아래 `database.rules.json` 참고). 규칙이 배포되기 전까지 이 함수는 reject된 Promise를
 * 던진다.
 */
export async function createSession(params: {
  sessionName: string;
  capacity?: number;
  host: {participantId: string; displayName: string};
}): Promise<SessionState> {
  const capacity = params.capacity ?? SESSION_CAPACITY_DEFAULT;
  const sessionId = generateId('session');
  const inviteCode = generateInviteCode();
  const sessionName = resolveSessionName(params.sessionName);

  const hostParticipant: ParticipantInfo = {
    participantId: params.host.participantId,
    displayName: params.host.displayName,
    ringColor: ringColorForIndex(0),
    role: 'host',
    connectionStatus: 'connected',
    delaySeconds: 0,
  };

  // RtdbSessionMeta의 createdAt는 읽기 시점 타입(number)이라, 쓰기 시점 placeholder인
  // serverTimestamp()(object)와는 타입이 다르다 — 아래 update 페이로드는 그래서
  // `Omit<RtdbSessionMeta, 'createdAt'> & {createdAt: object}` 형태를 인라인으로 구성한다.
  const db = getFirebaseDatabase();
  const updates: Record<string, unknown> = {
    [`sessions/${sessionId}/meta`]: {
      sessionName,
      hostParticipantId: params.host.participantId,
      capacity,
      inviteCode,
      createdAt: serverTimestamp(),
    },
    [`sessions/${sessionId}/participants/${params.host.participantId}`]: toRtdbParticipant(hostParticipant),
    [`inviteCodes/${inviteCode}`]: sessionId,
  };
  await update(ref(db), updates);

  const session: SessionState = {
    sessionId,
    inviteCode,
    sessionName,
    hostParticipantId: params.host.participantId,
    capacity,
    participants: [hostParticipant],
    entries: [],
    playback: {
      currentEntryId: null,
      positionMs: 0,
      isPlaying: false,
      serverTimestamp: Date.now(), // 로컬 전용 기본값(placeholder) — 위 buildSessionStateFromRtdb 주석 참고
      updatedByParticipantId: params.host.participantId,
    },
  };

  sessions.set(sessionId, session);
  return session;
}

/**
 * 로컬 캐시(이 프로세스 안에서 create/join한 세션)만 동기적으로 반환한다 — RTDB를 조회하지
 * 않는다. entries/playback(다음 라운드 몫)은 아직 RTDB에 없어 동기적으로 읽을 방법 자체가 없으므로,
 * 아직 마이그레이션되지 않은 addTrack/removeTrack 등과 관련 테스트가 이 로컬 캐시를 계속
 * 참조한다. RTDB의 최신 meta/participants를 실시간으로 반영하려면 아래 `subscribeToSession`을 쓰라.
 */
export function getSession(sessionId: string): SessionState | undefined {
  return sessions.get(sessionId);
}

async function fetchSessionFromRtdb(sessionId: string): Promise<SessionState | undefined> {
  const db = getFirebaseDatabase();
  const [metaSnap, participantsSnap] = await Promise.all([
    get(ref(db, `sessions/${sessionId}/meta`)),
    get(ref(db, `sessions/${sessionId}/participants`)),
  ]);
  if (!metaSnap.exists()) {
    return undefined;
  }
  const meta = metaSnap.val() as RtdbSessionMeta;
  const participantsRaw = participantsSnap.exists() ? (participantsSnap.val() as Record<string, RtdbParticipant>) : null;
  const built = buildSessionStateFromRtdb(sessionId, meta, participantsRaw, sessions.get(sessionId));
  sessions.set(sessionId, built);
  return built;
}

/**
 * 초대 코드로 세션을 조회한다(참여 여부와 무관하게 읽기 전용) — `/inviteCodes/{code}`를 먼저
 * 읽어 `sessionId`를 얻은 뒤 `/sessions/{sessionId}/meta`+`/participants`를 읽는다(10번 문서
 * "왜 /inviteCodes를 별도 최상위 경로로 두는가" — `/sessions` 전체를 순회하지 않기 위한 역참조
 * 인덱스, 보안 규칙 관점에서도 필수). 초대 코드는 항상 대문자로 발급되므로(utils/id.ts
 * generateInviteCode) 사용자가 소문자로 입력해도 매칭되도록 정규화한다.
 */
export async function getSessionByInviteCode(inviteCode: string): Promise<SessionState | undefined> {
  const normalized = inviteCode.trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }
  const db = getFirebaseDatabase();
  const codeSnap = await get(ref(db, `inviteCodes/${normalized}`));
  if (!codeSnap.exists()) {
    return undefined;
  }
  const sessionId = codeSnap.val() as string;
  return fetchSessionFromRtdb(sessionId);
}

export type JoinSessionFailureReason = 'not_found' | 'capacity_full';

export type JoinSessionResult =
  | {ok: true; session: SessionState; participant: ParticipantInfo}
  | {ok: false; reason: JoinSessionFailureReason};

/**
 * 초대 코드로 기존 세션에 참여자를 추가한다 ("코드로 참여하기", 00-ux-flow.md 참여 흐름).
 * `/sessions/{sessionId}/participants/{participantId}`에 본인 레코드 하나만 쓴다(보안 규칙
 * 시나리오 A: `auth.uid === $participantId`만 자기 레코드를 쓸 수 있음).
 *
 * 판단 근거(정원 초과 처리, 구현 로그에도 동일하게 남김): 04-playlist.md의 정원(capacity) 정책은
 * "세션 생성 시점 고정"이라고만 정의하고, 정원이 꽉 찬 세션에 참여를 시도할 때의 동작은 명세하지
 * 않았다. 참여 자체를 거부하고 사유를 명확히 안내하는 쪽으로 판단했다(대기열 등록 같은 추가 기능은
 * 스펙에 없으므로 만들지 않았다) — 이미 참여 중인 사람이 같은 코드로 재입장하는 경우는 새 인원이
 * 아니므로 정원 검사 없이 그대로 통과시킨다(예: 앱 재시작 후 같은 코드로 다시 들어오는 경우 대비).
 * 이 클라이언트측 정원 검사는 UX 안내용일 뿐 서버측 강제가 아니다 — 실제 강제는 RTDB 보안 규칙
 * (10번 문서 `participants/$participantId` `.write` 조건의 `numChildren() < capacity`)의 몫이다.
 */
export async function joinSessionByCode(
  inviteCode: string,
  joiningUser: {participantId: string; displayName: string},
): Promise<JoinSessionResult> {
  const session = await getSessionByInviteCode(inviteCode);
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

  const participant: ParticipantInfo = {
    participantId: joiningUser.participantId,
    displayName: joiningUser.displayName,
    ringColor: ringColorForIndex(session.participants.length),
    role: 'regular',
    connectionStatus: 'connected',
    delaySeconds: 0,
  };

  const db = getFirebaseDatabase();
  await set(ref(db, `sessions/${session.sessionId}/participants/${participant.participantId}`), toRtdbParticipant(participant));

  const updatedSession: SessionState = {...session, participants: [...session.participants, participant]};
  sessions.set(session.sessionId, updatedSession);
  return {ok: true, session: updatedSession, participant};
}

/** subscribeToSession 콜백으로 전달되는 값 — 이번 라운드는 meta+participants만 RTDB에 있다. */
export interface SessionLiveSnapshot {
  sessionName: string;
  hostParticipantId: string;
  capacity: number;
  participants: ParticipantInfo[];
}

/**
 * `/sessions/{sessionId}`를 실시간 구독한다(RTDB `onValue`). 다른 기기가 초대 코드로 참여해
 * 참여자가 추가되는 등 세션 메타/참여자 변화를 실시간으로 받고 싶은 화면(SessionContext.tsx)이
 * 이 함수를 쓴다. 이번 라운드는 meta/participants만 RTDB에 쓰므로 콜백 값도 그 두 부분만
 * 포함한다 — entries/playback은 아직 이 경로에 없다(다음 라운드가 채워 넣으면 이 구독이 자동으로
 * 그 값도 받게 된다, 코드 변경 불필요).
 *
 * 반환된 함수를 호출하면 구독이 해제된다(RNFirebase 모듈러 API의 `onValue`는 unsubscribe 함수를
 * 직접 반환한다 — 레거시 `off()`를 따로 호출할 필요 없음).
 */
export function subscribeToSession(
  sessionId: string,
  onChange: (snapshot: SessionLiveSnapshot | undefined) => void,
): () => void {
  const db = getFirebaseDatabase();
  const sessionRef = ref(db, `sessions/${sessionId}`);
  return onValue(sessionRef, snapshot => {
    if (!snapshot.exists()) {
      onChange(undefined);
      return;
    }
    const raw = snapshot.val() as {meta?: RtdbSessionMeta; participants?: Record<string, RtdbParticipant>};
    if (!raw.meta) {
      onChange(undefined);
      return;
    }
    const participants = raw.participants
      ? Object.entries(raw.participants).map(([pid, p]) => fromRtdbParticipant(pid, p))
      : [];
    onChange({
      sessionName: raw.meta.sessionName,
      hostParticipantId: raw.meta.hostParticipantId,
      capacity: raw.meta.capacity,
      participants,
    });
  });
}

/**
 * 아래 addTrack/removeTrack/reorderPlaylist 셋 다 `session.entries`를 직접 다룬다 (2026-07-28
 * YouTube 단일화로 서비스별 분기/간접 계층(구 `state/activeServicePlaylist.ts`)이 사라졌다 —
 * 04-playlist.md "플레이리스트 구조", docs/specs/11-youtube-only-migration-plan.md 참고).
 *
 * TODO(Firebase 연동, 다음 라운드): 아직 RTDB로 옮기지 않았다 — 로컬 캐시(`sessions` Map)만
 * 갱신한다(파일 상단 "1라운드" 주석 참고).
 */
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
  session.entries = [...session.entries, entry];
  return session.entries;
}

export function removeTrack(sessionId: string, entryId: string): PlaylistEntry[] {
  const session = sessions.get(sessionId);
  if (!session) {
    return [];
  }
  session.entries = session.entries.filter(item => item.entryId !== entryId);
  return session.entries;
}

export function reorderPlaylist(sessionId: string, orderedEntryIds: string[]): PlaylistEntry[] {
  const session = sessions.get(sessionId);
  if (!session) {
    return [];
  }
  const byId = new Map(session.entries.map(entry => [entry.entryId, entry]));
  session.entries = orderedEntryIds.map(id => byId.get(id)).filter((e): e is PlaylistEntry => !!e);
  return session.entries;
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
