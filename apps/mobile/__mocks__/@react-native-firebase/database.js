/**
 * Jest manual mock for `@react-native-firebase/database`.
 *
 * 근거: 네이티브 브릿지 모듈이라 jest 환경에는 존재하지 않는다. `services/session/sessionService.ts`
 * (1라운드, RTDB 교체)가 실제로 호출하는 모듈러 API 표면(ref/get/set/update/onValue/serverTimestamp)만
 * 골라 in-memory로 흉내낸 최소 페이크 RTDB다 — 실제 보안 규칙 평가는 하지 않는다(이 라운드의
 * 검증 범위 밖 — CLAUDE.md/작업 지시 참고, 규칙은 아직 배포되지 않은 상태를 그대로 반영).
 *
 * 테스트 파일 간 상태가 섞이지 않도록 `__resetMockDatabase()`를 매 파일 시작 전(`beforeEach` 등)
 * 호출할 수 있게 내보낸다 — 다만 기존 in-memory sessionService 테스트 관례(고유 generateId라
 * 테스트끼리 자연히 간섭하지 않음)를 따르는 한 필수는 아니다.
 */

let store = {};
let listeners = [];

function splitPath(path) {
  return (path || '').split('/').filter(Boolean);
}

function getAtPath(obj, segments) {
  let cur = obj;
  for (const seg of segments) {
    if (cur == null) {
      return undefined;
    }
    cur = cur[seg];
  }
  return cur;
}

function setAtPath(obj, segments, value) {
  if (segments.length === 0) {
    return;
  }
  let cur = obj;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const seg = segments[i];
    if (typeof cur[seg] !== 'object' || cur[seg] === null) {
      cur[seg] = {};
    }
    cur = cur[seg];
  }
  const last = segments[segments.length - 1];
  if (value === null || value === undefined) {
    delete cur[last];
  } else {
    cur[last] = value;
  }
}

function resolveServerValues(value) {
  if (value && typeof value === 'object') {
    if (value['.sv'] === 'timestamp') {
      return Date.now();
    }
    if (Array.isArray(value)) {
      return value.map(resolveServerValues);
    }
    const out = {};
    Object.keys(value).forEach(key => {
      out[key] = resolveServerValues(value[key]);
    });
    return out;
  }
  return value;
}

function makeSnapshot(value) {
  return {
    exists: () => value !== undefined && value !== null,
    val: () => (value === undefined ? null : value),
  };
}

function notifyListeners() {
  // 배열을 복사해서 순회 — 콜백 내부에서 구독 해제가 일어나도 안전하도록.
  [...listeners].forEach(entry => {
    const value = getAtPath(store, splitPath(entry.path));
    entry.callback(makeSnapshot(value));
  });
}

function getDatabase() {
  return {};
}

function ref(_db, path) {
  return {path: path || ''};
}

function child(parentRef, path) {
  return {path: parentRef.path ? `${parentRef.path}/${path}` : path};
}

async function get(refObj) {
  const value = getAtPath(store, splitPath(refObj.path));
  return makeSnapshot(value);
}

async function set(refObj, value) {
  setAtPath(store, splitPath(refObj.path), resolveServerValues(value));
  notifyListeners();
}

async function update(refObj, values) {
  Object.entries(values).forEach(([relativePath, value]) => {
    const fullPath = refObj.path ? `${refObj.path}/${relativePath}` : relativePath;
    setAtPath(store, splitPath(fullPath), resolveServerValues(value));
  });
  notifyListeners();
}

function onValue(refObj, callback) {
  const entry = {path: refObj.path, callback};
  listeners.push(entry);
  const value = getAtPath(store, splitPath(refObj.path));
  callback(makeSnapshot(value));
  return () => {
    listeners = listeners.filter(l => l !== entry);
  };
}

function serverTimestamp() {
  return {'.sv': 'timestamp'};
}

const ServerValue = {TIMESTAMP: {'.sv': 'timestamp'}};

function __resetMockDatabase() {
  store = {};
  listeners = [];
}

module.exports = {
  getDatabase,
  ref,
  child,
  get,
  set,
  update,
  onValue,
  serverTimestamp,
  ServerValue,
  __resetMockDatabase,
};
