import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {brand} from '../theme/tokens';
import {SESSION_CAPACITY_MAX, SESSION_CAPACITY_MIN} from '../types/domain';

/**
 * 세션 정원 스테퍼 (02-key-ui-patterns.md 7절) — 기본값 2명, 범위 2~12명.
 * 스테퍼(−/+) + 슬라이더 트랙(현재 값 대비 위치 표시)을 함께 노출한다.
 *
 * (2026-07-27, PB-09 — docs/design/06-ui-polish-audit.md) +/− 버튼을 36×36에서 44×44로 키웠다
 * (Apple HIG 최소 터치 타겟 44×44pt 충족).
 */
interface CapacityStepperProps {
  value: number;
  onChange: (next: number) => void;
}

export default function CapacityStepper({value, onChange}: CapacityStepperProps) {
  const theme = useTheme();
  const ratio = (value - SESSION_CAPACITY_MIN) / (SESSION_CAPACITY_MAX - SESSION_CAPACITY_MIN);

  const decrement = () => onChange(Math.max(SESSION_CAPACITY_MIN, value - 1));
  const increment = () => onChange(Math.min(SESSION_CAPACITY_MAX, value + 1));

  return (
    <View>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={decrement}
          disabled={value <= SESSION_CAPACITY_MIN}
          style={[styles.stepBtn, {borderColor: theme.border, opacity: value <= SESSION_CAPACITY_MIN ? 0.4 : 1}]}
          accessibilityLabel="정원 줄이기">
          <Text style={[styles.stepBtnText, {color: theme.text}]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.value, {color: theme.text}]}>{value}명</Text>
        <TouchableOpacity
          onPress={increment}
          disabled={value >= SESSION_CAPACITY_MAX}
          style={[styles.stepBtn, {borderColor: theme.border, opacity: value >= SESSION_CAPACITY_MAX ? 0.4 : 1}]}
          accessibilityLabel="정원 늘리기">
          <Text style={[styles.stepBtnText, {color: theme.text}]}>+</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.track, {backgroundColor: theme.trackBg}]}>
        <View style={[styles.trackDot, {left: `${ratio * 100}%`, backgroundColor: brand.primary}]} />
      </View>
      <View style={styles.labelsRow}>
        <Text style={[styles.rangeLabel, {color: theme.textSecondary}]}>{SESSION_CAPACITY_MIN}명</Text>
        <Text style={[styles.rangeLabel, {color: theme.textSecondary}]}>{SESSION_CAPACITY_MAX}명</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 12},
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {fontSize: 18, fontWeight: '700'},
  value: {fontSize: 20, fontWeight: '700', minWidth: 56, textAlign: 'center'},
  track: {height: 4, borderRadius: 2, marginHorizontal: 4},
  trackDot: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
  },
  labelsRow: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 10},
  rangeLabel: {fontSize: 12},
});
