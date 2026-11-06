import React from 'react';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router/js-tabs';
import { Icon, type IconName } from '@/ui/kit';
import { useUser } from '@/ui/hooks';
import { C, F } from '@/ui/theme';

const tab = (title: string, icon: IconName) => ({ title, tabBarIcon: ({ color }: { color: any }) => <Icon name={icon} size={22} color={String(color)} /> });

export default function HsTabs() {
  const u = useUser();
  const ins = useSafeAreaInsets();
  if (!u) return <Redirect href="/login" />;
  if (u.role !== 'student') return <Redirect href="/(cb)" />;
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: C.hs, tabBarInactiveTintColor: C.muted, tabBarLabelStyle: { fontFamily: F.sb, fontSize: 11.5 }, tabBarStyle: { borderTopColor: C.line, height: 62 + ins.bottom, paddingTop: 6, paddingBottom: ins.bottom + 6 } }}>
      <Tabs.Screen name="index" options={tab('Trang chủ', 'home-outline')} />
      <Tabs.Screen name="lich" options={tab('Lịch thi', 'calendar-outline')} />
      <Tabs.Screen name="ketqua" options={tab('Kết quả', 'bar-chart-outline')} />
      <Tabs.Screen name="hoidap" options={tab('Hỏi đáp', 'chatbubble-ellipses-outline')} />
      <Tabs.Screen name="toi" options={tab('Tài khoản', 'person-circle-outline')} />
    </Tabs>
  );
}
