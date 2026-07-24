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
 * 이번 라운드는 Spotify 전용 세션만 실제로 만들 수 있다 — YouTube/혼합은 라디오가 비활성화되고
 * "곧 지원 예정" 안내만 표시한다(리더 지시, 이번 라운드 범위 밖).
 */
type Props = NativeStackScreenProps<RootStackParamList, 'CreateSession'>;

const INFO_BY_SERVICE: Record<MusicService, string> = {
  spotify:
    '이 방은 Spotify 전용이에요. 참여자 모두 Spotify Premium이 필요해요.\n(나중에 세션 설정에서 다른 서비스로 전환할 수 있어요 — 이번 버전은 Spotify만 지원)',
  youtube: 'YouTube 세션은 곧 지원 예정이에요.',
  mixed: '혼합 세션은 곧 지원 예정이에요.',
};

export default function CreateSessionScreen({navigation}: Props) {
  const theme = useTheme();
  const {profile} = useAuth();
  const {createSession} = useSession();

  const [sessionName, setSessionName] = useState('우리 둘의 플레이리스트');
  const [capacity, setCapacity] = useState(SESSION_CAPACITY_DEFAULT);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = () => {
    if (!profile) {
      return;
    }
    setIsCreating(true);
    const session = createSession({
      sessionName,
      service: 'spotify',
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
          <RadioRow label="Spotify" selected disabled={false} />
          <RadioRow label="YouTube" selected={false} disabled note="곧 지원 예정" />
          <RadioRow label="혼합 (Mixed)" selected={false} disabled note="곧 지원 예정" />
        </View>

        <View>
          <Text style={[styles.label, {color: theme.textSecondary}]}>정원</Text>
          <CapacityStepper value={capacity} onChange={setCapacity} />
        </View>

        <Text style={[styles.infoBanner, {color: theme.textSecondary, backgroundColor: theme.cardBg}]}>
          ⓘ {INFO_BY_SERVICE.spotify}
        </Text>

        <PrimaryButton label="세션 만들기" onPress={handleCreate} loading={isCreating} style={styles.createButton} />
      </ScrollView>
    </SafeAreaView>
  );
}

function RadioRow({label, selected, disabled, note}: {label: string; selected: boolean; disabled: boolean; note?: string}) {
  const theme = useTheme();
  return (
    <View style={[styles.radioRow, {opacity: disabled ? 0.45 : 1}]}>
      <View style={[styles.radioDot, {borderColor: selected ? brand.primary : theme.border}]}>
        {selected && <View style={[styles.radioDotInner, {backgroundColor: brand.primary}]} />}
      </View>
      <Text style={[styles.radioLabel, {color: theme.text}]}>{label}</Text>
      {note && <Text style={[styles.radioNote, {color: theme.textSecondary}]}>{note}</Text>}
    </View>
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
