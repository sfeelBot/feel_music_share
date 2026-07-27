import React, {useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import BackButton from '../components/BackButton';
import {PrimaryButton, SecondaryButton} from '../components/Buttons';
import PlatformSelect from '../components/PlatformSelect';
import {useAuth} from '../services/auth/AuthContext';
import {useFirebaseAuth} from '../state/FirebaseAuthContext';
import {useSession} from '../state/SessionContext';
import {useTheme} from '../theme/ThemeContext';
import type {MixedParticipantPlatform} from '../types/domain';

/**
 * 홈 (00-ux-flow.md 2.5절) — 세션 생성/참여 진입점.
 *
 * (2026-07-26 구현) "코드로 참여하기"를 실제 로직으로 연결했다 — sessionService.joinSessionByCode
 * (SessionContext.tsx의 joinSession 액션 경유)로 초대 코드를 조회해 참여자를 추가한다.
 *
 * (2026-07-27 RTDB 1라운드) 세션이 이제 실제 RTDB에 저장되므로, 다른 기기가 만든 세션도 초대
 * 코드로 참여할 수 있다(단, 이 라운드 자체는 RTDB 보안 규칙이 아직 배포 전이라 실제 read/write는
 * 거부된다 — 코드 경로만 올바르게 준비된 상태, 회귀 아님). `participantId`는 Spotify 프로필의
 * `profile.id` 대신 Firebase Auth 익명 인증 `uid`를 쓴다(CreateSessionScreen.tsx와 동일 근거).
 */
type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({navigation}: Props) {
  const theme = useTheme();
  const {profile, logout} = useAuth();
  const {uid: firebaseUid} = useFirebaseAuth();
  const {joinSession} = useSession();
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  // 혼합 세션에 참여하려는 경우에만 쓰는 2단계 흐름 — CreateSessionScreen.tsx의 호스트 쪽
  // 'form' → 'platform' 전환과 동일한 패턴(00-ux-flow.md 2.6c 개념을 참여자 쪽에도 그대로 적용,
  // Round 7 검증 R7.31 갭 해소). Spotify/YouTube 전용 세션 참여는 이 단계 자체를 거치지 않는다.
  const [step, setStep] = useState<'code' | 'platform'>('code');
  const [joiningPlatform, setJoiningPlatform] = useState<MixedParticipantPlatform>('youtube');

  const attemptJoin = async (platform?: MixedParticipantPlatform) => {
    if (!profile || !firebaseUid) {
      return;
    }
    const trimmedCode = inviteCode.trim();
    if (!trimmedCode) {
      Alert.alert('코드를 입력해주세요', '참여하려는 세션의 초대 코드를 입력해주세요.');
      return;
    }

    setIsJoining(true);
    try {
      const result = await joinSession({
        inviteCode: trimmedCode,
        joiningUser: {
          participantId: firebaseUid,
          displayName: profile.displayName,
          accountTier: profile.isPremium ? 'premium' : 'free',
        },
        platform,
      });

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
    } catch {
      Alert.alert('참여하지 못했어요', '세션에 참여하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinByCode = () => attemptJoin();

  if (step === 'platform') {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: theme.bg}]}>
        <View style={styles.header}>
          <BackButton onPress={() => setStep('code')} />
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
