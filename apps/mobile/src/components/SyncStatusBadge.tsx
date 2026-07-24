import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {syncColors} from '../theme/tokens';
import type {SyncStatusValue} from '../types/domain';

/**
 * 동기화 상태 배지 4단계 (02-key-ui-patterns.md 2.2절).
 * 색상만이 아니라 아이콘 "모양"과 텍스트 라벨을 항상 함께 제공한다(색맹 접근성, 5절).
 */
interface SyncStatusBadgeProps {
  status: SyncStatusValue;
  /** "3명 함께 듣는 중" 같은 보조 문구 — 8절(참여 인원 vs 재생 인원)에서 이미 조합된 문자열을 넘긴다. */
  suffix?: string;
}

function labelFor(status: SyncStatusValue): string {
  switch (status.state) {
    case 'synced':
      return '동기화됨';
    case 'tuning':
      return status.reasonLabel ? `맞추는 중... (${status.reasonLabel})` : '맞추는 중...';
    case 'delayed':
      return `${status.delaySeconds ?? 0}초 지연`;
    case 'disconnected':
      return '연결 끊김 · 재접속 중';
    default:
      return '';
  }
}

export default function SyncStatusBadge({status, suffix}: SyncStatusBadgeProps) {
  const theme = useTheme();
  const {color, bg, iconShape} = (() => {
    switch (status.state) {
      case 'synced':
        return {color: syncColors.syncGreen, bg: theme.syncGreenBg, iconShape: 'dot' as const};
      case 'tuning':
        return {color: syncColors.amberAlert, bg: theme.amberAlertBg, iconShape: 'pulse' as const};
      case 'delayed':
        return {color: syncColors.amberAlert, bg: theme.amberAlertBg, iconShape: 'clock' as const};
      case 'disconnected':
      default:
        return {color: syncColors.mutedRed, bg: theme.mutedRedBg, iconShape: 'broken' as const};
    }
  })();

  const label = labelFor(status) + (suffix ? ` · ${suffix}` : '');

  return (
    <View style={[styles.badge, {backgroundColor: bg}]} accessibilityRole="text" accessibilityLabel={label}>
      <Icon shape={iconShape} color={color} />
      <Text style={[styles.text, {color}]}>{label}</Text>
    </View>
  );
}

function Icon({shape, color}: {shape: 'dot' | 'pulse' | 'clock' | 'broken'; color: string}) {
  if (shape === 'clock') {
    return <Text style={{color, fontSize: 12}}>⏱</Text>;
  }
  if (shape === 'broken') {
    return <Text style={{color, fontSize: 12}}>⚠</Text>;
  }
  // dot / pulse — pulse는 이번 라운드에서는 정적 점으로 단순화(애니메이션은 다음 단계 TODO)
  return <View style={[styles.dot, {backgroundColor: color}]} />;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dot: {width: 8, height: 8, borderRadius: 4},
  text: {fontSize: 12, fontWeight: '600', letterSpacing: 0.2},
});
