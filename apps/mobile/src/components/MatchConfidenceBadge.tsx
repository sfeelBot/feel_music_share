import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {matchColors} from '../theme/tokens';
import type {MatchConfidenceLevel} from '../types/domain';

/**
 * 일치율/신뢰도 배지 (02-key-ui-patterns.md 5.3절, 03-screen-mockups.html `.confidence-badge`).
 * 수치(%)와 등급(높음/중간/낮음)을 함께 표시 — 색상에만 의존하지 않고 아이콘 모양 + 텍스트 라벨을
 * 항상 병행한다(접근성, 1·2절과 동일 원칙).
 */
interface MatchConfidenceBadgeProps {
  score: number;
  level: MatchConfidenceLevel;
}

const LEVEL_META: Record<MatchConfidenceLevel, {icon: string; label: string}> = {
  high: {icon: '✅', label: '높음'},
  medium: {icon: '❓', label: '중간'},
  low: {icon: '⚠', label: '낮음 · 확인 필요'},
};

export default function MatchConfidenceBadge({score, level}: MatchConfidenceBadgeProps) {
  const theme = useTheme();
  const {icon, label} = LEVEL_META[level];
  const color = level === 'high' ? matchColors.high : level === 'medium' ? matchColors.medium : matchColors.low;
  const bg = level === 'high' ? theme.matchHighBg : level === 'medium' ? theme.matchMediumBg : theme.matchLowBg;

  return (
    <View
      style={[styles.badge, {backgroundColor: bg}]}
      accessibilityRole="text"
      accessibilityLabel={`일치율 ${score}% · ${label}`}>
      <Text style={{fontSize: 13}}>{icon}</Text>
      <Text style={[styles.text, {color}]}>
        일치율 {score}% · {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  text: {fontSize: 12.5, fontWeight: '700'},
});
