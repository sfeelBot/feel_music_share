import React, {useState} from 'react';
import {ActivityIndicator, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {searchSpotifyTracks, type SpotifySearchTrack} from '../services/spotify/spotifyWebApi';
import type {Track} from '../types/domain';

/**
 * 곡 검색 및 추가 바텀시트 (US-301, 00-ux-flow.md 2번 흐름 "곡 검색 및 추가 바텀시트").
 * 실제 Spotify Web API 검색(`GET /v1/search`)을 그대로 호출한다 — accessToken만 있으면 되므로
 * Firebase 연동 여부와 무관하게 이번 라운드에서 실제로 동작한다.
 */
interface AddTrackModalProps {
  visible: boolean;
  onClose: () => void;
  accessToken: string | null;
  onSelectTrack: (track: Track) => void;
}

export default function AddTrackModal({visible, onClose, accessToken, onSelectTrack}: AddTrackModalProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifySearchTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!accessToken) {
      setErrorMessage('로그인이 필요해요.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const items = await searchSpotifyTracks(query, accessToken);
      setResults(items);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '검색에 실패했어요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, {backgroundColor: theme.bg}]}>
        <View style={styles.header}>
          <Text style={[styles.title, {color: theme.text}]}>곡 추가</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="닫기">
            <Text style={[styles.closeText, {color: theme.textSecondary}]}>닫기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, {backgroundColor: theme.bgElevated, color: theme.text, borderColor: theme.border}]}
            placeholder="곡, 아티스트 검색"
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={[styles.searchButton, {backgroundColor: theme.cardBg}]} onPress={handleSearch}>
            <Text style={{color: theme.text, fontWeight: '700'}}>검색</Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator style={styles.loader} />}
        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        <FlatList
          data={results}
          keyExtractor={item => item.serviceTrackId}
          renderItem={({item}) => (
            <TouchableOpacity
              style={[styles.resultRow, {borderBottomColor: theme.border}]}
              onPress={() => onSelectTrack(item)}>
              <View style={{flex: 1}}>
                <Text style={[styles.resultTitle, {color: theme.text}]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.resultArtist, {color: theme.textSecondary}]} numberOfLines={1}>
                  {item.artist}
                </Text>
              </View>
              <Text style={{color: theme.textSecondary}}>+ 추가</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, paddingTop: 60, paddingHorizontal: 20},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16},
  title: {fontSize: 18, fontWeight: '700'},
  closeText: {fontSize: 14, fontWeight: '600'},
  searchRow: {flexDirection: 'row', gap: 8, marginBottom: 12},
  input: {flex: 1, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10},
  searchButton: {borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center'},
  loader: {marginVertical: 12},
  errorText: {color: '#E4573D', marginBottom: 12},
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultTitle: {fontSize: 14, fontWeight: '600'},
  resultArtist: {fontSize: 12, marginTop: 2},
});
