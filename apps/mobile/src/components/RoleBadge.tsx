import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {roleColors} from '../theme/tokens';
import type {ParticipantRole} from '../types/domain';

/**
 * 역할 배지 (02-key-ui-patterns.md 6절) — 방장/관리자만 배지를 표시하고, 일반사용자는 배지 없음이
 * 곧 상태 표시다(정보 과밀 방지, 6.2절).
 */
export default function RoleBadge({role}: {role: ParticipantRole}) {
  const theme = useTheme();
  if (role === 'regular') {
    return null;
  }
  const isHost = role === 'host';
  const color = isHost ? roleColors.gold : roleColors.slate;
  const bg = isHost ? theme.roleGoldBg : theme.roleSlateBg;
  const label = isHost ? '👑 방장' : '🛡 관리자';

  return (
    <Text style={[styles.badge, {color, backgroundColor: bg}]} accessibilityLabel={isHost ? '역할: 방장' : '역할: 관리자'}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginLeft: 6,
    overflow: 'hidden',
  },
});
