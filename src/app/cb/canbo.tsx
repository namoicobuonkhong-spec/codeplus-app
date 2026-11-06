/* CÁN BỘ — tài khoản, vai trò (quản trị). */
import React from 'react';
import { api } from '@/data/api';
import { Btn, Card, Loading, Muted, Row, Screen, formBox, toast } from '@/ui/kit';
import { useQuery } from '@/ui/hooks';
import type { StaffRole, UserDoc } from '../../../shared/logic';

const ROLE: Record<StaffRole, string> = { admin: 'Quản trị', bgh: 'BGH', quanli: 'Quản lí ca thi', coithi: 'Coi thi', kythuat: 'Kĩ thuật' };
export default function CanBo() {
  const staff = useQuery<UserDoc>('users', [{ field: 'role', op: '==', value: 'staff' }]);
  if (!staff) return <Loading tone="cb" />;
  const add = async () => {
    const r = await formBox({ title: 'Thêm cán bộ', tone: 'cb', ok: 'Tạo tài khoản', message: 'Vai trò: admin, bgh, quanli, coithi, kythuat — cách nhau dấu phẩy.', fields: [
      { key: 'name', label: 'Họ và tên' }, { key: 'position', label: 'Chức vụ', value: 'Giáo viên' }, { key: 'roles', label: 'Vai trò', value: 'coithi' }, { key: 'username', label: 'Tên đăng nhập' }, { key: 'password', label: 'Mật khẩu', value: Math.random().toString(36).slice(2, 10) }
    ], run: async v => {
      const roles = String(v.roles).split(',').map(x => x.trim()).filter(x => x in ROLE) as StaffRole[];
      if (!roles.length) throw new Error('Vai trò không hợp lệ');
      await api.createUser({ username: v.username, password: v.password, name: v.name.trim(), role: 'staff', staffRoles: roles, position: v.position });
    } });
    if (r) toast(`Đã tạo ${r.username}`);
  };
  return (
    <Screen tone="cb" title="Cán bộ" sub={`${staff.length} tài khoản`} back right={<Btn small tone="cb" title="Thêm" icon="person-add-outline" onPress={add} />}>
      <Card pad={false}>{staff.sort((a, b) => a.name.localeCompare(b.name, 'vi')).map((u, i) => <Row key={u.uid} first={i === 0} tone="cb" title={u.name} sub={`${u.position || ''} · ${(u.staffRoles || []).map(r => ROLE[r]).join(', ')} · ${u.username || ''}`} />)}</Card>
      <Muted style={{ fontSize: 12.5 }}>Đổi vai trò, khoá tài khoản: Firebase Console → Firestore → users (bản này chưa có màn hình sửa).</Muted>
    </Screen>
  );
}
