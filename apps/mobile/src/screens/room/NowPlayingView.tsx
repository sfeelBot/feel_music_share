import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Avatar from '../../components/Avatar';
import MatchingQueueSheet from '../../components/MatchingQueueSheet';
import PickerBadge from '../../components/PickerBadge';
import SyncStatusBadge from '../../components/SyncStatusBadge';
import {useAuth} from '../../services/auth/AuthContext';
import {useSession} from '../../state/SessionContext';
import {resolveMixedCurrentTrackForMe, type MixedTrackNeedsAttentionView} from '../../state/mixedTrackView';
import {useTheme} from '../../theme/ThemeContext';
import {brand} from '../../theme/tokens';
import {formatDuration} from '../../utils/format';

/**
 * Now Playing 탭 (00-ux-flow.md 2.10a절 — Spotify 전용 세션 레이아웃).
 *
 * (2026-07-26 확장, 혼합 세션 2.10d) 혼합 세션에서 "나"의 참여 플랫폼이 Spotify이면 이 컴포넌트가
 * 그대로 재사용된다(00-ux-flow.md 2.10d "완전히 새로운 레이아웃이 아니다 — 2.10a 또는 2.10c
 * 레이아웃을 그대로 물려받는다"). 추가되는 것은 세 가지뿐이다: (1) 동기화 배지 옆 "내 플랫폼"
 * 표시, (2) 참여자 아바타에 서비스 아이콘 오버레이, (3) 내 매칭이 아직 확인 전/실패 상태면 재생
 * 영역 대신 상태 카드를 보여주는 것. `session.playlist`/`session.mixedPlaylist` 중 어느 쪽을 볼지는
 * `session.service`로 분기한다(R3.17에서 반복됐던 "서비스 가드 누락" 실수를 피하기 위해, 혼합
 * 세션에서는 `session.service === 'spotify'` 같은 단일 서비스 가드를 그대로 재사용하지 않고
 * 참여자 개인의 매칭 플랫폼 기준으로 새로 판단한다 — Free 배너 조건 참고).
 *
 * TODO(Firebase 연동): 재생 위치(progress)는 지금 session.playback.positionMs 스냅샷을 그대로
 * 보여줄 뿐, 05-sync-architecture.md가 요구하는 "서버 타임스탬프 + 클록 오프셋 기반 실시간 계산"은
 * 아직 연결하지 않았다(utils/clock.ts의 computeExpectedPositionMs 참고, 다음 라운드 작업). 혼합
 * 세션의 진행바도 같은 수준의 단순화를 그대로 적용했다 — "공통 기준 위치를 내 매칭 트랙 길이
 * 기준으로 환산해 seek한다"(09문서 5절)는 정교한 환산은 하지 않고 positionMs를 그대로 재사용한다
 * (기존 Spotify/YouTube 전용 세션도 아직 이 정교화를 하지 않은 것과 동일한 수준 — TODO로 남김).
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
  const [matchingVisible, setMatchingVisible] = useState(false);

  if (!session) {
    return null;
  }

  const isMixed = session.service === 'mixed';

  if (isMixed) {
    return (
      <MixedNowPlayingBody
        onOpenParticipants={onOpenParticipants}
        onOpenMatching={() => setMatchingVisible(true)}
        matchingVisible={matchingVisible}
        onCloseMatching={() => setMatchingVisible(false)}
      />
    );
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

/**
 * 혼합 세션에서 내 참여 플랫폼이 Spotify일 때의 본문 (00-ux-flow.md 2.10d). 위 컴포넌트와 레이아웃
 * 골격은 같지만 데이터 출처가 session.mixedPlaylist + "내 매칭"이라 별도 함수로 분리했다(하나의
 * 컴포넌트 안에서 두 데이터 모델을 동시에 다루면 분기가 과도하게 늘어나 가독성이 떨어진다고 판단).
 */
