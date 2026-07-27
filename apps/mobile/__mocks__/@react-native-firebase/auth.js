/**
 * Jest manual mock for `@react-native-firebase/auth`.
 *
 * 근거: 네이티브 브릿지 모듈이라 jest 환경에는 존재하지 않는다. `services/firebase/firebaseAuth.ts`
 * (익명 인증)가 호출하는 최소 표면(getAuth/signInAnonymously/onAuthStateChanged)만 흉내낸다 —
 * 매 mock 인스턴스마다 순차 증가하는 가짜 uid를 발급해 "이미 로그인돼 있으면 재사용"(중복 로그인
 * 방지) 동작도 검증 가능하게 한다.
 */

let currentUser = null;
let uidCounter = 0;

const authInstance = {
  get currentUser() {
    return currentUser;
  },
};

function getAuth() {
  return authInstance;
}

async function signInAnonymously() {
  if (!currentUser) {
    uidCounter += 1;
    currentUser = {uid: `mock-anon-uid-${uidCounter}`};
  }
  return {user: currentUser, providerId: null, operationType: 'signIn'};
}

function onAuthStateChanged(_auth, callback) {
  callback(currentUser);
  return () => {};
}

function __resetMockAuth() {
  currentUser = null;
  uidCounter = 0;
}

module.exports = {getAuth, signInAnonymously, onAuthStateChanged, __resetMockAuth};
