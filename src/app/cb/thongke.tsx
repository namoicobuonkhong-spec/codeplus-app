/* THỐNG KÊ — tổng hợp các ca đã kết thúc: số dự thi, vắng, điểm TB, tỉ lệ đạt; theo lớp và theo môn. */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Bar, Btn, Card, Chip, Empty, Kpi, KpiRow, Loading, Muted, Row, Screen, Section, T } from '@/ui/kit';
import { useQuery } from '@/ui/hooks';
import { exportCsv } from '@/ui/export';
import { avg } from '@/ui/scores';
import { C, F, fmtDate, num } from '@/ui/theme';
import type { AttemptDoc, SessionDoc } from '../../../shared/logic';

export default function ThongKe() {
  const sessions = useQuery<SessionDoc>('sessions');
  const atts = useQuery<AttemptDoc>('attempts', [{ field: 'submitted', op: '==', value: true }]);
  const [sub, setSub] = useState('');
  if (!sessions || !atts) return <Loading tone="cb" />;
  const closed = sessions.filter(s => s.status === 'closed' && (!sub || s.subject === sub)).sort((a, b) => b.date.localeCompare(a.date));
  const ids = new Set(closed.map(s => s.id));
  const done = atts.filter(a => ids.has(a.sid));
  const sc = done.map(a => a.score || 0);
  const subjects = Array.from(new Set(sessions.filter(s => s.status === 'closed').map(s => s.subject))).sort();
  const classes = Array.from(new Set(done.map(a => a.className))).sort();
  const rate = (xs: number[], f: (x: number) => boolean) => (xs.length ? Math.round((xs.filter(f).length / xs.length) * 100) + '%' : '—');
  const exp = () => exportCsv('Thong_ke_ket_qua', [['Ca thi', 'Môn', 'Ngày', 'Số TS', 'Dự thi', 'Điểm TB', '≥5', '≥8'], ...closed.map(s => { const xs = done.filter(a => a.sid === s.id).map(a => a.score || 0); return [s.name, s.subject, fmtDate(s.date), s.studentIds.length, xs.length, num(avg(xs)), rate(xs, x => x >= 5), rate(xs, x => x >= 8)]; })]);
  return (
    <Screen tone="cb" title="Thống kê" sub={`${closed.length} ca đã kết thúc`} back right={closed.length ? <Btn small tone="cb" kind="secondary" title="Xuất" icon="download-outline" onPress={exp} /> : undefined}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Chip on={!sub} text="Mọi môn" onPress={() => setSub('')} />{subjects.map(x => <Chip key={x} on={sub === x} text={x} onPress={() => setSub(x)} />)}</View>
      <KpiRow>
        <Kpi label="Bài đã chấm" value={done.length} />
        <Kpi label="Điểm TB" value={num(avg(sc))} />
        <Kpi label="Đạt (≥5)" value={rate(sc, x => x >= 5)} sub={`≥8: ${rate(sc, x => x >= 8)}`} />
      </KpiRow>
      <Section title="Theo lớp" />
      <Card pad={false}>
        {classes.length ? classes.map((c, i) => {
          const xs = done.filter(a => a.className === c).map(a => a.score || 0), m = avg(xs);
          return (
            <Pressable key={c} accessibilityRole="button" onPress={() => router.push(`/cb/bangdiem?lop=${c}`)} style={{ padding: 14, gap: 6, borderTopWidth: i ? 1 : 0, borderTopColor: C.lineSoft }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T style={{ fontFamily: F.b, color: C.cb }}>{c}</T><T style={{ fontFamily: F.b }}>TB {num(m)}</T></View>
              <Bar ratio={(m || 0) / 10} color={C.cb} />
              <Muted style={{ fontSize: 12.5 }}>{xs.length} bài · đạt {rate(xs, x => x >= 5)} · giỏi {rate(xs, x => x >= 8)}</Muted>
            </Pressable>
          );
        }) : <Empty text="Chưa có số liệu" icon="stats-chart-outline" />}
      </Card>
      <Section title="Theo ca thi" />
      <Card pad={false}>
        {closed.map((s, i) => { const xs = done.filter(a => a.sid === s.id).map(a => a.score || 0); return <Row key={s.id} first={i === 0} tone="cb" title={s.name} sub={`${s.subject} · ${fmtDate(s.date)} · ${xs.length}/${s.studentIds.length} bài · đạt ${rate(xs, x => x >= 5)}`} right={<T style={{ fontFamily: F.b, fontSize: 17 }}>{num(avg(xs))}</T>} onPress={() => router.push(`/cb/ketqua/${s.id}`)} />; })}
        {!closed.length && <Empty text="Chưa có ca nào kết thúc" />}
      </Card>
    </Screen>
  );
}
