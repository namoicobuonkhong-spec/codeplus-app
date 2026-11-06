import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/ui/kit';
import { Chat } from '@/ui/chat';
import { useDoc } from '@/ui/hooks';

export default function ChatScreen() {
  const { tid } = useLocalSearchParams<{ tid: string }>();
  const u = useDoc<any>('users/' + tid);
  return <Screen tone="cb" title={u?.name || 'Tin nhắn'} sub={u?.className ? 'Lớp ' + u.className : undefined} back scroll={false} pad={false}><Chat tid={tid} tone="cb" student={u || undefined} /></Screen>;
}
