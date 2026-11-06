/* HỌC SINH — theo lớp; cấp tài khoản (kĩ thuật viên, BGH, quản trị). */
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/data/api';
import { Btn, Card, Chip, Empty, Field, Loading, Row, Screen, formBox, toast } from '@/ui/kit';
import { useQuery } from '@/ui/hooks';
import { exportCsv } from '@/ui/export';
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
  // nhập cả danh sách: mỗi dòng "Họ và tên, Lớp" (dán từ Excel cũng được — cột cách nhau bằng Tab)
  const importMany = async () => {
    const r = await formBox({ title: 'Nhập danh sách học sinh', tone: 'cb', ok: 'Tạo tài khoản', message: 'Mỗi dòng một em: Họ và tên, Lớp. Dán thẳng 2 cột từ Excel cũng được. Tài khoản tự đặt theo tiền tố + số thứ tự, mật khẩu ngẫu nhiên.',
      fields: [{ key: 'list', label: 'Danh sách', multiline: true, placeholder: 'Nguyễn Văn A, 10A1\nTrần Thị B, 10A1' }, { key: 'prefix', label: 'Tiền tố tài khoản', value: 'hs' }],
      run: async v => {
        const lines = String(v.list || '').split(/\r?\n/).map(l => l.split(/\t|,|;/).map(x => x.trim())).filter(x => x[0] && x[1]);
        if (!lines.length) throw new Error('Chưa có dòng nào đúng dạng "Họ và tên, Lớp"');
        const used = new Set(studs.map(s => s.username));
        let n = studs.length + 1; const made: string[][] = [];
        for (const [name, className] of lines) {
          let u = ''; do { u = `${String(v.prefix || 'hs').toLowerCase()}${String(n++).padStart(3, '0')}`; } while (used.has(u));
          used.add(u);
          const password = Math.random().toString(36).slice(2, 10);
          await api.createUser({ username: u, password, name, className: className.toUpperCase(), role: 'student' });
          made.push([name, className.toUpperCase(), u, password]);
        }
        return made;
      } });
    if (r && Array.isArray(r)) {
      toast(`Đã tạo ${r.length} tài khoản`);
      await exportCsv('Tai_khoan_hoc_sinh_moi', [['Họ và tên', 'Lớp', 'Tài khoản', 'Mật khẩu'], ...r]);
    }
  };
  return (
    <Screen tone="cb" title="Học sinh" sub={`${studs.length} em · ${classes.length} lớp`} back right={<View style={{ flexDirection: 'row', gap: 6 }}><Btn small tone="cb" kind="secondary" title="Nhập" icon="list-outline" onPress={importMany} /><Btn small tone="cb" title="Thêm" icon="person-add-outline" onPress={add} /></View>}>
      <Field value={q} onChange={setQ} placeholder="Tìm tên, tài khoản" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Chip on={!cls} text="Tất cả" onPress={() => setCls('')} />{classes.map(c => <Chip key={c} on={cls === c} text={c} onPress={() => setCls(c)} />)}</View>
      <Card pad={false}>
        {list.length ? list.map((s, i) => <Row key={s.uid} first={i === 0} tone="cb" title={s.name} sub={`${s.className} · ${s.username || s.uid}`} onPress={() => router.push(`/cb/hs/${s.uid}`)} />) : <Empty text="Không có học sinh" icon="people-outline" />}
      </Card>
    </Screen>
  );
}
