module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-firebase|@react-navigation|react-native-app-auth|react-native-base64|react-native-screens|react-native-safe-area-context|react-native-webview|react-native-gesture-handler)/)',
  ],
  // react-native-gesture-handler는 네이티브 모듈(RNGestureHandlerModule)에 의존한다 — 공식 문서가
  // 권장하는 jestSetup.js를 그대로 로드해 유닛 테스트 환경(react-test-renderer)에서 목업으로 대체한다.
  setupFiles: ['./node_modules/react-native-gesture-handler/jestSetup.js'],
};
