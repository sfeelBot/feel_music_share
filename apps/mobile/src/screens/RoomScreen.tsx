import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import ParticipantsBottomSheet from '../components/ParticipantsBottomSheet';
import NowPlayingView from './room/NowPlayingView';
import YouTubeNowPlayingView from './room/YouTubeNowPlayingView';
import PlaylistView from './room/PlaylistView';
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
 */
type Props = NativeStackScreenProps<RootStackParamList, 'Room'>;
type Tab = 'nowPlaying' | 'playlist';

export default function RoomScreen(_props: Props) {
  const theme = useTheme();
  const {session, isHost, appointAdmin, revokeAdmin, myPlatform, currentParticipantId} = useSession();
  const [tab, setTab] = useState<Tab>('nowPlaying');
  const [participantsVisible, setParticipantsVisible] = useState(false);

  if (!session) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: theme.bg}]}>
        <Text style={{color: theme.text, padding: 24}}>세션 정보를 찾을 수 없어요.</Text>
      </SafeAreaView>
    );
  }

  const nowPlayingPlatform = session.service === 'mixed' ? myPlatform ?? 'spotify' : session.service;

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
        <PlaylistView />
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
  tabSwitcher: {flexDirection: 'row', marginHorizontal: 16, borderRadius: 999, padding: 4, marginBottom: 8},
  tabButton: {flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center'},
  tabButtonText: {fontSize: 13, fontWeight: '700'},
});
