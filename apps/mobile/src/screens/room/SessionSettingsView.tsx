import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, Modal, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../navigation/types';
import BackButton from '../../components/BackButton';
import {PrimaryButton, SecondaryButton} from '../../components/Buttons';
import {useSession} from '../../state/SessionContext';
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
import type {ParticipantRole} from '../../types/domain';

/**
 * 세션 설정 화면 (00-ux-flow.md 2.13/2.13a/2.13b, 02-key-ui-patterns.md 6.3/6.4a/7.3/10절).
 *
 * (2026-07-27 변경, PB-02 — docs/design/06-ui-polish-audit.md) 원래 `Modal(presentationStyle="fullScreen")`
 * 로 구현했던 이유(RootStackParamList 변경을 피하고 ParticipantsBottomSheet와의 패턴 일관성을
 * 우선함)는 UI 폴리시 감사에서 뒤집혔다 — Modal은 네이티브 스택 push가 아니라서 iOS 표준 엣지 스와이프
 * 백 제스처가 동작하지 않는 문제(← 버튼을 눌러야만 닫힘)가 있었다. 이번 라운드부터 `RootStackParamList`에
 * `SessionSettings` 라우트를 추가해 실제 스택 화면으로 전환했다. `session`/`viewerRole`/`myPlatform`은
 * route param으로 넘기지 않고 `useSession()`으로 화면 내부에서 직접 조회한다(어차피 전역 세션 상태라
 * param 전달이 불필요 — RoomScreen.tsx가 하던 계산을 그대로 이 화면 안으로 옮겼을 뿐이다).
 *
 * 서비스 전환 완료 토스트(`onSwitchComplete`이던 것)는 이제 콜백 prop이 아니라
 * `navigation.navigate('Room', {sessionId, toastMessage})`로 전달한다 — Room이 이미 스택에 있는
 * 화면이라 navigate가 그 화면으로 되돌아가면서(goBack과 동일 효과) params를 병합해준다(navigation/types.ts
 * 주석 참고). RoomScreen.tsx가 그 값을 감지해 토스트를 띄우고 스스로 지운다.
 *
 * 서비스 전환 확인 다이얼로그(2.13a)·전환 중 오버레이(2.13b)는 `03-screen-mockups.html`의
 * `.dialog-overlay`/`.dialog-card`/`.transition-overlay__*` 마크업을 그대로 이식했다 — 회전하는
 * ⏳ 이모지(CSS `spin` 애니메이션)만 RN 관용구인 `ActivityIndicator`로 대체했다(정적 HTML 목업의
 * CSS 키프레임 애니메이션을 그대로 옮기기보다 RN 표준 스피너를 쓰는 것이 유지보수·접근성 양쪽에서
 * 낫다고 판단, 텍스트 카피는 100% 동일하게 유지).
 *
 * (2026-07-27 변경, PB-15) 이 화면이 더 이상 `Modal`이 아니게 되면서, `ServiceSwitchDialog`/
 * `TransitionOverlay`를 절대 위치 `View`로 직접 구현해 Modal-in-Modal을 피하던 이유 자체가 사라졌다
 * — 이제 둘 다 표준 RN `Modal`(transparent)로 되돌렸다.
 *
 * (2026-07-26 추가) 초대 코드 표시(00-ux-flow.md 2.7절, US-201) — `session.inviteCode`를 노출할 UI가
 * 그동안 앱 어디에도 없었다(방장이 "코드로 참여하기" 상대에게 코드를 알려줄 방법이 없는 갭).
 * 2.7 목업은 세션 생성 직후 QR코드까지 포함한 전용 화면을 그리지만, 이번 라운드에서는 정원 읽기
 * 전용 표시(`CapacityRow`) 바로 위에 `InviteCodeRow`만 추가했다 — (1) QR 코드는 생성 라이브러리
 * 신규 설치가 필요해 "가능하면 새 네이티브 의존성을 피한다"는 이전 라운드 관례에 어긋나고, (2)
 * 세션 설정은 언제든 열 수 있어 "생성 직후 1회성 노출"이 없어도 기능적 갭이 남지 않는다고 판단했다
 * (근거는 implementation-log.md에도 남김). 복사는 RN 코어의 `Clipboard`가 deprecated라 대신 코어의
 * `Share.share()`(신규 의존성 불필요)로 공유 시트를 띄운다 — OS 공유 시트 자체에 "복사" 옵션이
 * 포함되는 경우가 많아(카카오톡/메시지 공유 포함) 2.7 목업의 "링크 공유하기"+"코드 복사" 두 버튼을
 * 하나로 합쳐도 실질적 기능 갭이 없다고 판단했다.
 */
type Props = NativeStackScreenProps<RootStackParamList, 'SessionSettings'>;

const TRANSITION_OVERLAY_MS = 1400;

