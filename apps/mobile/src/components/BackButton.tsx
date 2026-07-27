import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';
import {useTheme} from '../theme/ThemeContext';

/**
 * 공통 뒤로가기(←) 버튼 (PB-07/PB-14, docs/design/06-ui-polish-audit.md).
 *
 * 이전에는 `CreateSessionScreen.tsx`/`HomeScreen.tsx`/`SessionSettingsView.tsx` 등 화면마다 각자
 * `Text`로 "←" 글리프를 구현했는데, `hitSlop`이나 44×44 최소 터치 영역 없이 `{width:28, fontSize:20}`
 * 텍스트 자체 크기만 히트 영역이었다(Apple HIG 44×44pt 미달). 이 컴포넌트로 통일하면서
 * `hitSlop={{top:12,bottom:12,left:12,right:12}}`를 기본 내장한다 — 시각 크기(28px 폭)는 그대로 두고
 * 터치 영역만 넓힌다(디자인 변경 없이 터치 타겟만 개선하는 게 PB-07의 취지).
 *
 * 기존 화면들의 헤더가 `justifyContent:'space-between'` + 오른쪽에 동일한 폭(28)의 빈 `View`를 둬서
 * 제목을 시각적으로 중앙에 배치하는 패턴을 그대로 쓰므로, 바깥 히트 영역 확장(hitSlop)과 별개로
 * 컴포넌트 자체의 레이아웃 폭은 28을 유지해 기존 헤더 스타일(`styles.back` 스페이서)과 맞춘다.
 */
interface BackButtonProps {
  onPress: () => void;
  /** 접근성 라벨 — 대부분 "뒤로 가기"지만, 오버레이를 닫는 문맥(AddTrackModal 등)에서는 다르게 줄 수 있다. */
  accessibilityLabel?: string;
  /** 글리프 색상 오버라이드 — 기본은 현재 테마의 본문 텍스트 색. */
  color?: string;
}

export default function BackButton({onPress, accessibilityLabel = '뒤로 가기', color}: BackButtonProps) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
      style={styles.touchTarget}>
      <Text style={[styles.glyph, {color: color ?? theme.text}]}>←</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchTarget: {width: 28, justifyContent: 'center'},
  glyph: {fontSize: 20, fontWeight: '600'},
});
