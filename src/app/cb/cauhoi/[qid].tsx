/* SOẠN / SỬA MỘT CÂU HỎI */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/data/api';
import { Btn, Field, Loading, Muted, Note, Section, Screen, Seg, T, confirmBox, toast , Chip } from '@/ui/kit';
import { LETTERS } from '@/ui/exam';
import { F } from '@/ui/theme';
import type { KeyedQuestion, QType } from '../../../../shared/logic';

export default function CauHoi() {
  const { qid } = useLocalSearchParams<{ qid: string }>();
  const isNew = qid === 'moi';
  const [q, setQ] = useState<KeyedQuestion | null>(isNew ? { id: 'q' + Date.now().toString(36), type: 'mcq', text: '', options: ['', '', '', ''], answer: 'A', points: 0.25, subject: 'Toán', chapter: '', level: 'biet' } : null);
  const [err, setErr] = useState('');
  useEffect(() => { if (!isNew) api.getDoc<KeyedQuestion>('bank/' + qid).then(setQ); }, [qid, isNew]);
  if (!q) return <Loading tone="cb" />;
  const set = (p: Partial<KeyedQuestion>) => setQ(x => ({ ...(x as KeyedQuestion), ...p }));
  const setType = (t: QType) => set({ type: t, options: t === 'mcq' || t === 'tf' ? (q.options?.length === 4 ? q.options : ['', '', '', '']) : undefined, answer: t === 'mcq' ? 'A' : t === 'tf' ? 'DDDD' : '', points: t === 'mcq' ? 0.25 : t === 'tf' ? 1 : t === 'short' ? 0.5 : 1 });
  const save = async () => {
    setErr('');
    if (!q.text.trim()) return setErr('Nhập nội dung câu hỏi');
    if ((q.type === 'mcq' || q.type === 'tf') && q.options!.some(o => !o.trim())) return setErr('Nhập đủ 4 ' + (q.type === 'mcq' ? 'phương án' : 'mệnh đề'));
    if (q.type === 'short' && !q.answer.trim()) return setErr('Nhập đáp số');
    if (!(q.points > 0)) return setErr('Điểm phải lớn hơn 0');
    try { await api.setDoc('bank/' + q.id, JSON.parse(JSON.stringify(q))); toast('Đã lưu câu hỏi'); router.back(); } catch (e: any) { setErr(e.message); }
  };
  return (
    <Screen tone="cb" title={isNew ? 'Câu hỏi mới' : 'Sửa câu hỏi'} back footer={<Btn tone="cb" title="Lưu câu hỏi" onPress={save} />}>
      <Seg tone="cb" value={q.type} onChange={setType} options={[['mcq', '4 lựa chọn'], ['tf', 'Đúng/Sai'], ['short', 'Điền số'], ['essay', 'Tự luận']]} />
      <Field label="Nội dung câu hỏi" value={q.text} onChange={v => set({ text: v })} multiline autoCap="sentences" />
      {q.type === 'mcq' && (<>
        <Section title="Phương án — bấm chữ cái để chọn đáp án đúng" />
        {q.options!.map((o, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <Chip on={q.answer === LETTERS[i]} text={LETTERS[i]} onPress={() => set({ answer: LETTERS[i] })} />
            <Field value={o} onChange={v => set({ options: q.options!.map((x, k) => (k === i ? v : x)) })} placeholder={`Phương án ${LETTERS[i]}`} style={{ flex: 1 }} />
          </View>
        ))}
      </>)}
      {q.type === 'tf' && (<>
        <Section title="Bốn mệnh đề — chọn Đúng/Sai cho từng ý" />
        {q.options!.map((o, i) => (
          <View key={i} style={{ gap: 8 }}>
            <Field label={`Ý ${'abcd'[i]})`} value={o} onChange={v => set({ options: q.options!.map((x, k) => (k === i ? v : x)) })} />
            <View style={{ flexDirection: 'row', gap: 8 }}>{(['D', 'S'] as const).map(k => <Chip key={k} on={q.answer[i] === k} text={k === 'D' ? 'Đúng' : 'Sai'} onPress={() => { const a = q.answer.padEnd(4, 'D').split(''); a[i] = k; set({ answer: a.join('') }); }} />)}</View>
          </View>
        ))}
        <Muted style={{ fontSize: 12.5 }}>Chấm như đề TN THPT: đúng 1 ý 10%, 2 ý 25%, 3 ý 50%, 4 ý 100% điểm câu.</Muted>
      </>)}
      {q.type === 'short' && <Field label="Đáp số" value={q.answer} onChange={v => set({ answer: v })} keyboard="decimal-pad" hint="So khớp chính xác (dấu phẩy hay dấu chấm đều được)" />}
      {q.type === 'essay' && <Note kind="info" text="Câu tự luận do giáo viên chấm tay sau khi kết thúc ca thi." />}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field label="Môn" value={q.subject || ''} onChange={v => set({ subject: v })} autoCap="sentences" style={{ flex: 1 }} />
        <Field label="Điểm" value={String(q.points)} onChange={v => set({ points: Number(v.replace(',', '.')) || 0 })} keyboard="decimal-pad" style={{ flex: 0.6 }} />
      </View>
      <Field label="Chương / chủ đề" value={q.chapter || ''} onChange={v => set({ chapter: v })} autoCap="sentences" />
      <T style={{ fontFamily: F.sb, fontSize: 14 }}>Mức độ</T>
      <View style={{ flexDirection: 'row', gap: 8 }}>{(['biet', 'hieu', 'vandung'] as const).map(l => <Chip key={l} on={q.level === l} text={{ biet: 'Biết', hieu: 'Hiểu', vandung: 'Vận dụng' }[l]} onPress={() => set({ level: l })} />)}</View>
      {!!err && <Note kind="bad" icon="alert-circle-outline" text={err} />}
      {!isNew && <Btn tone="cb" kind="ghost" title="Xoá câu hỏi" onPress={async () => { if (await confirmBox({ title: 'Xoá câu hỏi?', message: 'Đề đã tạo trước đó vẫn giữ câu này.', ok: 'Xoá', danger: true, tone: 'cb' })) { await api.deleteDoc('bank/' + q.id); toast('Đã xoá'); router.back(); } }} />}
    </Screen>
  );
}
