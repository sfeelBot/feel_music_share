/**
 * 도메인 타입 정의 (MVP 스코프 — Spotify 전용 세션)
 *
 * 근거 문서: docs/specs/04-playlist.md, docs/specs/05-sync-architecture.md,
 *           docs/specs/01-user-stories.md (US-106~US-210 권한/정원/Free 계정)
 *
 * NOTE: 백엔드가 커스텀 서버(REST/WebSocket)에서 Firebase로 확정됨에 따라(CLAUDE.md, 2026-07-24),
 * 이 타입들은 향후 Firestore/Realtime Database 문서 구조의 클라이언트 측 표현으로도 재사용될 것을
 * 전제로 정의했다. 실제 컬렉션/경로 설계는 구현 단계(Firebase 프로젝트 생성 이후) 몫이다.
 */

/** 세 가지 세션 유형 — Spotify 전용/YouTube 전용/혼합(Mixed, 2026-07-26 구현) */
export type MusicService = 'spotify' | 'youtube' | 'mixed';

/**
 * 혼합 세션에서 참여자 개인이 선택한 참여 플랫폼 (00-ux-flow.md 2.6c, US-105d).
 * 멜론/지니뮤직은 09문서 결론에 따라 참여 불가 — 혼합 세션은 실질적으로 Spotify/YouTube 두 값만 쓴다.
 */
export type MixedParticipantPlatform = 'spotify' | 'youtube';

/** 3단계 권한 체계 (04-playlist.md "권한 체계" 절, 2026-07-24 확정: 임명권은 방장 보유) */
export type ParticipantRole = 'host' | 'admin' | 'regular';

/** Spotify 계정 등급. Free는 동기화 재생에 참여 불가(재생 인원에서 제외) — US-106 */
export type AccountTier = 'premium' | 'free';

export interface Track {
  /** Spotify track URI (예: spotify:track:xxxx) */
  serviceTrackId: string;
  title: string;
  artist: string;
  albumArtUrl?: string;
  durationMs: number;
}

export interface ParticipantInfo {
  participantId: string;
  displayName: string;
  avatarUrl?: string;
  /** 아바타 컬러 링에 쓰이는 참여자별 고유 색 (01-style-guide.md 4절 — 자동 배정, 사용자 변경 불가) */
  ringColor: string;
  role: ParticipantRole;
  accountTier: AccountTier;
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
  /** 개인 단위 동기화 지연(초). 정상이면 0. (02-key-ui-patterns.md 2.3절 "참여자별 상세 상태") */
  delaySeconds: number;
  /**
   * 혼합 세션에서만 값을 갖는다 — 이 참여자가 2.6c에서 선택한 개인 참여 플랫폼.
   * Spotify 전용/YouTube 전용 세션에서는 session.service로 이미 알 수 있으므로 undefined로 둔다.
   */
  platform?: MixedParticipantPlatform;
}

export interface PlaylistEntry {
  entryId: string;
  track: Track;
  addedByParticipantId: string;
  addedByDisplayName: string;
  addedAt: number; // epoch ms
  playedStatus: 'pending' | 'playing' | 'played';
}

/* ------------------------------------------------------------------------------------------------
 * 혼합(Mixed) 세션 전용 플레이리스트 구조 (04-playlist.md "혼합 모드 플레이리스트 구조" 절, 2026-07-26 구현)
 *
 * 혼합 세션은 세션당 플레이리스트가 하나뿐이고(플랫폼 중립), 곡 항목이 두 계층으로 구성된다:
 *   1) 공통 식별자 계층 — MixedPlaylistEntry의 title/artist/representative* 필드
 *   2) 참여자별 매칭 트랙 계층 — MixedPlaylistEntry.matches[participantId] (ParticipantMatch)
 *
 * 구현 판단(로그에도 동일하게 남김): 유니온 타입으로 PlaylistEntry와 통합하지 않고 완전히 별도 타입
 * (MixedPlaylistEntry)으로 분리했다 — 04문서/09문서가 "근본적으로 다른 구조"라고 명시했고, 기존
 * Spotify/YouTube 전용 세션 코드(PlaylistView/NowPlayingView 등)가 이미 PlaylistEntry.track 구조에
 * 강하게 의존하고 있어 유니온으로 합치면 모든 소비처에 타입 좁히기 분기가 강제된다. 대신
 * SessionState.service(='mixed')로 어느 배열(playlist vs mixedPlaylist)을 쓸지 판별하는 방식을 택했다.
 * ---------------------------------------------------------------------------------------------- */

/** 매칭 일치율 등급 3단계 (02-key-ui-patterns.md 5.3절) */
export type MatchConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * 참여자의 매칭 확인 상태.
 * pending: 자동 매칭 결과가 나왔으나 아직 참여자가 확정/교체하지 않음 (2.11b 대기)
 * confirmed: 참여자가 "확정하기"를 눌러 그대로 채택
 * manual: 참여자가 "다른 결과 보기(후보 선택)" 또는 "직접 검색하기"로 교체
 */
