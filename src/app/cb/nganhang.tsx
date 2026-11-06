/* NGÂN HÀNG CÂU HỎI */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Card, Empty, Field, Loading, Muted, Pill, Screen, T , Chip } from '@/ui/kit';
import { TYPE_TEXT } from '@/ui/exam';
import { useQuery } from '@/ui/hooks';
import { F } from '@/ui/theme';
import type { KeyedQuestion } from '../../../shared/logic';

const LEVEL: Record<string, string> = { biet: 'Biết', hieu: 'Hiểu', vandung: 'Vận dụng' };

export default function NganHang() {
  const bank = useQuery<KeyedQuestion>('bank');
  const [q, setQ] = useState('');
  const [sub, setSub] = useState<string>('');
  if (!bank) return <Loading tone="cb" />;
  const subjects = Array.from(new Set(bank.map(x => x.subject || 'Khác'))).sort();
  const list = bank.filter(x => (!sub || x.subject === sub) && (!q || (x.text + ' ' + (x.chapter || '')).toLowerCase().includes(q.toLowerCase()))).sort((a, b) => (a.chapter || '').localeCompare(b.chapter || '') || a.id.localeCompare(b.id));
  return (
    <Screen tone="cb" title="Ngân hàng câu hỏi" sub={`${bank.length} câu`} back right={<Btn small tone="cb" title="Thêm" icon="add" onPress={() => router.push('/cb/cauhoi/moi')} />}>
      <Field value={q} onChange={setQ} placeholder="Tìm theo nội dung, chương" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Chip on={!sub} text="Tất cả" onPress={() => setSub('')} />{subjects.map(s => <Chip key={s} on={sub === s} text={s} onPress={() => setSub(s)} />)}</View>
      {list.length ? list.map(x => (
        <Card key={x.id} onPress={() => router.push(`/cb/cauhoi/${x.id}`)} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}><Pill text={TYPE_TEXT[x.type]} kind="info" />{x.level && <Pill text={LEVEL[x.level]} kind="muted" />}<Pill text={`${String(x.points).replace('.', ',')} đ`} kind="muted" /></View>
          <T numberOfLines={3} style={{ lineHeight: 21 }}>{x.text}</T>
          <Muted style={{ fontSize: 12.5 }}>{x.subject} · {x.chapter}</Muted>
        </Card>
      )) : <Card><Empty text="Không có câu hỏi phù hợp" icon="search-outline" /></Card>}
    </Screen>
  );
}
