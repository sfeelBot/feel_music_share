import type {ElementRef} from 'react';
import type WebView from 'react-native-webview';
import type {WebViewMessageEvent} from 'react-native-webview';

/**
 * `WebView`(클래스 컴포넌트) 인스턴스 타입. `WebView` 자체를 제네릭 인자 없이 직접 참조하면
 * 기본 제네릭(`P = undefined`)이 JSX상 `ref`/그 밖의 프롭 타입과 충돌해 `No overload matches
 * this call` 오류가 난다(react-native-webview 14.x + TS 5.0.4 조합에서 확인) — `ElementRef`로
 * 우회한다.
 */
type WebViewRef = ElementRef<typeof WebView>;

/**
 * YouTube IFrame Player 제어 레이어 — 실제 WebView/IFrame Player 연동 구현체 (2026-07-26 라운드).
 *
 * 근거: `docs/specs/03-youtube-integration.md` 2절/8절 — YouTube 세션은 우리 앱의 WebView 안에
 * IFrame Player API를 직접 렌더링해 재생한다(Spotify처럼 참여자 기기의 별도 공식 앱을 원격
 * 제어하는 구조가 아니다). HTML/JS 페이지 자체는 `youtubePlayerHtml.ts`가 만들고, 이 파일은
 * React Native 쪽에서 그 페이지와 통신하는 브릿지(명령 전달 + 상태 수신)만 담당한다.
 *
 * 통신 방향 2가지:
 * - RN → WebView: `WebView.injectJavaScript()`로 `window.__yt*` 커맨드 함수를 호출한다.
 *   WebView가 아직 마운트되지 않았거나 IFrame Player가 아직 준비(ready)되지 않은 경우 명령을
 *   큐에 쌓아뒀다가 ready 신호를 받는 즉시 순서대로 흘려보낸다(`flushPendingCommands`).
 * - WebView → RN: `onMessage`(`_handleBridgeMessage`)로 `window.ReactNativeWebView.postMessage()`가
 *   보낸 JSON 메시지(`{type: 'ready' | 'stateChange' | 'error', ...}`)를 받는다.
 *
 * 광고 감지/정책 준수(`03-youtube-integration.md` 8-2/8-3절, 위반 시 계정/API 정지 리스크):
 * 1. 광고 감지 시 seek/skip 명령을 절대 보내지 않는다 — `seekTo()`가 `isAdPlaying()`이 true인
 *    동안 스스로 명령을 무시한다(호출부에서도 걸러야 하지만 여기서 한 번 더 방어).
 * 2. 광고 재생 중 네이티브 컨트롤(스킵 버튼 등)을 자체 UI로 가리지 않는다 — 이 파일은 UI를
 *    다루지 않지만, `YouTubeNowPlayingView`가 커스텀 컨트롤을 플레이어 영역 바깥에 유지한다.
 * 3. 광고 감지/우회를 위해 플레이어 DOM을 조작하거나 IFrame 자체를 변형하지 않는다 — 표준
 *    IFrame Player API 함수 호출(`playVideo`/`pauseVideo`/`seekTo`/`loadVideoById`/`cueVideoById`/
 *    `getVideoData`)만 사용한다(`youtubePlayerHtml.ts` 참고).
 *
 * TODO(다음 라운드 이후):
 * - 실기기에서 광고 감지 휴리스틱(`getVideoData().video_id` 불일치 판정)의 정확도 검증.
 * - YouTube Data API v3 실연동 후에는 `extractYoutubeVideoId`의 폴백 분기(접두사 없는 순수
 *   videoId)가 주 경로가 될 가능성이 큼 — 그때 mock 접두사(`youtube:video:`) 분기는 제거 검토.
 */

/** YouTube IFrame Player가 보고하는 표준 재생 상태 코드(공식 문서 enum). 참고/디버깅용으로만 노출. */
export const YT_PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

interface YoutubeBridgeMessage {
  type: 'ready' | 'stateChange' | 'error';
  state?: number;
  isAd?: boolean;
  errorCode?: number;
}

export interface YoutubePlayerController {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(positionMs: number): void;
  /** 곡 전환 + 즉시 재생 (다음 곡/이전 곡 등 `SessionContext`가 `isPlaying: true`로 전환할 때). */
  loadVideoById(videoId: string, startSeconds?: number): void;
  /** 곡 전환만 하고 재생은 시작하지 않음(일시정지 상태에서 곡이 바뀌는 경우). */
  cueVideoById(videoId: string, startSeconds?: number): void;
  /** 02-key-ui-patterns.md 2.2a: 신규 상태를 만들지 않고 "맞추는 중" 배지에 보조 텍스트로만 반영한다. */
  isAdPlaying(): boolean;
  /** 광고 재생 상태가 바뀔 때마다 알림 — UI(`YouTubeNowPlayingView`)가 이 값으로 리렌더한다. */
  onAdStateChanged(listener: (isAdPlaying: boolean) => void): () => void;
  /**
   * WebView 컴포넌트(`YouTubeNowPlayingView`)만 호출해야 하는 내부 연결 훅.
   * 마운트 시 실제 `WebView` 인스턴스를, 언마운트 시 `null`을 넘긴다.
   */
  _attachWebView(ref: WebViewRef | null): void;
  /** `<WebView onMessage={...}>`에 그대로 연결한다. */
  _handleBridgeMessage(event: WebViewMessageEvent): void;
}

