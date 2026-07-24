/**
 * Feel Music Share — 앱 진입점
 * MVP 스캐폴딩: 인증(Provider) + 세션 상태(Provider) + 네비게이션 조립까지만 다룬다.
 *
 * @format
 */
import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider} from './src/services/auth/AuthContext';
import {SessionProvider} from './src/state/SessionContext';
import RootNavigator from './src/navigation/RootNavigator';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SessionProvider>
          <RootNavigator />
        </SessionProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
