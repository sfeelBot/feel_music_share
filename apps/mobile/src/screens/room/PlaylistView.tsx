import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, LayoutAnimation, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Swipeable} from 'react-native-gesture-handler';
import PickerBadge from '../../components/PickerBadge';
import AddTrackModal from '../../components/AddTrackModal';
import MatchingQueueSheet from '../../components/MatchingQueueSheet';
import {useAuth} from '../../services/auth/AuthContext';
import {activePlaylistEntries} from '../../state/activeServicePlaylist';
import {useSession} from '../../state/SessionContext';
import {useTheme} from '../../theme/ThemeContext';
import {brand, brandColors, matchColors, pickerColors, radius, spacing, syncColors} from '../../theme/tokens';
import type {MixedPlaylistEntry, PlaylistEntry} from '../../types/domain';

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
 * (2026-07-27, docs/design/06-ui-polish-audit.md A.5) 이번 UI 폴리시 라운드에서 스와이프 삭제를
 * 도입했지만 이 ▲/▼ 순서 변경 방식 자체는 건드리지 않았다 — 가로 스와이프(삭제)와 세로/탭 조작
 * (순서 변경)은 서로 다른 입력 축이라 그대로 공존한다(문서 A.5 판단 근거 참고).
 *
 * (2026-07-27 추가, 파트 A — 스와이프 삭제) `TrackRow`/`MixedTrackRow`를 `Swipeable`로 감싸 왼쪽
 * 스와이프 시 빨간 "삭제" 액션이 드러나게 했다. 탭 삭제는 확인 다이얼로그 없이 즉시 리스트에서
 * 사라지고 4초 Undo 스낵바를 띄우는 "지연 삭제(deferred delete)" 방식(`usePendingTrackDeletion`
 * 참고) — 실제 `removeTrack` 호출은 스낵바가 사라지는 시점까지 미룬다. 기존 롱프레스 →
 * `Alert.alert` 확인 경로는 그대로 남겨 접근성 대체 수단으로 유지한다(제거하지 않음, 06번 문서
 * A.7). 여러 행 중 하나만 열리도록 `openRowRef`로 관리한다(다른 행이 열리면 이전에 열려 있던 행을
 * 자동으로 닫음).
 *
 * (2026-07-27 추가, PB-05 연동) `RoomScreen.tsx`가 Now Playing/플레이리스트 탭을 좌우 스와이프로도
 * 전환할 수 있게 바뀌면서, 같은 가로축 제스처인 트랙 행 스와이프와 탭 페이징이 충돌할 위험이
 * 생겼다. `onRowSwipeActiveChange` prop으로 "지금 행을 드래그하는 중"을 상위(RoomScreen)에 알려,
 * 그동안만 페이저의 `scrollEnabled`를 꺼서 충돌을 피한다.
 *
 * (2026-07-26 확장, 혼합 세션) 혼합 세션은 플레이리스트가 서비스별로 나뉘지 않고 하나뿐이라
 * (04-playlist.md "혼합 모드 플레이리스트 구조"), 상단 서비스 칩 자리를 매칭 확인 배지(2.11a)가
 * 대신하고(00-ux-flow.md 2.10b 갱신 내용), 각 트랙 행은 "내 매칭" 상태(찾는 중/확인 필요/확정됨)를
 * 함께 보여준다.
 *
 * (2026-07-26 추가) 서비스 칩 → 세션 설정 단축 진입점(00-ux-flow.md 457행 "칩을 탭하면 세션 설정의
 * 서비스 전환 화면(2.13a)으로 바로 이동하는 단축 진입점으로 겸용한다"). `onOpenSettings`를 호출하는
 * 쪽(RoomScreen.tsx)이 이미 갖고 있는 세션 설정 오픈 로직을 그대로 재사용한다 — 이 화면이 직접
 * `SessionSettingsView`를 렌더링하지 않는 기존 구조를 유지하기 위함.
 * 혼합 세션에서는 이 onPress를 연결하지 않았다 — 혼합 세션은 위에서 설명한 대로 서비스 칩 자리 자체가
 * 매칭 확인 배지로 대체돼 있어(전환 개념이 없으므로 "서비스 전환 단축 진입점"이라는 원래 목적 자체가
 * 성립하지 않음, 09문서 "결정 3"), 탭할 칩이 물리적으로 존재하지 않는다. 세션 설정의 "내가 참여 중인
 * 플랫폼" 읽기 전용 표시(SessionSettingsView.tsx MixedPlatformRow)는 참여자 목록(⋮ → 세션 설정)에서
 * 이미 동일하게 확인 가능하므로 기능적 갭도 없다고 판단했다(근거는 implementation-log.md에도 남김).
 */
interface PlaylistViewProps {
  /** 서비스 칩(Spotify/YouTube 전용 세션에서만 노출) 탭 시 세션 설정 화면을 열기 위한 콜백. */
  onOpenSettings: () => void;
  /** PB-05 대응 — 트랙 행을 스와이프하는 동안 true를 보내 상위(RoomScreen)의 탭 페이저를 잠근다. */
  onRowSwipeActiveChange?: (active: boolean) => void;
}

const UNDO_DURATION_MS = 4000;

interface PendingSnackbar {
  entryId: string;
  title: string;
}

/**
 * 스와이프 삭제의 "지연 삭제(deferred delete)" 상태를 관리하는 훅 (06번 문서 A.4).
 * 탭 즉시 `pendingIds`에 넣어 화면에서만 숨기고, `UNDO_DURATION_MS` 후 실제 `removeTrack`을
 * 호출한다. Undo를 누르면 타이머를 취소하고 `pendingIds`에서 제거하기만 하면 되므로 "삭제된 곡을
 * 원래 위치에 되돌려 끼워넣는" 복원 로직이 따로 필요 없다(원래부터 리스트에서 숨기기만 했을 뿐 실제
 * 상태는 그대로였으므로).
 */
function usePendingTrackDeletion(removeTrack: (entryId: string) => void) {
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState<PendingSnackbar | null>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // removeTrack(useSession()에서 온 콜백)이 렌더마다 새 함수일 수 있어, setTimeout 콜백/언마운트
  // cleanup이 항상 "최신" 버전을 쓰도록 ref로 감싼다.
  const removeTrackRef = useRef(removeTrack);
  removeTrackRef.current = removeTrack;

  const commit = useCallback((entryId: string) => {
    timersRef.current.delete(entryId);
    removeTrackRef.current(entryId);
    setPendingIds(prev => {
      if (!prev.has(entryId)) {return prev;}
      const next = new Set(prev);
      next.delete(entryId);
      return next;
    });
    setSnackbar(prev => (prev?.entryId === entryId ? null : prev));
  }, []);

  const scheduleDelete = useCallback(
    (entryId: string, title: string) => {
      // PB-16: 리스트에서 행이 사라지는 상태 변경 직전에 걸어야 다음 레이아웃 변화가 애니메이션된다.
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setPendingIds(prev => new Set(prev).add(entryId));
      setSnackbar({entryId, title});
      const timer = setTimeout(() => commit(entryId), UNDO_DURATION_MS);
      timersRef.current.set(entryId, timer);
    },
    [commit],
  );

  const undo = useCallback((entryId: string) => {
    const timer = timersRef.current.get(entryId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(entryId);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPendingIds(prev => {
      if (!prev.has(entryId)) {return prev;}
      const next = new Set(prev);
      next.delete(entryId);
      return next;
    });
    setSnackbar(prev => (prev?.entryId === entryId ? null : prev));
  }, []);

  // A.4 경고 준수: 언마운트 시 대기 중인 삭제를 즉시 커밋한다 — 그렇지 않으면 "화면에서는 숨겼지만
  // 실제로는 삭제되지 않은 곡"이 남는 버그가 생긴다. (PB-05로 탭 전환 자체는 더 이상 이 컴포넌트를
  // 언마운트하지 않지만, 세션을 완전히 나가는 등 진짜 언마운트는 여전히 일어날 수 있어 이 안전장치는
  // 계속 필요하다.)
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer, entryId) => {
        clearTimeout(timer);
        removeTrackRef.current(entryId);
      });
      timers.clear();
    };
  }, []);

  return {pendingIds, snackbar, scheduleDelete, undo};
}

