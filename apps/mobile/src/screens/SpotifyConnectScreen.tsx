import React, {useEffect, useState} from 'react';
import {Linking, Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import {SpotifyButton, SecondaryButton} from '../components/Buttons';
import {useAuth} from '../services/auth/AuthContext';
import {useTheme} from '../theme/ThemeContext';
import {brandColors} from '../theme/tokens';

/**
 * Spotify 연동 안내 + OAuth 로그인 (US-101, US-102, 00-ux-flow.md 2.3절).
 * 로그인은 react-native-app-auth의 authorize()로 시스템 브라우저/공식 OAuth 플로우를 거친다
 * (임베드 웹뷰 아님 — docs/specs/02-spotify-integration.md 참고).
 *
 * "Premium이 없으신가요?" 링크(하단)는 00-ux-flow.md 2.4의 "차단" 레이아웃을 그대로 새 화면으로
 * 옮기지 않는다 — docs/specs/04-playlist.md "Free 계정(무료 등급) 처리" 절이 2026-07-24 "해석
 * A"(참여 자체는 항상 허용, 동기화 재생 제어만 제한)로 확정되면서 2.4가 전제한 "차단할지 미확정"
 * 상태가 해소됐기 때문이다. 대신 가벼운 안내 모달로 이 사실을 알리고, 그대로 기존 login()을
 * 이어서 호출할 수 있게 한다 — 새 네비게이션 라우트/화면을 만들지 않는 최소 변경.
 */
type Props = NativeStackScreenProps<RootStackParamList, 'SpotifyConnect'>;

const SPOTIFY_PREMIUM_URL = 'https://www.spotify.com/premium/';

export default function SpotifyConnectScreen({navigation}: Props) {
  const theme = useTheme();
  const {status, error, login, loginAsDemo} = useAuth();
  const [freeInfoVisible, setFreeInfoVisible] = useState(false);

  useEffect(() => {
    if (status === 'signed_in') {
      navigation.replace('Home');
    }
  }, [status, navigation]);

  const handleContinueLogin = () => {
    setFreeInfoVisible(false);
    login();
  };

  const handleOpenPremiumPage = () => {
    Linking.openURL(SPOTIFY_PREMIUM_URL).catch(() => {
      // 외부 브라우저를 열 수 없어도 모달은 계속 사용 가능하게 둔다 (무시).
    });
  };

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
        <TouchableOpacity accessibilityRole="link" onPress={() => setFreeInfoVisible(true)}>
          <Text style={[styles.link, {color: theme.textSecondary}]}>Premium이 없으신가요? →</Text>
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {__DEV__ && (
          <View style={styles.devSection}>
            <Text style={styles.devLabel}>⚠ 개발자 전용 (릴리즈 빌드에서 제외됨)</Text>
            <TouchableOpacity accessibilityRole="button" onPress={loginAsDemo}>
              <Text style={styles.devLink}>데모로 둘러보기 (로그인 건너뛰기)</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal
        visible={freeInfoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFreeInfoVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, {backgroundColor: theme.bgElevated}]}>
            <Text style={[styles.modalTitle, {color: theme.text}]}>Free 계정이어도 괜찮아요</Text>
            <Text style={[styles.modalBody, {color: theme.textSecondary}]}>
              Free(무료) 계정으로도 로그인하고 세션에 참여해서 플레이리스트에 곡을 추가·삭제·순서변경할
              수 있어요. 다만 곡 재생(동기화 재생)에는 참여할 수 없어요 — 이 기능은 Spotify Premium
              계정에서만 가능해요.
            </Text>
            <SpotifyButton
              label="로그인 계속하기"
              onPress={handleContinueLogin}
              style={styles.modalPrimaryButton}
            />
            <SecondaryButton
              label="Spotify Premium 알아보기"
              onPress={handleOpenPremiumPage}
              style={styles.modalSecondaryButton}
            />
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setFreeInfoVisible(false)}
              style={styles.modalCloseButton}>
              <Text style={[styles.modalCloseText, {color: theme.textSecondary}]}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  devSection: {
    marginTop: 36,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.3)',
    alignItems: 'center',
  },
  devLabel: {fontSize: 11, fontWeight: '600', color: '#E4573D', marginBottom: 6},
  devLink: {fontSize: 12, fontWeight: '500', color: '#888888', textDecorationLine: 'underline'},
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center'},
  modalBody: {fontSize: 14, lineHeight: 20, marginBottom: 20, textAlign: 'center'},
  modalPrimaryButton: {marginBottom: 10},
  modalSecondaryButton: {marginBottom: 4},
  modalCloseButton: {alignSelf: 'center', marginTop: 12, padding: 4},
  modalCloseText: {fontSize: 13, fontWeight: '600'},
});
