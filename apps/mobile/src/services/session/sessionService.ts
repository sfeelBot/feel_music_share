import {get, onValue, ref, serverTimestamp, set, update} from '@react-native-firebase/database';
import {
  SESSION_CAPACITY_DEFAULT,
  type MatchedTrackCandidate,
  type MixedParticipantPlatform,
  type MixedPlaylistEntry,
  type MusicService,
  type ParticipantInfo,
  type ParticipantMatch,
  type PlaybackState,
  type PlaylistEntry,
  type ServicePlaylistState,
  type SessionState,
  type SingleMusicService,
  type Track,
} from '../../types/domain';
import {activePlaylistEntries, withActivePlaylistEntries} from '../../state/activeServicePlaylist';
import {getFirebaseDatabase} from '../firebase/firebaseClient';
import {generateId, generateInviteCode} from '../../utils/id';
import {ringColorForIndex} from './mockSessionSeed';

/** 빈 서비스 플레이리스트 슬롯(곡 없음, 재생 위치 기억 없음) — createSession/신규 슬롯 초기화 공용. */
function emptyServicePlaylistState(): ServicePlaylistState {
  return {entries: [], lastPlayback: {currentEntryId: null, positionMs: 0}};
}

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
 * (addTrack/removeTrack/reorderPlaylist/switchService/appointAdmin/revokeAdmin/혼합 모드 매칭 함수)는
 * 이번 라운드 범위가 아니라서 손대지 않았다 — 여전히 모듈 스코프 in-memory `sessions` Map을
 * 그대로 읽고 쓴다. 이 Map은 이제 "실제 서버 데이터"가 아니라 **아직 RTDB로 옮기지 않은
 * 필드(playlists/mixedPlaylist/playback)를 위한 로컬 캐시**로 그 의미가 바뀌었다 — createSession/
 * joinSessionByCode가 이 Map에도 계속 세션을 채워 넣어(RTDB 쓰기와 별개로) 아래 함수들이 계속
 * 동작하도록 한다. 다음 라운드(2-A/2-B/3)가 이 함수들을 하나씩 RTDB로 옮기면서 이 Map은 점점
 * 쓸모가 줄어들다 마지막 라운드(4) 이후 완전히 제거될 것으로 예상한다.
 *
 * **데모 참여자/데모 플레이리스트 시드를 이 라운드에서 제거했다(중요, 의도적 변경)**: 기존
 * `createSession`은 `mockSessionSeed.buildDemoParticipants/buildDemoPlaylist/buildDemoMixedPlaylist`로
 * 가짜 참여자 2명 + 데모 곡 3곡을 항상 채워 넣었다. RTDB 다중 경로 원자적 update()로 실제
 * 참여자 레코드를 쓰는 이번 라운드부터는 이게 더 이상 맞지 않는다 — (1) 보안 규칙(시나리오 A)의
 * `participants/{pid}.write: auth.uid === $participantId` 조건상 호스트가 자기 자신이 아닌
 * 가짜 participantId로 다른 참여자 레코드를 쓰는 것 자체가 애초에 허용되지 않고(다중 경로
 * update()는 원자적이라 그 경로 하나만 규칙 위반이어도 전체 업데이트가 거부된다), (2) 실제
 * 기기 A/B가 초대 코드로 서로 만나는 크로스디바이스 흐름이 이 라운드부터 실제로 성립하는데,
 * 기기 A에는 가짜 참여자 2명이 보이고 기기 B(참여자)에는 안 보이는 불일치가 생겨 오히려 더 큰
 * 혼란을 준다. `mockSessionSeed.ts` 자신의 TODO 주석("실제로는 세션 생성 시 호스트 한 명만
 * 참여자로 시작하고, 다른 참여자는 초대 코드로 실제 입장할 때 추가되어야 한다")이 이미 이 방향을
 * 예고하고 있었다 — `buildDemoParticipants`/`buildDemoPlaylist`/`buildDemoMixedPlaylist` 함수
 * 자체는 삭제하지 않았다(다른 파일에서 직접 참조하지 않음, 재사용 필요 시 대비). 이 변경으로
 * 새로 만든 세션은 이제 호스트 1명 + 빈 플레이리스트로 시작한다 — UX가 눈에 보이게 달라지는
 * 지점이라 구현 로그에도 동일하게 남기고 리더에게 보고한다.
 *
 * **RTDB에 없는 필드(playlists/mixedPlaylist/playback)의 기본값**: `getSessionByInviteCode`로
 * 조회한 세션(특히 이 프로세스가 만들지 않은, 다른 기기가 만든 세션)은 로컬 캐시가 없으므로
 * 빈 플레이리스트 + 정지 상태(`playback.isPlaying: false`)로 기본값이 채워진다 — 이 필드들이
 * 실제로 RTDB에 반영되는 건 2-A/2-B/3라운드의 몫이다.
 *
 * 예상되는 다음 라운드 연동 지점(참고):
 * - addTrack/removeTrack/reorderPlaylist → `sessions/{sessionId}/playlists/{service}/entries/{entryId}`
 * - appointAdmin/revokeAdmin → `sessions/{sessionId}/participants/{pid}/role` (방장만 — 보안 규칙)
 * - 재생 명령(play/pause/seek/nextTrack) → `sessions/{sessionId}/playback`, `serverTimestamp`는
 *   반드시 `ServerValue.TIMESTAMP`(05-sync-architecture.md 모델 A)
 */

const sessions = new Map<string, SessionState>();

/** RTDB `/sessions/{id}/meta`의 원시 형태(10번 문서 스키마 그대로). */
interface RtdbSessionMeta {
  sessionName: string;
  service: MusicService;
  hostParticipantId: string;
  capacity: number;
  inviteCode: string;
  createdAt: number;
}

/**
 * RTDB `/sessions/{id}/participants/{pid}`의 원시 형태. 클라이언트 타입(`ParticipantInfo`)은
 * `avatarUrl?`/`platform?`을 `undefined`로 생략 가능하게 두지만, RTDB는 `undefined` 값을 쓸 수
 * 없어(에러) 명시적으로 `null`을 쓴다 — 10번 문서 스키마가 이미 `string | null` / `... | null`로
 * 명시한 이유이기도 하다. 아래 toRtdbParticipant/fromRtdbParticipant가 두 형태를 서로 변환한다.
 */
interface RtdbParticipant {
  displayName: string;
  avatarUrl: string | null;
  ringColor: string;
  role: ParticipantInfo['role'];
  accountTier: ParticipantInfo['accountTier'];
  connectionStatus: ParticipantInfo['connectionStatus'];
  delaySeconds: number;
  platform: MixedParticipantPlatform | null;
  joinedAt: unknown; // 쓰기 시점엔 serverTimestamp() placeholder, 읽기 시점엔 number(ms)
}

function toRtdbParticipant(p: ParticipantInfo): RtdbParticipant {
  return {
    displayName: p.displayName,
    avatarUrl: p.avatarUrl ?? null,
    ringColor: p.ringColor,
    role: p.role,
    accountTier: p.accountTier,
    connectionStatus: p.connectionStatus,
    delaySeconds: p.delaySeconds,
    platform: p.platform ?? null,
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
    accountTier: raw.accountTier,
    connectionStatus: raw.connectionStatus,
    delaySeconds: raw.delaySeconds,
    platform: raw.platform ?? undefined,
  };
}

function resolveSessionName(rawName: string): string {
  return rawName.trim() || '우리 둘의 플레이리스트';
}

/**
 * RTDB에서 읽은 meta+participants와, 이 프로세스의 로컬 캐시(있다면)를 합쳐 완전한
 * `SessionState`를 만든다. playlists/mixedPlaylist/playback은 아직 RTDB에 없으므로 캐시값을
 * 재사용하고, 캐시가 없으면(다른 기기가 만든 세션을 처음 조회하는 경우) 빈/정지 기본값을 쓴다.
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
    service: meta.service,
    hostParticipantId: meta.hostParticipantId,
    capacity: meta.capacity,
    participants,
    playlists: cached?.playlists ?? {spotify: emptyServicePlaylistState(), youtube: emptyServicePlaylistState()},
    mixedPlaylist: cached?.mixedPlaylist ?? [],
    playback:
      cached?.playback ?? {
        currentEntryId: null,
        positionMs: 0,
        isPlaying: false,
        // 로컬 전용 기본값(placeholder)이다 — RTDB에 쓰이지 않으므로 05-sync-architecture.md가
        // 경고하는 "Date.now()를 서버 타임스탬프로 오기록"하는 문제와 무관하다(3라운드에서
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
  service: MusicService;
  capacity?: number;
  host: {participantId: string; displayName: string; accountTier: 'premium' | 'free'};
  /** 혼합 세션일 때만 의미 있음 — 호스트가 2.6c에서 선택한 개인 참여 플랫폼. */
  hostPlatform?: MixedParticipantPlatform;
}): Promise<SessionState> {
  const capacity = params.capacity ?? SESSION_CAPACITY_DEFAULT;
  const isMixed = params.service === 'mixed';
  const sessionId = generateId('session');
  const inviteCode = generateInviteCode();
  const sessionName = resolveSessionName(params.sessionName);

  const hostParticipant: ParticipantInfo = {
    participantId: params.host.participantId,
    displayName: params.host.displayName,
    ringColor: ringColorForIndex(0),
    role: 'host',
    accountTier: params.host.accountTier,
    connectionStatus: 'connected',
    delaySeconds: 0,
    platform: isMixed ? params.hostPlatform ?? 'spotify' : undefined,
  };

  // RtdbSessionMeta의 createdAt는 읽기 시점 타입(number)이라, 쓰기 시점 placeholder인
  // serverTimestamp()(object)와는 타입이 다르다 — 아래 update 페이로드는 그래서
  // `Omit<RtdbSessionMeta, 'createdAt'> & {createdAt: object}` 형태를 인라인으로 구성한다.
  const db = getFirebaseDatabase();
  const updates: Record<string, unknown> = {
    [`sessions/${sessionId}/meta`]: {
      sessionName,
      service: params.service,
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
    service: params.service,
    hostParticipantId: params.host.participantId,
    capacity,
    participants: [hostParticipant],
    playlists: {spotify: emptyServicePlaylistState(), youtube: emptyServicePlaylistState()},
    mixedPlaylist: [],
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
 * 않는다. playlists/mixedPlaylist/playback(다음 라운드 몫)은 아직 RTDB에 없어 동기적으로 읽을
 * 방법이 자체가 없으므로, 아직 마이그레이션되지 않은 addTrack/removeTrack/switchService 등과
 * 관련 테스트가 이 로컬 캐시를 계속 참조한다. RTDB의 최신 meta/participants를 실시간으로
 * 반영하려면 아래 `subscribeToSession`을 쓰라.
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

export type JoinSessionFailureReason = 'not_found' | 'capacity_full' | 'platform_required';

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
 *
 * 혼합(mixed) 세션은 참여자 본인의 플랫폼 선택이 필요하다(PlatformSelect.tsx, 00-ux-flow.md 2.6c와
 * 동일한 개념을 참여자 쪽에도 적용). `platform` 인자 없이 호출되면 아직 선택 전이라는 뜻으로
 * `platform_required`를 반환한다 — 참여 자체를 미리 실패시키지 않고, 호출한 쪽(SessionContext.tsx)이
 * 플랫폼을 물어본 뒤 다시 호출하도록 한다(참고: 이 경우 참여자는 아직 세션에 추가되지 않는다).
 */
export async function joinSessionByCode(
  inviteCode: string,
  joiningUser: {participantId: string; displayName: string; accountTier: 'premium' | 'free'},
  platform?: MixedParticipantPlatform,
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

  const db = getFirebaseDatabase();
  await set(ref(db, `sessions/${session.sessionId}/participants/${participant.participantId}`), toRtdbParticipant(participant));

  const updatedSession: SessionState = {...session, participants: [...session.participants, participant]};
  sessions.set(session.sessionId, updatedSession);
  return {ok: true, session: updatedSession, participant};
}

/** subscribeToSession 콜백으로 전달되는 값 — 이번 라운드는 meta+participants만 RTDB에 있다. */
export interface SessionLiveSnapshot {
  sessionName: string;
  service: MusicService;
  hostParticipantId: string;
  capacity: number;
  participants: ParticipantInfo[];
}

/**
 * `/sessions/{sessionId}`를 실시간 구독한다(RTDB `onValue`). 다른 기기가 초대 코드로 참여해
 * 참여자가 추가되는 등 세션 메타/참여자 변화를 실시간으로 받고 싶은 화면(SessionContext.tsx)이
 * 이 함수를 쓴다. 이번 라운드는 meta/participants만 RTDB에 쓰므로 콜백 값도 그 두 부분만
 * 포함한다 — playlists/mixedPlaylist/playback은 아직 이 경로에 없다(다음 라운드가 채워 넣으면
 * 이 구독이 자동으로 그 값도 받게 된다, 코드 변경 불필요).
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
      service: raw.meta.service,
      hostParticipantId: raw.meta.hostParticipantId,
      capacity: raw.meta.capacity,
      participants,
    });
  });
}

/**
 * 아래 addTrack/removeTrack/reorderPlaylist 셋 다 "현재 활성 서비스의 플레이리스트"에 대해서만
 * 동작한다 — activePlaylistEntries/withActivePlaylistEntries(state/activeServicePlaylist.ts)로
 * 비활성 서비스 쪽 `session.playlists`는 절대 건드리지 않는다(04-playlist.md "플레이리스트 구조").
 * 혼합 세션(service==='mixed')에서는 호출되지 않아야 한다 — 호출측(SessionContext.tsx)이 이미
 * addMixedTrack/removeMixedTrack/reorderMixedPlaylist로 분기한다.
 *
 * TODO(Firebase 연동, 2-A라운드): 아직 RTDB로 옮기지 않았다 — 로컬 캐시(`sessions` Map)만
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
  const entries = [...activePlaylistEntries(session), entry];
  session.playlists = withActivePlaylistEntries(session, entries);
  return entries;
}

export function removeTrack(sessionId: string, entryId: string): PlaylistEntry[] {
  const session = sessions.get(sessionId);
  if (!session) {
    return [];
  }
  const entries = activePlaylistEntries(session).filter(item => item.entryId !== entryId);
  session.playlists = withActivePlaylistEntries(session, entries);
  return entries;
}

export function reorderPlaylist(sessionId: string, orderedEntryIds: string[]): PlaylistEntry[] {
  const session = sessions.get(sessionId);
  if (!session) {
    return [];
  }
  const byId = new Map(activePlaylistEntries(session).map(entry => [entry.entryId, entry]));
  const entries = orderedEntryIds.map(id => byId.get(id)).filter((e): e is PlaylistEntry => !!e);
  session.playlists = withActivePlaylistEntries(session, entries);
  return entries;
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

/** switchService가 실제로 바뀐 필드만 돌려주는 반환 타입 — addTrack 등 다른 함수와 같은 패턴. */
export interface ServiceSwitchResult {
  service: MusicService;
  playlists: SessionState['playlists'];
  playback: PlaybackState;
}

/**
 * 세션의 활성 음악 서비스를 전환한다 (00-ux-flow.md 2.13a/2.13b, US-105b/US-105c).
 * 혼합 세션(service==='mixed')은 호출측(state/SessionContext.tsx)이 이미 걸러야 한다 — 이 함수는
 * Spotify↔YouTube 전환만 다룬다.
 *
 * (2026-07-26 데이터 수준 구현) 서비스별 독립 플레이리스트(`SessionState.playlists`, 위 domain.ts
 * 참고)가 도입되면서, 이 함수는 이제 `service` 플래그만 바꾸는 게 아니라 실제로 두 단계를 수행한다:
 * 1) 전환 직전(=비활성화되는 쪽이 되는) 서비스의 현재 재생 위치를 `playlists[oldService].lastPlayback`
 *    에 스냅샷으로 저장한다 — 이 저장이 없으면 04-playlist.md가 요구하는 "비활성화되는 쪽 플레이리스트는
 *    삭제되지 않고 그대로 보존되어 나중에 다시 그 서비스로 돌아오면 이어서 쓸 수 있다"가 곡 목록에는
 *    맞아도 "이어서"(재생 위치)에는 맞지 않게 된다.
 * 2) 새로 활성화되는 서비스의 `playlists[newService].lastPlayback`으로부터 `session.playback`을
 *    복원한다 — 처음 가보는 서비스(또는 재생 이력이 없는 서비스)는 currentEntryId가 null로 남아있어
 *    자연스럽게 "재생할 곡 없음" 상태로 시작한다.
 * isPlaying은 스냅샷에 포함하지 않고 항상 true로 재개한다 — 서비스 전환은 항상 "재동기화" 이벤트라는
 * 기존 정책을 유지한다(정확한 판단 근거는 types/domain.ts의 ServicePlaybackMemory 주석 참고).
 *
 * TODO(Firebase 연동, 3라운드): 아직 RTDB로 옮기지 않았다 — 로컬 캐시(`sessions` Map)만 갱신한다.
 */
export function switchService(
  sessionId: string,
  newService: SingleMusicService,
  switchedByParticipantId: string,
): ServiceSwitchResult | undefined {
  const session = sessions.get(sessionId);
  if (!session || session.service === 'mixed') {
    return undefined;
  }
  if (session.service === newService) {
    // 이미 활성 서비스와 같으면 아무 것도 하지 않는다(호출측도 이미 이 케이스를 걸러야 하지만,
    // 데이터 계층에서도 방어적으로 동일하게 처리한다).
    return {service: session.service, playlists: session.playlists, playback: session.playback};
  }
  const oldService: SingleMusicService = session.service;

  session.playlists = {
    ...session.playlists,
    [oldService]: {
      ...session.playlists[oldService],
      lastPlayback: {
        currentEntryId: session.playback.currentEntryId,
        positionMs: session.playback.positionMs,
      },
    },
  };

  const restored = session.playlists[newService].lastPlayback;
  session.service = newService;
  session.playback = {
    currentEntryId: restored.currentEntryId,
    positionMs: restored.positionMs,
    isPlaying: true,
    serverTimestamp: Date.now(),
    updatedByParticipantId: switchedByParticipantId,
  };

  return {service: session.service, playlists: session.playlists, playback: session.playback};
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
 *
 * TODO(Firebase 연동, 2-B라운드): 아직 RTDB로 옮기지 않았다 — 로컬 캐시(`sessions` Map)만 갱신한다.
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
