import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {PrimaryButton, SecondaryButton} from '../../components/Buttons';
import {useTheme} from '../../theme/ThemeContext';
import {brand} from '../../theme/tokens';
import {
  canResignAdmin,
  canSwitchService,
  oppositeService,
  roleDisplayLabel,
  serviceLabel,
  shouldShowServiceSwitch,
} from '../../state/sessionPermissions';
import type {ParticipantRole, SessionState} from '../../types/domain';

/**
 * 세션 설정 화면 (00-ux-flow.md 2.13/2.13a/2.13b, 02-key-ui-patterns.md 6.3/6.4a/7.3/10절).
 *
 * `screens/room/*View.tsx`(NowPlayingView/PlaylistView) 명명 패턴을 그대로 따르되, 이 화면은 세션
 * 메인 탭 콘텐츠가 아니라 그 위로 전체 화면 전환되는 별도 화면이라(00-ux-flow.md 2.13 와이어프레임의
 * "← 세션 설정" 헤더, `03-screen-mockups.html` create-session-header와 동일한 톤) react-navigation
 * 스택 라우트를 새로 추가하는 대신(RootStackParamList 변경은 이번 라운드 범위 밖으로 판단—
 * RoomScreen.tsx가 이미 ParticipantsBottomSheet를 같은 방식으로 Modal 오버레이로 다루고 있어
 * 기존 패턴과의 일관성을 우선함) `Modal`(presentationStyle="fullScreen")로 구현했다. 진입점 판단
 * 근거는 RoomScreen.tsx/ParticipantsBottomSheet.tsx 주석 및 implementation-log.md 참고.
 *
 * 서비스 전환 확인 다이얼로그(2.13a)·전환 중 오버레이(2.13b)는 `03-screen-mockups.html`의
 * `.dialog-overlay`/`.dialog-card`/`.transition-overlay__*` 마크업을 그대로 이식했다 — 회전하는
 * ⏳ 이모지(CSS `spin` 애니메이션)만 RN 관용구인 `ActivityIndicator`로 대체했다(정적 HTML 목업의
 * CSS 키프레임 애니메이션을 그대로 옮기기보다 RN 표준 스피너를 쓰는 것이 유지보수·접근성 양쪽에서
 * 낫다고 판단, 텍스트 카피는 100% 동일하게 유지).
 */
interface SessionSettingsViewProps {
  visible: boolean;
  onClose: () => void;
  session: SessionState;
  /** 이 화면을 보고 있는 참여자 본인의 역할. */
  viewerRole: ParticipantRole;
  /** 혼합 세션에서만 의미 있음 — 내가 이 세션에서 선택한 참여 플랫폼. */
  myPlatform: 'spotify' | 'youtube' | null;
  onRequestServiceSwitch: (newService: 'spotify' | 'youtube') => void;
  onResignAdmin: () => void;
  /** 전환 완료 직후(설정 화면이 닫히고 세션 메인으로 복귀한 뒤) 상위 화면에 띄울 토스트 메시지. */
  onSwitchComplete: (message: string) => void;
}

const TRANSITION_OVERLAY_MS = 1400;

export default function SessionSettingsView({
  visible,
  onClose,
  session,
  viewerRole,
  myPlatform,
  onRequestServiceSwitch,
  onResignAdmin,
  onSwitchComplete,
}: SessionSettingsViewProps) {
  const [dialogTarget, setDialogTarget] = useState<'spotify' | 'youtube' | null>(null);
  const [transitionTarget, setTransitionTarget] = useState<'spotify' | 'youtube' | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (transitionTimer.current) {
        clearTimeout(transitionTimer.current);
      }
    };
  }, []);

  // 화면이 닫혔다가 다시 열릴 때 이전 진행 중이던 다이얼로그/오버레이 상태가 남아있지 않게 한다.
  useEffect(() => {
    if (!visible) {
      setDialogTarget(null);
      setTransitionTarget(null);
    }
  }, [visible]);

  if (!shouldShowServiceSwitch(session.service)) {
    return (
      <SettingsShell visible={visible} onClose={onClose}>
        <RoleSection
          role={viewerRole}
          onResignAdmin={() => confirmResign(onResignAdmin)}
        />
        <CapacityRow capacity={session.capacity} />
        <MixedPlatformRow myPlatform={myPlatform} />
      </SettingsShell>
    );
  }

  const activeService = session.service as 'spotify' | 'youtube';
  const canSwitch = canSwitchService(viewerRole);

  const openSwitchDialog = () => {
    if (!canSwitch) {return;}
    setDialogTarget(oppositeService(activeService));
  };

  const confirmSwitch = () => {
    const target = dialogTarget;
    if (!target) {return;}
    const previousLabel = serviceLabel(activeService);
    setDialogTarget(null);
    setTransitionTarget(target);
    transitionTimer.current = setTimeout(() => {
      onRequestServiceSwitch(target);
      setTransitionTarget(null);
      onSwitchComplete(`${serviceLabel(target)} 플레이리스트로 전환됐어요. ${previousLabel} 플레이리스트는 그대로 저장돼 있어요.`);
      onClose();
    }, TRANSITION_OVERLAY_MS);
  };

  return (
    <SettingsShell visible={visible} onClose={onClose}>
      <RoleSection role={viewerRole} onResignAdmin={() => confirmResign(onResignAdmin)} />
      <CapacityRow capacity={session.capacity} />
      <ServiceSwitchRow activeService={activeService} canSwitch={canSwitch} onPressSwitch={openSwitchDialog} />

      {dialogTarget && (
        <ServiceSwitchDialog
          fromService={activeService}
          toService={dialogTarget}
          onCancel={() => setDialogTarget(null)}
          onConfirm={confirmSwitch}
        />
      )}
      {transitionTarget && <TransitionOverlay targetService={transitionTarget} />}
    </SettingsShell>
  );
}

