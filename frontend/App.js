import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';// ????
import { AuthProvider } from './src/context/AuthContext';// Điều chỉnh đường dẫn cho đúng
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}