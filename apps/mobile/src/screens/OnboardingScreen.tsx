import React from 'react';
import {SafeAreaView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import {useAuth} from '../services/auth/AuthContext';

/**
 * 최초 실행 온보딩 (US-601, US-406).
 * - Spotify 계정 연동 안내
 * - "우리 서버가 오디오를 대신 재생하는 게 아니라, 각자 기기의 Spotify 앱이 실제로 재생하고
 *   우리는 그 재생을 맞춰주는 역할"이라는 기대치 설정 문구를 명시 (US-406, 리뷰/신뢰 리스크 방지).
 */
type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen({navigation}: Props) {
  const {status, error, login} = useAuth();

  React.useEffect(() => {
    if (status === 'signed_in') {
      navigation.replace('Home');
    }
  }, [status, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Feel Music Share</Text>
        <Text style={styles.subtitle}>
          멀리 있어도 같은 순간, 같은 음악을 함께 들어요.
        </Text>

        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            이 앱은 여러분의 Spotify 앱에서 실제로 음악을 재생하고, 우리는 재생 시점을
            맞춰주는 역할만 해요. 참여자 전원이 Spotify Premium 계정과 Spotify 앱 설치가
            필요합니다.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={login}
          disabled={status === 'signing_in'}
          accessibilityRole="button">
          <Text style={styles.loginButtonText}>
            {status === 'signing_in' ? '연동 중...' : 'Spotify로 계속하기'}
          </Text>
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0F0F14'},
  content: {flex: 1, justifyContent: 'center', paddingHorizontal: 24},
  title: {fontSize: 32, fontWeight: '700', color: '#FFFFFF', textAlign: 'center'},
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    color: '#B3B3B3',
    textAlign: 'center',
  },
  noticeBox: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1A1A22',
  },
  noticeText: {color: '#D0D0D8', fontSize: 13, lineHeight: 19},
  loginButton: {
    marginTop: 32,
    backgroundColor: '#1DB954',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  loginButtonText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
  errorText: {marginTop: 16, color: '#FF6B6B', textAlign: 'center'},
});
