import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Avatar from '../../components/Avatar';
import PickerBadge from '../../components/PickerBadge';
import SyncStatusBadge from '../../components/SyncStatusBadge';
import {useAuth} from '../../services/auth/AuthContext';
import {useSession} from '../../state/SessionContext';
import {useTheme} from '../../theme/ThemeContext';
import {brand} from '../../theme/tokens';
import {youtubePlayerController} from '../../services/youtube/youtubePlayerStub';

/**
 * Now Playing 탭 — YouTube 세션 전용 (00-ux-flow.md 2.10c절, US-105b/US-406).
 *
 * Spotify용 `NowPlayingView`(2.10a)와의 핵심 차이: 재생이 참여자 각자의 외부 앱이 아니라
 * "우리 앱 안"에서 일어나므로, 앨범 아트 자리 대신 실제 영상 재생 영역(WebView + IFrame Player)이
 * 화면에 있어야 한다. Spotify 화면에 있던 진행 바(progress track)는 2.10c 목업에 없다 — YouTube
 * IFrame Player 자체가 재생 진행 상태를 자기 컨트롤 안에 이미 표시하므로 중복 UI를 만들지 않는다.
 *
 * TODO(다음 라운드, 실제 연동): 아래 `playerPlaceholder` 자리에 `react-native-webview` 기반 IFrame
 * Player를 실제로 렌더링해야 한다(YouTube Required Minimum Functionality 정책 — 최소 200×200px,
 * 우리 UI가 그 위에 오버레이하지 않음, 02-key-ui-patterns.md 4절/00-ux-flow.md 2.10c 근거). 지금은
 * 정책이 요구하는 최소 크기만 확보한 플레이스홀더이며, 실제 재생 트리거는
 * `services/youtube/youtubePlayerStub.ts` STUB을 통해서만 호출한다(교체 지점 명확화).
 */
interface YouTubeNowPlayingViewProps {
  onOpenParticipants?: () => void;
}

export default function YouTubeNowPlayingView({onOpenParticipants}: YouTubeNowPlayingViewProps) {
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

  // YouTube 세션은 Premium 여부로 재생 가능 인원이 갈리지 않는다(US-103, Spotify의 US-106과 다른
  // 지점) — accountTier(Spotify Premium/Free 개념)를 재사용하지 않고 참여 인원만 그대로 보여준다.
  const suffix = `${session.participants.length}명 함께 듣는 중`;

  // 02-key-ui-patterns.md 2.2a: 신규 상태를 만들지 않고 기존 "맞추는 중" 상태에 보조 텍스트만
  // 얹는다. 실제 감지는 IFrame Player 연동 후에나 가능하므로 지금은 항상 false를 반환한다
  // (youtubePlayerController.isAdPlaying() STUB) — 연동되면 이 한 줄만으로 배지에 자동 반영된다.
  const isAdPlaying = youtubePlayerController.isAdPlaying();
  const effectiveSyncStatus = isAdPlaying
    ? {...syncStatus, state: 'tuning' as const, reasonLabel: '광고 재생 중'}
    : syncStatus;

  const handleTogglePlay = () => {
    if (session.playback.isPlaying) {
      requestPause();
      youtubePlayerController.pauseVideo();
    } else {
      requestPlay();
      youtubePlayerController.playVideo();
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[styles.playerPlaceholder, {backgroundColor: theme.cardBg, borderColor: theme.border}]}
        accessibilityRole="image"
        accessibilityLabel="YouTube 영상 재생 영역 (준비 중)">
        <Text style={styles.playerGlyph}>▶</Text>
        <Text style={[styles.playerCaption, {color: theme.textSecondary}]}>
          WebView · IFrame Player 실제 렌더링 영역{'\n'}
          (광고 스킵 버튼·카운트다운은 YouTube가 이 안에 그대로 노출 — 우리 UI는 겹치지 않음)
        </Text>
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
          onPress={handleTogglePlay}>
          <Text style={styles.controlGlyphMain}>{session.playback.isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel="다음 곡"
          style={[styles.controlBtn, {backgroundColor: theme.cardBg}]}
          onPress={requestNextTrack}>
          <Text style={[styles.controlGlyph, {color: theme.text}]}>⏭</Text>
        </TouchableOpacity>
      </View>

      <SyncStatusBadge status={effectiveSyncStatus} suffix={suffix} />

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
  playerPlaceholder: {
    width: '100%',
    minHeight: 200,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 18,
  },
  playerGlyph: {fontSize: 40, opacity: 0.4, marginBottom: 10},
  playerCaption: {fontSize: 12, textAlign: 'center', lineHeight: 17},
  trackTitle: {fontSize: 19, fontWeight: '700', textAlign: 'center'},
  trackArtist: {fontSize: 14, marginTop: 4, marginBottom: 14},
  controls: {flexDirection: 'row', alignItems: 'center', gap: 24, marginVertical: 20},
  controlBtn: {width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center'},
  controlBtnMain: {width: 60, height: 60, borderRadius: 30},
  controlGlyph: {fontSize: 20},
  controlGlyphMain: {fontSize: 22, color: '#FFFFFF'},
  avatarStack: {flexDirection: 'row', marginTop: 20},
  avatarOverlap: {marginLeft: -8},
});
