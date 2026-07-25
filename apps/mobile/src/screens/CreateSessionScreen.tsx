import React, {useState} from 'react';
import {ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import {PrimaryButton} from '../components/Buttons';
import CapacityStepper from '../components/CapacityStepper';
import {useAuth} from '../services/auth/AuthContext';
import {useSession} from '../state/SessionContext';
import {useTheme} from '../theme/ThemeContext';
import {brand} from '../theme/tokens';
import {SESSION_CAPACITY_DEFAULT, type MusicService} from '../types/domain';

/**
 * 세션 생성 (US-201, US-105, US-207, 00-ux-flow.md 2.6절).
 * (2026-07-25 갱신) YouTube가 MVP로 승격되어 Spotify와 함께 라디오에서 실제로 선택 가능해졌다
 * (00-ux-flow.md 2.6절 "2026-07-23 갱신 — 준비 중 비활성 처리를 해제했다"). 혼합(Mixed)은 여전히
 * 이번 라운드 범위 밖이라 비활성 상태를 유지한다(리더 지시).
 */
type Props = NativeStackScreenProps<RootStackParamList, 'CreateSession'>;

const INFO_BY_SERVICE: Record<MusicService, string> = {
  spotify: '이 방은 Spotify 전용이에요. 참여자 모두 Spotify Premium이 필요해요.\n나중에 세션 설정에서 전환할 수 있어요.',
  youtube:
    '이 방은 YouTube 전용이에요. YouTube 정책상 무광고가 보장되지 않아 광고가 보일 수 있어요.\n나중에 세션 설정에서 전환할 수 있어요.',
  mixed: '혼합 세션은 곧 지원 예정이에요.',
};

export default function CreateSessionScreen({navigation}: Props) {
  const theme = useTheme();
  const {profile} = useAuth();
  const {createSession} = useSession();

  const [sessionName, setSessionName] = useState('우리 둘의 플레이리스트');
  const [service, setService] = useState<MusicService>('spotify');
  const [capacity, setCapacity] = useState(SESSION_CAPACITY_DEFAULT);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = () => {
    if (!profile) {
      return;
    }
    setIsCreating(true);
    const session = createSession({
      sessionName,
      service,
      capacity,
      host: {
        participantId: profile.id,
        displayName: profile.displayName,
        accountTier: profile.isPremium ? 'premium' : 'free',
      },
    });
    setIsCreating(false);
    navigation.replace('Room', {sessionId: session.sessionId});
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.bg}]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="뒤로 가기">
          <Text style={[styles.back, {color: theme.text}]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: theme.text}]}>세션 만들기</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View>
          <Text style={[styles.label, {color: theme.textSecondary}]}>세션 이름</Text>
          <TextInput
            style={[styles.input, {backgroundColor: theme.bgElevated, color: theme.text, borderColor: theme.border}]}
            value={sessionName}
            onChangeText={setSessionName}
            placeholder="우리 둘의 플레이리스트"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View>
          <Text style={[styles.label, {color: theme.textSecondary}]}>음악 서비스</Text>
          <RadioRow label="Spotify" selected={service === 'spotify'} disabled={false} onPress={() => setService('spotify')} />
          <RadioRow label="YouTube" selected={service === 'youtube'} disabled={false} onPress={() => setService('youtube')} />
          <RadioRow label="혼합 (Mixed)" selected={false} disabled note="곧 지원 예정" />
        </View>

        <View>
          <Text style={[styles.label, {color: theme.textSecondary}]}>정원</Text>
          <CapacityStepper value={capacity} onChange={setCapacity} />
        </View>

        <Text style={[styles.infoBanner, {color: theme.textSecondary, backgroundColor: theme.cardBg}]}>
          ⓘ {INFO_BY_SERVICE[service]}
        </Text>

        <PrimaryButton label="세션 만들기" onPress={handleCreate} loading={isCreating} style={styles.createButton} />
      </ScrollView>
    </SafeAreaView>
  );
}

function RadioRow({
  label,
  selected,
  disabled,
  note,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  note?: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[styles.radioRow, {opacity: disabled ? 0.45 : 1}]}
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="radio"
      accessibilityState={{selected, disabled}}>
      <View style={[styles.radioDot, {borderColor: selected ? brand.primary : theme.border}]}>
        {selected && <View style={[styles.radioDotInner, {backgroundColor: brand.primary}]} />}
      </View>
      <Text style={[styles.radioLabel, {color: theme.text}]}>{label}</Text>
      {note && <Text style={[styles.radioNote, {color: theme.textSecondary}]}>{note}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  back: {width: 28, fontSize: 20},
  headerTitle: {fontSize: 16, fontWeight: '700'},
  body: {paddingHorizontal: 24, paddingBottom: 40, gap: 24},
  label: {fontSize: 13, fontWeight: '600', marginBottom: 10},
  input: {borderRadius: 8, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15},
  radioRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10},
  radioDot: {width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center'},
  radioDotInner: {width: 10, height: 10, borderRadius: 5},
  radioLabel: {fontSize: 15, fontWeight: '500'},
  radioNote: {fontSize: 12, marginLeft: 'auto'},
  infoBanner: {fontSize: 13, lineHeight: 19, borderRadius: 12, padding: 14},
  createButton: {marginTop: 8},
});
