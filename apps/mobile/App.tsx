import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initI18n } from './src/i18n/config';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/constants/theme';
import { ToastProvider } from './src/components/Toast';
import { takeNavigationStateForLanguageReload } from './src/i18n/config';
import { apiHealthCheck } from './src/features/queue/services/api';
import TestingWelcomeDialog from './src/components/TestingWelcomeDialog';

export default function App() {
  const [ready, setReady] = useState(false);
  const [initialNavigationState, setInitialNavigationState] = useState<any>();

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await initI18n();
      const savedState = await takeNavigationStateForLanguageReload();
      if (mounted) {
        setInitialNavigationState(savedState);
        setReady(true);
      }
      void apiHealthCheck();
    })();
    return () => { mounted = false; };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ToastProvider>
          <AppNavigator initialState={initialNavigationState} />
          <TestingWelcomeDialog />
        </ToastProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
