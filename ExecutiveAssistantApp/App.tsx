/**
 * Executive Assistant App
 * Personal assistant for email and calendar management
 *
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import AppInitializer from './src/utils/AppInitializer';

function App(): React.JSX.Element {
  useEffect(() => {
    // Initialize app services
    AppInitializer.initialize();

    // Handle app state changes
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        AppInitializer.onAppForeground();
      } else if (nextAppState === 'background') {
        AppInitializer.onAppBackground();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