export type MatchConfirmState = 'pending' | 'confirmed' | 'manual';

/** 참여자 개인의 매칭 시도 자체의 진행 상태 (검색 중/매칭됨/실패) */
export type ParticipantMatchStatus = 'searching' | 'matched' | 'failed';

/** 매칭 후보 하나(1차 매칭 결과 또는 대체 후보 목록의 항목 공통 셰이프) — 02-key-ui-patterns.md 5.2절 */
export interface MatchedTrackCandidate {
  service: MixedParticipantPlatform;
  serviceTrackId: string;
  title: string;
  artist: string;
  albumArtUrl?: string;
  durationMs: number;
  /** 0~100 — 09문서 "결정 2"의 수치 표시 요구사항. 정확한 산출 공식/가중치는 TODO(실측 필요), services/matching/trackMatcher.ts 참고 */
  matchScore: number;
  confidenceLevel: MatchConfidenceLevel;
}

/** 곡 항목 하나에 대한 "참여자 한 명"의 매칭 상태 (04-playlist.md "참여자별 매칭 트랙 계층") */
export interface ParticipantMatch {
  status: ParticipantMatchStatus;
  /** status === 'matched'일 때 현재 표시 중인(대기/확정/수동교체 상관없이) 트랙 */
  track?: MatchedTrackCandidate;
  confirmState: MatchConfirmState;
  /** "다른 결과 보기"에서 노출할 차순위 후보들(현재 track 제외, 점수 내림차순). 없으면 빈 배열. */
  candidates: MatchedTrackCandidate[];
  /** status==='failed'일 때, 참여자가 "이 곡 없이 넘어가기"를 선택했는지 (2.11d) */
  skipped: boolean;
}

export interface MixedPlaylistEntry {
  entryId: string;
  // --- 공통 식별자 계층 (플랫폼 중립, 모든 참여자 공유) ---
  title: string;
  artist: string;
  representativeThumbnailUrl?: string;
  representativeDurationMs: number;
  addedByParticipantId: string;
  addedByDisplayName: string;
  addedAt: number;
  playedStatus: 'pending' | 'playing' | 'played';
  // --- 참여자별 매칭 트랙 계층 (key: participantId) ---
  matches: Record<string, ParticipantMatch>;
}

/**
 * 서버가 관리하는 단일 진실 공급원(source of truth) 재생 상태.
 * 05-sync-architecture.md의 "모델 A: 서버 기준 시계"를 따른다.
 * TODO(Firebase 연동): 이 상태는 Cloud Functions가 갱신하고 Realtime Database/Firestore로
 * 브로드캐스트하는 문서가 될 예정이다 (state/SessionContext.tsx 주석 참고).
 */
export interface PlaybackState {
  currentEntryId: string | null;
  /** 마지막으로 상태가 갱신된 시점의 재생 위치(ms) */
  positionMs: number;
  isPlaying: boolean;
  /** 이 상태가 서버에 기록된 시각(epoch ms). 클라이언트는 클록 오프셋을 적용해 현재 예상 위치를 계산한다. */
  serverTimestamp: number;
  updatedByParticipantId: string;
}

/** 동기화 상태 4단계 (02-key-ui-patterns.md 2.2절) */
export type SyncState = 'synced' | 'tuning' | 'delayed' | 'disconnected';

export interface SyncStatusValue {
  state: SyncState;
  /** '지연' 상태일 때 표시할 초 단위 지연값 */
  delaySeconds?: number;
  /** '맞추는 중' 상태의 원인 보조 텍스트 (예: YouTube 광고 재생 중 — 이번 라운드 Spotify 전용이라 항상 undefined) */
  reasonLabel?: string;
}

export interface SessionState {
  sessionId: string;
  inviteCode: string;
  sessionName: string;
  service: MusicService;
  hostParticipantId: string;
  /** 세션 정원 2~12명, 기본값 2명 (04-playlist.md "세션 정원" 절, 2026-07-24 확정) */
  capacity: number;
  participants: ParticipantInfo[];
  /** Spotify 전용/YouTube 전용 세션에서 쓰는 단순 플레이리스트. 혼합 세션은 항상 빈 배열이다(mixedPlaylist를 대신 쓴다). */
  playlist: PlaylistEntry[];
  /** 혼합 세션 전용 플레이리스트(플랫폼 중립, 04-playlist.md). Spotify/YouTube 전용 세션에서는 항상 빈 배열이다. */
  mixedPlaylist: MixedPlaylistEntry[];
  playback: PlaybackState;
}

export const SESSION_CAPACITY_MIN = 2;
export const SESSION_CAPACITY_MAX = 12;
export const SESSION_CAPACITY_DEFAULT = 2;
