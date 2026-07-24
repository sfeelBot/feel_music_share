/**
 * 디자인 토큰 — docs/design/01-style-guide.md, docs/design/03-screen-mockups.html의 CSS 변수를 그대로 옮김.
 *
 * 색상/타이포 값은 디자인 문서상 "제안 단계(미확정)"로 명시되어 있으나, 구현 단계에서는 이 값을
 * 임의로 바꾸지 않고 그대로 사용한다 (01-style-guide.md 6절 참고 — 최종 확정은 별도 브랜딩 작업 몫).
 *
 * 라이트/다크 두 세트를 모두 옮겨두되, 스타일가이드 4절이 "다크모드를 1급 시민으로 취급"하라고
 * 제안했으므로 useColorScheme 훅으로 실제 기기 설정을 따르게 한다 (ThemeContext.tsx 참고).
 */

export interface ColorTokens {
  bg: string;
  bgElevated: string;
  cardBg: string;
  headerBg: string;
  headerText: string;
  text: string;
  textSecondary: string;
  border: string;
  overlay: string;
  trackBg: string;
  focusRing: string;
  shadow: string;
  syncGreenBg: string;
  amberAlertBg: string;
  mutedRedBg: string;
  roleGoldBg: string;
  roleSlateBg: string;
}

// 참여자별 컬러 링 (선곡자 배지, 01-style-guide.md 4절 / 03 mockup --color-picker-*)
export const pickerColors = {
  coral: '#FF6F61',
  amber: '#FFB25B',
  teal: '#2E9C8F',
} as const;

export const brandColors = {
  spotifyGreen: '#1DB954',
  youtubeRed: '#FF0000', // YouTube 관련 UI 요소 전용 — 동기화 상태 배지 등에는 절대 재사용 금지 (01문서 2절)
};

export const syncColors = {
  syncGreen: '#3FB68B',
  amberAlert: '#F2A93B',
  mutedRed: '#E4573D',
};

export const roleColors = {
  gold: '#D9A441', // 방장
  slate: '#7C6F9E', // 관리자
};

export const brand = {
  primary: '#FF6F61', // Dusk Coral
  primaryDark: '#4A2545', // Deep Plum
  secondary: '#FFB25B', // Warm Amber
};

export const lightColors: ColorTokens = {
  bg: '#FFF8F2',
  bgElevated: '#FFFFFF',
  cardBg: '#FFFFFF',
  headerBg: '#4A2545',
  headerText: '#FBF3EC',
  text: '#2B1E2E',
  textSecondary: 'rgba(43, 30, 46, 0.62)',
  border: 'rgba(43, 30, 46, 0.10)',
  overlay: 'rgba(43, 30, 46, 0.55)',
  trackBg: 'rgba(43, 30, 46, 0.12)',
  focusRing: '#4A2545',
  shadow: 'rgba(74, 37, 69, 0.18)',
  syncGreenBg: 'rgba(63, 182, 139, 0.14)',
  amberAlertBg: 'rgba(242, 169, 59, 0.16)',
  mutedRedBg: 'rgba(228, 87, 61, 0.14)',
  roleGoldBg: 'rgba(217, 164, 65, 0.16)',
  roleSlateBg: 'rgba(124, 111, 158, 0.14)',
};

export const darkColors: ColorTokens = {
  bg: '#1E1730',
  bgElevated: '#2A2140',
  cardBg: '#281F3D',
  headerBg: '#150F24',
  headerText: '#FBF3EC',
  text: '#FBF3EC',
  textSecondary: 'rgba(251, 243, 236, 0.65)',
  border: 'rgba(251, 243, 236, 0.14)',
  overlay: 'rgba(0, 0, 0, 0.62)',
  trackBg: 'rgba(251, 243, 236, 0.18)',
  focusRing: '#FFB25B',
  shadow: 'rgba(0, 0, 0, 0.55)',
  syncGreenBg: 'rgba(63, 182, 139, 0.22)',
  amberAlertBg: 'rgba(242, 169, 59, 0.22)',
  mutedRedBg: 'rgba(228, 87, 61, 0.22)',
  roleGoldBg: 'rgba(217, 164, 65, 0.24)',
  roleSlateBg: 'rgba(124, 111, 158, 0.26)',
};

// 01-style-guide.md 3절 타이포 위계 (시스템 폰트 사용 — iOS SF Pro / Android Roboto 계열 기본값 그대로 사용)
export const typography = {
  display: {fontSize: 30, fontWeight: '700' as const},
  title: {fontSize: 21, fontWeight: '600' as const},
  body: {fontSize: 15, fontWeight: '400' as const},
  caption: {fontSize: 12, fontWeight: '500' as const},
  status: {fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.3},
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};
