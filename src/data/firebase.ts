/* Firebase thật: Auth (tài khoản), Firestore (dữ liệu, đồng bộ thời gian thực), Cloud Functions (mọi nghiệp vụ ghi). */
import { initializeApp, getApps } from 'firebase/app';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import {
  getFirestore, doc, collection, onSnapshot, getDoc as fsGetDoc, getDocs, query as fsQuery, where, setDoc as fsSetDoc, deleteDoc as fsDeleteDoc,
  type QueryConstraint
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Backend, Filter, NewUser } from './api';
import type { UserDoc } from '../../shared/logic';
import { firebaseConfig, FUNCTIONS_REGION, LOGIN_DOMAIN } from './config';
import { makeAuth } from './fbauth';

const emailOf = (username: string) => (username.includes('@') ? username.trim() : `${username.trim().toLowerCase()}@${LOGIN_DOMAIN}`);
const VI: Record<string, string> = {
  'auth/invalid-credential': 'Sai tài khoản hoặc mật khẩu', 'auth/wrong-password': 'Sai tài khoản hoặc mật khẩu', 'auth/user-not-found': 'Sai tài khoản hoặc mật khẩu',
  'auth/too-many-requests': 'Đăng nhập sai quá nhiều lần, thử lại sau ít phút', 'auth/network-request-failed': 'Không có mạng',
  'permission-denied': 'Không có quyền', 'unavailable': 'Mất kết nối máy chủ, thử lại', 'functions/unavailable': 'Mất kết nối máy chủ, thử lại'
};
const viErr = (e: any) => new Error(VI[e?.code] || String(e?.message || e).replace(/^.*?:\s*/, ''));

export function createFirebaseBackend(): Backend {
  const app = getApps()[0] || initializeApp(firebaseConfig);
  const auth = makeAuth(app);
  const db = getFirestore(app);
  const fns = getFunctions(app, FUNCTIONS_REGION);
  const apiFn = httpsCallable<{ name: string; data: any }, any>(fns, 'api');
  const createUserFn = httpsCallable<NewUser, any>(fns, 'createUser');
  let offset = 0;

  const ref = (path: string) => doc(db, path);
  const cons = (filters: Filter[]): QueryConstraint[] => filters.map(f => where(f.field, f.op, f.value));

  return {
    mode: 'firebase',
    onUser(cb) {
      let unsubDoc: (() => void) | null = null;
      const off = onAuthStateChanged(auth, fu => {
        unsubDoc?.(); unsubDoc = null;
        if (!fu) { cb(null); return; }
        unsubDoc = onSnapshot(ref('users/' + fu.uid), s => cb(s.exists() ? ({ ...(s.data() as any), uid: fu.uid } as UserDoc) : null), () => cb(null));
      });
      return () => { off(); unsubDoc?.(); };
    },
    async login(username, password) {
      try { await signInWithEmailAndPassword(auth, emailOf(username), password); } catch (e) { throw viErr(e); }
    },
    async logout() { await signOut(auth); },
    async changePassword(oldPass, newPass) {
      const u = auth.currentUser; if (!u || !u.email) throw new Error('Chưa đăng nhập');
      try { await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, oldPass)); await updatePassword(u, newPass); }
      catch (e) { throw viErr(e); }
    },
    async verifyPassword(pass) {
      const u = auth.currentUser; if (!u || !u.email) throw new Error('Chưa đăng nhập');
      try { await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, pass)); } catch { throw new Error('Mật khẩu không đúng'); }
    },
    async call(name, data) {
      const t0 = Date.now();
      try {
        const r = await apiFn({ name, data });
        const res = r.data || {};
        if (res.serverNow) offset = res.serverNow - (t0 + Date.now()) / 2;
        return res.result;
      } catch (e) { throw viErr(e); }
    },
    watchDoc(path, cb) { return onSnapshot(ref(path), s => cb(s.exists() ? (s.data() as any) : null), () => cb(null)); },
    watchQuery(coll, filters, cb) { return onSnapshot(fsQuery(collection(db, coll), ...cons(filters)), s => cb(s.docs.map(d => d.data() as any)), () => cb([])); },
    async getDoc(path) { const s = await fsGetDoc(ref(path)); return s.exists() ? (s.data() as any) : null; },
    async query(coll, filters) { const s = await getDocs(fsQuery(collection(db, coll), ...cons(filters))); return s.docs.map(d => d.data() as any); },
    async setDoc(path, data, merge) { try { await fsSetDoc(ref(path), data, { merge: !!merge }); } catch (e) { throw viErr(e); } },
    async deleteDoc(path) { try { await fsDeleteDoc(ref(path)); } catch (e) { throw viErr(e); } },
    async createUser(n) { try { await createUserFn(n); } catch (e) { throw viErr(e); } },
    now: () => Date.now() + offset
  };
}
