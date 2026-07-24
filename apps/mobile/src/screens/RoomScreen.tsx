import React, {useState} from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import {useSession} from '../state/SessionContext';
import {useAuth} from '../services/auth/AuthContext';
import {addTrack, removeTrack, searchSpotifyTracks} from '../services/api/playlistApi';
import type {Track} from '../types/domain';

/**
 * 방(세션) 화면 — 협업 플레이리스트(에픽3) + 재생 동기화 상태(에픽4)의 최소 골격.
 * 순서 변경(드래그앤드롭, US-303)은 이 스캐폴딩 단계에서는 구현하지 않고 목록/추가/삭제/재생 제어까지만 다룬다.
 * TODO(다음 단계): 드래그 정렬 UI 라이브러리 도입 + reorderPlaylist API 연결.
 */
type Props = NativeStackScreenProps<RootStackParamList, 'Room'>;

export default function RoomScreen({route}: Props) {
  const {sessionId} = route.params;
  const {tokens} = useAuth();
  const {
    playback,
    playlist,
    participants,
    syncStatus,
    requestPlay,
    requestPause,
    requestNextTrack,
  } = useSession();

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);

  const accessToken = tokens?.accessToken ?? '';

  const handleSearch = async () => {
    if (!query.trim()) {
      return;
    }
    const results = await searchSpotifyTracks(sessionId, query.trim(), accessToken);
    setSearchResults(results);
  };

  const handleAdd = async (track: Track) => {
    await addTrack(sessionId, track, accessToken);
    setSearchResults([]);
    setQuery('');
  };

  const handleRemove = async (entryId: string) => {
    await removeTrack(sessionId, entryId, accessToken);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.syncBar}>
        <Text style={styles.syncText}>
          동기화 상태: {syncStatusLabel(syncStatus.state)}
          {syncStatus.driftMs > 0 ? ` (오차 ${syncStatus.driftMs}ms)` : ''}
        </Text>
      </View>

      <View style={styles.playbackControls}>
        <TouchableOpacity onPress={requestPlay} style={styles.controlButton}>
          <Text style={styles.controlButtonText}>재생</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={requestPause} style={styles.controlButton}>
          <Text style={styles.controlButtonText}>일시정지</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={requestNextTrack} style={styles.controlButton}>
          <Text style={styles.controlButtonText}>다음 곡</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>
        현재 재생 중: {playback?.currentEntryId ?? '없음'} ({playback?.isPlaying ? '재생 중' : '정지'})
      </Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="곡 검색"
          placeholderTextColor="#777"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          <Text style={styles.controlButtonText}>검색</Text>
        </TouchableOpacity>
      </View>

      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={item => item.serviceTrackId}
          style={styles.searchResults}
          renderItem={({item}) => (
            <TouchableOpacity style={styles.trackRow} onPress={() => handleAdd(item)}>
              <Text style={styles.trackTitle}>{item.title}</Text>
              <Text style={styles.trackArtist}>{item.artist}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Text style={styles.sectionTitle}>플레이리스트</Text>
      <FlatList
        data={playlist}
        keyExtractor={item => item.entryId}
        renderItem={({item}) => (
          <View style={styles.playlistRow}>
            <View style={styles.playlistRowInfo}>
              <Text style={styles.trackTitle}>{item.track.title}</Text>
              <Text style={styles.trackArtist}>
                {item.track.artist} · 추가: {item.addedByDisplayName}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleRemove(item.entryId)}>
              <Text style={styles.removeLabel}>삭제</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Text style={styles.sectionTitle}>참여자 ({participants.length})</Text>
      <FlatList
        horizontal
        data={participants}
        keyExtractor={item => item.participantId}
        renderItem={({item}) => (
          <View style={styles.participantChip}>
            <Text style={styles.participantName}>
              {item.displayName}
              {item.isHost ? ' (방장)' : ''}
            </Text>
            <Text style={styles.participantStatus}>{item.connectionStatus}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function syncStatusLabel(state: 'synced' | 'drifted' | 'resyncing'): string {
  switch (state) {
    case 'synced':
      return '정상';
    case 'drifted':
      return '약간 지연';
    case 'resyncing':
      return '재동기화 중';
    default:
      return state;
  }
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0F0F14', padding: 16},
  syncBar: {marginBottom: 8},
  syncText: {color: '#B3B3B3', fontSize: 12},
  playbackControls: {flexDirection: 'row', marginBottom: 12},
  controlButton: {
    backgroundColor: '#1A1A22',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  controlButtonText: {color: '#FFFFFF', fontWeight: '600'},
  sectionTitle: {color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 8},
  searchRow: {flexDirection: 'row'},
  input: {
    flex: 1,
    backgroundColor: '#1A1A22',
    color: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchButton: {backgroundColor: '#1A1A22', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8},
  searchResults: {maxHeight: 160, marginTop: 8},
  trackRow: {paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2A2A33'},
  trackTitle: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
  trackArtist: {color: '#9A9AA5', fontSize: 12},
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A2A33',
  },
  playlistRowInfo: {flex: 1},
  removeLabel: {color: '#FF6B6B', marginLeft: 12},
  participantChip: {
    backgroundColor: '#1A1A22',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  participantName: {color: '#FFFFFF', fontSize: 12, fontWeight: '600'},
  participantStatus: {color: '#7A7A85', fontSize: 10},
});
