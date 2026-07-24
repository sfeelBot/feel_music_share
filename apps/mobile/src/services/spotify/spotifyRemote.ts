/**
 * Spotify App Remote SDK 추상화 레이어 — 현재는 STUB.
 *
 * 근거: docs/specs/02-spotify-integration.md — 모바일 네이티브 앱에서 참여자 기기의
 * 로컬 Spotify 앱을 실제로 재생시키는 유일한 공식 경로는 App Remote SDK다.
 *
 * 왜 지금 실제 네이티브 SDK를 붙이지 않았는가:
 * 1. App Remote SDK는 Spotify Developer Dashboard에 등록된 실제 Client ID/Redirect URI,
 *    그리고 iOS/Android 네이티브 바이너리(SpotifyiOS.framework, Android AAR) 연동이 필요하다.
 *    이 스캐폴딩 단계에서는 실제 Spotify 개발자 앱 등록이 되어 있지 않아 붙일 수 없다
 *    (등록/쿼터 확장은 별도로 진행 필요 — 02번 문서 5)절 제안 참고).
 * 2. 커뮤니티 패키지(react-native-spotify-remote 등)를 무작정 추가하면 iOS/Android 네이티브
 *    프로젝트(Podfile, build.gradle)에 수동 링킹이 필요한데, 실제 자격 증명 없이 연결해봐야
 *    검증 불가능한 빌드 실패만 만들 위험이 있다.
 *
 * 따라서 이 인터페이스만 먼저 정의해 상위 레이어(재생 동기화 로직, UI)가 이 계약에 맞춰
 * 개발/검증될 수 있도록 하고, 실제 구현체는 다음 단계에서 교체한다.
 *
 * TODO(다음 단계):
 * - Spotify Developer Dashboard 앱 등록 후 client id/redirect uri 확정
 * - `react-native-spotify-remote` (또는 자체 네이티브 모듈) 연동, 아래 SpotifyRemotePlayer 구현
 * - 실측: connect ~ 상태 콜백 지연 프로토타입 (05-sync-architecture.md 권고사항)
 */

export interface RemotePlaybackStateSnapshot {
  trackUri: string | null;
  positionMs: number;
  isPlaying: boolean;
}

export interface SpotifyRemotePlayer {
  connect(): Promise<void>;
  disconnect(): void;
  play(trackUri: string, positionMs?: number): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  getCurrentState(): Promise<RemotePlaybackStateSnapshot | null>;
  /** App Remote SDK의 push 구독을 흉내낸 콜백 등록. 실제 구현체에서 지연/빈도를 실측할 대상. */
  onStateChanged(listener: (state: RemotePlaybackStateSnapshot) => void): () => void;
}

/** 실제 기기의 Spotify 앱과 통신하지 않는 목(mock) 구현체. UI/동기화 로직 개발용. */
export class StubSpotifyRemotePlayer implements SpotifyRemotePlayer {
  private listeners = new Set<(state: RemotePlaybackStateSnapshot) => void>();
  private state: RemotePlaybackStateSnapshot = {
    trackUri: null,
    positionMs: 0,
    isPlaying: false,
  };

  async connect(): Promise<void> {
    // no-op: 실제 SDK 연동 전까지는 항상 "연결됨"으로 취급한다.
  }

  disconnect(): void {
    this.listeners.clear();
  }

  async play(trackUri: string, positionMs = 0): Promise<void> {
    this.state = {trackUri, positionMs, isPlaying: true};
    this.emit();
  }

  async pause(): Promise<void> {
    this.state = {...this.state, isPlaying: false};
    this.emit();
  }

  async resume(): Promise<void> {
    this.state = {...this.state, isPlaying: true};
    this.emit();
  }

  async seek(positionMs: number): Promise<void> {
    this.state = {...this.state, positionMs};
    this.emit();
  }

  async getCurrentState(): Promise<RemotePlaybackStateSnapshot | null> {
    return this.state;
  }

  onStateChanged(listener: (state: RemotePlaybackStateSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach(listener => listener(this.state));
  }
}

/** 앱 전역에서 사용할 인스턴스. 다음 단계에서 실제 구현체로 교체. */
export const spotifyRemotePlayer: SpotifyRemotePlayer = new StubSpotifyRemotePlayer();
