import React, {useEffect, useRef} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import {useAuth} from '../services/auth/AuthContext';
import {useTheme} from '../theme/ThemeContext';
import {brand} from '../theme/tokens';

/**
 * 스플래시 화면 (00-ux-flow.md 2.1절).
 *
 * "로고 + 앱 이름 + 한 줄 태그라인"만 짧게 보여주는 화면. 목적 문구는 "Spotify 연동 상태 확인 +
 * 세션 재접속 여부 체크하는 동안의 로딩 화면"이라 적혀 있지만, 실제로는 최소한의 자동 전환
 * 로직만 구현했다(판단 근거, implementation-log.md에도 동일하게 남김):
 *
 * `AuthContext`는 아직 토큰 영속화를 하지 않는다(AuthContext.tsx 상단 TODO — react-native-keychain
 * 등 도입은 다음 단계). 즉 앱을 재시작하면 `status`는 항상 'signed_out'으로 시작하고, 코드 수준에서
 * "이미 Spotify 연동을 마친 사용자"와 "온보딩을 한 번도 안 본 사용자"를 구분할 방법이 없다(세션
 * 재접속 여부도 SessionContext가 영속화하지 않으므로 마찬가지). 그래서 이 화면은:
 *   1) 최소 노출 시간(SPLASH_MIN_DISPLAY_MS) 동안 브랜드를 보여주고,
 *   2) 그 시점의 `status`만으로 분기한다 — 'signed_in'이면 Home, 그 외(사실상 항상 signed_out)면
 *      Onboarding.
 * "온보딩은 봤지만 아직 Spotify 연동 전"인 사용자를 위한 SpotifyConnect 직행 분기는 넣지 않았다 —
 * 그 상태를 구분할 영속 플래그 자체가 없어서 지금 만들면 항상 미도달 코드가 된다. Firebase/토큰
 * 영속화 연동 이후 실제로 판별 가능해지면 추가할 TODO로 남긴다.
 */
type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SPLASH_MIN_DISPLAY_MS = 900;

export default function SplashScreen({navigation}: Props) {
  const {status} = useAuth();
  const theme = useTheme();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      navigation.replace(status === 'signed_in' ? 'Home' : 'Onboarding');
    }, SPLASH_MIN_DISPLAY_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [navigation, status]);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.bg}]}>
      <View style={styles.center}>
        <View style={[styles.logoMark, {backgroundColor: brand.primary}]}>
          <Text style={styles.logoMarkText}>S</Text>
        </View>
        <Text style={[styles.appName, {color: theme.text}]}>Samewave</Text>
        <Text style={[styles.tagline, {color: theme.textSecondary}]}>장거리에서도, 같은 순간에</Text>
      </View>
      <ActivityIndicator style={styles.spinner} color={theme.textSecondary} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  center: {alignItems: 'center'},
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoMarkText: {color: '#FFFFFF', fontSize: 32, fontWeight: '800'},
  appName: {fontSize: 26, fontWeight: '800', letterSpacing: 0.3, marginBottom: 8},
  tagline: {fontSize: 14, fontWeight: '500'},
  spinner: {position: 'absolute', bottom: 56},
});
