import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Card, Empty, Loading, Muted, Row, Screen, T } from '@/ui/kit';
import { useQuery } from '@/ui/hooks';
import { C, F, ago, initials } from '@/ui/theme';

export default function TinNhan() {
  const threads = useQuery<any>('threads');
  if (!threads) return <Loading tone="cb" />;
  const list = threads.filter(t => t.lastAt).sort((a, b) => b.lastAt - a.lastAt);
  return (
    <Screen tone="cb" title="Tin nhắn" sub="Học sinh hỏi đáp">
      <Card pad={false}>
        {list.length ? list.map((t, i) => (
          <Row key={t.uid} first={i === 0} tone="cb" title={`${t.name}${t.className ? ' · ' + t.className : ''}`} sub={t.last} onPress={() => router.push(`/cb/chat/${t.uid}`)}
            right={<View style={{ alignItems: 'flex-end', gap: 4 }}><Muted style={{ fontSize: 12 }}>{ago(t.lastAt)}</Muted>{!!t.unreadStaff && <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.bad, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}><T style={{ color: '#fff', fontSize: 11, fontFamily: F.b }}>{t.unreadStaff}</T></View>}</View>} />
        )) : <Empty text="Chưa có tin nhắn nào" icon="chatbubbles-outline" />}
      </Card>
    </Screen>
  );
}
