import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import type {MixedParticipantPlatform} from '../types/domain';

/**
 * 참여자별 컬러 링 아바타 (01-style-guide.md 4절, 02-key-ui-patterns.md 1.2절).
 * 색맹 접근성을 위해 색 단독이 아니라 이니셜을 항상 병행한다.
 *
 * (2026-07-26 확장) 혼합 세션 전용 — `platform`을 주면 아바타 우하단에 참여 플랫폼 아이콘을
 * 오버레이한다(00-ux-flow.md 2.10d "참여자 아바타 스택에 서비스 아이콘 병기", 2.6c). 아이콘
 * 모양(●/🎧) + 색을 함께 써서 색맹 접근성 원칙(1·2절과 동일)을 유지한다.
 */
interface AvatarProps {
  initial: string;
  ringColor: string;
  size?: 'sm' | 'md';
  crown?: boolean;
  platform?: MixedParticipantPlatform;
}

export default function Avatar({initial, ringColor, size = 'md', crown = false, platform}: AvatarProps) {
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
      {platform && (
        <View
          style={[styles.platformBadge, {backgroundColor: theme.bgElevated, borderColor: theme.border}]}
          accessibilityLabel={platform === 'spotify' ? '참여 플랫폼: Spotify' : '참여 플랫폼: YouTube'}>
          <Text style={styles.platformBadgeGlyph}>{platform === 'spotify' ? '🟢' : '🎧'}</Text>
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
  platformBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformBadgeGlyph: {fontSize: 8},
});
