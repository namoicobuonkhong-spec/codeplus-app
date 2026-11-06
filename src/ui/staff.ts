/* Quyền và tiện ích cho màn hình cán bộ. */
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { api } from '@/data/api';
import { formBox } from './kit';
import { EV_TEXT, type Ev, type RoomDoc, type StaffRole, type UserDoc } from '../../shared/logic';

export const can = (u: UserDoc | null | undefined, ...roles: StaffRole[]) => !!u && u.role === 'staff' && (u.staffRoles || []).some(r => r === 'admin' || roles.includes(r));
export const isManager = (u: UserDoc) => can(u, 'quanli', 'bgh');
/** Ai được xem nội dung câu hỏi khi theo dõi: quản lí ca, BGH, cán bộ coi thi đúng phòng. Kĩ thuật viên chỉ thấy khung bài. */
export const seesContent = (u: UserDoc, room?: RoomDoc | null) => can(u, 'quanli', 'bgh') || (!!room && room.proctors.includes(u.uid));
export const watchesAll = (u: UserDoc) => can(u, 'quanli', 'bgh', 'kythuat');

/** Xác nhận chính chủ: vân tay / Face ID nếu máy có, không thì nhập lại mật khẩu. */
export async function verifyMe(reason: string): Promise<boolean> {
  if (Platform.OS !== 'web') {
    try {
      if (await LocalAuthentication.hasHardwareAsync() && await LocalAuthentication.isEnrolledAsync()) {
        const r = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: 'Huỷ', fallbackLabel: 'Dùng mật khẩu máy' });
        return r.success;
      }
    } catch { }
  }
  const r = await formBox({ title: 'Xác nhận chính chủ', message: reason, tone: 'cb', ok: 'Xác nhận', fields: [{ key: 'p', label: 'Mật khẩu tài khoản của bạn', secure: true }], run: async v => { await api.verifyPassword(v.p); } });
  return !!r;
}

export const SSTATUS: Record<string, [string, 'muted' | 'info' | 'warn' | 'ok']> = { draft: ['Chưa mở', 'muted'], waiting: ['Phòng chờ mở', 'info'], running: ['Đang thi', 'warn'], closed: ['Đã kết thúc', 'ok'] };
export const STEP_N: Record<string, number> = { chuanhan: 0, diemdanh: 1, cholenh: 2, sansang: 3, choxacnhan: 4, daphat: 5 };

export const evLine = (e?: Ev | null) => {
  if (!e) return '';
  const [, k, a, b] = e;
  if (k === 'A') return `Chọn ${b === '' || b == null ? '(bỏ)' : String(b).replace(/_/g, '–')}`;
  if (k === 'N') return `Sang câu ${Number(b) + 1}`;
  if (k === 'E') return `Viết tự luận · ${b} kí tự`;
  if (k === 'F') return b ? 'Đánh dấu xem lại' : 'Bỏ đánh dấu';
  return EV_TEXT[k] || k;
};
