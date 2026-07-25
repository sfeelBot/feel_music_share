/**
 * YouTube IFrame Player 제어 레이어 — 현재는 STUB.
 *
 * 근거: `docs/specs/03-youtube-integration.md` 2절 — YouTube 세션은 우리 앱의 WebView 안에
 * IFrame Player API를 직접 렌더링해 재생한다(Spotify처럼 참여자 기기의 별도 공식 앱을 원격
 * 제어하는 구조가 아니다). `services/spotify/spotifyRemote.ts`의 STUB 패턴과 동일한 이유로
 * 이번 라운드는 실제 WebView/IFrame Player를 붙이지 않는다(리더 지시 — UI/상태 흐름까지만
 * 이번 범위, 실제 렌더링은 다음 라운드 TODO).
 *
 * `NowPlayingView`(YouTube 세션 전용, `screens/room/YouTubeNowPlayingView.tsx`)의 커스텀
 * 재생/일시정지 버튼은 정책상(00-ux-flow.md 2.10c "장식용 버튼 금지 — 정책상 요구사항") 반드시
 * IFrame Player의 실제 재생을 트리거해야 하므로, 지금부터 이 인터페이스를 통해 호출하도록
 * 배선해뒀다 — 실제 구현체로 교체되면 버튼 쪽 코드는 손댈 필요가 없다.
 *
 * TODO(다음 라운드):
 * - `react-native-webview` 설치 + YouTube IFrame Player API(HTML/JS) 로드
 * - playVideo()/pauseVideo()/seekTo() 등을 실제 postMessage 브릿지로 연결
 * - 광고 재생 감지(`03-youtube-integration.md` 8-3절) — `onStateChange`의 `AD_STARTED`류 이벤트나
 *   player state polling으로 판별, `isAdPlaying()`이 실제 값을 반환하도록 교체. 감지되면
 *   동기화 엔진의 seek 명령을 일시적으로 무시해야 한다(YouTube API Services Developer Policies
 *   III.I.5/6 — 광고 변조 금지).
 */

export interface YoutubePlayerController {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(positionMs: number): void;
  /** 02-key-ui-patterns.md 2.2a: 신규 상태를 만들지 않고 "맞추는 중" 배지에 보조 텍스트로만 반영한다. */
  isAdPlaying(): boolean;
}

class StubYoutubePlayerController implements YoutubePlayerController {
  playVideo(): void {
    // no-op: 실제 WebView/IFrame Player 연동 전까지는 세션의 로컬 재생 상태만 바뀐다.
  }

  pauseVideo(): void {
    // no-op
  }

  seekTo(_positionMs: number): void {
    // no-op
  }

  isAdPlaying(): boolean {
    // TODO(다음 라운드): 실제 감지 로직으로 교체. 지금은 항상 false — 광고 상태를 UI가 임의로
    // 지어내지 않는다(02-key-ui-patterns.md 2.2a "감지가 불확실하면 그냥 '맞추는 중...'만 표시").
    return false;
  }
}

/** 앱 전역에서 사용할 인스턴스. 다음 단계에서 실제 구현체로 교체. */
export const youtubePlayerController: YoutubePlayerController = new StubYoutubePlayerController();
