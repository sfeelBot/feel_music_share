import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Avatar from '../../components/Avatar';
import PickerBadge from '../../components/PickerBadge';
import SyncStatusBadge from '../../components/SyncStatusBadge';
import {useAuth} from '../../services/auth/AuthContext';
import {useSession} from '../../state/SessionContext';
import {useTheme} from '../../theme/ThemeContext';
import {brand} from '../../theme/tokens';
import {formatDuration} from '../../utils/format';

/**
 * Now Playing 탭 (00-ux-flow.md 2.10a절 — Spotify 전용 세션).
 *
 * TODO(Firebase 연동): 재생 위치(progress)는 지금 session.playback.positionMs 스냅샷을 그대로
 * 보여줄 뿐, 05-sync-architecture.md가 요구하는 "서버 타임스탬프 + 클록 오프셋 기반 실시간 계산"은
 * 아직 연결하지 않았다(utils/clock.ts의 computeExpectedPositionMs 참고, 다음 라운드 작업).
 * TODO(Spotify App Remote 연동): 실제 재생/일시정지/다음곡 버튼은 지금 세션의 로컬 목업 상태만
 * 바꾼다 — 참여자 기기의 실제 Spotify 앱을 제어하려면 services/spotify/spotifyRemote.ts의 STUB을
 * 실제 App Remote SDK 구현체로 교체해야 한다.
 */
interface NowPlayingViewProps {
  onOpenParticipants?: () => void;
}

export default function NowPlayingView({onOpenParticipants}: NowPlayingViewProps) {
  const theme = useTheme();
  const {profile} = useAuth();
  const {session, syncStatus, requestPlay, requestPause, requestNextTrack, requestPrevTrack} = useSession();

  if (!session) {
    return null;
  }

  const currentEntry = session.playlist.find(e => e.entryId === session.playback.currentEntryId);
  const currentIndex = session.playlist.findIndex(e => e.entryId === session.playback.currentEntryId);
  const hasPrevTrack = currentIndex > 0;
  const picker = currentEntry
    ? session.participants.find(p => p.participantId === currentEntry.addedByParticipantId)
    : undefined;

  const playableCount = session.participants.filter(p => p.accountTier === 'premium').length;
  const suffix =
    playableCount === session.participants.length
      ? `${session.participants.length}명 함께 듣는 중`
      : `${session.participants.length}명 참여 중 (재생 ${playableCount}명)`;

  const viewerIsFree = profile ? !profile.isPremium : false;
  const progressRatio = currentEntry ? Math.min(1, session.playback.positionMs / currentEntry.track.durationMs) : 0;

  return (
    <View style={styles.container}>
      {viewerIsFree && session.service === 'spotify' && (
        <View style={[styles.freeBanner, {backgroundColor: theme.amberAlertBg}]}>
          <Text style={styles.freeBannerTitle}>⚠ Free 계정 안내</Text>
          <Text style={[styles.freeBannerBody, {color: theme.text}]}>
            Free 계정으로는 곡 재생(동기화 재생)에 참여할 수 없어요
          </Text>
          <TouchableOpacity>
            <Text style={styles.freeBannerLink}>Premium 알아보기 →</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.albumArt, {backgroundColor: theme.cardBg}]}>
        <Text style={styles.albumArtGlyph}>♪</Text>
      </View>

      <Text style={[styles.trackTitle, {color: theme.text}]}>{currentEntry?.track.title ?? '재생할 곡이 없어요'}</Text>
      <Text style={[styles.trackArtist, {color: theme.textSecondary}]}>{currentEntry?.track.artist ?? ''}</Text>

      {picker && (
        <PickerBadge
          displayName={picker.displayName}
          ringColor={picker.ringColor}
          isMe={picker.participantId === profile?.id}
        />
      )}

      <View style={styles.progress}>
        <View style={[styles.progressTrack, {backgroundColor: theme.trackBg}]}>
          <View style={[styles.progressFill, {width: `${progressRatio * 100}%`, backgroundColor: brand.primary}]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabel, {color: theme.textSecondary}]}>
            {formatDuration(session.playback.positionMs)}
          </Text>
          <Text style={[styles.progressLabel, {color: theme.textSecondary}]}>
            {formatDuration(currentEntry?.track.durationMs ?? 0)}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          accessibilityLabel="이전 곡"
          accessibilityState={{disabled: !hasPrevTrack}}
          disabled={!hasPrevTrack}
          style={[styles.controlBtn, {backgroundColor: theme.cardBg, opacity: hasPrevTrack ? 1 : 0.4}]}
          onPress={requestPrevTrack}>
          <Text style={[styles.controlGlyph, {color: theme.text}]}>⏮</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel={session.playback.isPlaying ? '일시정지' : '재생'}
          style={[styles.controlBtn, styles.controlBtnMain, {backgroundColor: brand.primary}]}
          onPress={session.playback.isPlaying ? requestPause : requestPlay}>
          <Text style={styles.controlGlyphMain}>{session.playback.isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel="다음 곡"
          style={[styles.controlBtn, {backgroundColor: theme.cardBg}]}
          onPress={requestNextTrack}>
          <Text style={[styles.controlGlyph, {color: theme.text}]}>⏭</Text>
        </TouchableOpacity>
      </View>

      <SyncStatusBadge status={syncStatus} suffix={suffix} />

      <TouchableOpacity
        style={styles.avatarStack}
        onPress={onOpenParticipants}
        accessibilityLabel="참여자 목록 보기"
        disabled={!onOpenParticipants}>
        {session.participants.map((p, index) => (
          <View key={p.participantId} style={index > 0 ? styles.avatarOverlap : undefined}>
            <Avatar initial={p.displayName.slice(0, 1)} ringColor={p.ringColor} size="sm" crown={p.role === 'host'} />
          </View>
        ))}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 20},
  freeBanner: {width: '100%', borderRadius: 12, padding: 14, marginBottom: 16},
  freeBannerTitle: {fontSize: 13, fontWeight: '700', color: '#F2A93B', marginBottom: 4},
  freeBannerBody: {fontSize: 13, lineHeight: 18},
  freeBannerLink: {fontSize: 12, fontWeight: '700', color: '#F2A93B', marginTop: 6},
  albumArt: {
    width: 160,
    height: 160,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  albumArtGlyph: {fontSize: 48, opacity: 0.5},
  trackTitle: {fontSize: 19, fontWeight: '700', textAlign: 'center'},
  trackArtist: {fontSize: 14, marginTop: 4, marginBottom: 14},
  progress: {width: '100%', marginTop: 18, marginBottom: 8},
  progressTrack: {height: 4, borderRadius: 2, overflow: 'hidden'},
  progressFill: {height: 4, borderRadius: 2},
  progressLabels: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 6},
  progressLabel: {fontSize: 11},
  controls: {flexDirection: 'row', alignItems: 'center', gap: 24, marginVertical: 20},
  controlBtn: {width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center'},
  controlBtnMain: {width: 60, height: 60, borderRadius: 30},
  controlGlyph: {fontSize: 20},
  controlGlyphMain: {fontSize: 22, color: '#FFFFFF'},
  avatarStack: {flexDirection: 'row', marginTop: 20},
  avatarOverlap: {marginLeft: -8},
});
