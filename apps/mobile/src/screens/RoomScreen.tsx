import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import ParticipantsBottomSheet from '../components/ParticipantsBottomSheet';
import ReconnectingOverlay from '../components/ReconnectingOverlay';
import NowPlayingView from './room/NowPlayingView';
import YouTubeNowPlayingView from './room/YouTubeNowPlayingView';
import PlaylistView from './room/PlaylistView';
import SessionSettingsView from './room/SessionSettingsView';
import {useSession} from '../state/SessionContext';
import {useTheme} from '../theme/ThemeContext';
import {brand} from '../theme/tokens';

/**
 * 세션 메인 화면 컨테이너 (00-ux-flow.md 2.10절) — Now Playing / 플레이리스트 두 탭을
 * 커스텀 세그먼트 컨트롤로 전환한다(react-navigation의 탭 네비게이터 대신 목업과 동일한
 * tab-switcher 컴포넌트를 그대로 구현 — 별도 탭 네비게이션 패키지를 추가하지 않기 위함).
 *
 * Now Playing 탭은 어느 레이아웃(2.10a Spotify vs 2.10c YouTube)을 쓸지로 갈린다. Spotify/YouTube
 * 전용 세션은 `session.service`로 바로 판정하고, 혼합 세션(2.10d, 2026-07-26 구현)은 "나"의 개인
 * 참여 플랫폼(myPlatform, 2.6c에서 선택)으로 판정한다 — 09문서 "결정 3"대로 혼합 세션은 세션
 * 전체가 아니라 참여자 개인 단위로 플랫폼이 갈리기 때문이다. 두 컴포넌트(NowPlayingView/
 * YouTubeNowPlayingView) 자체가 내부적으로 session.service==='mixed'를 인지해 mixedPlaylist
 * 기반으로 동작한다. 플레이리스트 탭은 세 세션 유형이 구조를 공유하므로 `PlaylistView` 하나를
 * 그대로 재사용한다(내부에서 mixed 분기).
 *
 * 세션 설정(00-ux-flow.md 2.13) 진입점 판단(2026-07-27, 근거를 implementation-log.md에도 남김):
 * 헤더에 "⋮" 아이콘 하나만 있고, 00-ux-flow.md 플로우차트도 세션 메인에서 "참여자 목록"과
 * "세션 설정"을 별개 도착지로 그리되 어느 진입점 UI로 갈리는지는 명시하지 않았다(72/91행). 헤더에
 * 아이콘을 하나 더 추가하는 대신, 이미 "⋮" 메뉴의 실질적인 세션 정보 허브 역할을 해온
 * `ParticipantsBottomSheet` 하단에 "세션 설정" 링크를 추가하는 쪽을 택했다 — (1) 헤더 아이콘이
 * 늘어나 목업에 없는 새 UI 요소를 만들지 않아도 되고, (2) 참여자 시트를 열었다가 "아 설정을 보고
 * 싶었지"라고 바뀌는 자연스러운 탐색 경로를 제공하며, (3) 이전 라운드가 참여자 시트를 "⋮ 메뉴의
 * 실질적인 세션 정보 진입점"으로 이미 취급해온 관례와 일관되기 때문이다.
 *
 * 예외/엣지 상태(00-ux-flow.md 2.14, 2026-07-26 추가) 배선:
 * - 재접속 중 오버레이(US-206) → `ReconnectingOverlay`. "내 참여자 레코드의
 *   connectionStatus==='reconnecting'"이라는 정직한 조건으로 연결했지만, 그 값을 실제로 바꾸는
 *   네트워크 감지 로직은 아직 없다(컴포넌트 자체 주석의 TODO 참고) — 지금 목업 데이터에서는 항상
 *   'connected'라 실제로 뜨지 않는다.
 * - 호스트 마이그레이션 토스트(US-204) → 기존 세션 설정 전환 완료 토스트와 같은 인프라
 *   (`toastMessage`/`showToast`)를 재사용한다. `session.hostParticipantId`가 실제로 바뀌는 순간을
 *   감지해 토스트를 띄우는 로직 자체는 진짜로 동작하지만(가짜 트리거 아님), 지금 코드베이스
 *   어디에도 hostParticipantId를 바꾸는 액션이 없어(방장 이탈 감지는 Firebase Presence 연동 이후
 *   과제) 실제로는 발동하지 않는다 — 발동 조건만 정직하게 준비해둔 상태.
 */
type Props = NativeStackScreenProps<RootStackParamList, 'Room'>;
type Tab = 'nowPlaying' | 'playlist';

const TOAST_DISPLAY_MS = 3200;

