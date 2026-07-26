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
 * (2026-07-26 스코프 판단) 이번 라운드에서는 세션 생성 화면(CreateSessionScreen)의 호스트 플로우
 * 에만 실제로 연결했다 — "코드로 참여하기"(HomeScreen.tsx)가 아직 Alert 스텁이라 참여자 쪽 진입
 * 경로 자체가 이 앱에 없기 때문(리더 지시 범위 밖, 기존 라운드부터 있던 제약). 컴포넌트 자체는
 * props만으로 완결되어 있어 참여자 플로우가 생기면 그대로 재사용할 수 있다.
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
        label="Spotify로 참여"
        selected={value === 'spotify'}
        onPress={() => onChange('spotify')}
      />
      <PlatformRow
        label="YouTube로 참여"
        selected={value === 'youtube'}
        onPress={() => onChange('youtube')}
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
