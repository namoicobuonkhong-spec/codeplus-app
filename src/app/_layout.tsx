import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold } from '@expo-google-fonts/be-vietnam-pro';
import { api } from '@/data/api';
import { AuthCtx } from '@/ui/hooks';
import { DialogHost } from '@/ui/kit';
import type { UserDoc } from '../../shared/logic';

SplashScreen.preventAutoHideAsync().catch(() => { });

export default function Root() {
  const [fonts] = useFonts({ BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold });
  const [user, setUser] = useState<UserDoc | null | undefined>(undefined);
  useEffect(() => api.onUser(setUser), []);
  useEffect(() => { if (fonts && user !== undefined) SplashScreen.hideAsync().catch(() => { }); }, [fonts, user]);
  if (!fonts || user === undefined) return null;
  return (
    <SafeAreaProvider>
      <AuthCtx.Provider value={{ user }}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
        <DialogHost />
      </AuthCtx.Provider>
    </SafeAreaProvider>
  );
}
