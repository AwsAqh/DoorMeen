/**
 * Root Navigation — React Navigation stack
 * Mirrors the web React Router structure:
 *
 *   /            → HomeScreen
 *   /queue/:id   → QueueScreen      (customer view)
 *   /owner/:id   → OwnerDashboardScreen
 *   /scan        → ScanScreen       (QR scanner, replaces web ScanPage)
 *   /join/:id    → JoinScreen       (form to join a queue)
 *   /create      → CreateQueueScreen
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Colors } from '../constants/theme';

// ─── Screen imports ──────────────────────────────────────────────────────────
import HomeScreen           from '../screens/HomeScreen';
import QueueScreen          from '../screens/QueueScreen';
import OwnerDashboardScreen from '../screens/OwnerDashboardScreen';
import ScanScreen           from '../screens/ScanScreen';
import JoinScreen           from '../screens/JoinScreen';
import CreateQueueScreen    from '../screens/CreateQueueScreen';
import ManageLoginScreen    from '../screens/ManageLoginScreen';
import LanguageSwitcher     from '../components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

// ─── Route param types ────────────────────────────────────────────────────────
export type RootStackParamList = {
  Home:           undefined;
  Queue:          { queueId: string };
  OwnerDashboard: { queueId: string };
  Scan:           undefined;
  Join:           { queueId: string; ownerReturn?: boolean };
  CreateQueue:    undefined;
  ManageLogin:    { queueId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator({ initialState }: { initialState?: React.ComponentProps<typeof NavigationContainer>['initialState'] }) {
  const { t, i18n } = useTranslation();
  const screenOptions = {
  headerStyle:      { backgroundColor: Colors.bgPrimary },
    headerTintColor:  Colors.textPrimary,
    headerTitleStyle: { fontWeight: '600' as const, color: Colors.textPrimary, fontFamily: i18n.language === 'ar' ? 'Cairo' : 'Manrope' },
    headerTitleAlign: 'center' as const,
    headerRight: () => <LanguageSwitcher />,
    contentStyle:     { backgroundColor: Colors.bgPrimary },
    animation:        'slide_from_right' as const,
  };
  return (
    <NavigationContainer initialState={initialState}>
      <Stack.Navigator initialRouteName="Home" screenOptions={screenOptions}>
        <Stack.Screen name="Home"           component={HomeScreen}           options={{ title: 'DoorMeen', headerShown: false }} />
        <Stack.Screen name="Scan"           component={ScanScreen}           options={{ title: t('nav.scan') }} />
        <Stack.Screen name="Join"           component={JoinScreen}           options={{ title: t('nav.join') }} />
        <Stack.Screen name="Queue"          component={QueueScreen}          options={{ title: t('nav.queue') }} />
        <Stack.Screen name="CreateQueue"    component={CreateQueueScreen}    options={{ title: t('nav.create') }} />
        <Stack.Screen name="ManageLogin"    component={ManageLoginScreen}    options={{ title: t('nav.manage') }} />
        <Stack.Screen name="OwnerDashboard" component={OwnerDashboardScreen} options={{ title: t('nav.dashboard') }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
