import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Card, Empty, Loading, Muted, Pill, Screen, Seg, T } from '@/ui/kit';
import { useMe, useQuery } from '@/ui/hooks';
import { SSTATUS, isManager, watchesAll } from '@/ui/staff';
import { F, fmtDate } from '@/ui/theme';
import type { SessionDoc } from '../../../shared/logic';

export default function CaThi() {
  const me = useMe();
  const [tab, setTab] = useState<'dang' | 'sap' | 'xong'>('dang');
  const all = useQuery<SessionDoc>('sessions', watchesAll(me) ? [] : [{ field: 'staffIds', op: 'array-contains', value: me.uid }]);
  if (!all) return <Loading tone="cb" />;
  const pick = all.filter(s => tab === 'dang' ? s.status === 'waiting' || s.status === 'running' : tab === 'sap' ? s.status === 'draft' : s.status === 'closed')
    .sort((a, b) => (tab === 'xong' ? -1 : 1) * (a.date + a.start).localeCompare(b.date + b.start));
  return (
    <Screen tone="cb" title="Ca thi" sub={`${all.length} ca`} right={isManager(me) ? <Btn small tone="cb" title="Tạo ca" icon="add" onPress={() => router.push('/cb/taoca')} /> : undefined}>
      <Seg tone="cb" value={tab} onChange={setTab} options={[['dang', 'Đang mở'], ['sap', 'Sắp tới'], ['xong', 'Đã xong']]} />
      {pick.length ? pick.map(s => (
        <Card key={s.id} onPress={() => router.push(`/cb/ca/${s.id}`)} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T style={{ fontFamily: F.sb, flex: 1 }} numberOfLines={1}>{s.name}</T>
            <Pill text={s.status === 'closed' && s.published ? 'Đã công bố' : SSTATUS[s.status][0]} kind={SSTATUS[s.status][1]} />
          </View>
          <Muted style={{ fontSize: 13 }}>{s.examTitle}</Muted>
          <Muted style={{ fontSize: 13 }}>{fmtDate(s.date)} · {s.start} · {s.durationMin} phút · {s.studentIds.length} thí sinh</Muted>
        </Card>
      )) : <Card><Empty text={tab === 'dang' ? 'Không có ca đang mở' : tab === 'sap' ? 'Chưa có ca sắp tới' : 'Chưa có ca đã xong'} icon="calendar-clear-outline" /></Card>}
    </Screen>
  );
}
