import React, {useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import {PrimaryButton, SecondaryButton} from '../components/Buttons';
import PlatformSelect from '../components/PlatformSelect';
import {useAuth} from '../services/auth/AuthContext';
import {useSession} from '../state/SessionContext';
import {useTheme} from '../theme/ThemeContext';
import type {MixedParticipantPlatform} from '../types/domain';

/**
 * 홈 (00-ux-flow.md 2.5절) — 세션 생성/참여 진입점.
 *
 * (2026-07-26 구현) "코드로 참여하기"를 실제 로직으로 연결했다 — sessionService.joinSessionByCode
 * (SessionContext.tsx의 joinSession 액션 경유)로 초대 코드를 조회해 참여자를 추가한다.
 *
 * TODO(Firebase 연동, 알려진 데모 스코프 한계): 세션은 이 앱 프로세스의 in-memory 목업에만 존재하므로
 * (services/session/sessionService.ts), 이 화면에서 실제로 참여가 성립하는 경우는 **같은 기기(같은 앱
 * 인스턴스)에서 방금 만든 세션**뿐이다. 다른 기기가 만든 세션은 이 프로세스 메모리에 없어 "코드가
 * 존재하지 않음"으로 처리된다 — Firestore/RTDB 연동 후에는 실제 원격 조회로 자연히 해소된다.
 */
type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({navigation}: Props) {
  const theme = useTheme();
  const {profile, logout} = useAuth();
  const {joinSession} = useSession();
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  // 혼합 세션에 참여하려는 경우에만 쓰는 2단계 흐름 — CreateSessionScreen.tsx의 호스트 쪽
  // 'form' → 'platform' 전환과 동일한 패턴(00-ux-flow.md 2.6c 개념을 참여자 쪽에도 그대로 적용,
  // Round 7 검증 R7.31 갭 해소). Spotify/YouTube 전용 세션 참여는 이 단계 자체를 거치지 않는다.
  const [step, setStep] = useState<'code' | 'platform'>('code');
  const [joiningPlatform, setJoiningPlatform] = useState<MixedParticipantPlatform>('spotify');

  const attemptJoin = (platform?: MixedParticipantPlatform) => {
    if (!profile) {
      return;
    }
    const trimmedCode = inviteCode.trim();
    if (!trimmedCode) {
      Alert.alert('코드를 입력해주세요', '참여하려는 세션의 초대 코드를 입력해주세요.');
      return;
    }

    setIsJoining(true);
    const result = joinSession({
      inviteCode: trimmedCode,
      joiningUser: {
        participantId: profile.id,
        displayName: profile.displayName,
        accountTier: profile.isPremium ? 'premium' : 'free',
      },
      platform,
    });
    setIsJoining(false);

    if (result.ok) {
      setStep('code');
      navigation.navigate('Room', {sessionId: result.session.sessionId});
      return;
    }

    switch (result.reason) {
      case 'not_found':
        Alert.alert(
          '세션을 찾을 수 없어요',
          '입력한 초대 코드로 참여 가능한 세션이 없어요. 코드를 다시 확인해주세요.',
        );
        break;
      case 'capacity_full':
        Alert.alert(
          '이 세션은 정원이 가득 찼어요',
          '방장이 세션을 만들 때 정한 최대 인원에 도달해서 더 이상 참여할 수 없어요.',
        );
        break;
      case 'platform_required':
        // 혼합 세션 — 참여자 본인의 플랫폼을 먼저 고르게 한다.
        setStep('platform');
        break;
      default:
        break;
    }
  };

  const handleJoinByCode = () => attemptJoin();

  if (step === 'platform') {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: theme.bg}]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('code')} accessibilityLabel="뒤로 가기">
            <Text style={[styles.back, {color: theme.text}]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.appName, {color: theme.text}]}>혼합 세션 참여</Text>
          <View style={styles.back} />
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <PlatformSelect value={joiningPlatform} onChange={setJoiningPlatform} />
          <PrimaryButton
            label="확인하고 입장"
            onPress={() => attemptJoin(joiningPlatform)}
            loading={isJoining}
            style={styles.ctaSpacing}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.bg}]}>
      <View style={styles.header}>
        <Text style={[styles.appName, {color: theme.text}]}>feel_music_share</Text>
        <TouchableOpacity onPress={logout} accessibilityRole="button">
          <Text style={[styles.logout, {color: theme.textSecondary}]}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.tagline, {color: theme.text}]}>지금 이 순간을 함께</Text>
      {profile && !profile.isPremium && (
        <Text style={styles.premiumWarning}>
          Spotify Premium 계정이 아니어서 재생 제어 기능이 제한될 수 있어요. (US-102)
        </Text>
      )}

      <PrimaryButton
        label="+ 새 세션 만들기"
        onPress={() => navigation.navigate('CreateSession')}
        style={styles.ctaSpacing}
      />

      <View style={styles.joinRow}>
        <TextInput
          style={[styles.input, {backgroundColor: theme.bgElevated, color: theme.text, borderColor: theme.border}]}
          placeholder="초대 코드 입력"
          placeholderTextColor={theme.textSecondary}
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
        />
      </View>
      <SecondaryButton label="# 코드로 참여하기" onPress={handleJoinByCode} loading={isJoining} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 24},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24},
  appName: {fontSize: 18, fontWeight: '700'},
  logout: {fontSize: 13},
  tagline: {fontSize: 22, fontWeight: '700', marginBottom: 28},
  premiumWarning: {color: '#F2A93B', marginBottom: 16, fontSize: 13},
  ctaSpacing: {marginBottom: 24},
  joinRow: {marginBottom: 12},
  input: {borderRadius: 8, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12},
  back: {width: 28, fontSize: 20},
  body: {paddingBottom: 40},
});
