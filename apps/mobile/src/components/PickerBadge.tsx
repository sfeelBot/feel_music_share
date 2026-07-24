import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Avatar from './Avatar';
import {useTheme} from '../theme/ThemeContext';

/**
 * 선곡자 배지 (02-key-ui-patterns.md 1절) — "◐ 이 곡은 OO님이 선곡".
 * isMe === true면 "나(닉네임)"으로 표기한다(1.4절 엣지 케이스).
 */
interface PickerBadgeProps {
  displayName: string;
  ringColor: string;
  isMe?: boolean;
  variant?: 'nowPlaying' | 'inline';
}

export default function PickerBadge({displayName, ringColor, isMe, variant = 'nowPlaying'}: PickerBadgeProps) {
  const theme = useTheme();
  const label = isMe ? `나(${displayName})` : displayName;
  const initial = displayName.slice(0, 1);

  if (variant === 'inline') {
    return (
      <View style={styles.inlineRow}>
        <Avatar initial={initial} ringColor={ringColor} size="sm" />
        <Text style={[styles.inlineText, {color: theme.textSecondary}]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Avatar initial={initial} ringColor={ringColor} size="sm" />
      <Text style={[styles.text, {color: theme.textSecondary}]}>이 곡은 {label}님이 선곡</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center'},
  text: {fontSize: 13, fontWeight: '500'},
  inlineRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4},
  inlineText: {fontSize: 12, fontWeight: '500', maxWidth: 90},
});
