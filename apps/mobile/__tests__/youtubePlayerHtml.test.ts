import {describe, expect, it} from '@jest/globals';
import {buildYoutubePlayerHtml} from '../src/services/youtube/youtubePlayerHtml';

/**
 * Round 13 갭 수정 검증: 서비스 전환 후 YouTube로 복귀했을 때 복원된 `positionMs`가
 * 실제 IFrame Player의 `start` playerVar(초 단위 정수)에 반영되는지 확인한다
 * (`docs/roadmap.md` — "복원된 positionMs가 YouTube IFrame Player의 실제 시크에 반영되지 않는다").
 * `buildYoutubePlayerHtml`은 순수 함수이므로 생성된 HTML 문자열에 `start: <n>`이 그대로
 * 포함되는지 검사하는 수준으로 충분하다(실기기 검증은 이번 라운드 범위 밖).
 */
describe('buildYoutubePlayerHtml', () => {
  it('omits a meaningful start position when startSeconds is not provided (defaults to 0)', () => {
    const html = buildYoutubePlayerHtml({initialVideoId: 'abc123', autoplay: false});
    expect(html).toContain('start: 0,');
  });

  it('reflects a provided startSeconds (already integer) in playerVars.start', () => {
    const html = buildYoutubePlayerHtml({initialVideoId: 'abc123', autoplay: true, startSeconds: 92});
    expect(html).toContain('start: 92,');
  });

  it('floors a fractional startSeconds — IFrame Player API only accepts integer seconds', () => {
    const html = buildYoutubePlayerHtml({initialVideoId: 'abc123', autoplay: false, startSeconds: 92.7});
    expect(html).toContain('start: 92,');
  });

  it('clamps a negative/zero startSeconds down to 0', () => {
    const html = buildYoutubePlayerHtml({initialVideoId: 'abc123', autoplay: false, startSeconds: -5});
    expect(html).toContain('start: 0,');
  });

  it('still bakes in the requested videoId and autoplay flag alongside start', () => {
    const html = buildYoutubePlayerHtml({initialVideoId: 'xyz789', autoplay: true, startSeconds: 10});
    expect(html).toContain('videoId: "xyz789"');
    expect(html).toContain('autoplay: 1,');
    expect(html).toContain('start: 10,');
  });
});
