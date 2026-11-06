/* BIÊN BẢN VI PHẠM */
import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Card, Empty, Loading, Muted, Screen, T } from '@/ui/kit';
import { useQuery } from '@/ui/hooks';
import { F, fmtDate, fmtTime } from '@/ui/theme';
import type { SessionDoc } from '../../../shared/logic';

export default function ViPham() {
  const { sid } = useLocalSearchParams<{ sid?: string }>();
  const list = useQuery<any>('incidents', sid ? [{ field: 'sid', op: '==', value: sid }] : []);
  const sessions = useQuery<SessionDoc>('sessions');
  if (!list || !sessions) return <Loading tone="cb" />;
  const sname = (id: string) => sessions.find(s => s.id === id)?.name || '';
  return (
    <Screen tone="cb" title="Biên bản vi phạm" sub={sid ? sname(sid) : 'Mọi ca thi'} back>
      {list.length ? list.sort((a, b) => b.at - a.at).map(x => (
        <Card key={x.id} tone="bad" onPress={() => router.push(`/cb/ts/${x.sid}/${x.uid}`)} style={{ gap: 3 }}>
          <T style={{ fontFamily: F.sb }}>{x.name} · {x.kind}</T>
          {!!x.note && <T style={{ fontSize: 13.5 }}>{x.note}</T>}
          <Muted style={{ fontSize: 12 }}>{sname(x.sid)} · {fmtTime(x.at)} {fmtDate(x.at)} · {x.byName}</Muted>
        </Card>
      )) : <Card><Empty text="Chưa có biên bản nào" icon="shield-checkmark-outline" /></Card>}
      <Muted style={{ fontSize: 12.5 }}>Ghi biên bản từ màn hình một thí sinh (Màn hình bài làm → bấm vào em đó).</Muted>
    </Screen>
  );
}
