import React, {useEffect, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import AddTrackModal from './AddTrackModal';
import MatchCandidateList from './MatchCandidateList';
import MatchConfirmCard from './MatchConfirmCard';
import MatchFailCard from './MatchFailCard';
import {useAuth} from '../services/auth/AuthContext';
import {resolveQueueEntryId} from '../state/matchQueueNavigation';
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

  useEffect(() => {
    if (visible) {
      setMode('card');
    }
  }, [visible]);

  if (!visible || !session || session.service !== 'mixed' || !currentParticipantId || !myPlatform) {
    return null;
  }

  // 인덱스(cursor) 대신 entryId 기준으로 "지금 보여줄 항목"을 계산한다 — R7.13 수정,
  // 근거는 `state/matchQueueNavigation.ts` 주석 참고. 처리(확정/스킵/수동교체)된 항목은
  // `myPendingMatchEntryIds` 자체에서 다음 렌더에 자연히 빠지므로, 별도로 "다음 인덱스"를
  // 계산할 필요 없이 항상 대기열의 첫 항목을 보여주면 된다 — stale length를 참조하는 산술이
  // 아예 존재하지 않아 React state batching 여부와 무관하게 항상 올바르다.
  const entryId = resolveQueueEntryId(myPendingMatchEntryIds);
  const entry = entryId ? session.mixedPlaylist.find(e => e.entryId === entryId) : undefined;
  const myMatch = entry ? entry.matches[currentParticipantId] : undefined;

  const handleManualSelect = (track: Track) => {
    if (!entryId) {return;}
    manualMatchTrack(entryId, track);
    setMode('card');
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
            {myPendingMatchEntryIds.length > 1
              ? ` (${myPendingMatchEntryIds.indexOf(entryId as string) + 1}/${myPendingMatchEntryIds.length})`
              : ''}
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
              setMode('card');
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
              setMode('card');
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
