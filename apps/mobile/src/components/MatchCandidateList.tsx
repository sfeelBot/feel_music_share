import React from 'react';
import {FlatList, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import MatchConfidenceBadge from './MatchConfidenceBadge';
import {useTheme} from '../theme/ThemeContext';
import {formatDuration} from '../utils/format';
import type {MatchedTrackCandidate} from '../types/domain';

/**
 * 대체 후보 목록 (00-ux-flow.md 2.11c). 자동 매칭이 계산한 차순위 후보를 일치율 순으로 보여준다.
 * 후보가 없으면 "직접 검색하기"로 바로 안내한다.
 */
interface MatchCandidateListProps {
  candidates: MatchedTrackCandidate[];
  onSelect: (candidate: MatchedTrackCandidate) => void;
  onManualSearch: () => void;
}

export default function MatchCandidateList({candidates, onSelect, onManualSearch}: MatchCandidateListProps) {
  const theme = useTheme();

  if (candidates.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyText, {color: theme.textSecondary}]}>다른 후보를 찾지 못했어요.</Text>
        <TouchableOpacity onPress={onManualSearch} accessibilityRole="button">
          <Text style={[styles.manualLink, {color: theme.focusRing}]}>직접 검색하기 →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <FlatList
        data={candidates}
        keyExtractor={item => item.serviceTrackId}
        scrollEnabled={false}
        renderItem={({item}) => (
          <View style={[styles.row, styles.rowSpacing, {backgroundColor: theme.cardBg}]}>
            <View style={[styles.thumb, {backgroundColor: theme.trackBg}]}>
              <Text style={styles.thumbGlyph}>♪</Text>
            </View>
            <View style={styles.info}>
              <Text style={[styles.title, {color: theme.text}]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.meta, {color: theme.textSecondary}]} numberOfLines={1}>
                {item.artist} · {formatDuration(item.durationMs)}
              </Text>
              <View style={styles.badgeInline}>
                <MatchConfidenceBadge score={item.matchScore} level={item.confidenceLevel} />
              </View>
            </View>
            <TouchableOpacity
              style={[styles.selectBtn, {borderColor: theme.border}]}
              onPress={() => onSelect(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.title} 선택`}>
              <Text style={[styles.selectBtnText, {color: theme.text}]}>선택</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <View style={styles.footer}>
        <Text style={[styles.footerText, {color: theme.textSecondary}]}>원하는 결과가 없다면</Text>
        <TouchableOpacity onPress={onManualSearch} accessibilityRole="button">
          <Text style={[styles.manualLink, {color: theme.focusRing}]}>직접 검색하기 →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 12},
  rowSpacing: {marginBottom: 10},
  thumb: {width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  thumbGlyph: {fontSize: 18, opacity: 0.5},
  info: {flex: 1},
  title: {fontWeight: '700', fontSize: 13},
  meta: {fontSize: 11, marginTop: 2, marginBottom: 6},
  badgeInline: {alignSelf: 'flex-start'},
  selectBtn: {borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8},
  selectBtnText: {fontWeight: '700', fontSize: 12},
  footer: {alignItems: 'center', marginTop: 16, gap: 6},
  footerText: {fontSize: 13},
  manualLink: {fontWeight: '700', fontSize: 13},
  emptyWrap: {alignItems: 'center', paddingVertical: 24, gap: 10},
  emptyText: {fontSize: 13},
});
