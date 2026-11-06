/* BÀI LÀM SAU KHI CÔNG BỐ — điểm, đáp án đúng từng câu, đề nghị phúc khảo. */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '@/data/api';
import { Bar, Btn, Card, Kpi, KpiRow, Loading, Muted, Note, Pill, Screen, T, formBox, toast } from '@/ui/kit';
import { TYPE_TEXT } from '@/ui/exam';
import { useDoc, useMe, useQuery } from '@/ui/hooks';
import { C, F, num } from '@/ui/theme';
import { attemptId, type AttemptDoc, type Question, type SessionDoc } from '../../../shared/logic';

const showAns = (q: Question, v?: string) => !v ? '—' : q.type === 'tf' ? v.split('').map((c, k) => `${'abcd'[k]}) ${c === 'D' ? 'Đ' : c === 'S' ? 'S' : '–'}`).join('  ') : q.type === 'essay' ? `${v.length} kí tự` : v;

export default function BaiLam() {
  const { sid } = useLocalSearchParams<{ sid: string }>();
  const me = useMe();
  const a = useDoc<AttemptDoc>('attempts/' + attemptId(sid, me.uid));
  const s = useDoc<SessionDoc>('sessions/' + sid);
  const pub = useDoc<any>('pubkeys/' + sid);
  const appeals = useQuery<any>('appeals', [{ field: 'uid', op: '==', value: me.uid }]);
  const [paper, setPaper] = useState<Question[] | null>(null);
  useEffect(() => { api.getDoc<{ questions: Question[] }>(`sessions/${sid}/paper/main`).then(p => setPaper(p?.questions || [])).catch(() => setPaper([])); }, [sid]);
  if (!a || !s || !paper || pub === undefined || !appeals) return <Loading tone="hs" />;
  if (!s.published) return <Screen tone="hs" title="Bài làm" back><Note text="Điểm chưa được công bố." /></Screen>;
  const key = new Map<string, string>((pub?.questions || []).map((q: any) => [q.id, q.answer]));
  const order = a.order?.length ? a.order : paper.map(q => q.id);
  const byId = new Map(paper.map(q => [q.id, q]));
  const chapters = new Map<string, [number, number]>();
  for (const q of paper) { const c = q.chapter || 'Khác'; const x = chapters.get(c) || [0, 0]; x[0] += a.perQ?.[q.id] || 0; x[1] += q.points; chapters.set(c, x); }
  const mine = appeals.filter(p => p.sid === sid);
  const appeal = async (qid: string | null, qno: number | null) => {
    const r = await formBox({ title: qno ? `Phúc khảo câu ${qno}` : 'Phúc khảo cả bài', tone: 'hs', ok: 'Gửi đơn', fields: [{ key: 'note', label: 'Lí do', multiline: true, placeholder: 'Ví dụ: em chọn đúng phương án nhưng bị chấm sai' }],
      run: async v => { await api.call('appeal', { sid, qid, qno, note: v.note }); } });
    if (r) toast('Đã gửi đơn phúc khảo');
  };
  return (
    <Screen tone="hs" title="Bài làm" sub={s.examTitle} back footer={<Btn tone="hs" kind="secondary" title="Phúc khảo cả bài" icon="document-text-outline" onPress={() => appeal(null, null)} />}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}><T style={{ fontFamily: F.b, fontSize: 44, letterSpacing: -1 }}>{num(a.score)}</T><Muted style={{ fontSize: 16 }}>/ 10</Muted></View>
        {!!a.pendingEssay && <Muted style={{ fontSize: 13 }}>Còn {a.pendingEssay} câu tự luận chờ chấm</Muted>}
        <KpiRow><Kpi label="Đúng" value={a.correct ?? 0} /><Kpi label="Sai" value={a.wrong ?? 0} /><Kpi label="Bỏ trống" value={a.blank ?? 0} /></KpiRow>
      </Card>
      {mine.map(p => <Note key={p.id} kind={p.status === 'cho' ? 'info' : p.status === 'chapnhan' ? 'ok' : 'warn'} text={`Phúc khảo${p.qno ? ' câu ' + p.qno : ''}: ${p.status === 'cho' ? 'đang chờ xử lí' : p.status === 'chapnhan' ? 'chấp nhận' : 'giữ nguyên'}${p.reply ? ' — ' + p.reply : ''}`} />)}
      <Card style={{ gap: 12 }}>
        <T style={{ fontFamily: F.sb }}>Theo chương</T>
        {Array.from(chapters).map(([c, [got, max]]) => (
          <View key={c} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T style={{ fontSize: 13.5 }}>{c}</T><T style={{ fontSize: 13.5, fontFamily: F.sb }}>{num(got)}/{num(max)}</T></View>
            <Bar ratio={max ? got / max : 0} />
          </View>
        ))}
      </Card>
      {order.map((qid, i) => {
        const q = byId.get(qid); if (!q) return null;
        const got = a.perQ?.[q.id] ?? 0, ans = a.answers?.[q.id], k = key.get(q.id);
        const st = !ans ? ['Bỏ trống', 'muted'] : q.type === 'essay' && a.essayScores?.[q.id] === undefined ? ['Chờ chấm', 'info'] : got >= q.points ? ['Đúng', 'ok'] : got > 0 ? [`${num(got)}/${num(q.points)} điểm`, 'warn'] : ['Sai', 'bad'];
        return (
          <Card key={q.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T style={{ fontFamily: F.b, color: C.hs, fontSize: 13 }}>CÂU {i + 1} · {TYPE_TEXT[q.type]}</T>
              <Pill text={st[0]} kind={st[1] as any} />
            </View>
            <T style={{ lineHeight: 22 }}>{q.text}</T>
            {q.type === 'mcq' && q.options!.map((o, j) => { const L = 'ABCD'[j]; return <T key={j} style={{ fontSize: 14, color: L === k ? C.hsDark : L === ans ? C.bad : C.ink2, fontFamily: L === k ? F.sb : F.r }}>{L}. {o}{L === k ? '  ✓ đáp án' : L === ans ? '  (em chọn)' : ''}</T>; })}
            {q.type === 'tf' && q.options!.map((o, j) => <T key={j} style={{ fontSize: 14 }}>{'abcd'[j]}) {o} — <T style={{ fontFamily: F.sb, fontSize: 14, color: C.hsDark }}>{k?.[j] === 'D' ? 'Đúng' : 'Sai'}</T>{ans?.[j] && ans[j] !== '_' && ans[j] !== k?.[j] ? <T style={{ fontSize: 14, color: C.bad }}> (em chọn {ans[j] === 'D' ? 'Đúng' : 'Sai'})</T> : null}</T>)}
            {(q.type === 'short' || q.type === 'essay') && <Muted style={{ fontSize: 13.5 }}>Em trả lời: <T style={{ fontFamily: F.sb, fontSize: 13.5 }}>{showAns(q, ans)}</T>{q.type === 'short' && k ? <>  ·  Đáp án: <T style={{ fontFamily: F.sb, fontSize: 13.5, color: C.hsDark }}>{k}</T></> : null}</Muted>}
            <Btn small tone="hs" kind="ghost" title="Phúc khảo câu này" onPress={() => appeal(q.id, i + 1)} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
          </Card>
        );
      })}
    </Screen>
  );
}
