import React, {useState} from 'react';
import {ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import BackButton from '../components/BackButton';
import {PrimaryButton} from '../components/Buttons';
import CapacityStepper from '../components/CapacityStepper';
import PlatformSelect from '../components/PlatformSelect';
import {useAuth} from '../services/auth/AuthContext';
import {useFirebaseAuth} from '../state/FirebaseAuthContext';
import {useSession} from '../state/SessionContext';
import {useTheme} from '../theme/ThemeContext';
import {brand} from '../theme/tokens';
import {SESSION_CAPACITY_DEFAULT, type MixedParticipantPlatform, type MusicService} from '../types/domain';

/**
 * 세션 생성 (US-201, US-105, US-105d, US-207, 00-ux-flow.md 2.6/2.6c절).
 * (2026-07-25 갱신) YouTube가 MVP로 승격되어 Spotify와 함께 라디오에서 실제로 선택 가능해졌다.
 * (2026-07-26 갱신) 혼합(Mixed)도 실제로 구현됨 — 혼합을 고르면 "세션 만들기"를 눌렀을 때 곧바로
 * 세션을 만들지 않고, 먼저 호스트 본인이 참여할 플랫폼을 고르는 2.6c 단계를 거친다(00-ux-flow.md
 * 2.6절 "혼합 선택: 호스트 자신도 이 세션의 참여자이므로, 먼저 호스트 본인이 참여할 플랫폼을
 * 선택/확인하는 화면(2.6c)을 거친 뒤...").
 * (2026-07-27 RTDB 1라운드) `participantId`는 더 이상 Spotify 프로필의 `profile.id`가 아니라
 * Firebase Auth 익명 인증의 `auth.uid`를 쓴다(RTDB 보안 규칙이 "본인 여부"를 검사할 수 있는
 * 유일한 위조 불가능 값 — docs/specs/10-rtdb-schema-and-security-rules.md "설계 변경 요구사항").
 * `useFirebaseAuth().uid`가 아직 준비되지 않았으면(앱 시작 직후 익명 로그인이 끝나기 전) 세션
 * 생성을 진행하지 않는다.
 */
type Props = NativeStackScreenProps<RootStackParamList, 'CreateSession'>;

const INFO_BY_SERVICE: Record<MusicService, string> = {
  spotify: '이 방은 Spotify 전용이에요. 참여자 모두 Spotify Premium이 필요해요.\n나중에 세션 설정에서 전환할 수 있어요.',
  youtube:
    '이 방은 YouTube 전용이에요. YouTube 정책상 무광고가 보장되지 않아 광고가 보일 수 있어요.\n나중에 세션 설정에서 전환할 수 있어요.',
  mixed:
    '이 방은 혼합 모드예요. 참여자마다 자신이 쓰는 서비스(Spotify 또는 YouTube)로 각자 참여해요. 곡을 추가하면 각자의 플랫폼에서 자동으로 찾아드리고, 맞는지 항상 확인을 받을게요.',
};

export default function CreateSessionScreen({navigation}: Props) {
  const theme = useTheme();
  const {profile} = useAuth();
  const {uid: firebaseUid} = useFirebaseAuth();
  const {createSession} = useSession();

  const [sessionName, setSessionName] = useState('우리 둘의 플레이리스트');
  const [service, setService] = useState<MusicService>('spotify');
  const [capacity, setCapacity] = useState(SESSION_CAPACITY_DEFAULT);
  const [isCreating, setIsCreating] = useState(false);
  // 혼합 세션 전용 2단계 흐름 (2.6 → 2.6c) — 'form'은 기존 세션 생성 폼, 'platform'은 호스트 본인의
  // 참여 플랫폼 선택 화면. Spotify/YouTube 전용 세션은 이 단계 자체가 없다(09문서 "결정 3").
  const [step, setStep] = useState<'form' | 'platform'>('form');
  const [hostPlatform, setHostPlatform] = useState<MixedParticipantPlatform>('spotify');

  const finalizeCreate = async (resolvedHostPlatform?: MixedParticipantPlatform) => {
    if (!profile || !firebaseUid) {
      return;
    }
    setIsCreating(true);
    try {
      const session = await createSession({
        sessionName,
        service,
        capacity,
        hostPlatform: resolvedHostPlatform,
        host: {
          participantId: firebaseUid,
          displayName: profile.displayName,
          accountTier: profile.isPremium ? 'premium' : 'free',
        },
      });
      navigation.replace('Room', {sessionId: session.sessionId});
    } finally {
      setIsCreating(false);
    }
  };

  const handlePrimaryButtonPress = () => {
    if (service === 'mixed') {
      // 00-ux-flow.md 2.6c: 혼합 세션은 호스트도 참여자이므로 먼저 본인 참여 플랫폼을 고른다.
      setStep('platform');
      return;
    }
    finalizeCreate();
  };

  if (step === 'platform') {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: theme.bg}]}>
        <View style={styles.header}>
          <BackButton onPress={() => setStep('form')} />
          <Text style={[styles.headerTitle, {color: theme.text}]}>혼합 세션 참여</Text>
          <View style={styles.back} />
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <PlatformSelect value={hostPlatform} onChange={setHostPlatform} />
          <PrimaryButton
            label="확인하고 입장"
            onPress={() => finalizeCreate(hostPlatform)}
            loading={isCreating}
            style={styles.createButton}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.bg}]}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
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
          <RadioRow
            label="혼합 (Mixed)"
            selected={service === 'mixed'}
            disabled={false}
            onPress={() => setService('mixed')}
          />
        </View>

        <View>
          <Text style={[styles.label, {color: theme.textSecondary}]}>정원</Text>
          <CapacityStepper value={capacity} onChange={setCapacity} />
        </View>

        <Text style={[styles.infoBanner, {color: theme.textSecondary, backgroundColor: theme.cardBg}]}>
          ⓘ {INFO_BY_SERVICE[service]}
        </Text>

        <PrimaryButton
          label="세션 만들기"
          onPress={handlePrimaryButtonPress}
          loading={isCreating}
          style={styles.createButton}
        />
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