export default function PlaylistView({onOpenSettings, onRowSwipeActiveChange}: PlaylistViewProps) {
  const theme = useTheme();
  const {profile, tokens} = useAuth();
  const {
    session,
    removeTrack,
    addTrack,
    requestMoveTrack,
    myPlatform,
    addMixedTrack,
    myPendingMatchEntryIds,
    currentParticipantId,
  } = useSession();
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [matchingQueueVisible, setMatchingQueueVisible] = useState(false);
  // 스와이프로 연 행이 항상 하나만 있도록 관리한다 — 새 행이 열리면 이전에 열려 있던 행을 닫는다.
  const openRowRef = useRef<{entryId: string; close: () => void} | null>(null);
  const {pendingIds, snackbar, scheduleDelete, undo} = usePendingTrackDeletion(removeTrack);

  const handleRowWillOpen = useCallback((entryId: string, close: () => void) => {
    if (openRowRef.current && openRowRef.current.entryId !== entryId) {
      openRowRef.current.close();
    }
    openRowRef.current = {entryId, close};
  }, []);

  const handleRowSwipeActive = useCallback(
    (active: boolean) => onRowSwipeActiveChange?.(active),
    [onRowSwipeActiveChange],
  );

  if (!session) {
    return null;
  }

  const isMixed = session.service === 'mixed';
  const ringColorByParticipant = new Map(session.participants.map(p => [p.participantId, p.ringColor]));

  const confirmDeleteMixed = (entry: MixedPlaylistEntry) => {
    Alert.alert('곡 삭제', `"${entry.title}"을(를) 플레이리스트에서 삭제할까요?`, [
      {text: '취소', style: 'cancel'},
      {text: '삭제', style: 'destructive', onPress: () => removeTrack(entry.entryId)},
    ]);
  };

  const confirmDelete = (entry: PlaylistEntry) => {
    Alert.alert('곡 삭제', `"${entry.track.title}"을(를) 플레이리스트에서 삭제할까요?`, [
      {text: '취소', style: 'cancel'},
      {text: '삭제', style: 'destructive', onPress: () => removeTrack(entry.entryId)},
    ]);
  };

  if (isMixed) {
    const visiblePlaylist = session.mixedPlaylist.filter(e => !pendingIds.has(e.entryId));
    const currentEntry = visiblePlaylist.find(e => e.entryId === session.playback.currentEntryId);
    const pending = visiblePlaylist.filter(
      e => e.playedStatus !== 'played' && e.entryId !== currentEntry?.entryId,
    );
    const played = visiblePlaylist.filter(e => e.playedStatus === 'played');

    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[
            styles.matchBadge,
            {backgroundColor: myPendingMatchEntryIds.length > 0 ? theme.matchMediumBg : theme.trackBg},
          ]}
          onPress={() => setMatchingQueueVisible(true)}
          accessibilityRole="button"
          disabled={myPendingMatchEntryIds.length === 0}>
          <Text
            style={[
              styles.matchBadgeText,
              {color: myPendingMatchEntryIds.length > 0 ? matchColors.medium : theme.textSecondary},
            ]}>
            {myPendingMatchEntryIds.length > 0
              ? `🔔 확인할 매칭 ${myPendingMatchEntryIds.length}개`
              : '내 매칭 확인 대기 없음'}
          </Text>
        </TouchableOpacity>

        {currentEntry && (
          <View style={[styles.miniPlayer, {backgroundColor: theme.cardBg, borderColor: theme.border}]}>
            <View style={[styles.miniPlayerArt, {backgroundColor: theme.bgElevated}]} />
            <Text style={[styles.miniPlayerTitle, {color: theme.text}]} numberOfLines={1}>
              {currentEntry.title} — {currentEntry.artist}
            </Text>
            <Text style={styles.miniPlayerToggle}>{session.playback.isPlaying ? '⏸' : '▶'}</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scrollBody}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>다음 곡들</Text>

          {currentEntry && (
            <MixedTrackRow
              entry={currentEntry}
              isPlaying
              viewerParticipantId={profile?.id}
              myParticipantId={currentParticipantId}
              ringColor={ringColorByParticipant.get(currentEntry.addedByParticipantId) ?? pickerColors.coral}
              onDelete={confirmDeleteMixed}
              onSwipeDelete={entry => scheduleDelete(entry.entryId, entry.title)}
              onRowWillOpen={handleRowWillOpen}
              onSwipeGestureActive={handleRowSwipeActive}
            />
          )}
          {pending.map((entry, index) => (
            <MixedTrackRow
              key={entry.entryId}
              entry={entry}
              viewerParticipantId={profile?.id}
              myParticipantId={currentParticipantId}
              ringColor={ringColorByParticipant.get(entry.addedByParticipantId) ?? pickerColors.coral}
              onDelete={confirmDeleteMixed}
              onSwipeDelete={e => scheduleDelete(e.entryId, e.title)}
              onRowWillOpen={handleRowWillOpen}
              onSwipeGestureActive={handleRowSwipeActive}
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
              <MixedTrackRow
                key={entry.entryId}
                entry={entry}
                readOnly
                viewerParticipantId={profile?.id}
                myParticipantId={currentParticipantId}
                ringColor={ringColorByParticipant.get(entry.addedByParticipantId) ?? pickerColors.coral}
                onDelete={confirmDeleteMixed}
                onSwipeDelete={e => scheduleDelete(e.entryId, e.title)}
                onRowWillOpen={handleRowWillOpen}
                onSwipeGestureActive={handleRowSwipeActive}
              />
            ))}

          <TouchableOpacity
            style={[styles.addButton, {backgroundColor: theme.cardBg, borderColor: theme.border}]}
            onPress={() => setAddModalVisible(true)}>
            <Text style={[styles.addButtonText, {color: theme.text}]}>+ 곡 추가</Text>
          </TouchableOpacity>
        </ScrollView>

        {snackbar && <UndoSnackbar title={snackbar.title} onUndo={() => undo(snackbar.entryId)} />}

        <AddTrackModal
          visible={addModalVisible}
          onClose={() => setAddModalVisible(false)}
          service={myPlatform ?? 'spotify'}
          accessToken={myPlatform === 'spotify' ? tokens?.accessToken ?? null : null}
          onSelectTrack={track => {
            addMixedTrack(track);
            setAddModalVisible(false);
          }}
        />

        <MatchingQueueSheet visible={matchingQueueVisible} onClose={() => setMatchingQueueVisible(false)} />
      </View>
    );
  }

  const allEntries = activePlaylistEntries(session);
  const entries = allEntries.filter(e => !pendingIds.has(e.entryId));
  const currentEntry = entries.find(e => e.entryId === session.playback.currentEntryId);
  const pending = entries.filter(e => e.playedStatus !== 'played' && e.entryId !== currentEntry?.entryId);
  const played = entries.filter(e => e.playedStatus === 'played');

  const serviceChip =
    session.service === 'youtube'
      ? {label: '🔴 YouTube 플레이리스트 ▸', color: brandColors.youtubeRed}
      : {label: '🟢 Spotify 플레이리스트 ▸', color: brandColors.spotifyGreen};

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.serviceChip}
        onPress={onOpenSettings}
        accessibilityRole="button"
        accessibilityLabel={`${serviceChip.label} — 세션 설정 열기`}>
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
            onSwipeDelete={entry => scheduleDelete(entry.entryId, entry.track.title)}
            onRowWillOpen={handleRowWillOpen}
            onSwipeGestureActive={handleRowSwipeActive}
          />
        )}
        {pending.map((entry, index) => (
          <TrackRow
            key={entry.entryId}
            entry={entry}
            viewerParticipantId={profile?.id}
            ringColor={ringColorByParticipant.get(entry.addedByParticipantId) ?? pickerColors.coral}
            onDelete={confirmDelete}
            onSwipeDelete={e => scheduleDelete(e.entryId, e.track.title)}
            onRowWillOpen={handleRowWillOpen}
            onSwipeGestureActive={handleRowSwipeActive}
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
              onSwipeDelete={e => scheduleDelete(e.entryId, e.track.title)}
              onRowWillOpen={handleRowWillOpen}
              onSwipeGestureActive={handleRowSwipeActive}
            />
          ))}

        <TouchableOpacity
          style={[styles.addButton, {backgroundColor: theme.cardBg, borderColor: theme.border}]}
          onPress={() => setAddModalVisible(true)}>
          <Text style={[styles.addButtonText, {color: theme.text}]}>+ 곡 추가</Text>
        </TouchableOpacity>
      </ScrollView>

      {snackbar && <UndoSnackbar title={snackbar.title} onUndo={() => undo(snackbar.entryId)} />}

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

