import React from 'react';
import { Screen } from '@/ui/kit';
import { Chat } from '@/ui/chat';
import { useMe } from '@/ui/hooks';

export default function HoiDap() {
  const me = useMe();
  return <Screen tone="hs" title="Hỏi đáp" sub="Nhắn cán bộ kĩ thuật, giáo viên" scroll={false} pad={false}><Chat tid={me.uid} tone="hs" /></Screen>;
}
