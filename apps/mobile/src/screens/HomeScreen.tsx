import React, {useState} from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import {useAuth} from '../services/auth/AuthContext';
import {useSession} from '../state/SessionContext';
import {createSession, joinSession} from '../services/api/sessionApi';

/** 세션 생성/참여 (US-201, US-202). */
type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({navigation}: Props) {
  const {user, tokens, logout} = useAuth();
  const {joinSession: connectSession} = useSession();
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const accessToken = tokens?.accessToken ?? '';

  const handleCreate = async () => {
    if (!user) {
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const {session, participantId} = await createSession({
        hostDisplayName: user.displayName,
        accessToken,
      });
      connectSession(session.sessionId, participantId, user.displayName);
      navigation.navigate('Room', {sessionId: session.sessionId});
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '방 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !inviteCode.trim()) {
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const {session, participantId} = await joinSession({
        inviteCode: inviteCode.trim(),
        displayName: user.displayName,
        accessToken,
      });
      connectSession(session.sessionId, participantId, user.displayName);
      navigation.navigate('Room', {sessionId: session.sessionId});
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '방 참여에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>안녕하세요, {user?.displayName ?? ''}님</Text>
        {!user?.isPremium && (
          <Text style={styles.premiumWarning}>
            Spotify Premium 계정이 아니어서 재생 제어 기능이 제한될 수 있어요. (US-102)
          </Text>
        )}
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleCreate} disabled={isLoading}>
          <Text style={styles.primaryButtonText}>새 방 만들기</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TextInput
          style={styles.input}
          placeholder="초대 코드 입력"
          placeholderTextColor="#777"
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={handleJoin} disabled={isLoading}>
          <Text style={styles.secondaryButtonText}>방 참여하기</Text>
        </TouchableOpacity>
      </View>

      {isLoading && <ActivityIndicator style={styles.loader} color="#1DB954" />}
      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0F0F14', padding: 24},
  header: {marginBottom: 32},
  greeting: {color: '#FFFFFF', fontSize: 20, fontWeight: '600'},
  premiumWarning: {color: '#FFC857', marginTop: 8, fontSize: 13},
  logout: {color: '#7A7A85', marginTop: 12},
  section: {marginBottom: 20},
  primaryButton: {
    backgroundColor: '#1DB954',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButtonText: {color: '#FFFFFF', fontWeight: '600', fontSize: 16},
  input: {
    backgroundColor: '#1A1A22',
    color: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#1DB954',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  secondaryButtonText: {color: '#1DB954', fontWeight: '600', fontSize: 16},
  loader: {marginTop: 12},
  errorText: {color: '#FF6B6B', marginTop: 12, textAlign: 'center'},
});
