import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Card, Empty, Icon, Loading, Muted, Screen, T } from '@/ui/kit';
import { useMyExams } from '@/ui/student';
import { C, F, fmtDate, num } from '@/ui/theme';

export default function KetQua() {
  const list = useMyExams();
  if (!list) return <Loading tone="hs" />;
  const done = list.filter(x => x.s.status === 'closed').sort((a, b) => b.s.date.localeCompare(a.s.date));
  return (
    <Screen tone="hs" title="Kết quả" sub="Điểm hiện khi nhà trường công bố">
      {done.length ? done.map(x => (
        <Card key={x.s.id} onPress={x.s.published && x.a?.submitted ? () => router.push(`/bailam/${x.s.id}`) : undefined}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T style={{ fontFamily: F.sb }}>{x.s.examTitle}</T>
              <Muted style={{ fontSize: 13 }}>{fmtDate(x.s.date)} · {x.s.durationMin} phút</Muted>
            </View>
            {x.s.published && x.a?.submitted
              ? <View style={{ alignItems: 'flex-end' }}><T style={{ fontFamily: F.b, fontSize: 26, color: C.hsDark }}>{num(x.a.score)}</T><Muted style={{ fontSize: 12 }}>{x.a.pendingEssay ? 'chờ chấm tự luận' : 'điểm / 10'}</Muted></View>
              : <View style={{ alignItems: 'flex-end' }}><Icon name="time-outline" size={20} color={C.faint} /><Muted style={{ fontSize: 12 }}>{x.a?.submitted ? 'chờ công bố' : 'không dự thi'}</Muted></View>}
          </View>
        </Card>
      )) : <Card><Empty text="Chưa có bài thi nào kết thúc" icon="ribbon-outline" /></Card>}
    </Screen>
  );
}
