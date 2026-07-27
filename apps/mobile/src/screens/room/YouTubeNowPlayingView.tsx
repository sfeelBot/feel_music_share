import React, {useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import WebView from 'react-native-webview';
import type {WebViewMessageEvent} from 'react-native-webview';
import Avatar from '../../components/Avatar';
import MatchingQueueSheet from '../../components/MatchingQueueSheet';
import PickerBadge from '../../components/PickerBadge';
import SyncStatusBadge from '../../components/SyncStatusBadge';
import {useAuth} from '../../services/auth/AuthContext';
import {activePlaylistEntries} from '../../state/activeServicePlaylist';
import {useSession} from '../../state/SessionContext';
import {resolveMixedCurrentTrackForMe} from '../../state/mixedTrackView';
import {useTheme} from '../../theme/ThemeContext';
import {brand} from '../../theme/tokens';
import {buildYoutubePlayerHtml} from '../../services/youtube/youtubePlayerHtml';
import {extractYoutubeVideoId, youtubePlayerController} from '../../services/youtube/youtubePlayerStub';

/**
 * Now Playing 탭 — YouTube 세션 전용 (00-ux-flow.md 2.10c절, US-105b/US-406).
 *
 * Spotify용 `NowPlayingView`(2.10a)와의 핵심 차이: 재생이 참여자 각자의 외부 앱이 아니라
 * "우리 앱 안"에서 일어나므로, 앨범 아트 자리 대신 실제 영상 재생 영역(WebView + IFrame Player)이
 * 화면에 있어야 한다. Spotify 화면에 있던 진행 바(progress track)는 2.10c 목업에 없다 — YouTube
 * IFrame Player 자체가 재생 진행 상태를 자기 컨트롤 안에 이미 표시하므로 중복 UI를 만들지 않는다.
 *
 * (2026-07-26 확장, 혼합 세션 2.10d) 혼합 세션에서 "나"의 참여 플랫폼이 YouTube이면 이 컴포넌트가
 * 그대로 재사용된다. 영상 소스(videoId)가 `session.playlists[activeService].entries`가 아니라 "내 매칭 트랙"에서 나온다는
 * 점만 다르다 — 매칭이 아직 확인 전/실패 상태면 WebView 대신 상태 카드를 보여준다
 * (`NowPlayingView.tsx`의 동일한 판단, `state/mixedTrackView.ts` 공유).
 *
 * 실제 재생 연동(2026-07-26 라운드): `react-native-webview`의 `<WebView>`에 YouTube IFrame Player
 * API를 로드하는 HTML(`services/youtube/youtubePlayerHtml.ts`)을 `source={{html}}`로 주입한다.
 * 최초 영상은 이 HTML 안에 직접 굽고(WebView 재마운트 없이), 이후 곡 전환은
 * `youtubePlayerController.loadVideoById/cueVideoById`(WebView `injectJavaScript` 브릿지)로
 * 처리한다 — 곡이 바뀔 때마다 WebView를 통째로 재생성하면 매번 IFrame API 재로딩이 발생해
 * 깜빡임/지연이 커지기 때문에 의도적으로 나눴다(`youtubePlayerStub.ts` 파일 헤더 주석 참고).
 *
 * 정책 준수(`docs/specs/03-youtube-integration.md` 8-2/8-3절, 위반 시 계정/API 정지 리스크):
 * - 플레이어 영역(WebView) 자체에는 YouTube 네이티브 컨트롤 위에 겹치는 자체 UI가 전혀 없다.
 * - 커스텀 재생/이전/다음 버튼은 플레이어 영역 **바깥**(아래)에만 배치한다(기존 구조 유지).
 * - 광고 재생 중에는 `SyncStatusBadge`에 "맞추는 중... (광고 재생 중)"만 보여주고, 광고를
 *   건너뛰거나 숨기는 어떤 동작도 하지 않는다.
 */
interface YouTubeNowPlayingViewProps {
  onOpenParticipants?: () => void;
}

export default function YouTubeNowPlayingView({onOpenParticipants}: YouTubeNowPlayingViewProps) {
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

  const webViewRef = useRef<React.ElementRef<typeof WebView>>(null);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [matchingVisible, setMatchingVisible] = useState(false);

  const isMixed = session?.service === 'mixed';
  const currentEntryId = session?.playback.currentEntryId;

  // 비-혼합 세션: session.playlists[activeService].entries에서 현재 엔트리를 찾는다. 혼합 세션: "내 매칭" 결과를 쓴다.
  const currentEntry =
    !isMixed && session ? activePlaylistEntries(session).find(e => e.entryId === currentEntryId) : undefined;
  const mixedView = isMixed && session ? resolveMixedCurrentTrackForMe(session, currentParticipantId) : null;
  const mixedEntry = isMixed ? session?.mixedPlaylist.find(e => e.entryId === currentEntryId) : undefined;

  const currentVideoId = isMixed
    ? mixedView?.kind === 'ready'
      ? extractYoutubeVideoId(mixedView.serviceTrackId)
      : null
    : currentEntry
      ? extractYoutubeVideoId(currentEntry.track.serviceTrackId)
      : null;
  // `<WebView>`는 아래에서 이 값이 참일 때만 조건부 렌더링된다 — attach effect의 의존성으로 써서
  // WebView의 마운트/언마운트 시점(값이 false<->true로 바뀌는 시점)마다만 재실행되게 한다.
  const isWebViewMounted = Boolean(currentVideoId);
  // 이미 WebView가 로드해둔(또는 로드 중인) 곡을 추적한다 — 최초 렌더의 영상은 아래 `initialHtml`
  // 자체가 이미 굽고 있으므로, 이 값과 다를 때만 `loadVideoById/cueVideoById`를 호출해야 중복
  // 로드를 피할 수 있다.
  const loadedEntryIdRef = useRef<string | null>(currentVideoId ? (currentEntryId ?? null) : null);

  // Rules of Hooks 준수: 아래 `if (!session) return null;` 가드보다 모든 훅 호출이 앞서야 한다.
  //
  // startSeconds(Round 13 갭 수정, 2026-07-27): Spotify↔YouTube 서비스 전환 후 YouTube로 복귀하면
  // `sessionService.switchService`가 `session.playlists.youtube.lastPlayback.positionMs`로부터
  // `session.playback.positionMs`를 복원해둔다(domain.ts ServicePlaybackMemory 주석 참고) — 이
  // 컴포넌트가 마운트되는 시점(=WebView가 처음 생기는 시점)에 그 값을 IFrame Player의 `start`
  // playerVar로 넘겨야 실제로 그 지점부터 재생된다. 혼합 세션(`isMixed`)은 제외한다 — 혼합 세션의
  // `session.playback.positionMs`는 `switchService`가 다루는 서비스별 스냅샷 복원 대상이 아니라
  // 참여자별 매칭 트랙 재생을 따라가는 값이라 의미가 다르고(위 mixedView 관련 주석 참고), 이번
  // 갭은 Spotify/YouTube 전용 세션의 "전환 후 복귀" 케이스만 대상이다. 방금 참여/생성한 세션은
  // positionMs가 0이라 자연스럽게 0초부터 시작한다 — 별도 분기가 필요 없다.
  const initialHtml = useMemo(
    () =>
      buildYoutubePlayerHtml({
        initialVideoId: currentVideoId ?? '',
        autoplay: session?.playback.isPlaying ?? false,
        startSeconds: !isMixed && session ? Math.floor(session.playback.positionMs / 1000) : 0,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 의도적으로 최초 1회만 빌드한다(재마운트 방지, 위 주석 참고).
    [],
  );

  useEffect(() => {
    return youtubePlayerController.onAdStateChanged(setIsAdPlaying);
  }, []);

  // 플레이리스트가 비어 `currentVideoId`가 null이 되면 WebView가 언마운트됐다가, 이후 새 곡이
  // 생기면 다시 마운트된다. `isWebViewMounted`(WebView가 실제로 JSX에 렌더링되는지 여부)를
  // 의존성으로 써서 그 마운트/언마운트 시점마다 재실행되게 한다(2026-07-26 QA R5.17).
  useEffect(() => {
    youtubePlayerController._attachWebView(webViewRef.current);
    return () => youtubePlayerController._attachWebView(null);
  }, [isWebViewMounted]);

  // 곡 전환 배선: `requestNextTrack`/`requestPrevTrack`/자동 다음 곡(곡 삭제) 등 어떤 경로로
  // `session.playback.currentEntryId`가 바뀌든(혼합 세션에서는 내 매칭이 확정될 때도), 이 effect
  // 하나가 실제 IFrame Player에 새 영상을 로드하도록 일원화한다.
  useEffect(() => {
    if (!currentVideoId || currentEntryId === loadedEntryIdRef.current) {
      return;
    }
    loadedEntryIdRef.current = currentEntryId ?? null;
    if (session?.playback.isPlaying) {
      youtubePlayerController.loadVideoById(currentVideoId);
    } else {
      youtubePlayerController.cueVideoById(currentVideoId);
    }
  }, [currentEntryId, currentVideoId, session?.playback.isPlaying]);

  if (!session) {
    return null;
  }

  const currentIndex = (isMixed ? session.mixedPlaylist : activePlaylistEntries(session)).findIndex(
    e => e.entryId === session.playback.currentEntryId,
  );
  const hasPrevTrack = currentIndex > 0;
  const addedByParticipantId = isMixed ? mixedEntry?.addedByParticipantId : currentEntry?.addedByParticipantId;
  const picker = addedByParticipantId
    ? session.participants.find(p => p.participantId === addedByParticipantId)
    : undefined;

  const playableCount = isMixed
    ? session.participants.filter(p => !(p.platform === 'spotify' && p.accountTier === 'free')).length
    : session.participants.length; // YouTube 전용 세션은 Premium 여부로 재생 가능 인원이 갈리지 않는다(US-103)
  const baseSuffix =
    playableCount === session.participants.length
      ? `${session.participants.length}명 함께 듣는 중`
      : `${session.participants.length}명 참여 중 (재생 ${playableCount}명)`;
  const suffix = isMixed ? `${baseSuffix} · 나: ${myPlatform === 'spotify' ? 'Spotify' : 'YouTube'}` : baseSuffix;

  // 02-key-ui-patterns.md 2.2a: 신규 상태를 만들지 않고 기존 "맞추는 중" 상태에 보조 텍스트만 얹는다.
  // 혼합 세션에서 내 매칭이 미확인/실패 상태면 광고보다 그 상태를 우선 알린다(더 근본적인 원인이므로).
  const mixedIssueLabel =
    isMixed && mixedView
      ? mixedView.kind === 'searching'
        ? '내 플랫폼에서 찾는 중'
        : mixedView.kind === 'awaitingConfirm' || mixedView.kind === 'failed'
          ? '내 매칭 확인 필요'
          : null
      : null;
  const effectiveSyncStatus = mixedIssueLabel
    ? {...syncStatus, state: 'tuning' as const, reasonLabel: mixedIssueLabel}
    : isAdPlaying
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

  const displayTitle = isMixed ? (mixedView?.kind === 'ready' ? mixedView.title : mixedEntry?.title) : currentEntry?.track.title;
  const displayArtist = isMixed
    ? (mixedView?.kind === 'ready' ? mixedView.artist : mixedEntry?.artist)
    : currentEntry?.track.artist;

  return (
    <View style={styles.container}>
      {isMixed && mixedView && mixedView.kind !== 'ready' ? (
        <View
          style={[
            styles.playerContainer,
            styles.matchStatusContainer,
            {backgroundColor: theme.cardBg, borderColor: theme.border},
          ]}>
          <Text style={[styles.matchStatusMessage, {color: theme.textSecondary}]}>
            {mixedView.kind === 'none'
              ? '재생할 곡이 없어요'
              : mixedView.kind === 'searching'
                ? '내 플랫폼에서 찾는 중...'
                : mixedView.kind === 'failed'
                  ? '이 곡을 내 플랫폼(YouTube)에서 찾지 못했어요'
                  : '이 곡의 매칭을 아직 확인하지 않았어요'}
          </Text>
          {mixedView.kind !== 'none' && mixedView.kind !== 'searching' && (
            <TouchableOpacity onPress={() => setMatchingVisible(true)} accessibilityRole="button">
              <Text style={[styles.matchStatusAction, {color: brand.primary}]}>
                {mixedView.kind === 'failed' ? '직접 검색하기 →' : '확인하러 가기 →'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View
          style={[styles.playerContainer, {backgroundColor: theme.cardBg, borderColor: theme.border}]}
          accessibilityRole="image"
          accessibilityLabel="YouTube 영상 재생 영역">
          {currentVideoId ? (
            <WebView
              ref={webViewRef}
              style={styles.webview}
              source={{html: initialHtml}}
              onMessage={(event: WebViewMessageEvent) => youtubePlayerController._handleBridgeMessage(event)}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
            />
          ) : (
            <Text style={[styles.playerCaption, {color: theme.textSecondary}]}>재생할 영상이 없어요</Text>
          )}
        </View>
      )}

      <Text style={[styles.trackTitle, {color: theme.text}]}>{displayTitle ?? '재생할 곡이 없어요'}</Text>
      <Text style={[styles.trackArtist, {color: theme.textSecondary}]}>{displayArtist ?? ''}</Text>

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

      {isMixed && <MatchingQueueSheet visible={matchingVisible} onClose={() => setMatchingVisible(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 20},
  playerContainer: {
    width: '100%',
    minHeight: 200,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 18,
  },
  matchStatusContainer: {padding: 20, gap: 6},
  matchStatusMessage: {fontSize: 13, textAlign: 'center', marginTop: 8},
  matchStatusAction: {fontSize: 13, fontWeight: '700', marginTop: 10},
  webview: {width: '100%', minHeight: 200, backgroundColor: '#000000'},
  playerCaption: {fontSize: 12, textAlign: 'center', lineHeight: 17, padding: 16},
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
