import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';

/**
 * 참여자별 컬러 링 아바타 (01-style-guide.md 4절, 02-key-ui-patterns.md 1.2절).
 * 색맹 접근성을 위해 색 단독이 아니라 이니셜을 항상 병행한다.
 */
interface AvatarProps {
  initial: string;
  ringColor: string;
  size?: 'sm' | 'md';
  crown?: boolean;
}

export default function Avatar({initial, ringColor, size = 'md', crown = false}: AvatarProps) {
  const theme = useTheme();
  const dimension = size === 'sm' ? 28 : 40;
  return (
    <View
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          borderColor: ringColor,
          backgroundColor: theme.bgElevated,
        },
      ]}>
      <Text style={[styles.initial, {color: theme.text, fontSize: size === 'sm' ? 12 : 15}]}>{initial}</Text>
      {crown && (
        <View style={styles.crown} accessibilityLabel="방장">
          <Text style={styles.crownEmoji}>👑</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {fontWeight: '700'},
  crown: {position: 'absolute', top: -8, right: -6},
  crownEmoji: {fontSize: 13},
});
