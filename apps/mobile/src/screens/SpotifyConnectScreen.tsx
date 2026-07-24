import React, {useEffect} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import {SpotifyButton} from '../components/Buttons';
import {useAuth} from '../services/auth/AuthContext';
import {useTheme} from '../theme/ThemeContext';
import {brandColors} from '../theme/tokens';

/**
 * Spotify 연동 안내 + OAuth 로그인 (US-101, US-102, 00-ux-flow.md 2.3절).
 * 로그인은 react-native-app-auth의 authorize()로 시스템 브라우저/공식 OAuth 플로우를 거친다
 * (임베드 웹뷰 아님 — docs/specs/02-spotify-integration.md 참고).
 */
type Props = NativeStackScreenProps<RootStackParamList, 'SpotifyConnect'>;

export default function SpotifyConnectScreen({navigation}: Props) {
  const theme = useTheme();
  const {status, error, login} = useAuth();

  useEffect(() => {
    if (status === 'signed_in') {
      navigation.replace('Home');
    }
  }, [status, navigation]);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.bg}]}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, {backgroundColor: brandColors.spotifyGreen}]}>
          <Text style={styles.iconGlyph}>♪</Text>
        </View>
        <Text style={[styles.title, {color: theme.text}]}>feel_music_share는 Spotify Premium 계정이 필요해요</Text>

        <View style={styles.bullets}>
          <Text style={[styles.bullet, {color: theme.textSecondary}]}>
            • 곡을 직접 골라 재생하려면 Premium이 필요합니다
          </Text>
          <Text style={[styles.bullet, {color: theme.textSecondary}]}>
            • 계정 정보는 로그인 시 안전하게 확인해요
          </Text>
        </View>

        <SpotifyButton
          label={status === 'signing_in' ? '연동 중...' : 'Spotify로 로그인'}
          onPress={login}
          loading={status === 'signing_in'}
          style={styles.loginButton}
        />
        <TouchableOpacity accessibilityRole="link">
          <Text style={[styles.link, {color: theme.textSecondary}]}>Premium이 없으신가요? →</Text>
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {flex: 1, justifyContent: 'center', paddingHorizontal: 28},
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconGlyph: {color: '#FFFFFF', fontSize: 30, fontWeight: '700'},
  title: {fontSize: 20, fontWeight: '700', textAlign: 'center', lineHeight: 27},
  bullets: {marginTop: 20, marginBottom: 28, gap: 8},
  bullet: {fontSize: 14, lineHeight: 20},
  loginButton: {marginBottom: 16},
  link: {textAlign: 'center', fontSize: 13, fontWeight: '600'},
  errorText: {marginTop: 16, color: '#E4573D', textAlign: 'center'},
});