function confirmResign(onResignAdmin: () => void) {
  Alert.alert('관리자 권한을 반납할까요?', '서비스 전환 권한을 잃게 돼요.', [
    {text: '취소', style: 'cancel'},
    {text: '사임하기', style: 'destructive', onPress: onResignAdmin},
  ]);
}

function SettingsShell({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, {backgroundColor: theme.bg}]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="뒤로 가기" accessibilityRole="button">
            <Text style={[styles.back, {color: theme.text}]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: theme.text}]}>세션 설정</Text>
          <View style={styles.back} />
        </View>
        <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

/** "내 역할" 영역 — 관리자일 때만 바로 아래 "관리자 사임하기" 링크가 함께 노출된다 (6.4a절). */
function RoleSection({role, onResignAdmin}: {role: ParticipantRole; onResignAdmin: () => void}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.rowLabel, {color: theme.text}]}>내 역할: {roleDisplayLabel(role)}</Text>
      {canResignAdmin(role) && (
        <TouchableOpacity onPress={onResignAdmin} accessibilityRole="button">
          <Text style={[styles.linkText, {color: brand.primary}]}>관리자 사임하기 →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/** 정원 읽기 전용 표시 (02-key-ui-patterns.md 7.3절) — 조작 가능해 보이는 컨트롤을 절대 두지 않는다. */
function CapacityRow({capacity}: {capacity: number}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.rowLabel, {color: theme.textSecondary}]}>정원: {capacity}명 (변경 불가)</Text>
    </View>
  );
}

/** 혼합 세션 전용 — 서비스 전환 대신 "내가 참여 중인 플랫폼" 읽기 전용 표시 (00-ux-flow.md 2.13절 혼합 세션 예외). */
function MixedPlatformRow({myPlatform}: {myPlatform: 'spotify' | 'youtube' | null}) {
  const theme = useTheme();
  if (!myPlatform) {
    return null;
  }
  return (
    <View style={[styles.card, {backgroundColor: theme.cardBg}]}>
      <Text style={[styles.rowLabel, {color: theme.text}]}>내가 참여 중인 플랫폼: {serviceLabel(myPlatform)}</Text>
      <Text style={[styles.helperText, {color: theme.textSecondary}]}>
        혼합 세션은 세션 전체 차원의 서비스 전환이 없어요 — 참여자마다 자신의 플랫폼으로 계속 참여해요.
      </Text>
    </View>
  );
}

/** "음악 서비스: 전환하기" 항목 (02-key-ui-patterns.md 10절) — 방장/관리자만 활성. */
function ServiceSwitchRow({
  activeService,
  canSwitch,
  onPressSwitch,
}: {
  activeService: 'spotify' | 'youtube';
  canSwitch: boolean;
  onPressSwitch: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.card, {backgroundColor: theme.cardBg}]}>
      <Text style={[styles.rowLabel, {color: theme.text}]}>🎧 음악 서비스: {serviceLabel(activeService)}</Text>
      <TouchableOpacity
        onPress={onPressSwitch}
        disabled={!canSwitch}
        accessibilityRole="button"
        accessibilityState={{disabled: !canSwitch}}
        style={[styles.switchButton, {borderColor: canSwitch ? brand.primary : theme.border, opacity: canSwitch ? 1 : 0.5}]}>
        <Text style={[styles.switchButtonText, {color: canSwitch ? brand.primary : theme.textSecondary}]}>
          전환하기 ▸
        </Text>
      </TouchableOpacity>
      {!canSwitch && (
        <Text style={[styles.helperText, {color: theme.textSecondary}]}>
          ⓘ 방장 또는 관리자만 전환할 수 있어요
        </Text>
      )}
    </View>
  );
}

