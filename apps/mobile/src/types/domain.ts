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

/** 이번 라운드는 Spotify 전용 세션만 다룬다. YouTube/혼합은 타입만 남겨두고 화면은 만들지 않는다. */
export type MusicService = 'spotify' | 'youtube' | 'mixed';

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
}

export interface PlaylistEntry {
  entryId: string;
  track: Track;
  addedByParticipantId: string;
  addedByDisplayName: string;
  addedAt: number; // epoch ms
  playedStatus: 'pending' | 'playing' | 'played';
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
  playlist: PlaylistEntry[];
  playback: PlaybackState;
}

export const SESSION_CAPACITY_MIN = 2;
export const SESSION_CAPACITY_MAX = 12;
export const SESSION_CAPACITY_DEFAULT = 2;
