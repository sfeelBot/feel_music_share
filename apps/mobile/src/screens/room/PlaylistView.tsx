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
 * 플레이리스트 탭 (00-ux-flow.md 2.10b절). Spotify/YouTube 세션 공용 — 상단 서비스 칩만
 * `session.service`에 따라 달라진다(2.10b "서비스 칩 상시 노출" 정책).
 *
 * 순서 변경(US-303): react-native-draggable-flatlist 같은 드래그 라이브러리를 새로 설치하는 대신
 * (네이티브 의존성 추가 → Android/iOS 빌드 재검증까지 다시 필요해지는 부담을 피하기 위한 판단,
 * 04-playlist.md 110행 "드래그 앤 드롭 등"이 다른 방식도 허용함을 근거로 삼음) 각 행에 ▲/▼ 버튼을
 * 두어 순수 JS 상태 변경만으로 실제 순서를 바꾼다(SessionContext.requestMoveTrack). "다음 곡들"
 * 섹션(재생 완료/현재 재생 중이 아닌 곡)에서만 버튼이 보이고, 첫/마지막 곡은 해당 방향 버튼이
 * 비활성화된다. TODO(다음 단계): Firebase 연동 시 requestMoveTrack 내부만 Cloud Function 호출로
 * 교체하면 되도록 상태 갱신 로직을 SessionContext에 이미 분리해뒀다.
 */
export default function PlaylistView() {
  const theme = useTheme();
  const {profile, tokens} = useAuth();
  const {session, removeTrack, addTrack, requestMoveTrack} = useSession();
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

  const serviceChip =
    session.service === 'youtube'
      ? {label: '🔴 YouTube 플레이리스트 ▸', color: brandColors.youtubeRed}
      : {label: '🟢 Spotify 플레이리스트 ▸', color: brandColors.spotifyGreen};

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.serviceChip} accessibilityRole="button">
        <Text style={[styles.serviceChipText, {color: serviceChip.color}]}>{serviceChip.label}</Text>
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
        {pending.map((entry, index) => (
          <TrackRow
            key={entry.entryId}
            entry={entry}
            viewerParticipantId={profile?.id}
            ringColor={ringColorByParticipant.get(entry.addedByParticipantId) ?? pickerColors.coral}
            onDelete={confirmDelete}
            canMoveUp={index > 0}
            canMoveDown={index < pending.length - 1}
            onMoveUp={() => requestMoveTrack(entry.entryId, 'up')}
            onMoveDown={() => requestMoveTrack(entry.entryId, 'down')}
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
        service={session.service}
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
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  entry: PlaylistEntry;
  isPlaying?: boolean;
  readOnly?: boolean;
  viewerParticipantId?: string;
  ringColor: string;
  onDelete: (entry: PlaylistEntry) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const theme = useTheme();
  const isMe = entry.addedByParticipantId === viewerParticipantId;
  // "다음 곡들" 큐에 있는 항목만(재생 중/재생 완료 제외) 순서 변경 버튼을 보여준다.
  const canReorder = !isPlaying && !readOnly && (onMoveUp || onMoveDown);

  return (
    <TouchableOpacity
      style={[styles.trackRow, {borderBottomColor: theme.border}]}
      onLongPress={() => onDelete(entry)}
      delayLongPress={350}
      accessibilityHint="길게 누르면 삭제할 수 있어요">
      {isPlaying ? (
        <Text style={styles.playingGlyph}>▶</Text>
      ) : readOnly ? (
        <View style={styles.handlePlaceholder} />
      ) : canReorder ? (
        <View style={styles.reorderButtons}>
          <TouchableOpacity
            onPress={onMoveUp}
            disabled={!canMoveUp}
            accessibilityLabel={`${entry.track.title} 위로 이동`}
            accessibilityState={{disabled: !canMoveUp}}
            hitSlop={{top: 4, bottom: 4, left: 8, right: 8}}>
            <Text style={[styles.reorderGlyph, {color: theme.textSecondary, opacity: canMoveUp ? 1 : 0.3}]}>▲</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onMoveDown}
            disabled={!canMoveDown}
            accessibilityLabel={`${entry.track.title} 아래로 이동`}
            accessibilityState={{disabled: !canMoveDown}}
            hitSlop={{top: 4, bottom: 4, left: 8, right: 8}}>
            <Text style={[styles.reorderGlyph, {color: theme.textSecondary, opacity: canMoveDown ? 1 : 0.3}]}>▼</Text>
          </TouchableOpacity>
        </View>
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
  reorderButtons: {width: 16, alignItems: 'center', gap: 2},
  reorderGlyph: {fontSize: 11, lineHeight: 12},
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
