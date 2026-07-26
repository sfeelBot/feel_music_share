import React, {useEffect, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import AddTrackModal from './AddTrackModal';
import MatchCandidateList from './MatchCandidateList';
import MatchConfirmCard from './MatchConfirmCard';
import MatchFailCard from './MatchFailCard';
import {useAuth} from '../services/auth/AuthContext';
import {useSession} from '../state/SessionContext';
import {useTheme} from '../theme/ThemeContext';
import type {Track} from '../types/domain';

/**
 * 매칭 확인 큐 오케스트레이터 (00-ux-flow.md 2.11a~2.11d, 02-key-ui-patterns.md 5절).
 *
 * "확인할 매칭 N개" 배지(2.11a)를 탭하면 열리는 큐 — 여러 개면 다음/이전으로 넘기는 큐 형태로
 * 하나씩 보여준다(강제 모달로 매 곡마다 가로막지 않는다는 디자인 절충안, 00-ux-flow.md 2.11a).
 * 카드(2.11b) → 대체 후보(2.11c) / 매칭 실패(2.11d) → 직접 검색(2.11 재사용) 화면 전환을
 * 이 컴포넌트 하나가 담당한다.
 */
interface MatchingQueueSheetProps {
  visible: boolean;
  onClose: () => void;
}

type Mode = 'card' | 'candidates' | 'search';

export default function MatchingQueueSheet({visible, onClose}: MatchingQueueSheetProps) {
  const theme = useTheme();
  const {tokens} = useAuth();
  const {
    session,
    currentParticipantId,
    myPlatform,
    myPendingMatchEntryIds,
    confirmMyMatch,
    selectMyMatchCandidate,
    manualMatchTrack,
    skipMyMatch,
  } = useSession();
  const [mode, setMode] = useState<Mode>('card');
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (visible) {
      setCursor(0);
      setMode('card');
    }
  }, [visible]);

  useEffect(() => {
    setCursor(prev => Math.min(prev, Math.max(0, myPendingMatchEntryIds.length - 1)));
  }, [myPendingMatchEntryIds.length]);

  if (!visible || !session || session.service !== 'mixed' || !currentParticipantId || !myPlatform) {
    return null;
  }

  const entryId = myPendingMatchEntryIds[cursor];
  const entry = entryId ? session.mixedPlaylist.find(e => e.entryId === entryId) : undefined;
  const myMatch = entry ? entry.matches[currentParticipantId] : undefined;

  const goToNextInQueue = () => {
    setMode('card');
    setCursor(prev => (prev < myPendingMatchEntryIds.length - 1 ? prev + 1 : prev));
  };

  const handleManualSelect = (track: Track) => {
    if (!entryId) {return;}
    manualMatchTrack(entryId, track);
    goToNextInQueue();
  };

  if (mode === 'search') {
    return (
      <AddTrackModal
        visible
        onClose={() => setMode('card')}
        service={myPlatform}
        accessToken={myPlatform === 'spotify' ? tokens?.accessToken ?? null : null}
        onSelectTrack={handleManualSelect}
        headerTitle="직접 검색하기"
      />
    );
  }

  // 큐가 비었으면(전부 처리 완료) 자동으로 닫는다.
  if (!entry || !myMatch) {
    onClose();
    return null;
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, {backgroundColor: theme.overlay}]} onPress={onClose} />
      <View style={[styles.sheet, {backgroundColor: theme.bgElevated}]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="닫기">
            <Text style={[styles.close, {color: theme.textSecondary}]}>✕</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: theme.text}]}>
            {mode === 'candidates' ? '다른 결과 보기' : '곡 매칭 확인'}
            {myPendingMatchEntryIds.length > 1 ? ` (${cursor + 1}/${myPendingMatchEntryIds.length})` : ''}
          </Text>
          <View style={styles.close} />
        </View>

        {myMatch.status === 'failed' ? (
          <MatchFailCard
            entry={entry}
            platform={myPlatform}
            onManualSearch={() => setMode('search')}
            onSkip={() => {
              skipMyMatch(entryId as string);
              goToNextInQueue();
            }}
          />
        ) : mode === 'candidates' ? (
          <MatchCandidateList
            candidates={myMatch.candidates}
            onSelect={candidate => {
              selectMyMatchCandidate(entryId as string, candidate);
              setMode('card');
            }}
            onManualSearch={() => setMode('search')}
          />
        ) : myMatch.track ? (
          <MatchConfirmCard
            entry={entry}
            track={myMatch.track}
            hasCandidates={myMatch.candidates.length > 0}
            onConfirm={() => {
              confirmMyMatch(entryId as string);
              goToNextInQueue();
            }}
            onShowCandidates={() => setMode('candidates')}
            onManualSearch={() => setMode('search')}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1},
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16},
  close: {width: 28, fontSize: 16},
  headerTitle: {fontSize: 15, fontWeight: '700'},
});
