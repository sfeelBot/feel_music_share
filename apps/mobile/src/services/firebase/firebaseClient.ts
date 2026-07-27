/**
 * Firebase 초기화.
 *
 * 근거: CLAUDE.md / docs/specs/06-mvp-scope-and-tech-stack.md "확정 — 기술 스택 결정 (2026-07-24)"
 * — 실시간 동기화/백엔드는 Firebase로 확정됐다. docs/decision-log.md(2026-07-27)에서
 * Realtime Database(RTDB) 단일 구성으로 최종 확정됐다.
 *
 * ## 진행 상태 (2026-07-27, RTDB 코드 준비 라운드)
 *
 * - Firebase 콘솔 프로젝트 생성 + Android 앱(`com.mobile`) 등록 + `google-services.json` 배치 +
 *   Google Services Gradle 플러그인 연결까지 완료됨(Round 16 검증 통과, 커밋 `2a6f51d`).
 * - `@react-native-firebase/app`, `@react-native-firebase/database` 설치 완료.
 * - **RTDB 자체는 Firebase 콘솔에서 아직 활성화("데이터베이스 만들기")되지 않았다.** 앱 초기화는
 *   되지만(아래 설명 참고) 실제 read/write는 콘솔에서 DB를 켜기 전까지 실패한다 — 의도된 제약이며
 *   목업 데이터로 덮지 않는다.
 * - 이 라운드에서는 `getFirebaseDatabase()` 헬퍼만 노출하고, 실제로 이 헬퍼를 호출해 read/write하는
 *   코드(`services/session/sessionService.ts` 교체)는 다음 라운드에서 진행한다.
 *
 * ## 왜 코드에서 Firebase 프로젝트 설정값(apiKey 등)을 직접 넘기지 않는가
 *
 * `@react-native-firebase`는 모듈러 웹 JS SDK(`firebase/app`의 `initializeApp(firebaseConfig)`)와
 * 달리 **네이티브 브릿지 방식**이다. Android에서는 `android/app/google-services.json`,
 * iOS에서는 `GoogleService-Info.plist`를 네이티브 프로젝트가 빌드 시점에 읽어, 앱 프로세스가
 * 시작될 때 기본(`[DEFAULT]`) Firebase 앱을 **네이티브 레이어에서 자동으로 초기화**한다
 * (공식 문서 https://rnfirebase.io/ "Installation" 절 — "the default Firebase app instance will
 * be created automatically for you when your app starts"). 즉 JS 코드에서
 * `initializeApp({apiKey, projectId, ...})`을 다시 호출할 필요가 없다 — 오히려 잘못 호출하면
 * 기본 앱과 설정이 어긋날 위험만 생긴다. `src/config/env.ts`의 `FIREBASE_*` placeholder 값들은
 * 이 방식에서는 사실상 불필요하다 — 자세한 근거는 `.env.example` 갱신 이력 참고.
 *
 * ## 모듈러 API를 쓰는 이유
 *
 * `@react-native-firebase`는 레거시 네임스페이스드 API(`firebase.app()`, `database().ref()`)와
 * 모듈러 API(`getApp()`, `getDatabase(app)`, `ref(db, path)`)를 둘 다 제공하지만, v22부터
 * 네임스페이스드 API는 지속적으로 축소·비권장(deprecated) 되고 있고 공식 문서/예제도 모듈러
 * 패턴을 기준으로 작성된다. 이 프로젝트는 처음부터 모듈러 API로 통일한다.
 */

import {getApps} from '@react-native-firebase/app';
import {getDatabase, type Database} from '@react-native-firebase/database';

export interface FirebaseConnectionStatus {
  /**
   * `google-services.json`(Android, iOS는 아직 미설정) 네이티브 설정 파일을 근거로
   * `@react-native-firebase/app`이 기본(`[DEFAULT]`) Firebase 앱을 실제로 초기화했는지 여부.
   * true라도 "RTDB가 콘솔에서 활성화되어 read/write가 가능하다"는 뜻은 **아니다** — 아래
   * `isDatabaseVerified` 설명 참고.
   */
  isAppInitialized: boolean;

  /**
   * RTDB가 Firebase 콘솔에서 실제로 활성화되어 read/write가 가능한 상태인지 여부.
   *
   * **중요한 한계(현재 구현으로는 알 수 없음)**: `@react-native-firebase/app`의 앱 초기화는
   * 네이티브 설정 파일만 있으면 로컬에서 동기적으로 완료되지만, 특정 하위 서비스(RTDB)가 콘솔에서
   * 활성화됐는지는 그 서비스에 실제로 네트워크 요청(read/write)을 보내 응답을 받아보기 전까지
   * 클라이언트에서 알 방법이 없다 — 즉 비동기 네트워크 확인이 필요하다. 이 라운드는 "실제 RTDB
   * read/write 코드는 작성하지 않는다"는 범위 제약이 있으므로, 아직 그 확인을 수행하지 않는다
   * (다음 라운드에서 `sessionService.ts`가 실제로 RTDB 호출로 교체될 때, 그 호출의 성공/실패
   * 자체가 사실상 이 확인 역할을 겸하게 된다). 그때까지 이 필드는 `isAppInitialized`와 동일한
   * 값을 그대로 반영한다 — **"DB 활성화를 확인했다"가 아니라 "아직 반증되지 않았다"로 읽어야 한다.**
   */
  isDatabaseVerified: boolean;

  /**
   * 하위 호환 필드 — 기존/향후 소비 코드가 "Firebase를 지금 써도 되는가"를 단순 boolean으로
   * 묻고 싶을 때 참고. 현재는 `isAppInitialized`와 동일한 값이다.
   */
  isConfigured: boolean;
}

/**
 * 현재 Firebase 연결 상태를 조회한다.
 *
 * 네이티브 브릿지에 접근할 수 없는 환경(예: 네이티브 모듈이 아직 로드되지 않은 유닛 테스트,
 * 네이티브 빌드가 이 모듈을 링크하지 않은 상태)에서 `getApps()` 호출 자체가 예외를 던질 수 있어
 * try/catch로 감싼다 — 이 경우 "초기화 안 됨"으로 안전하게 폴백한다.
 */
export function getFirebaseConnectionStatus(): FirebaseConnectionStatus {
  let isAppInitialized = false;
  try {
    isAppInitialized = getApps().length > 0;
  } catch {
    isAppInitialized = false;
  }

  return {
    isAppInitialized,
    isDatabaseVerified: isAppInitialized,
    isConfigured: isAppInitialized,
  };
}

/**
 * 기본 Firebase 앱에 연결된 Realtime Database 인스턴스를 반환한다.
 *
 * 네이티브 설정 파일(`google-services.json`)에 RTDB URL이 없는 현재 상태에서는, 이 함수가
 * 반환하는 `Database` 인스턴스로 실제 read/write(`ref(db, path)` 등)를 시도하면 실패한다 —
 * RTDB가 Firebase 콘솔에서 아직 활성화되지 않았기 때문이다(의도된 제약, `docs/decision-log.md`
 * "후속 조치" 참고). 이 함수 자체는 인스턴스 생성만 하며 네트워크 요청을 보내지 않는다.
 *
 * 이 헬퍼를 실제로 호출해 read/write를 수행하는 코드는 아직 작성하지 않는다 — 그건
 * `services/session/sessionService.ts`의 인메모리 로직을 교체하는 다음 라운드의 범위다.
 */
export function getFirebaseDatabase(): Database {
  return getDatabase();
}
