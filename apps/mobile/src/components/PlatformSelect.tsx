import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {brand} from '../theme/tokens';
import type {MixedParticipantPlatform} from '../types/domain';

/**
 * 혼합 세션 참여 플랫폼 선택 (00-ux-flow.md 2.6c) — 호스트/참여자 양쪽에서 재사용 가능하게 설계.
 * "이 세션 전체가 어떤 서비스로 재생될지"가 아니라 "나 개인이 어떤 서비스로 참여할지"를 정하는
 * 선택이라는 점을 문구로 명시한다(09문서 "결정 3").
 *
 * 호스트(CreateSessionScreen)·참여자(HomeScreen의 "코드로 참여하기", 혼합 세션 참여 시) 양쪽 플로우
 * 모두에 실제로 연결되어 있다(커밋 `caea14d`; 2026-07-26 정정 — 이전 주석은 "코드로 참여하기가 아직
 * Alert 스텁이라 참여자 쪽엔 연결되지 않았다"고 남아 있었지만, 이미 그 스텁은 실제 동작으로
 * 교체됐다, Round 10 QA 지적 반영).
 */
interface PlatformSelectProps {
  value: MixedParticipantPlatform;
  onChange: (platform: MixedParticipantPlatform) => void;
}

export default function PlatformSelect({value, onChange}: PlatformSelectProps) {
  const theme = useTheme();

  return (
    <View>
      <Text style={[styles.title, {color: theme.text}]}>혼합 세션 참여 방법</Text>
      <Text style={[styles.desc, {color: theme.textSecondary}]}>
        이 방은 혼합 모드예요. 당신이 사용할 플랫폼을 선택해주세요.
      </Text>

      <PlatformRow
        label="YouTube로 참여"
        selected={value === 'youtube'}
        onPress={() => onChange('youtube')}
      />
      <PlatformRow
        label="Spotify로 참여"
        selected={value === 'spotify'}
        onPress={() => onChange('spotify')}
      />

      <Text style={[styles.infoBanner, {color: theme.textSecondary, backgroundColor: theme.cardBg}]}>
        ⓘ 세션 전체가 이 서비스로 고정되는 게 아니라, 나 개인이 어떤 플랫폼으로 참여할지 정하는
        선택이에요. 다른 참여자는 다른 플랫폼을 선택할 수 있어요 — 그게 혼합 세션의 정상 동작이에요.
      </Text>
    </View>
  );
}

function PlatformRow({label, selected, onPress}: {label: string; selected: boolean; onPress: () => void}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{selected}}>
      <View style={[styles.dot, {borderColor: selected ? brand.primary : theme.border}]}>
        {selected && <View style={[styles.dotInner, {backgroundColor: brand.primary}]} />}
      </View>
      <Text style={[styles.label, {color: theme.text}]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  title: {fontSize: 17, fontWeight: '700', marginBottom: 10},
  desc: {fontSize: 13.5, lineHeight: 20, marginBottom: 18},
  row: {flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12},
  dot: {width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center'},
  dotInner: {width: 11, height: 11, borderRadius: 6},
  label: {fontSize: 15, fontWeight: '500'},
  infoBanner: {fontSize: 12.5, lineHeight: 18, borderRadius: 12, padding: 14, marginTop: 16},
});
