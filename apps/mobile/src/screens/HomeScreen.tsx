import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import {PrimaryButton, SecondaryButton} from '../components/Buttons';
import {useAuth} from '../services/auth/AuthContext';
import {useTheme} from '../theme/ThemeContext';

/** 홈 (00-ux-flow.md 2.5절) — 세션 생성/참여 진입점. */
type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({navigation}: Props) {
  const theme = useTheme();
  const {profile, logout} = useAuth();
  const [inviteCode, setInviteCode] = useState('');

  const handleJoinByCode = () => {
    // TODO(Firebase 연동): 실제 세션 조회/참여는 Firestore/RTDB 연동 이후에 동작한다.
    // 이번 라운드는 로컬 목업 세션(services/session/sessionService.ts)만 있어 다른 기기의
    // 초대 코드로 실제 참여할 방법이 없다 — 안내만 노출한다.
    Alert.alert('준비 중', '세션 참여 기능은 Firebase 연동 이후 지원될 예정이에요.');
  };

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
      <SecondaryButton label="# 코드로 참여하기" onPress={handleJoinByCode} />
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
});
