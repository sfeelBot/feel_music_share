import React, {useState} from 'react';
import {FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Avatar from './Avatar';
import RoleBadge from './RoleBadge';
import {useTheme} from '../theme/ThemeContext';
import {syncColors} from '../theme/tokens';
import type {ParticipantInfo, SessionState} from '../types/domain';

/**
 * 참여자 바텀시트 (00-ux-flow.md 2.12절, 02-key-ui-patterns.md 6.4절/8절).
 * - 참여자별 연결 상태 상세 표시
 * - 참여 인원 vs 재생 인원(Free 계정 제외) 조건부 헤더 — Spotify 세션에서만 노출
 *   (04-playlist.md "Free 계정 처리" 절: 경고문/Free 표시는 Spotify 세션 전용, YouTube는
 *   Premium 여부로 재생 가능 인원이 갈리지 않으므로 표시하지 않는다. NowPlayingView.tsx의
 *   `session.service === 'spotify'` 가드와 동일한 패턴.)
 * - 방장 전용: 참여자별 ⋮ 메뉴로 관리자 임명/해제
 *
 * TODO(Firebase 연동): 관리자 임명/해제는 반드시 서버(Cloud Functions)에서 권한을 재검증해야 한다
 * (04-playlist.md "디자인 에이전트 전달 사항" 6번) — 이 컴포넌트는 클라이언트 표시만 담당한다.
 *
 * 드래그로 닫는 제스처는 이번 라운드에서 구현하지 않았다(제스처 라이브러리 미설치) — 닫기 버튼/배경
 * 탭으로 대체. TODO(다음 단계): react-native-gesture-handler 도입 시 드래그 닫기 추가.
 */
interface ParticipantsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  session: SessionState;
  participants: ParticipantInfo[];
  viewerIsHost: boolean;
  onAppointAdmin: (participantId: string) => void;
  onRevokeAdmin: (participantId: string) => void;
}

export default function ParticipantsBottomSheet({
  visible,
  onClose,
  session,
  participants,
  viewerIsHost,
  onAppointAdmin,
  onRevokeAdmin,
}: ParticipantsBottomSheetProps) {
  const theme = useTheme();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const showFreeTierUi = session.service === 'spotify';
  const playableCount = participants.filter(p => p.accountTier === 'premium').length;
  const headerTitle =
    !showFreeTierUi || playableCount === participants.length
      ? `참여자 (${participants.length})`
      : `참여자 (${participants.length}) · 재생 ${playableCount}명`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, {backgroundColor: theme.overlay}]} onPress={onClose} />
      <View style={[styles.sheet, {backgroundColor: theme.bgElevated}]}>
        <View style={[styles.grabber, {backgroundColor: theme.border}]} />
        <Text style={[styles.title, {color: theme.text}]}>{headerTitle}</Text>
        <FlatList
          data={participants}
          keyExtractor={item => item.participantId}
          renderItem={({item}) => (
            <ParticipantRow
              participant={item}
              showFreeTierUi={showFreeTierUi}
              menuOpen={openMenuId === item.participantId}
              canManage={viewerIsHost && item.role !== 'host'}
              onToggleMenu={() =>
                setOpenMenuId(prev => (prev === item.participantId ? null : item.participantId))
              }
              onAppointAdmin={() => {
                onAppointAdmin(item.participantId);
                setOpenMenuId(null);
              }}
              onRevokeAdmin={() => {
                onRevokeAdmin(item.participantId);
                setOpenMenuId(null);
              }}
            />
          )}
        />
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
          <Text style={[styles.closeText, {color: theme.textSecondary}]}>닫기</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function ParticipantRow({
  participant,
  showFreeTierUi,
  menuOpen,
  canManage,
  onToggleMenu,
  onAppointAdmin,
  onRevokeAdmin,
}: {
  participant: ParticipantInfo;
  showFreeTierUi: boolean;
  menuOpen: boolean;
  canManage: boolean;
  onToggleMenu: () => void;
  onAppointAdmin: () => void;
  onRevokeAdmin: () => void;
}) {
  const theme = useTheme();
  const statusColor = participant.delaySeconds > 0 ? syncColors.amberAlert : syncColors.syncGreen;
  const statusLabel = participant.delaySeconds > 0 ? `지연 ${participant.delaySeconds}초` : '정상';

  return (
    <View style={[styles.row, {borderBottomColor: theme.border}]}>
      <Avatar initial={participant.displayName.slice(0, 1)} ringColor={participant.ringColor} />
      <View style={styles.nameArea}>
        <View style={styles.nameLine}>
          <Text style={[styles.name, {color: theme.text}]} numberOfLines={1}>
            {participant.displayName}
          </Text>
          <RoleBadge role={participant.role} />
        </View>
        {showFreeTierUi && participant.accountTier === 'free' && (
          <Text style={[styles.freeTag, {color: theme.textSecondary}]}>Free · 재생 불가</Text>
        )}
      </View>
      <Text style={[styles.status, {color: statusColor}]}>{statusLabel}</Text>
      {canManage && (
        <TouchableOpacity onPress={onToggleMenu} accessibilityLabel={`${participant.displayName}님 관리 메뉴 열기`}>
          <Text style={[styles.menuTrigger, {color: theme.textSecondary}]}>⋮</Text>
        </TouchableOpacity>
      )}
      {menuOpen && (
        <View style={[styles.menu, {backgroundColor: theme.cardBg, borderColor: theme.border}]}>
          <Text style={[styles.menuHint, {color: theme.textSecondary}]}>방장 전용 메뉴</Text>
          {participant.role === 'admin' ? (
            <TouchableOpacity onPress={onRevokeAdmin}>
              <Text style={[styles.menuItem, {color: theme.text}]}>🛡 관리자 해제</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onAppointAdmin}>
              <Text style={[styles.menuItem, {color: theme.text}]}>🛡 관리자로 임명</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1},
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  grabber: {alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 14},
  title: {fontSize: 16, fontWeight: '700', marginBottom: 12},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  nameArea: {flex: 1},
  nameLine: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap'},
  name: {fontSize: 15, fontWeight: '600'},
  freeTag: {fontSize: 11, marginTop: 2},
  status: {fontSize: 12, fontWeight: '600'},
  menuTrigger: {fontSize: 20, paddingHorizontal: 6},
  menu: {
    position: 'absolute',
    right: 0,
    top: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    minWidth: 160,
    zIndex: 10,
    elevation: 6,
  },
  menuHint: {fontSize: 10, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 6},
  menuItem: {fontSize: 13, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 8},
  closeBtn: {alignItems: 'center', paddingTop: 8},
  closeText: {fontSize: 14, fontWeight: '600'},
});
