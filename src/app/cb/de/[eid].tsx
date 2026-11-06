/* SOẠN ĐỀ — chọn câu từ ngân hàng. Điểm bài quy về thang 10 theo tỉ lệ điểm thô. */
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/data/api';
import { Btn, Card, Field, Icon, Loading, Muted, Note, Pill, Screen, Section, T, confirmBox, toast } from '@/ui/kit';
import { TYPE_TEXT } from '@/ui/exam';
import { useMe, useQuery } from '@/ui/hooks';
import { C, F } from '@/ui/theme';
import type { KeyedQuestion } from '../../../../shared/logic';

export default function SoanDe() {
  const { eid } = useLocalSearchParams<{ eid: string }>();
  const me = useMe();
  const isNew = eid === 'moi';
  const bank = useQuery<KeyedQuestion>('bank');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Toán');
  const [dur, setDur] = useState('45');
  const [sel, setSel] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(isNew);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (isNew) return;
    api.getDoc<any>('exams/' + eid).then(e => { if (e) { setTitle(e.title); setSubject(e.subject); setDur(String(e.durationMin)); setSel((e.questions || []).map((q: any) => q.id)); } setLoaded(true); });
  }, [eid, isNew]);
  if (!bank || !loaded) return <Loading tone="cb" />;
  const pool = bank.filter(q => !subject || q.subject === subject);
  const chosen = sel.map(id => bank.find(q => q.id === id)).filter(Boolean) as KeyedQuestion[];
  const pts = chosen.reduce((s, q) => s + q.points, 0);
  const save = async () => {
    setErr('');
    if (!title.trim()) return setErr('Nhập tên đề');
    if (!chosen.length) return setErr('Chọn ít nhất một câu');
    const id = isNew ? 'E' + Date.now().toString(36).toUpperCase() : eid;
    // giữ thứ tự phần như đề TN THPT: trắc nghiệm → đúng/sai → trả lời ngắn → tự luận
    const ord = { mcq: 0, tf: 1, short: 2, essay: 3 } as const;
    const qs = chosen.slice().sort((a, b) => ord[a.type] - ord[b.type]);
    try { await api.setDoc('exams/' + id, { id, title: title.trim(), subject, durationMin: Number(dur) || 45, questions: JSON.parse(JSON.stringify(qs)), createdBy: me.uid, createdAt: Date.now() }); toast('Đã lưu đề'); router.back(); }
    catch (e: any) { setErr(e.message); }
  };
  return (
    <Screen tone="cb" title={isNew ? 'Tạo đề' : 'Sửa đề'} back footer={<Btn tone="cb" title={`Lưu đề · ${chosen.length} câu · ${String(pts).replace('.', ',')} điểm thô`} onPress={save} />}>
      <Field label="Tên đề" value={title} onChange={setTitle} autoCap="sentences" placeholder="Ví dụ: Toán 12 — Kiểm tra giữa kì I" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field label="Môn" value={subject} onChange={setSubject} autoCap="sentences" style={{ flex: 1 }} />
        <Field label="Thời gian (phút)" value={dur} onChange={setDur} keyboard="numeric" style={{ flex: 1 }} />
      </View>
      <Note kind="info" text="Ca thi đã tạo dùng bản đề lúc tạo ca; sửa đề không ảnh hưởng ca đã có." />
      <Section title={`Câu hỏi môn ${subject || '…'} (${pool.length})`} />
      {pool.map(q => {
        const on = sel.includes(q.id);
        return (
          <Pressable key={q.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => setSel(x => (on ? x.filter(y => y !== q.id) : [...x, q.id]))}>
            <Card style={{ flexDirection: 'row', gap: 12, borderColor: on ? C.cb : C.line, borderWidth: on ? 2 : 1 }}>
              <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: on ? C.cb : '#AEB9C6', backgroundColor: on ? C.cb : '#fff', alignItems: 'center', justifyContent: 'center' }}>{on && <Icon name="checkmark" size={16} color="#fff" />}</View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}><Pill text={TYPE_TEXT[q.type]} kind="info" /><Pill text={`${String(q.points).replace('.', ',')} đ`} kind="muted" /></View>
                <T numberOfLines={2} style={{ lineHeight: 20 }}>{q.text}</T>
                <Muted style={{ fontSize: 12 }}>{q.chapter}</Muted>
              </View>
            </Card>
          </Pressable>
        );
      })}
      {!!err && <Note kind="bad" icon="alert-circle-outline" text={err} />}
      {!isNew && <Btn tone="cb" kind="ghost" title="Xoá đề" onPress={async () => { if (await confirmBox({ title: 'Xoá đề?', ok: 'Xoá', danger: true, tone: 'cb' })) { await api.deleteDoc('exams/' + eid); router.back(); } }} />}
    </Screen>
  );
}