export default function RoomScreen({navigation}: Props) {
  const theme = useTheme();
  const {
    session,
    isHost,
    appointAdmin,
    revokeAdmin,
    requestServiceSwitch,
    resignAdmin,
    myPlatform,
    currentParticipantId,
    leaveSession,
  } = useSession();
  const [tab, setTab] = useState<Tab>('nowPlaying');
  const [participantsVisible, setParticipantsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevHostIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => setToastMessage(null), TOAST_DISPLAY_MS);
  }, []);

  // 호스트 마이그레이션 토스트(US-204) — 실제로 hostParticipantId가 바뀌는 순간에만 반응한다.
  // 위 컴포넌트 주석 참고: 지금은 그 값을 바꾸는 액션 자체가 없어 실질적으로 발동하지 않는다.
  useEffect(() => {
    if (!session) {
      prevHostIdRef.current = null;
      return;
    }
    const prevHostId = prevHostIdRef.current;
    prevHostIdRef.current = session.hostParticipantId;
    if (prevHostId && prevHostId !== session.hostParticipantId) {
      const newHost = session.participants.find(p => p.participantId === session.hostParticipantId);
      if (newHost) {
        showToast(`호스트가 자리를 비웠어요. ${newHost.displayName}님이 새 호스트가 되었어요.`);
      }
    }
  }, [session, showToast]);

  const handleLeaveSession = useCallback(() => {
    leaveSession();
    navigation.navigate('Home');
  }, [leaveSession, navigation]);

  if (!session) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: theme.bg}]}>
        <Text style={{color: theme.text, padding: 24}}>세션 정보를 찾을 수 없어요.</Text>
      </SafeAreaView>
    );
  }

  const nowPlayingPlatform = session.service === 'mixed' ? myPlatform ?? 'spotify' : session.service;
  const viewerRole = session.participants.find(p => p.participantId === currentParticipantId)?.role ?? 'regular';
  const myConnectionStatus =
    session.participants.find(p => p.participantId === currentParticipantId)?.connectionStatus ?? 'connected';

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.bg}]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, {color: theme.text}]} numberOfLines={1}>
          {session.sessionName} ▾
        </Text>
        <TouchableOpacity onPress={() => setParticipantsVisible(true)} accessibilityLabel="참여자/세션 메뉴 열기">
          <Text style={[styles.headerMenu, {color: theme.text}]}>⋮</Text>
        </TouchableOpacity>
      </View>

      {toastMessage && (
        <View style={[styles.toast, {backgroundColor: theme.bgElevated, borderColor: theme.border}]}>
          <Text style={[styles.toastText, {color: theme.text}]}>{toastMessage}</Text>
        </View>
      )}

      <View style={[styles.tabSwitcher, {backgroundColor: theme.cardBg}]}>
        <TabButton label="Now Playing" active={tab === 'nowPlaying'} onPress={() => setTab('nowPlaying')} />
        <TabButton label="플레이리스트" active={tab === 'playlist'} onPress={() => setTab('playlist')} />
      </View>

      {tab === 'nowPlaying' ? (
        nowPlayingPlatform === 'youtube' ? (
          <YouTubeNowPlayingView onOpenParticipants={() => setParticipantsVisible(true)} />
        ) : (
          <NowPlayingView onOpenParticipants={() => setParticipantsVisible(true)} />
        )
      ) : (
        <PlaylistView onOpenSettings={() => setSettingsVisible(true)} />
      )}

      <ParticipantsBottomSheet
        visible={participantsVisible}
        onClose={() => setParticipantsVisible(false)}
        session={session}
        participants={session.participants}
        viewerIsHost={isHost}
        viewerParticipantId={currentParticipantId}
        onAppointAdmin={appointAdmin}
        onRevokeAdmin={revokeAdmin}
        onOpenSettings={() => {
          setParticipantsVisible(false);
          setSettingsVisible(true);
        }}
      />

      <SessionSettingsView
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        session={session}
        viewerRole={viewerRole}
        myPlatform={myPlatform}
        onRequestServiceSwitch={requestServiceSwitch}
        onResignAdmin={resignAdmin}
        onSwitchComplete={showToast}
      />

      <ReconnectingOverlay
        visible={myConnectionStatus === 'reconnecting'}
        onLeaveSession={handleLeaveSession}
      />
    </SafeAreaView>
  );
}

function TabButton({label, active, onPress}: {label: string; active: boolean; onPress: () => void}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && {backgroundColor: theme.bgElevated}]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{selected: active}}>
      <Text style={[styles.tabButtonText, {color: active ? brand.primary : theme.textSecondary}]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {fontSize: 16, fontWeight: '700', flex: 1},
  headerMenu: {fontSize: 20, paddingHorizontal: 8},
  toast: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toastText: {fontSize: 12.5, fontWeight: '600', lineHeight: 18},
  tabSwitcher: {flexDirection: 'row', marginHorizontal: 16, borderRadius: 999, padding: 4, marginBottom: 8},
  tabButton: {flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center'},
  tabButtonText: {fontSize: 13, fontWeight: '700'},
});
