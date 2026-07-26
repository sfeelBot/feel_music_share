import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Modal, StyleSheet, Text, View} from 'react-native';
import {SecondaryButton} from './Buttons';
import {useTheme} from '../theme/ThemeContext';

/**
 * 재접속 중 오버레이 (00-ux-flow.md 2.14절, US-206).
 *
 * "반투명 오버레이 + '연결이 불안정해요, 다시 연결하는 중...' + 스피너. 일정 시간 초과 시
 * '세션에서 나가기' 옵션 노출" — 문서 문구를 그대로 옮겼다. `SessionSettingsView.tsx`의
 * `TransitionOverlay`(2.13b)와 톤을 맞춰 `theme.overlay` 배경 + `theme.headerText` 전경색을 쓴다.
 *
 * TODO(Firebase 연동, 중요 — 이 컴포넌트 자체는 완성이지만 트리거는 아직 실제로 동작하지 않는다):
 * `visible` 여부를 결정하는 실제 네트워크 끊김/재접속 감지 로직은 존재하지 않는다. 호출부
 * (`RoomScreen.tsx`)는 "내 참여자 레코드의 `connectionStatus === 'reconnecting'`"이라는 정직한
 * 조건으로 이 컴포넌트를 연결해뒀지만, `connectionStatus`는 지금 인메모리 목업
 * (`services/session/mockSessionSeed.ts`)이 항상 `'connected'`로 고정해서 만들기 때문에 실제 앱
 * 사용 중에는 이 오버레이가 나타날 방법이 없다 — 스토리북처럼 `visible` prop을 강제로 true로 두면
 * 언제든 렌더링해서 확인할 수 있는 상태로만 완성해뒀다. 실제 연결 상태 감지는 Firebase Realtime
 * Database Presence(`onDisconnect` 등) 연동 이후의 과제다(`state/SessionContext.tsx` 상단
 * TODO 5번과 동일 맥락) — 가짜 타이머 등으로 "실제로 끊긴 것처럼" 흉내 내지 않는다.
 */
interface ReconnectingOverlayProps {
  visible: boolean;
  onLeaveSession: () => void;
}

/** "일정 시간 초과 시" — 문서가 구체적 초 단위를 못 박지 않아 08초로 임의 선택(구현 판단). */
const LEAVE_OPTION_TIMEOUT_MS = 8000;

export default function ReconnectingOverlay({visible, onLeaveSession}: ReconnectingOverlayProps) {
  const theme = useTheme();
  const [showLeaveOption, setShowLeaveOption] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      setShowLeaveOption(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setTimeout(() => setShowLeaveOption(true), LEAVE_OPTION_TIMEOUT_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={[styles.overlay, {backgroundColor: theme.overlay}]}>
        <ActivityIndicator size="large" color={theme.headerText} style={styles.spinner} />
        <Text style={[styles.title, {color: theme.headerText}]}>
          연결이 불안정해요,{'\n'}다시 연결하는 중...
        </Text>
        {showLeaveOption && (
          <SecondaryButton label="세션에서 나가기" onPress={onLeaveSession} style={styles.leaveButton} />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32},
  spinner: {marginBottom: 18},
  title: {fontSize: 16, fontWeight: '700', textAlign: 'center', lineHeight: 23},
  leaveButton: {marginTop: 28, minWidth: 200},
});
