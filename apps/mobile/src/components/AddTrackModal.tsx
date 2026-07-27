import React, {useState} from 'react';
import {ActivityIndicator, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import BackButton from './BackButton';
import {useTheme} from '../theme/ThemeContext';
import {searchSpotifyTracks, type SpotifySearchTrack} from '../services/spotify/spotifyWebApi';
import {searchYoutubeTracks} from '../services/youtube/youtubeSearch';
import type {MusicService, Track} from '../types/domain';

/**
 * 곡 검색 및 추가 바텀시트 (US-301, 00-ux-flow.md 2번 흐름 "곡 검색 및 추가 바텀시트").
 * Spotify 세션은 실제 Spotify Web API 검색(`GET /v1/search`)을 그대로 호출한다 — accessToken만
 * 있으면 되므로 Firebase 연동 여부와 무관하게 실제로 동작한다.
 * YouTube 세션도 (2026-07-27부터) 실제 YouTube Data API v3 `search.list`/`videos.list` 호출로
 * 검색한다(`services/youtube/youtubeSearch.ts`) — accessToken 없이 API 키만으로 동작.
 *
 * 디바운스 관련 판단(2026-07-27): 두 서비스 모두 타이핑마다 자동 검색하는 구조가 아니라 검색
 * 버튼 클릭/키보드 "검색" 제출(`onSubmitEditing`)로만 `handleSearch`가 호출된다 — 이미 사용자
 * 액션 1회당 API 호출 1회로 제한돼 있어 디바운스를 추가할 필요가 없다(Spotify 쪽과 동일한 트리거
 * 방식을 그대로 따름 — 서비스별로 동작이 달라지면 UX 일관성이 깨진다는 판단).
 *
 * (2026-07-27, PB-06 — docs/design/06-ui-polish-audit.md) 닫기 UI를 우상단 "닫기" 텍스트 링크에서
 * 좌상단 "←" 아이콘(`BackButton` 공통 컴포넌트)으로 바꿨다 — 전체 화면 오버레이류(이 모달,
 * `SessionSettingsView`)는 "←", 부분 시트류(`ParticipantsBottomSheet` 등)는 하단 "닫기"/배경 탭으로
 * 통일하는 규칙을 세웠다(문서 PB-06 해결안). 헤더 레이아웃도 `SessionSettingsView`와 같은
 * "왼쪽 뒤로가기 + 가운데 제목 + 오른쪽 spacer" 패턴으로 맞췄다.
 */
interface AddTrackModalProps {
  visible: boolean;
  onClose: () => void;
  service: MusicService;
  accessToken: string | null;
  onSelectTrack: (track: Track) => void;
  /**
   * 헤더 타이틀 오버라이드 — 혼합 세션의 "직접 검색하기"(00-ux-flow.md 2.11/2.11d 재사용)처럼
   * 같은 검색 UI를 다른 문맥(곡 추가가 아니라 매칭 수동 교체)에서 재사용할 때 쓴다.
   */
  headerTitle?: string;
}

export default function AddTrackModal({
  visible,
  onClose,
  service,
  accessToken,
  onSelectTrack,
  headerTitle,
}: AddTrackModalProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifySearchTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSearch = async () => {
    if (service === 'spotify' && !accessToken) {
      setErrorMessage('로그인이 필요해요.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const items =
        service === 'youtube'
          ? await searchYoutubeTracks(query)
          : await searchSpotifyTracks(query, accessToken as string);
      setResults(items);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '검색에 실패했어요.');
    } finally {
      setLoading(false);
    }
  };

  const searchPlaceholder = service === 'youtube' ? '영상 제목, 채널 검색' : '곡, 아티스트 검색';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, {backgroundColor: theme.bg}]}>
        <View style={styles.header}>
          <BackButton onPress={onClose} accessibilityLabel="닫기" />
          <Text style={[styles.title, {color: theme.text}]}>
            {headerTitle ?? (service === 'youtube' ? '영상 추가' : '곡 추가')}
          </Text>
          <View style={styles.backSpacer} />
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, {backgroundColor: theme.bgElevated, color: theme.text, borderColor: theme.border}]}
            placeholder={searchPlaceholder}
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
  title: {flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center'},
  backSpacer: {width: 28},
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
