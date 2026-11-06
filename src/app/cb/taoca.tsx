/* TẠO CA THI — chọn đề, lớp; tự chia phòng theo tên (ABC tiếng Việt), cấp số báo danh. */
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/data/api';
import { Btn, Card, Chip, Empty, Field, Loading, Muted, Note, Section, Screen, T, toast } from '@/ui/kit';
import { useQuery } from '@/ui/hooks';
import { C, F } from '@/ui/theme';
import type { UserDoc } from '../../../shared/logic';


export default function TaoCa() {
  const exams = useQuery<any>('exams');
  const studs = useQuery<UserDoc>('users', [{ field: 'role', op: '==', value: 'student' }]);
  const tomorrow = new Date(Date.now() + 86400e3).toISOString().slice(0, 10);
  const [ex, setEx] = useState<any>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState(tomorrow);
  const [start, setStart] = useState('07:30');
  const [dur, setDur] = useState('');
  const [cls, setCls] = useState<string[]>([]);
  const [size, setSize] = useState('24');
  const [places, setPlaces] = useState('');
  const [err, setErr] = useState('');
  const classes = useMemo(() => { const m = new Map<string, number>(); (studs || []).forEach(s => s.className && m.set(s.className, (m.get(s.className) || 0) + 1)); return Array.from(m).sort(); }, [studs]);
  if (!exams || !studs) return <Loading tone="cb" />;
  const n = classes.filter(([c]) => cls.includes(c)).reduce((x, [, k]) => x + k, 0);
  const rooms = n ? Math.ceil(n / Math.max(1, Number(size) || 24)) : 0;
  const save = async () => {
    setErr('');
    if (!ex) return setErr('Chọn đề thi');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setErr('Ngày theo dạng năm-tháng-ngày, ví dụ ' + tomorrow);
    if (!/^\d{1,2}:\d{2}$/.test(start)) return setErr('Giờ theo dạng 07:30');
    if (!cls.length) return setErr('Chọn ít nhất một lớp');
    try {
      const r = await api.call('createSession', { examId: ex.id, name: name || ex.title, date, start, durationMin: Number(dur) || ex.durationMin, classNames: cls, roomSize: Number(size) || 24, places: places.split(',').map(x => x.trim()).filter(Boolean) });
      toast('Đã tạo ca thi'); router.replace(`/cb/ca/${r.sid}`);
    } catch (e: any) { setErr(e.message); }
  };
  return (
    <Screen tone="cb" title="Tạo ca thi" back footer={<Btn tone="cb" title={rooms ? `Tạo ca · ${n} thí sinh · ${rooms} phòng` : 'Tạo ca thi'} onPress={save} />}>
      <Section title="1. Đề thi" />
      {exams.length ? exams.map(e => (
        <Card key={e.id} onPress={() => { setEx(e); setDur(String(e.durationMin)); }} style={{ borderColor: ex?.id === e.id ? C.cb : C.line, borderWidth: ex?.id === e.id ? 2 : 1 }}>
          <T style={{ fontFamily: F.sb }}>{e.title}</T><Muted style={{ fontSize: 13 }}>{e.subject} · {e.questions?.length || 0} câu · {e.durationMin} phút</Muted>
        </Card>
      )) : <Card><Empty text="Chưa có đề. Vào Quản lí → Đề thi để tạo." /></Card>}
      <Section title="2. Thời gian" />
      <Field label="Tên ca thi" value={name} onChange={setName} placeholder={ex?.title || 'Ví dụ: Ca 1 — Toán 12'} autoCap="sentences" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field label="Ngày" value={date} onChange={setDate} style={{ flex: 1.3 }} />
        <Field label="Giờ" value={start} onChange={setStart} style={{ flex: 1 }} />
        <Field label="Phút" value={dur} onChange={setDur} keyboard="numeric" style={{ flex: 0.8 }} />
      </View>
      <Section title="3. Thí sinh, phòng thi" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{classes.map(([c, k]) => <Chip key={c} on={cls.includes(c)} text={`${c} · ${k}`} onPress={() => setCls(x => (x.includes(c) ? x.filter(y => y !== c) : [...x, c]))} />)}</View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field label="Số chỗ mỗi phòng" value={size} onChange={setSize} keyboard="numeric" style={{ flex: 1 }} />
        <Field label="Phòng (cách nhau dấu phẩy)" value={places} onChange={setPlaces} placeholder="P.204, P.205" style={{ flex: 1.6 }} />
      </View>
      <Note kind="info" text="Thí sinh được xếp theo tên (ABC tiếng Việt: tên → họ đệm), chia đều vào các phòng, cấp số báo danh liên tục. Tạo xong thì phân công cán bộ coi thi từng phòng." />
      {!!err && <Note kind="bad" icon="alert-circle-outline" text={err} />}
    </Screen>
  );
}