function MixedNowPlayingBody({
  onOpenParticipants,
  onOpenMatching,
  matchingVisible,
  onCloseMatching,
}: {
  onOpenParticipants?: () => void;
  onOpenMatching: () => void;
  matchingVisible: boolean;
  onCloseMatching: () => void;
}) {
  const theme = useTheme();
  const {profile} = useAuth();
  const {
    session,
    currentParticipantId,
    syncStatus,
    requestPlay,
    requestPause,
    requestNextTrack,
    requestPrevTrack,
    myPlatform,
  } = useSession();

  if (!session) {
    return null;
  }

  const currentIndex = session.mixedPlaylist.findIndex(e => e.entryId === session.playback.currentEntryId);
  const hasPrevTrack = currentIndex > 0;
  const mixedEntry = session.mixedPlaylist.find(e => e.entryId === session.playback.currentEntryId);
  const picker = mixedEntry
    ? session.participants.find(p => p.participantId === mixedEntry.addedByParticipantId)
    : undefined;
  const view = resolveMixedCurrentTrackForMe(session, currentParticipantId);

  // Free 배너는 "나"의 매칭 플랫폼이 Spotify일 때만 판단한다(session.service==='spotify' 같은 세션
  // 전체 가드를 혼합 세션에 그대로 새어 들어가게 하지 않는다 — 작업 지시 7번, R3.17 재발 방지).
  const viewerIsFree = profile ? !profile.isPremium : false;
  const showFreeBanner = viewerIsFree && myPlatform === 'spotify';

  const playableCount = session.participants.filter(p => !(p.platform === 'spotify' && p.accountTier === 'free'))
    .length;
  const baseSuffix =
    playableCount === session.participants.length
      ? `${session.participants.length}명 함께 듣는 중`
      : `${session.participants.length}명 참여 중 (재생 ${playableCount}명)`;
  const suffix = `${baseSuffix} · 나: ${myPlatform === 'youtube' ? 'YouTube' : 'Spotify'}`;

  const issueReasonLabel =
    view.kind === 'searching'
      ? '내 플랫폼에서 찾는 중'
      : view.kind === 'awaitingConfirm'
        ? '내 매칭 확인 필요'
        : view.kind === 'failed'
          ? '내 매칭 확인 필요'
          : null;
  const effectiveSyncStatus = issueReasonLabel ? {...syncStatus, state: 'tuning' as const, reasonLabel: issueReasonLabel} : syncStatus;

  const progressRatio = view.kind === 'ready' ? Math.min(1, session.playback.positionMs / view.durationMs) : 0;

  return (
    <View style={styles.container}>
      {showFreeBanner && (
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

      {view.kind === 'ready' ? (
        <>
          <View style={[styles.albumArt, {backgroundColor: theme.cardBg}]}>
            <Text style={styles.albumArtGlyph}>♪</Text>
          </View>
          <Text style={[styles.trackTitle, {color: theme.text}]}>{view.title}</Text>
          <Text style={[styles.trackArtist, {color: theme.textSecondary}]}>{view.artist}</Text>
        </>
      ) : (
        <MixedMatchStatusCard view={view} onOpenMatching={onOpenMatching} />
      )}

      {picker && view.kind === 'ready' && (
        <PickerBadge
          displayName={picker.displayName}
          ringColor={picker.ringColor}
          isMe={picker.participantId === profile?.id}
        />
      )}

      {view.kind === 'ready' && (
        <View style={styles.progress}>
          <View style={[styles.progressTrack, {backgroundColor: theme.trackBg}]}>
            <View style={[styles.progressFill, {width: `${progressRatio * 100}%`, backgroundColor: brand.primary}]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={[styles.progressLabel, {color: theme.textSecondary}]}>
              {formatDuration(session.playback.positionMs)}
            </Text>
            <Text style={[styles.progressLabel, {color: theme.textSecondary}]}>{formatDuration(view.durationMs)}</Text>
          </View>
        </View>
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

      <SyncStatusBadge status={effectiveSyncStatus} suffix={suffix} />

      <TouchableOpacity
        style={styles.avatarStack}
        onPress={onOpenParticipants}
        accessibilityLabel="참여자 목록 보기"
        disabled={!onOpenParticipants}>
        {session.participants.map((p, index) => (
          <View key={p.participantId} style={index > 0 ? styles.avatarOverlap : undefined}>
            <Avatar
              initial={p.displayName.slice(0, 1)}
              ringColor={p.ringColor}
              size="sm"
              crown={p.role === 'host'}
              platform={p.platform}
            />
          </View>
        ))}
      </TouchableOpacity>

      <MatchingQueueSheet visible={matchingVisible} onClose={onCloseMatching} />
    </View>
  );
}

function MixedMatchStatusCard({
  view,
  onOpenMatching,
}: {
  view: MixedTrackNeedsAttentionView;
  onOpenMatching: () => void;
}) {
  const theme = useTheme();
  if (view.kind === 'none') {
    return (
      <View style={[styles.albumArt, {backgroundColor: theme.cardBg}]}>
        <Text style={[styles.trackTitle, {color: theme.text}]}>재생할 곡이 없어요</Text>
      </View>
    );
  }
  const isSearching = view.kind === 'searching';
  const message = isSearching
    ? '내 플랫폼에서 찾는 중...'
    : view.kind === 'failed'
      ? '이 곡을 내 플랫폼에서 찾지 못했어요'
      : '이 곡의 매칭을 아직 확인하지 않았어요';

  return (
    <View style={[styles.matchStatusCard, {backgroundColor: theme.cardBg}]}>
      <Text style={[styles.trackTitle, {color: theme.text}]} numberOfLines={2}>
        {view.entryTitle}
      </Text>
      <Text style={[styles.trackArtist, {color: theme.textSecondary}]}>{view.entryArtist}</Text>
      <Text style={[styles.matchStatusMessage, {color: theme.textSecondary}]}>{message}</Text>
      {!isSearching && (
        <TouchableOpacity onPress={onOpenMatching} accessibilityRole="button">
          <Text style={[styles.matchStatusAction, {color: brand.primary}]}>
            {view.kind === 'failed' ? '직접 검색하기 →' : '확인하러 가기 →'}
          </Text>
        </TouchableOpacity>
      )}
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
  matchStatusCard: {
    width: '100%',
    minHeight: 160,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginBottom: 20,
    gap: 6,
  },
  matchStatusMessage: {fontSize: 13, textAlign: 'center', marginTop: 8},
  matchStatusAction: {fontSize: 13, fontWeight: '700', marginTop: 10},
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
