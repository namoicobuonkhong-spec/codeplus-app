/* HỌC SINH — theo lớp; cấp tài khoản (kĩ thuật viên, BGH, quản trị). */
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/data/api';
import { Btn, Card, Chip, Empty, Field, Loading, Muted, Row, Screen, formBox, toast } from '@/ui/kit';
import { useQuery } from '@/ui/hooks';
import { viCompare, type UserDoc } from '../../../shared/logic';

export default function HocSinh() {
  const studs = useQuery<UserDoc>('users', [{ field: 'role', op: '==', value: 'student' }]);
  const [cls, setCls] = useState('');
  const [q, setQ] = useState('');
  const classes = useMemo(() => Array.from(new Set((studs || []).map(s => s.className || ''))).filter(Boolean).sort(), [studs]);
  if (!studs) return <Loading tone="cb" />;
  const list = studs.filter(s => (!cls || s.className === cls) && (!q || (s.name + ' ' + s.username).toLowerCase().includes(q.toLowerCase()))).sort((a, b) => (a.className || '').localeCompare(b.className || '') || viCompare(a.name, b.name));
  const add = async () => {
    const r = await formBox({ title: 'Thêm học sinh', tone: 'cb', ok: 'Tạo tài khoản', fields: [
      { key: 'name', label: 'Họ và tên' }, { key: 'className', label: 'Lớp', value: cls }, { key: 'username', label: 'Tên đăng nhập', placeholder: 'ví dụ hs025' }, { key: 'password', label: 'Mật khẩu', value: Math.random().toString(36).slice(2, 10), hint: 'Ghi lại để giao cho học sinh' }
    ], run: async v => { if (!v.name.trim() || !v.className.trim()) throw new Error('Nhập họ tên và lớp'); await api.createUser({ ...v, name: v.name.trim(), className: v.className.trim().toUpperCase(), role: 'student' } as any); } });
    if (r) toast(`Đã tạo ${r.username} · mật khẩu ${r.password}`);
  };
  return (
    <Screen tone="cb" title="Học sinh" sub={`${studs.length} em · ${classes.length} lớp`} back right={<Btn small tone="cb" title="Thêm" icon="person-add-outline" onPress={add} />}>
      <Field value={q} onChange={setQ} placeholder="Tìm tên, tài khoản" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Chip on={!cls} text="Tất cả" onPress={() => setCls('')} />{classes.map(c => <Chip key={c} on={cls === c} text={c} onPress={() => setCls(c)} />)}</View>
      <Card pad={false}>
        {list.length ? list.map((s, i) => <Row key={s.uid} first={i === 0} tone="cb" title={s.name} sub={`${s.className} · ${s.username || s.uid}`} onPress={() => router.push(`/cb/chat/${s.uid}`)} right={<Muted style={{ fontSize: 12 }}>Nhắn</Muted>} />) : <Empty text="Không có học sinh" icon="people-outline" />}
      </Card>
    </Screen>
  );
}
