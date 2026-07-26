import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import MatchConfidenceBadge from './MatchConfidenceBadge';
import {useTheme} from '../theme/ThemeContext';
import {shouldShowDurationMismatchNotice} from '../services/matching/trackMatcher';
import {formatDuration} from '../utils/format';
import type {MatchedTrackCandidate, MixedPlaylistEntry} from '../types/domain';

/**
 * 매칭 확인 카드 (00-ux-flow.md 2.11b, 02-key-ui-patterns.md 5절 — 혼합 모드 3대 핵심 UI 중 하나).
 * "확정하기 / 다른 결과 보기 / 직접 검색하기" 세 액션. 09문서 결정 2가 요구하는 필수 표시 항목
 * (썸네일/제목/아티스트·채널/길이/플랫폼 배지/일치율)을 모두 담는다.
 */
interface MatchConfirmCardProps {
  entry: MixedPlaylistEntry;
  track: MatchedTrackCandidate;
  hasCandidates: boolean;
  onConfirm: () => void;
  onShowCandidates: () => void;
  onManualSearch: () => void;
}

export default function MatchConfirmCard({
  entry,
  track,
  hasCandidates,
  onConfirm,
  onShowCandidates,
  onManualSearch,
}: MatchConfirmCardProps) {
  const theme = useTheme();
  const platformLabel = track.service === 'spotify' ? '🟢 Spotify' : '🎧 YouTube';
  const showDurationNotice = shouldShowDurationMismatchNotice(
    {title: entry.title, artist: entry.artist, durationMs: entry.representativeDurationMs},
    track,
  );

  return (
    <View>
      <Text style={[styles.intro, {color: theme.textSecondary}]}>
        <Text style={{fontWeight: '700', color: theme.text}}>"{entry.title}"</Text>을(를) 당신의{' '}
        {track.service === 'spotify' ? 'Spotify' : 'YouTube'}에서 이렇게 찾았어요
      </Text>

      <View style={[styles.card, {backgroundColor: theme.cardBg}]}>
        <View style={styles.top}>
          <View style={[styles.thumb, {backgroundColor: theme.trackBg}]}>
            <Text style={styles.thumbGlyph}>♪</Text>
          </View>
          <View style={styles.info}>
            <Text style={[styles.title, {color: theme.text}]} numberOfLines={2}>
              {track.title}
            </Text>
            <Text style={[styles.meta, {color: theme.textSecondary}]}>
              {platformLabel}
              {'\n'}
              {track.artist}
              {'\n'}
              {formatDuration(track.durationMs)}
            </Text>
          </View>
        </View>
        <MatchConfidenceBadge score={track.matchScore} level={track.confidenceLevel} />
      </View>

      {showDurationNotice && (
        <Text style={[styles.notice, {color: theme.textSecondary, backgroundColor: theme.amberAlertBg}]}>
          ⓘ 원곡({formatDuration(entry.representativeDurationMs)})과 길이가 조금 달라요 — 라이브 버전/리믹스일 수
          있어요. 괜찮은지 확인해주세요
        </Text>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryBtn, {backgroundColor: theme.focusRing}]}
          onPress={onConfirm}
          accessibilityRole="button">
          <Text style={styles.primaryBtnText}>확정하기</Text>
        </TouchableOpacity>
        {hasCandidates && (
          <TouchableOpacity style={styles.textBtn} onPress={onShowCandidates} accessibilityRole="button">
            <Text style={[styles.textBtnText, {color: theme.text}]}>다른 결과 보기</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.textBtn} onPress={onManualSearch} accessibilityRole="button">
          <Text style={[styles.textBtnText, {color: theme.text}]}>직접 검색하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 16},
  card: {borderRadius: 16, padding: 16},
  top: {flexDirection: 'row', gap: 12, marginBottom: 12},
  thumb: {width: 64, height: 64, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
  thumbGlyph: {fontSize: 22, opacity: 0.5},
  info: {flex: 1},
  title: {fontWeight: '700', fontSize: 14.5, marginBottom: 6, lineHeight: 19},
  meta: {fontSize: 12, lineHeight: 18},
  notice: {fontSize: 12.5, lineHeight: 18, borderRadius: 12, padding: 12, marginTop: 12},
  actions: {marginTop: 16, gap: 10},
  primaryBtn: {borderRadius: 999, paddingVertical: 14, alignItems: 'center'},
  primaryBtnText: {color: '#FFFFFF', fontWeight: '700', fontSize: 15},
  textBtn: {paddingVertical: 10, alignItems: 'center'},
  textBtnText: {fontWeight: '600', fontSize: 13.5},
});
