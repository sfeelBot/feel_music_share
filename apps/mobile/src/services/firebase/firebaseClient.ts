/**
 * Firebase 초기화 — 현재는 STUB.
 *
 * 근거: CLAUDE.md / docs/specs/06-mvp-scope-and-tech-stack.md "확정 — 기술 스택 결정 (2026-07-24)"
 * — 실시간 동기화/백엔드는 Firebase(Realtime Database 또는 Firestore + Cloud Functions)로 확정됐다.
 *
 * 왜 지금 실제 Firebase SDK를 붙이지 않았는가:
 * 1. Firebase 콘솔에서 실제 프로젝트가 아직 생성되지 않았다 — google-services.json /
 *    GoogleService-Info.plist 없이는 @react-native-firebase/* 네이티브 모듈이 빌드조차 되지 않는다.
 * 2. 이번 라운드 목표는 "Spotify 전용 세션 MVP 핵심 화면"의 UI 완성이며, 실시간 백엔드 연동은
 *    범위 밖으로 명시됐다(리더 지시) — 대신 이 파일과 sessionService.ts가 "나중에 정확히 이 지점에
 *    Firebase 호출이 들어간다"는 계약을 명시해 다음 라운드에 그대로 교체할 수 있게 한다.
 *
 * TODO(다음 단계 — Firebase 프로젝트 생성 이후):
 * - `@react-native-firebase/app` 설치 + iOS/Android 네이티브 설정 파일 추가
 * - Realtime Database 사용 시 `@react-native-firebase/database`, Firestore 사용 시
 *   `@react-native-firebase/firestore` 추가 (세부 서비스 조합은 이 라운드에서 결정하지 않음 —
 *   05-sync-architecture.md가 요구하는 "저지연 상태 브로드캐스트"에 어느 쪽이 더 유리한지 실측 후 결정)
 * - Cloud Functions 프로젝트(`functions/`) 초기화 — 서버 기준 시계(authoritative timestamp) 발급,
 *   클록 오프셋 계산 보조, 권한 검증(서비스 전환 등)을 여기서 수행해야 한다(클라이언트 신뢰 금지).
 * - 아래 STUB 함수들을 실제 Firebase 호출로 교체.
 */

export interface FirebaseConnectionStatus {
  isConfigured: boolean;
}

/** 실제 프로젝트 연결 전까지는 항상 false. 화면에서 "백엔드 미연동" 안내가 필요하면 이 값을 참고. */
export function getFirebaseConnectionStatus(): FirebaseConnectionStatus {
  return {isConfigured: false};
}
