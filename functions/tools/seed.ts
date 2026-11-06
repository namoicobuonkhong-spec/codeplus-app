/*
 * NẠP DỮ LIỆU MẪU VÀO FIREBASE THẬT (chạy một lần sau khi tạo dự án):
 *   1. Firebase Console → Project settings → Service accounts → Generate new private key → lưu thành functions/service-account.json
 *   2. cd functions && npm install && npm run build
 *   3. node lib/functions/tools/seed.js            (thêm --reset để xoá dữ liệu cũ trước)
 * Tạo 9 cán bộ, 24 học sinh (mật khẩu demo1234), ngân hàng câu hỏi, 2 đề, 1 ca thi đã mở phòng chờ.
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Query } from 'firebase-admin/firestore';
import * as path from 'path';
import { handle, type Tx } from '../../shared/handlers';
import { BANK, DEMO_PASSWORD, EXAMS, STAFF, STUDENTS } from '../../shared/seed';

const LOGIN_DOMAIN = 'hvt.codeplus.app';
initializeApp({ credential: cert(require(path.resolve(__dirname, '../../../service-account.json'))) });
const db = getFirestore(), auth = getAuth();

async function run(name: string, data: any, uid: string) {
  const user = (await db.doc('users/' + uid).get()).data() as any;
  return db.runTransaction(t => {
    const tx: Tx = {
      async get(p) { const s = await t.get(db.doc(p)); return s.exists ? (s.data() as any) : null; },
      async query(c, fs) { let q: Query = db.collection(c); for (const f of fs) q = q.where(f.field, f.op, f.value); return (await t.get(q)).docs.map(d => d.data() as any); },
      set(p, d) { t.set(db.doc(p), d); }, update(p, d) { t.update(db.doc(p), d); }, del(p) { t.delete(db.doc(p)); }
    };
    return handle(name, data, { uid, user: { ...user, uid }, now: Date.now() }, tx);
  });
}

(async () => {
  if (process.argv.includes('--reset')) {
    for (const c of ['sessions', 'attempts', 'keys', 'notices', 'incidents', 'threads', 'bank', 'exams']) await db.recursiveDelete(db.collection(c));
    console.log('Đã xoá dữ liệu cũ');
  }
  const ids: Record<string, string> = {};
  for (const u of [...STAFF, ...STUDENTS]) {
    const email = `${u.username}@${LOGIN_DOMAIN}`;
    let rec = await auth.getUserByEmail(email).catch(() => null);
    if (!rec) rec = await auth.createUser({ email, password: DEMO_PASSWORD, displayName: u.name });
    ids[u.uid] = rec.uid;
    const { uid, ...doc } = u as any;
    await db.doc('users/' + rec.uid).set(JSON.parse(JSON.stringify({ ...doc, uid: rec.uid })));
  }
  console.log('Tài khoản:', Object.keys(ids).length);
  for (const q of BANK) await db.doc('bank/' + q.id).set(q);
  for (const e of EXAMS) await db.doc('exams/' + e.id).set({ id: e.id, title: e.title, subject: e.subject, durationMin: e.durationMin, questions: e.questionIds.map(id => BANK.find(q => q.id === id)), createdBy: ids['u-toan'], createdAt: Date.now() });
  const mgr = ids['u-toan'];
  const today = new Date().toISOString().slice(0, 10);
  const { sid } = await run('createSession', { examId: 'E1', name: 'Ca 1 — Toán 12', date: today, start: '07:30', classNames: ['12A1', '12A2'], roomSize: 12, places: ['P.204', 'P.205'] }, mgr);
  await run('assignProctors', { sid, rid: 'R1', proctors: [ids['u-gt1'], ids['u-gt2']] }, mgr);
  await run('assignProctors', { sid, rid: 'R2', proctors: [ids['u-gt3'], ids['u-gt4']] }, mgr);
  await run('openSession', { sid }, mgr);
  await db.doc('notices/N1').set({ id: 'N1', title: 'Lịch thi giữa kì I', body: 'Các em có mặt tại phòng thi trước giờ thi 15 phút.', sid: null, to: 'all', by: ids['u-kt'], byName: 'Đỗ Tuấn', at: Date.now() });
  console.log('Xong. Ca thi', sid, '— đăng nhập toan / giamthi1 / hs001 (mật khẩu', DEMO_PASSWORD + ')');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
