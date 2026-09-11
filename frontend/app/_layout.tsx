import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/useAuthStore';
import { useProfileStore } from '../src/store/useProfileStore';
import { useEmergencyStore } from '../src/store/useEmergencyStore';

export default function RootLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const fetchProfileAndReadiness = useProfileStore((s) => s.fetchProfileAndReadiness);
  const refreshActiveEmergency = useEmergencyStore((s) => s.refreshActiveEmergency);

  useEffect(() => {
    restoreSession();
    fetchProfileAndReadiness();
    // Sync SOS state with backend on app launch — clears stale local state
    refreshActiveEmergency();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(auth)/login" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="admin/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen
            name="sos/emergency"
            options={{
              presentation: 'fullScreenModal',
              animation: 'fade',
            }}
          />
        </Stack>
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  );
}
