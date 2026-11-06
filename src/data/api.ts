/* Lớp dữ liệu của app. Hai cách chạy cùng một giao diện:
 *  - Firebase thật: điền cấu hình ở src/data/config.ts (Auth + Firestore + Cloud Functions).
 *  - Chế độ thử: để trống cấu hình → dữ liệu mẫu nằm trong máy, chạy ngay không cần mạng. */
import type { Filter } from '../../shared/handlers';
import type { UserDoc, StaffRole } from '../../shared/logic';
import { firebaseConfig } from './config';

export type Unsub = () => void;
export type { Filter };
export interface NewUser { username: string; password: string; name: string; role: 'student' | 'staff'; className?: string; staffRoles?: StaffRole[]; position?: string }

export interface Backend {
  mode: 'demo' | 'firebase';
  onUser(cb: (u: UserDoc | null) => void): Unsub;
  login(username: string, password: string): Promise<void>;
  logout(): Promise<void>;
  changePassword(oldPass: string, newPass: string): Promise<void>;
  /** Xác nhận lại mật khẩu (khi máy không có vân tay/Face ID) */
  verifyPassword(pass: string): Promise<void>;
  /** Mọi thao tác nghiệp vụ (phát đề, lưu bài, nộp bài, tạo ca…) — xem shared/handlers.ts */
  call<T = any>(name: string, data: any): Promise<T>;
  watchDoc<T = any>(path: string, cb: (d: T | null) => void): Unsub;
  watchQuery<T = any>(coll: string, filters: Filter[], cb: (list: T[]) => void): Unsub;
  getDoc<T = any>(path: string): Promise<T | null>;
  query<T = any>(coll: string, filters: Filter[]): Promise<T[]>;
  /** Ghi trực tiếp (ngân hàng câu hỏi, đề, tin nhắn) — Security Rules giới hạn quyền */
  setDoc(path: string, data: any, merge?: boolean): Promise<void>;
  deleteDoc(path: string): Promise<void>;
  createUser(u: NewUser): Promise<void>;
  resetPassword(uid: string, password: string): Promise<void>;
  /** Giờ máy chủ (ms) */
  now(): number;
  resetDemo?(): Promise<void>;
}

export const usingFirebase = !!firebaseConfig.apiKey;

let impl: Backend;
if (usingFirebase) impl = require('./firebase').createFirebaseBackend();
else impl = require('./demo').createDemoBackend();
export const api: Backend = impl;
