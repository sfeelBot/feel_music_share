import React, {useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import WebView from 'react-native-webview';
import type {WebViewMessageEvent} from 'react-native-webview';
import Avatar from '../../components/Avatar';
import PickerBadge from '../../components/PickerBadge';
import SyncStatusBadge from '../../components/SyncStatusBadge';
import {useAuth} from '../../services/auth/AuthContext';
import {useSession} from '../../state/SessionContext';
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
  const {session, syncStatus, requestPlay, requestPause, requestNextTrack, requestPrevTrack} = useSession();

  const webViewRef = useRef<React.ElementRef<typeof WebView>>(null);
  const [isAdPlaying, setIsAdPlaying] = useState(false);

  const currentEntryId = session?.playback.currentEntryId;
  const currentEntry = session?.playlist.find(e => e.entryId === currentEntryId);
  const currentVideoId = currentEntry ? extractYoutubeVideoId(currentEntry.track.serviceTrackId) : null;
  // 이미 WebView가 로드해둔(또는 로드 중인) 곡을 추적한다 — 최초 렌더의 영상은 아래 `initialHtml`
  // 자체가 이미 굽고 있으므로, 이 값과 다를 때만 `loadVideoById/cueVideoById`를 호출해야 중복
  // 로드를 피할 수 있다.
  const loadedEntryIdRef = useRef<string | null>(currentEntry?.entryId ?? null);

  // Rules of Hooks 준수: 아래 `if (!session) return null;` 가드보다 모든 훅 호출이 앞서야 한다.
  const initialHtml = useMemo(
    () =>
      buildYoutubePlayerHtml({
        initialVideoId: currentVideoId ?? '',
        autoplay: session?.playback.isPlaying ?? false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 의도적으로 최초 1회만 빌드한다(재마운트 방지, 위 주석 참고).
    [],
  );

  useEffect(() => {
    return youtubePlayerController.onAdStateChanged(setIsAdPlaying);
  }, []);

  useEffect(() => {
    youtubePlayerController._attachWebView(webViewRef.current);
    return () => youtubePlayerController._attachWebView(null);
  }, []);

  // 곡 전환 배선: `requestNextTrack`/`requestPrevTrack`/자동 다음 곡(곡 삭제 시) 등 어떤 경로로
  // `session.playback.currentEntryId`가 바뀌든, 이 effect 하나가 실제 IFrame Player에 새 영상을
  // 로드하도록 일원화한다(호출부마다 개별 배선할 필요 없음).
  useEffect(() => {
    if (!currentEntry || currentEntry.entryId === loadedEntryIdRef.current || !currentVideoId) {
      return;
    }
    loadedEntryIdRef.current = currentEntry.entryId;
    if (session?.playback.isPlaying) {
      youtubePlayerController.loadVideoById(currentVideoId);
    } else {
      youtubePlayerController.cueVideoById(currentVideoId);
    }
  }, [currentEntry, currentVideoId, session?.playback.isPlaying]);

  if (!session) {
    return null;
  }

  const currentIndex = session.playlist.findIndex(e => e.entryId === session.playback.currentEntryId);
  const hasPrevTrack = currentIndex > 0;
  const picker = currentEntry
    ? session.participants.find(p => p.participantId === currentEntry.addedByParticipantId)
    : undefined;

  // YouTube 세션은 Premium 여부로 재생 가능 인원이 갈리지 않는다(US-103, Spotify의 US-106과 다른
  // 지점) — accountTier(Spotify Premium/Free 개념)를 재사용하지 않고 참여 인원만 그대로 보여준다.
  const suffix = `${session.participants.length}명 함께 듣는 중`;

  // 02-key-ui-patterns.md 2.2a: 신규 상태를 만들지 않고 기존 "맞추는 중" 상태에 보조 텍스트만 얹는다.
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
