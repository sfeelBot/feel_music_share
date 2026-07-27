/**
 * Jest manual mock for `@react-native-firebase/app`.
 *
 * 근거: 네이티브 브릿지 모듈이라 jest(jsdom/react-test-renderer) 환경에는 존재하지 않는다.
 * `getApp()`/`getApps()`만 있으면 되는 소비 코드(firebaseClient.ts, firebaseAuth.ts)를
 * 만족시키는 최소 더미 앱 객체를 제공한다 — 실제 초기화 로직은 흉내내지 않는다.
 */
const app = {name: '[DEFAULT]'};

function getApp() {
  return app;
}

function getApps() {
  return [app];
}

module.exports = {getApp, getApps};
