/* LÀM BÀI LUYỆN TẬP — giống bài thi nhưng không giám sát; nộp xong chấm ngay và hiện đáp án từng câu. */
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/data/api';
import { Btn, Card, Icon, Kpi, KpiRow, Loading, Muted, Pill, Screen, T, confirmBox, toast } from '@/ui/kit';
import { Palette, QuestionView, TYPE_TEXT } from '@/ui/exam';
import { useDoc, useNow } from '@/ui/hooks';
import { C, F, clock, num } from '@/ui/theme';
import type { Question } from '../../../shared/logic';

const showAns = (q: Question, v?: string) => !v ? '—' : q.type === 'tf' ? v.split('').map((c, k) => `${'abcd'[k]}) ${c === 'D' ? 'Đ' : c === 'S' ? 'S' : '–'}`).join('  ') : q.type === 'essay' ? `${v.length} kí tự` : v;

export default function Luyen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ins = useSafeAreaInsets();
  const p = useDoc<any>('practice/' + id);
  const now = useNow(1000);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [cur, setCur] = useState(0);
  const [pal, setPal] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (p?.answers) setAnswers(a => (Object.keys(a).length ? a : p.answers)); }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const expired = !!p && !p.submitted && p.deadline - now <= 0;
  const submitRef = React.useRef<((auto?: boolean) => Promise<void>) | null>(null);
  useEffect(() => { if (expired) void submitRef.current?.(true); }, [expired]);
  if (!p) return <Loading tone="hs" />;
  const byId = new Map<string, Question>(p.questions.map((q: Question) => [q.id, q]));
  const order: string[] = p.order;
  const submit = async (auto = false) => {
    if (busy) return;
    if (!auto && !(await confirmBox({ title: 'Nộp bài luyện tập?', tone: 'hs', ok: 'Nộp', message: `Đã làm ${Object.keys(answers).length}/${order.length} câu.` }))) return;
    setBusy(true);
    try { await api.call('practiceSubmit', { id, answers }); } catch (e: any) { toast(e.message, true); }
    setBusy(false);
  };
  submitRef.current = submit;
  if (!p.submitted) {
    const left = p.deadline - now;
    const q = byId.get(order[cur])!;
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ paddingTop: ins.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Thoát" onPress={() => router.back()} hitSlop={8}><Icon name="close" size={24} /></Pressable>
          <View style={{ flex: 1 }}><T style={{ fontFamily: F.sb }} numberOfLines={1}>{p.title}</T><Muted style={{ fontSize: 12.5 }}>Luyện tập · đã làm {Object.keys(answers).length}/{order.length}</Muted></View>
          <Pill text={clock(left)} kind={left < 120000 ? 'bad' : 'muted'} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, maxWidth: 760, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
          <QuestionView key={q.id} q={q} index={cur} total={order.length} value={answers[q.id]} onChange={v => setAnswers(a => { const n = { ...a }; if (v) n[q.id] = v; else delete n[q.id]; return n; })} />
        </ScrollView>
        <View style={{ borderTopWidth: 1, borderTopColor: C.line, padding: 12, paddingBottom: ins.bottom + 12, flexDirection: 'row', gap: 8 }}>
          <Btn title="Trước" icon="chevron-back" kind="secondary" onPress={() => setCur(c => Math.max(0, c - 1))} disabled={cur === 0} style={{ flex: 1 }} />
          <Btn title="Bảng câu" kind="secondary" onPress={() => setPal(true)} style={{ flex: 1 }} />
          {cur < order.length - 1 ? <Btn title="Sau" onPress={() => setCur(c => c + 1)} style={{ flex: 1 }} /> : <Btn title="Nộp" onPress={() => submit()} loading={busy} style={{ flex: 1 }} />}
        </View>
        <Modal visible={pal} transparent animationType="slide" onRequestClose={() => setPal(false)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,27,45,0.4)' }} onPress={() => setPal(false)} />
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: ins.bottom + 20, gap: 14 }}>
            <Palette order={order} answers={answers} flags={{}} cur={cur} onPick={i => { setCur(i); setPal(false); }} size={40} />
            <Btn title="Nộp bài" onPress={() => { setPal(false); void submit(); }} />
          </View>
        </Modal>
      </View>
    );
  }
  const key = new Map<string, string>((p.key || []).map((k: any) => [k.id, k.answer]));
  return (
    <Screen tone="hs" title="Kết quả luyện tập" sub={p.title} back>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}><T style={{ fontFamily: F.b, fontSize: 44 }}>{num(p.score)}</T><Muted>/ 10</Muted></View>
        <KpiRow><Kpi label="Đúng" value={p.correct} /><Kpi label="Sai" value={p.wrong} /><Kpi label="Bỏ trống" value={p.blank} /></KpiRow>
      </Card>
      {order.map((qid, i) => {
        const q = byId.get(qid)!, got = p.perQ?.[qid] ?? 0, ans = p.answers?.[qid];
        const st = q.type === 'essay' ? ['Tự luận — tự đối chiếu', 'info'] : !ans ? ['Bỏ trống', 'muted'] : got >= q.points ? ['Đúng', 'ok'] : got > 0 ? ['Đúng một phần', 'warn'] : ['Sai', 'bad'];
        return (
          <Card key={qid} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T style={{ fontFamily: F.b, color: C.hs, fontSize: 13 }}>CÂU {i + 1} · {TYPE_TEXT[q.type]}</T><Pill text={st[0]} kind={st[1] as any} /></View>
            <T style={{ lineHeight: 22 }}>{q.text}</T>
            {q.type === 'mcq' && q.options!.map((o, k) => <T key={k} style={{ fontSize: 14, color: 'ABCD'[k] === key.get(qid) ? C.hsDark : 'ABCD'[k] === ans ? C.bad : C.ink2, fontFamily: 'ABCD'[k] === key.get(qid) ? F.sb : F.r }}>{'ABCD'[k]}. {o}{'ABCD'[k] === key.get(qid) ? '  ✓' : 'ABCD'[k] === ans ? '  (em chọn)' : ''}</T>)}
            {q.type === 'tf' && q.options!.map((o, k) => <T key={k} style={{ fontSize: 14 }}>{'abcd'[k]}) {o} — <T style={{ fontFamily: F.sb, fontSize: 14, color: C.hsDark }}>{key.get(qid)?.[k] === 'D' ? 'Đúng' : 'Sai'}</T>{ans?.[k] && ans[k] !== key.get(qid)?.[k] ? <T style={{ fontSize: 14, color: C.bad }}> (em chọn {ans[k] === 'D' ? 'Đúng' : 'Sai'})</T> : null}</T>)}
            {(q.type === 'short' || q.type === 'essay') && <Muted style={{ fontSize: 13.5 }}>Em trả lời: <T style={{ fontFamily: F.sb, fontSize: 13.5 }}>{showAns(q, ans)}</T>{q.type === 'short' ? <>  ·  Đáp án: <T style={{ fontFamily: F.sb, fontSize: 13.5, color: C.hsDark }}>{key.get(qid)}</T></> : null}</Muted>}
          </Card>
        );
      })}
      <Btn tone="hs" title="Về Luyện tập" onPress={() => router.replace('/(hs)/luyentap')} />
    </Screen>
  );
}
