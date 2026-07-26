import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RootStackParamList} from './types';
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SpotifyConnectScreen from '../screens/SpotifyConnectScreen';
import HomeScreen from '../screens/HomeScreen';
import CreateSessionScreen from '../screens/CreateSessionScreen';
import RoomScreen from '../screens/RoomScreen';
import {useTheme} from '../theme/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

// (2026-07-26 변경) 초기 라우트를 Splash로 고정했다 — 로그인 상태(status)에 따른 분기는 더 이상
// 여기서 하지 않고 SplashScreen.tsx가 최소 노출 시간 이후에 navigation.replace로 직접 수행한다
// (00-ux-flow.md 2.1절, 판단 근거는 SplashScreen.tsx 주석/implementation-log.md 참고).
export default function RootNavigator() {
  const theme = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerStyle: {backgroundColor: theme.headerBg},
          headerTintColor: theme.headerText,
          contentStyle: {backgroundColor: theme.bg},
        }}>
        <Stack.Screen name="Splash" component={SplashScreen} options={{headerShown: false}} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{headerShown: false}} />
        <Stack.Screen name="SpotifyConnect" component={SpotifyConnectScreen} options={{headerShown: false}} />
        <Stack.Screen name="Home" component={HomeScreen} options={{headerShown: false}} />
        <Stack.Screen name="CreateSession" component={CreateSessionScreen} options={{headerShown: false}} />
        <Stack.Screen name="Room" component={RoomScreen} options={{headerShown: false}} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
