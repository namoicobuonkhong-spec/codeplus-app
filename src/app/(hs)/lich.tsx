import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Card, Empty, Loading, Muted, Pill, Screen, T } from '@/ui/kit';
import { examState, useMyExams } from '@/ui/student';
import { C, F, fmtDate, weekday } from '@/ui/theme';

export default function Lich() {
  const list = useMyExams();
  if (!list) return <Loading tone="hs" />;
  const sorted = list.slice().sort((a, b) => (b.s.date + b.s.start).localeCompare(a.s.date + a.s.start));
  return (
    <Screen tone="hs" title="Lịch thi" sub={`${list.length} ca thi`}>
      {sorted.length ? sorted.map(x => {
        const st = examState(x);
        const go = st.action === 'work' ? `/thi/${x.s.id}` : st.action === 'wait' ? `/phongcho/${x.s.id}` : st.action === 'result' ? `/bailam/${x.s.id}` : undefined;
        return (
          <Card key={x.s.id} onPress={go ? () => router.push(go as any) : undefined}>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <View style={{ width: 52, alignItems: 'center' }}>
                <Muted style={{ fontSize: 12, fontFamily: F.sb }}>{weekday(x.s.date)}</Muted>
                <T style={{ fontFamily: F.b, fontSize: 19 }}>{fmtDate(x.s.date).slice(0, 5)}</T>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <T style={{ fontFamily: F.sb }}>{x.s.examTitle}</T>
                <Muted style={{ fontSize: 13 }}>{x.s.start} · {x.s.durationMin} phút · {x.s.questionCount} câu{x.a?.sbd ? ` · SBD ${x.a.sbd}` : ''}</Muted>
                <Pill text={st.text} kind={st.kind} />
              </View>
            </View>
          </Card>
        );
      }) : <Card><Empty text="Chưa có ca thi nào" icon="calendar-clear-outline" /></Card>}
      <T style={{ fontSize: 12.5, color: C.faint, textAlign: 'center' }}>Phòng thi, số báo danh hiện khi phòng chờ mở.</T>
    </Screen>
  );
}
