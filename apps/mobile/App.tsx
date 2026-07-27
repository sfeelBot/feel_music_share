/**
 * Feel Music Share — 앱 진입점
 * MVP 스캐폴딩: 인증(Provider) + 세션 상태(Provider) + 네비게이션 조립까지만 다룬다.
 *
 * @format
 */
import React from 'react';
import {Platform, UIManager} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ThemeProvider} from './src/theme/ThemeContext';
import {AuthProvider} from './src/services/auth/AuthContext';
import {FirebaseAuthProvider} from './src/state/FirebaseAuthContext';
import {SessionProvider} from './src/state/SessionContext';
import RootNavigator from './src/navigation/RootNavigator';

// PB-16(docs/design/06-ui-polish-audit.md) — LayoutAnimation은 Android에서 기본적으로 꺼져 있어
// 명시적으로 켜야 한다(iOS는 기본 활성). 앱 시작 시 1회만 실행하면 되므로 모듈 최상단에 둔다.
// (New Architecture(Fabric)가 활성화돼 있어 Paper 전용 API인 이 experimental 플래그가 사실상
// no-op일 수 있지만, 하위 호환을 위해 관용적으로 계속 호출해두는 RN 커뮤니티 패턴을 따른다.)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function App(): React.JSX.Element {
  return (
    // react-native-gesture-handler 필수 설정 — 앱 루트를 GestureHandlerRootView로 감싸지 않으면
    // iOS/Android 모두에서 Swipeable(스와이프 삭제)/PanGestureHandler(드래그로 닫기) 제스처가 전혀
    // 반응하지 않는다(docs/design/06-ui-polish-audit.md 파트 A.2 경고). RN `Modal`로 렌더링되는
    // 화면(ParticipantsBottomSheet/MatchingQueueSheet)은 별도의 네이티브 루트라 이 래퍼가 닿지
    // 않으므로, 그 두 컴포넌트 내부에 각자 GestureHandlerRootView를 추가로 둬야 한다(각 파일 주석 참고).
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <ThemeProvider>
          {/* FirebaseAuthProvider는 AuthProvider(Spotify OAuth)와 완전히 독립적인 신원 시스템이라
              중첩 순서가 서로에게 영향을 주지 않는다 — AuthProvider 바깥에 둔 이유는 단지 "세션
              생성 액션이 참조하는 두 값(Spotify 프로필, Firebase uid) 중 어느 하나가 먼저 준비돼도
              무방하다"는 걸 코드 구조로도 드러내기 위함(둘 중 하나에 종속되지 않음). */}
          <FirebaseAuthProvider>
            <AuthProvider>
              <SessionProvider>
                <RootNavigator />
              </SessionProvider>
            </AuthProvider>
          </FirebaseAuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
