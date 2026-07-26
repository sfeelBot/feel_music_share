import type {MusicService, ParticipantRole} from '../types/domain';

/**
 * 세션 설정 화면(00-ux-flow.md 2.13, 02-key-ui-patterns.md 6/7/10절)의 권한별 분기를 순수 함수로
 * 추출했다 — SessionSettingsView.tsx/SessionContext.tsx가 이 함수들을 그대로 재사용하고, 단위
 * 테스트도 이 파일만 대상으로 삼는다(React 렌더링과 분리해 로직만 검증하기 위함, 기존
 * `matchQueueNavigation.ts`/`playlistSequencing.ts`와 동일한 패턴).
 */

/**
 * 서비스 전환 버튼 활성 여부 (04-playlist.md "권한 체계" 절, US-208 확정 — 방장/관리자만 허용).
 * 02-key-ui-patterns.md 10.1절 "세 가지 상태" 표의 첫 두 행에 해당한다(혼합 세션 예외는
 * `shouldShowServiceSwitch`가 별도로 담당).
 *
 * TODO(Firebase 연동): 이 함수는 클라이언트 표시 판단용일 뿐이다 — 실제 권한 강제는 Cloud
 * Functions가 서버 측에서 재검증해야 한다(04-playlist.md "디자인 에이전트 전달 사항" 6번).
 */
export function canSwitchService(role: ParticipantRole): boolean {
  return role === 'host' || role === 'admin';
}

/**
 * "관리자 사임하기" 진입점 노출 여부 — 관리자 본인에게만 보인다(02-key-ui-patterns.md 6.4a절).
 * 방장은 대상이 아니고, 일반사용자는 반납할 권한이 없다.
 */
export function canResignAdmin(role: ParticipantRole): boolean {
  return role === 'admin';
}

/**
 * 세션 설정 화면에 "음악 서비스: 전환하기" 항목 자체를 보여줄지 여부 — 혼합 세션에는 이 개념 자체가
 * 없다(09-cross-platform-mixed-mode.md "결정 3", 00-ux-flow.md 2.13절 "혼합 세션 예외").
 */
export function shouldShowServiceSwitch(service: MusicService): boolean {
  return service !== 'mixed';
}

/** Spotify ↔ YouTube 상호 전환 대상 (혼합 세션은 이 함수를 호출하기 전에 걸러진다). */
export function oppositeService(service: 'spotify' | 'youtube'): 'spotify' | 'youtube' {
  return service === 'spotify' ? 'youtube' : 'spotify';
}

/** 서비스 코드 → 사용자 노출용 라벨 (다이얼로그/오버레이 카피에서 재사용). */
export function serviceLabel(service: 'spotify' | 'youtube'): string {
  return service === 'spotify' ? 'Spotify' : 'YouTube';
}

/** "내 역할" 한 줄 표시 텍스트 (00-ux-flow.md 2.13절 와이어프레임의 세 예시와 동일). */
export function roleDisplayLabel(role: ParticipantRole): string {
  if (role === 'host') {
    return '방장 👑';
  }
  if (role === 'admin') {
    return '관리자 🛡';
  }
  return '일반 참여자';
}
