/*
 * CLOUD FUNCTIONS — máy chủ nghiệp vụ trên Firebase.
 *  api        : một hàm gọi duy nhất, chạy shared/handlers.ts trong giao dịch Firestore (phát đề, lưu bài, nộp bài, tạo ca…)
 *  createUser : tạo tài khoản (quản trị, kĩ thuật viên)
 *  autoClose  : mỗi phút tự nộp bài đã hết giờ (kể cả em mất mạng, tắt máy)
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Transaction, type Query } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2';
import { handle, type Filter, type Tx } from '../../shared/handlers';
import { RuleError, grade, receiptOf, type AttemptDoc, type KeyedQuestion, type UserDoc } from '../../shared/logic';

const REGION = 'asia-southeast1';     // trùng src/data/config.ts
const LOGIN_DOMAIN = 'hvt.codeplus.app';
setGlobalOptions({ region: REGION, maxInstances: 50 });
initializeApp();
const db = getFirestore();

function wrapTx(t: Transaction): Tx {
  return {
    async get(path) { const s = await t.get(db.doc(path)); return s.exists ? (s.data() as any) : null; },
    async query(coll, filters: Filter[]) {
      let q: Query = db.collection(coll);
      for (const f of filters) q = q.where(f.field, f.op, f.value);
      const s = await t.get(q);
      return s.docs.map(d => d.data() as any);
    },
    set(path, data) { t.set(db.doc(path), data); },
    update(path, patch) { t.update(db.doc(path), patch); },
    del(path) { t.delete(db.doc(path)); }
  };
}

const NAMES = new Set(['presence', 'progress', 'submit', 'createSession', 'assignProctors', 'openSession', 'release', 'phatAll', 'closeSession', 'publish', 'gradeEssay', 'checkin', 'roll', 'request', 'confirm', 'force', 'cancel', 'late', 'incident', 'notice', 'extend', 'resetAttempt', 'updateSession', 'deleteSession', 'setPractice', 'practiceStart', 'practiceSubmit', 'appeal', 'appealReply']);

export const api = onCall({ cors: true, memory: '256MiB', concurrency: 80 }, async req => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Chưa đăng nhập');
  const { name, data } = (req.data || {}) as { name: string; data: any };
  if (!NAMES.has(name)) throw new HttpsError('not-found', 'Không có chức năng ' + name);
  const us = await db.doc('users/' + req.auth.uid).get();
  if (!us.exists) throw new HttpsError('permission-denied', 'Tài khoản chưa có hồ sơ');
  const user = { ...(us.data() as UserDoc), uid: req.auth.uid };
  try {
    const result = await db.runTransaction(t => handle(name, data || {}, { uid: user.uid, user, now: Date.now() }, wrapTx(t)), { maxAttempts: 5 });
    return { result, serverNow: Date.now() };
  } catch (e: any) {
    if (e instanceof RuleError) throw new HttpsError('failed-precondition', e.message);
    console.error(name, e);
    throw new HttpsError('internal', 'Lỗi máy chủ: ' + (e?.message || e));
  }
});

export const createUser = onCall({ cors: true }, async req => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Chưa đăng nhập');
  const me = (await db.doc('users/' + req.auth.uid).get()).data() as UserDoc | undefined;
  const roles = me?.staffRoles || [];
  const n = req.data as { username: string; password: string; name: string; role: 'student' | 'staff'; className?: string; staffRoles?: string[]; position?: string };
  const canStudent = roles.some(r => ['admin', 'kythuat', 'bgh'].includes(r));
  if (!(n.role === 'student' ? canStudent : roles.includes('admin'))) throw new HttpsError('permission-denied', 'Không có quyền tạo tài khoản này');
  const username = String(n.username || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new HttpsError('invalid-argument', 'Tên đăng nhập 3–32 kí tự: chữ thường, số, . _ -');
  if (String(n.password || '').length < 6) throw new HttpsError('invalid-argument', 'Mật khẩu cần ít nhất 6 kí tự');
  try {
    const rec = await getAuth().createUser({ email: `${username}@${LOGIN_DOMAIN}`, password: n.password, displayName: n.name });
    const doc: any = { uid: rec.uid, role: n.role, name: String(n.name).trim(), username };
    if (n.role === 'student') doc.className = n.className || '';
    else { doc.staffRoles = n.staffRoles || ['coithi']; doc.position = n.position || ''; }
    await db.doc('users/' + rec.uid).set(doc);
    return { uid: rec.uid };
  } catch (e: any) {
    if (e?.code === 'auth/email-already-exists') throw new HttpsError('already-exists', 'Tên đăng nhập đã có');
    throw new HttpsError('internal', e?.message || String(e));
  }
});

/** Đặt lại mật khẩu: học sinh (kĩ thuật viên, BGH, quản trị), cán bộ (quản trị). */
export const resetPassword = onCall({ cors: true }, async req => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Chưa đăng nhập');
  const me = (await db.doc('users/' + req.auth.uid).get()).data() as UserDoc | undefined;
  const { uid, password } = req.data as { uid: string; password: string };
  const target = (await db.doc('users/' + uid).get()).data() as UserDoc | undefined;
  if (!target) throw new HttpsError('not-found', 'Không có tài khoản');
  const roles = me?.staffRoles || [];
  const ok = target.role === 'student' ? roles.some(r => ['admin', 'kythuat', 'bgh'].includes(r)) : roles.includes('admin');
  if (!ok) throw new HttpsError('permission-denied', 'Không có quyền đặt lại mật khẩu tài khoản này');
  if (String(password || '').length < 6) throw new HttpsError('invalid-argument', 'Mật khẩu cần ít nhất 6 kí tự');
  await getAuth().updateUser(uid, { password });
  return { ok: true };
});

/** Hết giờ mà máy thí sinh chưa nộp (mất mạng, hết pin…): máy chủ tự nộp bài đã lưu. */
export const autoClose = onSchedule({ schedule: 'every 1 minutes', timeZone: 'Asia/Ho_Chi_Minh' }, async () => {
  const now = Date.now();
  const snap = await db.collection('attempts').where('submitted', '==', false).where('deadline', '<', now - 90000).limit(400).get();
  const keys = new Map<string, KeyedQuestion[]>();
  for (const d of snap.docs) {
    const a = d.data() as AttemptDoc;
    if (!a.startedAt) continue;
    if (!keys.has(a.sid)) keys.set(a.sid, ((await db.doc('keys/' + a.sid).get()).data() as any)?.questions || []);
    const g = grade(keys.get(a.sid)!, a.answers || {}, a.essayScores || {});
    await d.ref.update({ submitted: true, submittedAt: now, receipt: receiptOf(a, now), score: g.score, maxScore: 10, correct: g.correct, wrong: g.wrong, blank: g.blank, pendingEssay: g.pendingEssay, perQ: g.perQ, autoSubmitted: true, away: false });
  }
});