class WebViewYoutubePlayerController implements YoutubePlayerController {
  private webViewRef: WebViewRef | null = null;
  private ready = false;
  private pendingCommands: string[] = [];
  private isAd = false;
  private readonly adListeners = new Set<(isAdPlaying: boolean) => void>();

  _attachWebView(ref: WebViewRef | null): void {
    this.webViewRef = ref;
    if (!ref) {
      // 언마운트(방 나가기 등) — 다음 마운트에서 새 ready 신호를 받을 때까지 큐/상태를 리셋한다.
      this.ready = false;
      this.pendingCommands = [];
      this.setAdPlaying(false);
    }
  }

  _handleBridgeMessage(event: WebViewMessageEvent): void {
    let message: YoutubeBridgeMessage | null = null;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      // 브릿지 프로토콜 밖의 메시지(파싱 실패)는 조용히 무시한다.
      return;
    }
    if (!message) {
      return;
    }
    if (message.type === 'ready') {
      this.ready = true;
      this.flushPendingCommands();
      return;
    }
    if (message.type === 'stateChange' && typeof message.isAd === 'boolean') {
      this.setAdPlaying(message.isAd);
      return;
    }
    // 'error' 타입은 이번 라운드에서 UI에 반영하지 않는다(범위 밖) — 향후 재생 실패 배너 등에 연결 가능.
  }

  private setAdPlaying(isAd: boolean): void {
    if (isAd === this.isAd) {
      return;
    }
    this.isAd = isAd;
    this.adListeners.forEach(listener => listener(isAd));
  }

  private flushPendingCommands(): void {
    if (!this.webViewRef) {
      return;
    }
    const queued = this.pendingCommands;
    this.pendingCommands = [];
    queued.forEach(js => this.webViewRef?.injectJavaScript(js));
  }

  private run(js: string): void {
    if (this.webViewRef && this.ready) {
      this.webViewRef.injectJavaScript(js);
    } else {
      // WebView가 아직 없거나(마운트 전) IFrame Player가 아직 ready 신호를 보내기 전 — 순서
      // 보장을 위해 큐에 쌓아두고 ready 시점에 한꺼번에 흘려보낸다.
      this.pendingCommands.push(js);
    }
  }

  playVideo(): void {
    this.run('window.__ytPlayVideo && window.__ytPlayVideo(); true;');
  }

  pauseVideo(): void {
    this.run('window.__ytPauseVideo && window.__ytPauseVideo(); true;');
  }

  seekTo(positionMs: number): void {
    // 8-2/8-3절 정책: 광고 재생 중에는 서버발 동기화 seek 명령을 절대 보내지 않는다.
    if (this.isAd) {
      return;
    }
    const seconds = Math.max(0, positionMs / 1000);
    this.run(`window.__ytSeekTo && window.__ytSeekTo(${seconds}); true;`);
  }

  loadVideoById(videoId: string, startSeconds = 0): void {
    this.run(
      `window.__ytLoadVideoById && window.__ytLoadVideoById(${JSON.stringify(videoId)}, ${startSeconds}); true;`,
    );
  }

  cueVideoById(videoId: string, startSeconds = 0): void {
    this.run(
      `window.__ytCueVideoById && window.__ytCueVideoById(${JSON.stringify(videoId)}, ${startSeconds}); true;`,
    );
  }

  isAdPlaying(): boolean {
    return this.isAd;
  }

  onAdStateChanged(listener: (isAdPlaying: boolean) => void): () => void {
    this.adListeners.add(listener);
    return () => this.adListeners.delete(listener);
  }
}

/** 앱 전역에서 사용할 싱글턴 인스턴스. `YouTubeNowPlayingView`가 WebView를 붙이고 뗀다. */
export const youtubePlayerController: YoutubePlayerController = new WebViewYoutubePlayerController();

/**
 * 검색 결과(`youtubeSearch.ts`, 2026-07-27 실연동)의 `serviceTrackId`는 `youtube:video:<id>` 형식
 * 이다(실제 YouTube 영상 ID). 혹시 접두사 없는 순수 videoId가 들어와도 대응할 수 있도록, 접두사가
 * 없으면 원본 문자열을 그대로 videoId로 취급한다(안전한 폴백).
 *
 * NOTE: 현재 데모 시드 플레이리스트(`mockSessionSeed.ts`)는 YouTube 세션이어도 여전히
 * `spotify:track:demoN` 형식을 쓴다(서비스 무관 공통 시드 — 이번 라운드 범위 밖). 이 경우 폴백
 * 분기가 그 문자열 전체를 videoId로 취급해 실제 존재하지 않는 영상 ID를 요청하게 되지만,
 * IFrame Player가 `onError`로 안전하게 처리하므로 앱이 크래시하지는 않는다(실기기 검증은
 * 이번 라운드 필수 사항이 아님 — CLAUDE.md 지시 참고).
 */
export function extractYoutubeVideoId(serviceTrackId: string): string {
  const prefix = 'youtube:video:';
  return serviceTrackId.startsWith(prefix) ? serviceTrackId.slice(prefix.length) : serviceTrackId;
}
