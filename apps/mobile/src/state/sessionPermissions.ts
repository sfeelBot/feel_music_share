import type {ParticipantRole} from '../types/domain';

/**
 * 세션 설정 화면(00-ux-flow.md 2.13, 02-key-ui-patterns.md 6/7절)의 권한별 분기를 순수 함수로
 * 추출했다 — SessionSettingsView.tsx/SessionContext.tsx가 이 함수들을 그대로 재사용하고, 단위
 * 테스트도 이 파일만 대상으로 삼는다(React 렌더링과 분리해 로직만 검증하기 위함, 기존
 * `playlistSequencing.ts`와 동일한 패턴).
 *
 * NOTE(2026-07-28, YouTube 단일화): `canSwitchService`/`shouldShowServiceSwitch`/`oppositeService`/
 * `serviceLabel`은 전환할 다른 음악 서비스가 더 이상 없으므로 제거했다 —
 * docs/decision-log.md 2026-07-28 "Spotify 지원 완전 제거 + 혼합(Mixed) 세션 모드 제거",
 * docs/specs/11-youtube-only-migration-plan.md 참고.
 */

/**
 * "관리자 사임하기" 진입점 노출 여부 — 관리자 본인에게만 보인다(02-key-ui-patterns.md 6.4a절).
 * 방장은 대상이 아니고, 일반사용자는 반납할 권한이 없다.
 */
export function canResignAdmin(role: ParticipantRole): boolean {
  return role === 'admin';
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
