import React, {useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import PickerBadge from '../../components/PickerBadge';
import AddTrackModal from '../../components/AddTrackModal';
import {useAuth} from '../../services/auth/AuthContext';
import {useSession} from '../../state/SessionContext';
import {useTheme} from '../../theme/ThemeContext';
import {brandColors, pickerColors} from '../../theme/tokens';
import type {PlaylistEntry} from '../../types/domain';

/**
 * 플레이리스트 탭 (00-ux-flow.md 2.10b절).
 *
 * 순서 변경(드래그앤드롭, US-303)은 드래그 핸들(⠿)만 시각적으로 배치하고 실제 동작은 이번
 * 라운드에서 구현하지 않았다 — 제스처/드래그 라이브러리가 아직 설치돼 있지 않다.
 * TODO(다음 단계): react-native-gesture-handler + reanimated 기반 드래그 정렬 도입 + Firebase
 * reorderPlaylist 이벤트 연동.
 */
export default function PlaylistView() {
  const theme = useTheme();
  const {profile, tokens} = useAuth();
  const {session, removeTrack, addTrack} = useSession();
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);

  if (!session) {
    return null;
  }

  const currentEntry = session.playlist.find(e => e.entryId === session.playback.currentEntryId);
  const pending = session.playlist.filter(e => e.playedStatus !== 'played' && e.entryId !== currentEntry?.entryId);
  const played = session.playlist.filter(e => e.playedStatus === 'played');
  const ringColorByParticipant = new Map(session.participants.map(p => [p.participantId, p.ringColor]));

  const confirmDelete = (entry: PlaylistEntry) => {
    Alert.alert('곡 삭제', `"${entry.track.title}"을(를) 플레이리스트에서 삭제할까요?`, [
      {text: '취소', style: 'cancel'},
      {text: '삭제', style: 'destructive', onPress: () => removeTrack(entry.entryId)},
    ]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.serviceChip} accessibilityRole="button">
        <Text style={[styles.serviceChipText, {color: brandColors.spotifyGreen}]}>🟢 Spotify 플레이리스트 ▸</Text>
      </TouchableOpacity>

      {currentEntry && (
        <View style={[styles.miniPlayer, {backgroundColor: theme.cardBg, borderColor: theme.border}]}>
          <View style={[styles.miniPlayerArt, {backgroundColor: theme.bgElevated}]} />
          <Text style={[styles.miniPlayerTitle, {color: theme.text}]} numberOfLines={1}>
            {currentEntry.track.title} — {currentEntry.track.artist}
          </Text>
          <Text style={styles.miniPlayerToggle}>{session.playback.isPlaying ? '⏸' : '▶'}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollBody}>
        <Text style={[styles.sectionTitle, {color: theme.text}]}>다음 곡들</Text>

        {currentEntry && (
          <TrackRow
            entry={currentEntry}
            isPlaying
            viewerParticipantId={profile?.id}
            ringColor={ringColorByParticipant.get(currentEntry.addedByParticipantId) ?? pickerColors.coral}
            onDelete={confirmDelete}
          />
        )}
        {pending.map(entry => (
          <TrackRow
            key={entry.entryId}
            entry={entry}
            viewerParticipantId={profile?.id}
            ringColor={ringColorByParticipant.get(entry.addedByParticipantId) ?? pickerColors.coral}
            onDelete={confirmDelete}
          />
        ))}

        {played.length > 0 && (
          <TouchableOpacity
            style={[styles.historyToggle, {borderColor: theme.border}]}
            onPress={() => setHistoryExpanded(prev => !prev)}>
            <Text style={[styles.historyToggleText, {color: theme.textSecondary}]}>재생 완료 ({played.length}곡)</Text>
            <Text style={{color: theme.textSecondary}}>{historyExpanded ? '▴' : '▾'}</Text>
          </TouchableOpacity>
        )}
        {historyExpanded &&
          played.map(entry => (
            <TrackRow
              key={entry.entryId}
              entry={entry}
              readOnly
              viewerParticipantId={profile?.id}
              ringColor={ringColorByParticipant.get(entry.addedByParticipantId) ?? pickerColors.coral}
              onDelete={confirmDelete}
            />
          ))}

        <TouchableOpacity
          style={[styles.addButton, {backgroundColor: theme.cardBg, borderColor: theme.border}]}
          onPress={() => setAddModalVisible(true)}>
          <Text style={[styles.addButtonText, {color: theme.text}]}>+ 곡 추가</Text>
        </TouchableOpacity>
      </ScrollView>

      <AddTrackModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        accessToken={tokens?.accessToken ?? null}
        onSelectTrack={track => {
          addTrack(track);
          setAddModalVisible(false);
        }}
      />
    </View>
  );
}

function TrackRow({
  entry,
  isPlaying,
  readOnly,
  viewerParticipantId,
  ringColor,
  onDelete,
}: {
  entry: PlaylistEntry;
  isPlaying?: boolean;
  readOnly?: boolean;
  viewerParticipantId?: string;
  ringColor: string;
  onDelete: (entry: PlaylistEntry) => void;
}) {
  const theme = useTheme();
  const isMe = entry.addedByParticipantId === viewerParticipantId;

  return (
    <TouchableOpacity
      style={[styles.trackRow, {borderBottomColor: theme.border}]}
      onLongPress={() => !readOnly && onDelete(entry)}
      delayLongPress={350}
      accessibilityHint={readOnly ? undefined : '길게 누르면 삭제할 수 있어요'}>
      {isPlaying ? (
        <Text style={styles.playingGlyph}>▶</Text>
      ) : readOnly ? (
        <View style={styles.handlePlaceholder} />
      ) : (
        <Text style={[styles.handleGlyph, {color: theme.textSecondary}]}>⠿</Text>
      )}
      <View style={styles.trackInfo}>
        <Text style={[styles.trackTitle, {color: theme.text}]} numberOfLines={1}>
          {entry.track.title}
        </Text>
        <Text style={[styles.trackArtist, {color: theme.textSecondary}]} numberOfLines={1}>
          {entry.track.artist}
        </Text>
        <PickerBadge displayName={entry.addedByDisplayName} ringColor={ringColor} isMe={isMe} variant="inline" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, paddingHorizontal: 16, paddingTop: 12},
  scrollBody: {paddingBottom: 24},
  serviceChip: {marginBottom: 10},
  serviceChipText: {fontSize: 13, fontWeight: '700'},
  miniPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    gap: 8,
  },
  miniPlayerArt: {width: 32, height: 32, borderRadius: 6},
  miniPlayerTitle: {flex: 1, fontSize: 13, fontWeight: '600'},
  miniPlayerToggle: {fontSize: 16},
  sectionTitle: {fontSize: 15, fontWeight: '700', marginBottom: 8},
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  playingGlyph: {fontSize: 14, width: 16, color: '#3FB68B'},
  handleGlyph: {fontSize: 16, width: 16, textAlign: 'center'},
  handlePlaceholder: {width: 16},
  trackInfo: {flex: 1},
  trackTitle: {fontSize: 14, fontWeight: '600'},
  trackArtist: {fontSize: 12, marginTop: 1},
  historyToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    marginTop: 8,
  },
  historyToggleText: {fontSize: 13, fontWeight: '600'},
  addButton: {marginTop: 20, marginBottom: 24, borderWidth: 1, borderRadius: 999, paddingVertical: 14, alignItems: 'center'},
  addButtonText: {fontSize: 15, fontWeight: '700'},
});