export default function SessionSettingsView({navigation}: Props) {
  const theme = useTheme();
  const {session, currentParticipantId, myPlatform, requestServiceSwitch, resignAdmin} = useSession();
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

  const goBack = () => navigation.goBack();

  if (!session) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: theme.bg}]}>
        <View style={styles.header}>
          <BackButton onPress={goBack} />
          <Text style={[styles.headerTitle, {color: theme.text}]}>세션 설정</Text>
          <View style={styles.back} />
        </View>
        <Text style={{color: theme.text, padding: 24}}>세션 정보를 찾을 수 없어요.</Text>
      </SafeAreaView>
    );
  }

  const viewerRole: ParticipantRole =
    session.participants.find(p => p.participantId === currentParticipantId)?.role ?? 'regular';

  if (!shouldShowServiceSwitch(session.service)) {
    return (
      <SettingsShell onBack={goBack}>
        <RoleSection role={viewerRole} onResignAdmin={() => confirmResign(resignAdmin)} />
        <InviteCodeRow inviteCode={session.inviteCode} sessionName={session.sessionName} />
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
      requestServiceSwitch(target);
      setTransitionTarget(null);
      navigation.navigate('Room', {
        sessionId: session.sessionId,
        toastMessage: `${serviceLabel(target)} 플레이리스트로 전환됐어요. ${previousLabel} 플레이리스트는 그대로 저장돼 있어요.`,
      });
    }, TRANSITION_OVERLAY_MS);
  };

  return (
    <SettingsShell onBack={goBack}>
      <RoleSection role={viewerRole} onResignAdmin={() => confirmResign(resignAdmin)} />
      <InviteCodeRow inviteCode={session.inviteCode} sessionName={session.sessionName} />
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

function SettingsShell({onBack, children}: {onBack: () => void; children: React.ReactNode}) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.bg}]}>
      <View style={styles.header}>
        <BackButton onPress={onBack} />
        <Text style={[styles.headerTitle, {color: theme.text}]}>세션 설정</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
    </SafeAreaView>
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

/**
 * 초대 코드 표시 (00-ux-flow.md 2.7절, US-201) — 방장/참여자 누구나 확인 가능(코드 자체는 비밀 정보가
 * 아니라 세션 정원 내 참여를 위한 공유 값이므로 역할 제한을 두지 않았다). "공유하기"는 OS 공유
 * 시트(`Share.share`)를 띄운다 — 실패(사용자 취소 포함)해도 조용히 무시한다(취소는 에러가 아님).
 */
function InviteCodeRow({inviteCode, sessionName}: {inviteCode: string; sessionName: string}) {
  const theme = useTheme();

  const shareInviteCode = async () => {
    try {
      await Share.share({
        message: `${sessionName} 세션에 초대할게요! Samewave 앱에서 초대 코드 "${inviteCode}"로 참여해보세요.`,
      });
    } catch {
      // 사용자가 공유를 취소한 경우 등 — 별도 에러 처리 없이 조용히 무시한다.
    }
  };

  return (
    <View style={[styles.card, {backgroundColor: theme.cardBg}]}>
      <Text style={[styles.rowLabel, {color: theme.text}]}>초대 코드</Text>
      <Text style={[styles.inviteCodeText, {color: brand.primary}]}>{inviteCode}</Text>
      <Text style={[styles.helperText, {color: theme.textSecondary}]}>
        이 코드를 상대에게 알려주면 "코드로 참여하기"로 이 세션에 들어올 수 있어요.
      </Text>
      <TouchableOpacity
        onPress={shareInviteCode}
        accessibilityRole="button"
        accessibilityLabel="초대 코드 공유하기"
        style={[styles.switchButton, {borderColor: brand.primary}]}>
        <Text style={[styles.switchButtonText, {color: brand.primary}]}>초대 코드 공유하기 ▸</Text>
      </TouchableOpacity>
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

/**
 * 서비스 전환 확인 다이얼로그 (00-ux-flow.md 2.13a, 03-screen-mockups.html .dialog-overlay/.dialog-card 이식).
 * (2026-07-27, PB-15) 표준 `Modal(transparent)`로 되돌렸다 — 위 파일 헤더 주석 참고.
 */
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
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
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
    </Modal>
  );
}

/**
 * 전환 중 오버레이 (00-ux-flow.md 2.13b, 03-screen-mockups.html .transition-overlay__* 이식).
 * (2026-07-27, PB-15) 표준 `Modal(transparent)`로 되돌렸다 — 전환 도중에는 사용자가 취소할 방법이
 * 없으므로 `onRequestClose`는 안드로이드 뒤로가기를 그냥 무시하는 no-op으로 둔다.
 */
function TransitionOverlay({targetService}: {targetService: 'spotify' | 'youtube'}) {
  const theme = useTheme();
  const label = serviceLabel(targetService);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={[styles.overlay, {backgroundColor: theme.overlay}]}>
        <View style={styles.transitionContent}>
          <ActivityIndicator size="large" color={theme.headerText} style={styles.transitionSpinner} />
          <Text style={[styles.transitionTitle, {color: theme.headerText}]}>{label}로 전환하는 중...</Text>
          <Text style={[styles.transitionDesc, {color: theme.headerText}]}>
            잠시 후 {label} 플레이리스트로{'\n'}이어집니다
          </Text>
        </View>
      </View>
    </Modal>
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
  inviteCodeText: {fontSize: 26, fontWeight: '800', letterSpacing: 4},
  linkText: {fontSize: 13, fontWeight: '700'},
  helperText: {fontSize: 12, lineHeight: 17},
  switchButton: {alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8},
  switchButtonText: {fontSize: 13, fontWeight: '700'},
  overlay: {
    flex: 1,
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
