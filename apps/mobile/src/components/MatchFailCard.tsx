import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import type {MixedParticipantPlatform, MixedPlaylistEntry} from '../types/domain';

/**
 * 매칭 실패 안내 (00-ux-flow.md 2.11d). "이 참여자의 이 플랫폼"에 한정된 실패임을 강조 —
 * 다른 참여자는 정상 매칭됐을 수 있다.
 */
interface MatchFailCardProps {
  entry: MixedPlaylistEntry;
  platform: MixedParticipantPlatform;
  onManualSearch: () => void;
  onSkip: () => void;
}

export default function MatchFailCard({entry, platform, onManualSearch, onSkip}: MatchFailCardProps) {
  const theme = useTheme();
  const platformName = platform === 'spotify' ? 'Spotify' : 'YouTube';

  return (
    <View style={styles.wrap}>
      <View style={[styles.icon, {backgroundColor: theme.matchLowBg}]}>
        <Text style={{fontSize: 26}}>🔍</Text>
      </View>
      <Text style={[styles.title, {color: theme.text}]}>이 곡을 {platformName}에서 찾지 못했어요</Text>
      <Text style={[styles.detail, {backgroundColor: theme.cardBg, color: theme.textSecondary}]}>
        "{entry.title}" - {entry.artist}에 해당하는 결과를 당신의 {platformName}에서 찾지 못했어요.
      </Text>

      <TouchableOpacity
        style={[styles.primaryBtn, {backgroundColor: theme.focusRing}]}
        onPress={onManualSearch}
        accessibilityRole="button">
        <Text style={styles.primaryBtnText}>직접 검색해서 찾기</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.textBtn} onPress={onSkip} accessibilityRole="button">
        <Text style={[styles.textBtnText, {color: theme.textSecondary}]}>이 곡 없이 넘어가기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {alignItems: 'center', paddingTop: 8},
  icon: {width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 18},
  title: {fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 12},
  detail: {fontSize: 13, lineHeight: 19, borderRadius: 12, padding: 14, marginBottom: 20},
  primaryBtn: {width: '100%', borderRadius: 999, paddingVertical: 14, alignItems: 'center'},
  primaryBtnText: {color: '#FFFFFF', fontWeight: '700', fontSize: 15},
  textBtn: {paddingVertical: 12, alignItems: 'center'},
  textBtnText: {fontWeight: '600', fontSize: 13.5},
});
