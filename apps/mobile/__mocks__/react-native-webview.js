/**
 * Jest manual mock for `react-native-webview`.
 *
 * 근거: react-native-webview는 네이티브 모듈(RNCWebViewModule)에 의존하는데, jest 유닛 테스트
 * 환경(jsdom/react-test-renderer)에는 그 네이티브 바이너리가 존재하지 않는다. 실제 기기/에뮬레이터
 * 없이도 `YouTubeNowPlayingView` 등을 렌더링하는 스모크 테스트(`__tests__/App.test.tsx`)가 통과할
 * 수 있도록, 아무 것도 하지 않는 더미 `View`로 대체한다(react-native-webview가 자체 jest mock을
 * 배포하지 않아 직접 작성 — react-native 공식 문서가 권장하는 "node_modules/__mocks__" 패턴).
 */
const React = require('react');
const {View} = require('react-native');

const WebView = React.forwardRef((props, ref) => React.createElement(View, {...props, ref}));
WebView.displayName = 'WebView';

module.exports = WebView;
module.exports.WebView = WebView;
module.exports.default = WebView;
