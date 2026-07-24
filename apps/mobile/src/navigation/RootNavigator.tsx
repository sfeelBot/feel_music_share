import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RootStackParamList} from './types';
import OnboardingScreen from '../screens/OnboardingScreen';
import SpotifyConnectScreen from '../screens/SpotifyConnectScreen';
import HomeScreen from '../screens/HomeScreen';
import CreateSessionScreen from '../screens/CreateSessionScreen';
import RoomScreen from '../screens/RoomScreen';
import {useAuth} from '../services/auth/AuthContext';
import {useTheme} from '../theme/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const {status} = useAuth();
  const theme = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={status === 'signed_in' ? 'Home' : 'Onboarding'}
        screenOptions={{
          headerStyle: {backgroundColor: theme.headerBg},
          headerTintColor: theme.headerText,
          contentStyle: {backgroundColor: theme.bg},
        }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{headerShown: false}} />
        <Stack.Screen name="SpotifyConnect" component={SpotifyConnectScreen} options={{headerShown: false}} />
        <Stack.Screen name="Home" component={HomeScreen} options={{headerShown: false}} />
        <Stack.Screen name="CreateSession" component={CreateSessionScreen} options={{headerShown: false}} />
        <Stack.Screen name="Room" component={RoomScreen} options={{headerShown: false}} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