/** 서비스 전환 확인 다이얼로그 (00-ux-flow.md 2.13a, 03-screen-mockups.html .dialog-overlay/.dialog-card 이식). */
function ServiceSwitchDialog({
  fromService,
  toService,
  onCancel,
  onConfirm,
}: {
  fromService: 'spotify' | 'youtube';
  toService: 'spotify' | 'youtube';
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const theme = useTheme();
  const fromLabel = serviceLabel(fromService);
  const toLabel = serviceLabel(toService);
  return (
    <View style={[styles.overlay, {backgroundColor: theme.overlay}]}>
      <View style={[styles.dialogCard, {backgroundColor: theme.bgElevated, shadowColor: theme.shadow}]}>
        <Text style={[styles.dialogTitle, {color: theme.text}]}>음악 서비스 전환</Text>
        <Text style={[styles.dialogHeadline, {color: theme.text}]}>
          {fromLabel} → {toLabel}로{'\n'}전환할까요?
        </Text>
        <View style={[styles.dialogNote, {backgroundColor: theme.cardBg}]}>
          <Text style={styles.dialogNoteIcon}>ⓘ</Text>
          <Text style={[styles.dialogNoteText, {color: theme.textSecondary}]}>
            지금 재생 중인 곡이 멈춰요. 전환 후 {toLabel} 플레이리스트로 다시 동기화가 시작돼요.
          </Text>
        </View>
        <View style={[styles.dialogNote, {backgroundColor: theme.syncGreenBg}]}>
          <Text style={styles.dialogNoteIcon}>ⓘ</Text>
          <Text style={[styles.dialogNoteText, styles.dialogNoteEmphasis, {color: theme.text}]}>
            {fromLabel} 플레이리스트는 삭제되지 않고 그대로 저장돼 있어요 — 나중에 다시 {fromLabel}로
            돌아오면 이어서 쓸 수 있어요.
          </Text>
        </View>
        <View style={styles.dialogActions}>
          <SecondaryButton label="취소" onPress={onCancel} style={styles.dialogButton} />
          <PrimaryButton label="전환하기" onPress={onConfirm} style={styles.dialogButton} />
        </View>
      </View>
    </View>
  );
}

/** 전환 중 오버레이 (00-ux-flow.md 2.13b, 03-screen-mockups.html .transition-overlay__* 이식). */
function TransitionOverlay({targetService}: {targetService: 'spotify' | 'youtube'}) {
  const theme = useTheme();
  const label = serviceLabel(targetService);
  return (
    <View style={[styles.overlay, {backgroundColor: theme.overlay}]}>
      <View style={styles.transitionContent}>
        <ActivityIndicator size="large" color={theme.headerText} style={styles.transitionSpinner} />
        <Text style={[styles.transitionTitle, {color: theme.headerText}]}>{label}로 전환하는 중...</Text>
        <Text style={[styles.transitionDesc, {color: theme.headerText}]}>
          잠시 후 {label} 플레이리스트로{'\n'}이어집니다
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  back: {width: 28, fontSize: 20},
  headerTitle: {fontSize: 16, fontWeight: '700'},
  body: {paddingHorizontal: 20, paddingBottom: 40, gap: 16},
  section: {gap: 8},
  card: {borderRadius: 12, padding: 14, gap: 8},
  rowLabel: {fontSize: 15, fontWeight: '700'},
  linkText: {fontSize: 13, fontWeight: '700'},
  helperText: {fontSize: 12, lineHeight: 17},
  switchButton: {alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8},
  switchButtonText: {fontSize: 13, fontWeight: '700'},
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  dialogCard: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 1,
    shadowRadius: 36,
    elevation: 10,
  },
  dialogTitle: {fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 14},
  dialogHeadline: {fontSize: 14.5, fontWeight: '700', textAlign: 'center', marginBottom: 16},
  dialogNote: {flexDirection: 'row', gap: 8, borderRadius: 12, padding: 12, marginBottom: 10},
  dialogNoteIcon: {fontSize: 12},
  dialogNoteText: {flex: 1, fontSize: 12, lineHeight: 17.5},
  dialogNoteEmphasis: {fontWeight: '600'},
  dialogActions: {flexDirection: 'row', gap: 10, marginTop: 6},
  dialogButton: {flex: 1},
  transitionContent: {alignItems: 'center'},
  transitionSpinner: {marginBottom: 14},
  transitionTitle: {fontSize: 16, fontWeight: '700', marginBottom: 10, textAlign: 'center'},
  transitionDesc: {fontSize: 12.5, lineHeight: 19, opacity: 0.85, textAlign: 'center', maxWidth: 220},
});
