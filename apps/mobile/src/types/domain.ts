/**
 * 도메인 타입 정의 (MVP 스코프 — YouTube 단일 플랫폼 세션)
 *
 * 근거 문서: docs/specs/04-playlist.md, docs/specs/05-sync-architecture.md,
 *           docs/specs/01-user-stories.md (US-106~US-210 권한/정원),
 *           docs/decision-log.md 2026-07-28 "Spotify 지원 완전 제거 + 혼합(Mixed) 세션 모드 제거",
 *           docs/specs/11-youtube-only-migration-plan.md (삭제/수정 범위 계획, 라운드 1)
 *
 * NOTE: 백엔드가 커스텀 서버(REST/WebSocket)에서 Firebase로 확정됨에 따라(CLAUDE.md, 2026-07-24),
 * 이 타입들은 향후 Firestore/Realtime Database 문서 구조의 클라이언트 측 표현으로도 재사용될 것을
 * 전제로 정의했다. 실제 컬렉션/경로 설계는 구현 단계(Firebase 프로젝트 생성 이후) 몫이다.
 *
 * NOTE(2026-07-28, YouTube 단일화): 이전에는 Spotify 전용/YouTube 전용/혼합(Mixed) 세 가지 세션
 * 유형을 지원했고 그에 맞춰 MusicService/SingleMusicService/MixedParticipantPlatform/AccountTier/
 * 매칭 관련 타입(MatchConfidenceLevel/MatchConfirmState/ParticipantMatchStatus/
 * MatchedTrackCandidate/ParticipantMatch/MixedPlaylistEntry)과 서비스별 독립 플레이리스트 구조
 * (ServicePlaybackMemory/ServicePlaylistState)가 있었다. 세션이 항상 YouTube 하나뿐이면 "이 세션의
 * 서비스가 무엇인지"를 굳이 필드/타입으로 들고 다닐 이유가 없어 전부 제거했다 — 과거 구현은
 * `spotify-mixed-legacy` 브랜치(2026-07-28 보존)에서 참고할 수 있다.
 */

/** 3단계 권한 체계 (04-playlist.md "권한 체계" 절, 2026-07-24 확정: 임명권은 방장 보유) */
export type ParticipantRole = 'host' | 'admin' | 'regular';

export interface Track {
  /** YouTube video ID (예: dQw4w9WgXcQ) */
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
  /** '맞추는 중' 상태의 원인 보조 텍스트 (예: YouTube 광고 재생 중) */
  reasonLabel?: string;
}

export interface SessionState {
  sessionId: string;
  inviteCode: string;
  sessionName: string;
  hostParticipantId: string;
  /** 세션 정원 2~12명, 기본값 2명 (04-playlist.md "세션 정원" 절, 2026-07-24 확정) */
  capacity: number;
  participants: ParticipantInfo[];
  /**
   * 세션의 플레이리스트 — 서비스가 YouTube 하나뿐이므로 서비스별 분기 없이 단일 배열로 관리한다
   * (2026-07-28 YouTube 단일화, docs/specs/11-youtube-only-migration-plan.md 2절). 배열 순서 =
   * 재생 순서(커서 = playback.currentEntryId의 인덱스) — state/playlistSequencing.ts 참고.
   */
  entries: PlaylistEntry[];
  /** 현재 세션의 "라이브" 재생 상태 — 단일 진실 공급원(05-sync-architecture.md 모델 A). */
  playback: PlaybackState;
}

export const SESSION_CAPACITY_MIN = 2;
export const SESSION_CAPACITY_MAX = 12;
export const SESSION_CAPACITY_DEFAULT = 2;
