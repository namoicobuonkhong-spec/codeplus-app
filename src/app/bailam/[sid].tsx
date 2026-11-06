import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '@/data/api';
import { Bar, Card, Kpi, KpiRow, Loading, Muted, Note, Pill, Screen, T } from '@/ui/kit';
import { TYPE_TEXT } from '@/ui/exam';
import { useDoc, useMe } from '@/ui/hooks';
import { C, F, num } from '@/ui/theme';
import { attemptId, type AttemptDoc, type Question, type SessionDoc } from '../../../shared/logic';

export default function BaiLam() {
  const { sid } = useLocalSearchParams<{ sid: string }>();
  const me = useMe();
  const a = useDoc<AttemptDoc>('attempts/' + attemptId(sid, me.uid));
  const s = useDoc<SessionDoc>('sessions/' + sid);
  const [paper, setPaper] = useState<Question[] | null>(null);
  useEffect(() => { api.getDoc<{ questions: Question[] }>(`sessions/${sid}/paper/main`).then(p => setPaper(p?.questions || [])).catch(() => setPaper([])); }, [sid]);
  if (!a || !s || !paper) return <Loading tone="hs" />;
  if (!s.published) return <Screen tone="hs" title="Bài làm" back><Note text="Điểm chưa được công bố." /></Screen>;
  const chapters = new Map<string, [number, number]>();
  for (const q of paper) { const c = q.chapter || 'Khác'; const x = chapters.get(c) || [0, 0]; x[0] += a.perQ?.[q.id] || 0; x[1] += q.points; chapters.set(c, x); }
  return (
    <Screen tone="hs" title="Bài làm" sub={s.examTitle} back>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}><T style={{ fontFamily: F.b, fontSize: 44, letterSpacing: -1 }}>{num(a.score)}</T><Muted style={{ fontSize: 16 }}>/ 10</Muted></View>
        {!!a.pendingEssay && <Muted style={{ fontSize: 13 }}>Còn {a.pendingEssay} câu tự luận chờ chấm</Muted>}
        <KpiRow><Kpi label="Đúng" value={a.correct ?? 0} /><Kpi label="Sai" value={a.wrong ?? 0} /><Kpi label="Bỏ trống" value={a.blank ?? 0} /></KpiRow>
      </Card>
      <Card style={{ gap: 12 }}>
        <T style={{ fontFamily: F.sb }}>Theo chương</T>
        {Array.from(chapters).map(([c, [got, max]]) => (
          <View key={c} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T style={{ fontSize: 13.5 }}>{c}</T><T style={{ fontSize: 13.5, fontFamily: F.sb }}>{num(got)}/{num(max)}</T></View>
            <Bar ratio={max ? got / max : 0} />
          </View>
        ))}
      </Card>
      {paper.map((q, i) => {
        const got = a.perQ?.[q.id] ?? 0, ans = a.answers?.[q.id];
        const st = !ans ? ['Bỏ trống', 'muted'] : q.type === 'essay' && a.essayScores?.[q.id] === undefined ? ['Chờ chấm', 'info'] : got >= q.points ? ['Đúng', 'ok'] : got > 0 ? [`${num(got)}/${num(q.points)} điểm`, 'warn'] : ['Sai', 'bad'];
        return (
          <Card key={q.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T style={{ fontFamily: F.b, color: C.hs, fontSize: 13 }}>CÂU {i + 1} · {TYPE_TEXT[q.type]}</T>
              <Pill text={st[0]} kind={st[1] as any} />
            </View>
            <T style={{ lineHeight: 22 }}>{q.text}</T>
            <Muted style={{ fontSize: 13 }}>Em trả lời: <T style={{ fontFamily: F.sb, fontSize: 13 }}>{ans ? (q.type === 'tf' ? ans.split('').map((c, k) => `${'abcd'[k]}) ${c === 'D' ? 'Đ' : c === 'S' ? 'S' : '–'}`).join('  ') : q.type === 'essay' ? `${ans.length} kí tự` : ans) : '—'}</T></Muted>
          </Card>
        );
      })}
    </Screen>
  );
}