/** 스와이프 오른쪽 액션 — "삭제" (06번 문서 A.6 시각 스펙: mutedRed 배경 + 흰 텍스트, 폭 84). */
function DeleteAction({label, onPress}: {label: string; onPress: () => void}) {
  return (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} 삭제`}>
      <Text style={styles.deleteActionText}>삭제</Text>
    </TouchableOpacity>
  );
}

/** Undo 스낵바 (06번 문서 A.4) — "+ 곡 추가" 버튼 위, 화면 하단에 고정 노출된다. */
function UndoSnackbar({title, onUndo}: {title: string; onUndo: () => void}) {
  const theme = useTheme();
  return (
    <View style={[styles.snackbar, {backgroundColor: theme.headerBg}]}>
      <Text style={[styles.snackbarText, {color: theme.headerText}]} numberOfLines={1}>
        '{title}'을(를) 삭제했어요
      </Text>
      <TouchableOpacity onPress={onUndo} accessibilityRole="button" accessibilityLabel="삭제 실행 취소">
        <Text style={[styles.snackbarAction, {color: brand.secondary}]}>실행 취소</Text>
      </TouchableOpacity>
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
  onSwipeDelete,
  onRowWillOpen,
  onSwipeGestureActive,
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
  onSwipeDelete: (entry: PlaylistEntry) => void;
  onRowWillOpen: (entryId: string, close: () => void) => void;
  onSwipeGestureActive: (active: boolean) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const theme = useTheme();
  const swipeableRef = useRef<Swipeable>(null);
  const isMe = entry.addedByParticipantId === viewerParticipantId;
  // "다음 곡들" 큐에 있는 항목만(재생 중/재생 완료 제외) 순서 변경 버튼을 보여준다.
  const canReorder = !isPlaying && !readOnly && (onMoveUp || onMoveDown);

  return (
    <Swipeable
      ref={swipeableRef}
      overshootRight={false}
      renderRightActions={() => (
        <DeleteAction
          label={entry.track.title}
          onPress={() => {
            swipeableRef.current?.close();
            onSwipeDelete(entry);
          }}
        />
      )}
      onSwipeableOpenStartDrag={() => onSwipeGestureActive(true)}
      onSwipeableCloseStartDrag={() => onSwipeGestureActive(true)}
      onSwipeableWillOpen={() => {
        onSwipeGestureActive(false);
        onRowWillOpen(entry.entryId, () => swipeableRef.current?.close());
      }}
      onSwipeableWillClose={() => onSwipeGestureActive(false)}>
      <TouchableOpacity
        style={[styles.trackRow, {borderBottomColor: theme.border, backgroundColor: theme.bg}]}
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
    </Swipeable>
  );
}

/**
 * 혼합 세션 전용 트랙 행 — MixedPlaylistEntry(공통 식별자 계층)을 렌더링하고, "나"의 매칭 상태를
 * 곡 제목 아래 보조 텍스트로 함께 보여준다(00-ux-flow.md 2.11a "플레이리스트 탭의 해당 곡 항목에
 * 작은 스피너 + 찾는 중... 텍스트를 임시로 얹는다").
 */
function MixedTrackRow({
  entry,
  isPlaying,
  readOnly,
  viewerParticipantId,
  myParticipantId,
  ringColor,
  onDelete,
  onSwipeDelete,
  onRowWillOpen,
  onSwipeGestureActive,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  entry: MixedPlaylistEntry;
  isPlaying?: boolean;
  readOnly?: boolean;
  viewerParticipantId?: string;
  myParticipantId: string | null;
  ringColor: string;
  onDelete: (entry: MixedPlaylistEntry) => void;
  onSwipeDelete: (entry: MixedPlaylistEntry) => void;
  onRowWillOpen: (entryId: string, close: () => void) => void;
  onSwipeGestureActive: (active: boolean) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const theme = useTheme();
  const swipeableRef = useRef<Swipeable>(null);
  const isMe = entry.addedByParticipantId === viewerParticipantId;
  const canReorder = !isPlaying && !readOnly && (onMoveUp || onMoveDown);
  const myMatch = myParticipantId ? entry.matches[myParticipantId] : undefined;

  const matchStatusLabel = (() => {
    if (!myMatch) {return null;}
    if (myMatch.status === 'searching') {return {text: '내 플랫폼에서 찾는 중...', color: matchColors.medium};}
    if (myMatch.status === 'failed' && !myMatch.skipped) {return {text: '내 플랫폼에서 못 찾음 · 확인 필요', color: matchColors.low};}
    if (myMatch.status === 'matched' && myMatch.confirmState === 'pending') {
      return {text: `내 매칭 확인 필요 · 일치율 ${myMatch.track?.matchScore ?? 0}%`, color: matchColors.medium};
    }
    if (myMatch.status === 'matched') {return {text: '내 매칭 확정됨', color: matchColors.high};}
    return null;
  })();

  return (
    <Swipeable
      ref={swipeableRef}
      overshootRight={false}
      renderRightActions={() => (
        <DeleteAction
          label={entry.title}
          onPress={() => {
            swipeableRef.current?.close();
            onSwipeDelete(entry);
          }}
        />
      )}
      onSwipeableOpenStartDrag={() => onSwipeGestureActive(true)}
      onSwipeableCloseStartDrag={() => onSwipeGestureActive(true)}
      onSwipeableWillOpen={() => {
        onSwipeGestureActive(false);
        onRowWillOpen(entry.entryId, () => swipeableRef.current?.close());
      }}
      onSwipeableWillClose={() => onSwipeGestureActive(false)}>
      <TouchableOpacity
        style={[styles.trackRow, {borderBottomColor: theme.border, backgroundColor: theme.bg}]}
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
              accessibilityLabel={`${entry.title} 위로 이동`}
              accessibilityState={{disabled: !canMoveUp}}
              hitSlop={{top: 4, bottom: 4, left: 8, right: 8}}>
              <Text style={[styles.reorderGlyph, {color: theme.textSecondary, opacity: canMoveUp ? 1 : 0.3}]}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onMoveDown}
              disabled={!canMoveDown}
              accessibilityLabel={`${entry.title} 아래로 이동`}
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
            {entry.title}
          </Text>
          <Text style={[styles.trackArtist, {color: theme.textSecondary}]} numberOfLines={1}>
            {entry.artist}
          </Text>
          <PickerBadge displayName={entry.addedByDisplayName} ringColor={ringColor} isMe={isMe} variant="inline" />
          {matchStatusLabel && (
            <Text style={[styles.matchStatusText, {color: matchStatusLabel.color}]}>{matchStatusLabel.text}</Text>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md},
  scrollBody: {paddingBottom: spacing.xl},
  serviceChip: {marginBottom: 10},
  serviceChipText: {fontSize: 13, fontWeight: '700'},
  matchBadge: {alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 10},
  matchBadgeText: {fontSize: 12.5, fontWeight: '700'},
  miniPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.lg,
    gap: 8,
  },
  miniPlayerArt: {width: 32, height: 32, borderRadius: 6},
  miniPlayerTitle: {flex: 1, fontSize: 13, fontWeight: '600'},
  miniPlayerToggle: {fontSize: 16},
  sectionTitle: {fontSize: 15, fontWeight: '700', marginBottom: 8},
  // PB-01: 56px 상당 → 64px 실질 높이(paddingVertical 10→14 + 콘텐츠 높이)로 확대. 스와이프 액션
  // 버튼도 이 minHeight에 맞춰 세로로 꽉 채운다(06번 문서 A.6).
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: 14,
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
  matchStatusText: {fontSize: 11, fontWeight: '700', marginTop: 4},
  historyToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    marginTop: 8,
  },
  historyToggleText: {fontSize: 13, fontWeight: '600'},
  addButton: {
    marginTop: 20,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addButtonText: {fontSize: 15, fontWeight: '700'},
  // 06번 문서 A.6: 삭제 액션 배경 mutedRed(#E4573D) + 흰 텍스트, 폭 84.
  deleteAction: {
    width: 84,
    backgroundColor: syncColors.mutedRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionText: {color: '#FFFFFF', fontSize: 13, fontWeight: '700'},
  snackbar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  snackbarText: {flex: 1, fontSize: 13, fontWeight: '600'},
  snackbarAction: {fontSize: 13, fontWeight: '700'},
});
