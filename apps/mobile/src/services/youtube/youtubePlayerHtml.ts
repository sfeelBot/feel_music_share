/**
 * WebView 안에 로드할 YouTube IFrame Player 페이지(HTML/JS) 생성기.
 *
 * 근거: `docs/specs/03-youtube-integration.md` 2절/8-1절 — 2026년 기준 Google이 실질적으로
 * 지원하는 유일한 서드파티 재생 제어 경로는 IFrame Player API(`https://www.youtube.com/iframe_api`)를
 * WebView에 로드하는 방식뿐이다(네이티브 Android/iOS 전용 SDK는 모두 단종/아카이브됨).
 *
 * 이 파일은 순수 문자열 템플릿만 만든다 — React Native 쪽 브릿지 로직(명령 큐잉, 메시지 파싱,
 * 광고 감지 상태 관리)은 `youtubePlayerStub.ts`의 컨트롤러가 담당한다. 역할을 분리해 둔 이유는
 * HTML/JS 템플릿(웹 쪽 코드)과 RN 쪽 상태 관리 코드가 섞이면 브릿지 프로토콜(메시지 타입 등)을
 * 한눈에 검토하기 어려워지기 때문이다.
 *
 * 정책 준수 메모(반드시 지킬 것, `03-youtube-integration.md` 8-2절 — Section III.I.5/III.I.6):
 * - 아래 스크립트는 표준 IFrame Player API 함수(`playVideo`/`pauseVideo`/`seekTo`/`loadVideoById`/
 *   `cueVideoById`/`getVideoData`/`getPlayerState`)만 호출한다. 플레이어 DOM을 직접 조작하거나
 *   광고를 스킵/차단하는 코드는 여기에 절대 추가하지 않는다.
 * - `getVideoData().video_id`가 우리가 요청한 videoId와 다르면 "광고가 재생 중"으로 추정한다.
 *   이는 IFrame Player API가 광고 재생 여부를 나타내는 전용 상태 코드를 공식 문서에 노출하지
 *   않기 때문에 쓰는 실무적 휴리스틱이다(정확도는 실기기 검증 필요 — 이번 라운드 범위 밖).
 */

export interface BuildYoutubePlayerHtmlOptions {
  /** 최초 로드할 videoId. 이후 곡 전환은 `youtubePlayerController.loadVideoById`로 처리한다. */
  initialVideoId: string;
  /** 최초 로드 시 바로 재생할지(true) 큐잉만 할지(false) — 세션의 `playback.isPlaying` 반영. */
  autoplay: boolean;
}

export function buildYoutubePlayerHtml({initialVideoId, autoplay}: BuildYoutubePlayerHtmlOptions): string {
  const safeVideoId = JSON.stringify(initialVideoId);
  const autoplayFlag = autoplay ? 1 : 0;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000000; overflow: hidden; }
      #player { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="player"></div>
    <script>
      // RN <-> WebView 브릿지 상태. window 전역에 둔 이유: onYouTubeIframeAPIReady 콜백과
      // RN에서 injectJavaScript로 호출하는 커맨드 함수들이 서로 이 상태를 공유해야 하기 때문.
      window.__ytBridgeState = {requestedVideoId: ${safeVideoId}, isAd: false};

      function postToRN(message) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      }

      // 광고 재생 감지 휴리스틱(위 파일 헤더 정책 메모 참고) — 표준 getVideoData() 조회만 사용한다.
      function detectAdPlaying() {
        try {
          var data = window.__ytPlayer.getVideoData();
          var currentVideoId = data && data.video_id;
          return !!(
            window.__ytBridgeState.requestedVideoId &&
            currentVideoId &&
            currentVideoId !== window.__ytBridgeState.requestedVideoId
          );
        } catch (err) {
          return false;
        }
      }

      function onPlayerReady() {
        postToRN({type: 'ready'});
      }

      function onPlayerStateChange(event) {
        var isAd = detectAdPlaying();
        window.__ytBridgeState.isAd = isAd;
        postToRN({type: 'stateChange', state: event.data, isAd: isAd});
      }

      function onPlayerError(event) {
        postToRN({type: 'error', errorCode: event.data});
      }

      function onYouTubeIframeAPIReady() {
        window.__ytPlayer = new YT.Player('player', {
          videoId: ${safeVideoId},
          playerVars: {
            playsinline: 1,
            autoplay: ${autoplayFlag},
            controls: 1,
            rel: 0,
            modestbranding: 1,
          },
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
            onError: onPlayerError,
          },
        });
      }

      // RN -> WebView 명령 브릿지. 표준 IFrame Player API 함수만 호출한다(DOM 조작/광고 스킵 금지).
      window.__ytPlayVideo = function () {
        if (window.__ytPlayer && window.__ytPlayer.playVideo) {
          window.__ytPlayer.playVideo();
        }
      };
      window.__ytPauseVideo = function () {
        if (window.__ytPlayer && window.__ytPlayer.pauseVideo) {
          window.__ytPlayer.pauseVideo();
        }
      };
      window.__ytSeekTo = function (seconds) {
        if (window.__ytPlayer && window.__ytPlayer.seekTo) {
          window.__ytPlayer.seekTo(seconds, true);
        }
      };
      window.__ytLoadVideoById = function (videoId, startSeconds) {
        window.__ytBridgeState.requestedVideoId = videoId;
        if (window.__ytPlayer && window.__ytPlayer.loadVideoById) {
          window.__ytPlayer.loadVideoById({videoId: videoId, startSeconds: startSeconds || 0});
        }
      };
      window.__ytCueVideoById = function (videoId, startSeconds) {
        window.__ytBridgeState.requestedVideoId = videoId;
        if (window.__ytPlayer && window.__ytPlayer.cueVideoById) {
          window.__ytPlayer.cueVideoById({videoId: videoId, startSeconds: startSeconds || 0});
        }
      };
    </script>
    <script src="https://www.youtube.com/iframe_api"></script>
  </body>
</html>`;
}
