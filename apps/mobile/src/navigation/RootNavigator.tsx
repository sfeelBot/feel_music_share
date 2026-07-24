import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RootStackParamList} from './types';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import RoomScreen from '../screens/RoomScreen';
import {useAuth} from '../services/auth/AuthContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const {status} = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={status === 'signed_in' ? 'Home' : 'Onboarding'}
        screenOptions={{headerStyle: {backgroundColor: '#0F0F14'}, headerTintColor: '#FFFFFF'}}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{headerShown: false}} />
        <Stack.Screen name="Home" component={HomeScreen} options={{title: 'Feel Music Share'}} />
        <Stack.Screen name="Room" component={RoomScreen} options={{title: '방'}} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
