/** 간단한 임의 ID/초대 코드 생성기 (MVP 스캐폴딩용 — 충돌 방지 로직 없음, TODO Firebase 연동 시 서버 발급으로 교체). */

const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동되는 0/O, 1/I 제외

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 음성/문자로 불러주기 쉬운 6자리 초대 코드 (00-ux-flow.md 2.7절). */
export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)];
  }
  return code;
}
