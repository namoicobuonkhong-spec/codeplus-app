/*
 * CHẾ ĐỘ THỬ — kho dữ liệu nằm ngay trong máy, cùng bộ nghiệp vụ với Cloud Functions (shared/handlers.ts).
 * Có sẵn 9 cán bộ, 24 học sinh, ngân hàng câu hỏi, 4 ca thi (đang chờ, đang thi có thí sinh giả lập làm bài,
 * đã kết thúc có điểm, sắp tới). Mật khẩu chung: demo1234.
 * Trên web: nhiều tab cùng trình duyệt dùng chung dữ liệu (mỗi tab đăng nhập một tài khoản riêng).
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Backend, NewUser, Unsub } from './api';
import { handle, type Filter, type Tx } from '../../shared/handlers';
import { RuleError, type AttemptDoc, type Ev, type UserDoc, type KeyedQuestion } from '../../shared/logic';
import { BANK, DEMO_PASSWORD, EXAMS, STAFF, STUDENTS } from '../../shared/seed';

const KEY = 'cp-demo-db-v3', AUTH = 'cp-demo-auth', LEADER = 'cp-demo-leader';
type DB = { docs: Record<string, any>; pass: Record<string, { uid: string; password: string }>; seededAt: number };
const web = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.localStorage;
const clone = <T,>(x: T): T => (x === undefined ? x : JSON.parse(JSON.stringify(x)));

const parentOf = (p: string) => p.slice(0, p.lastIndexOf('/'));
function match(doc: any, filters: Filter[]) {
  return filters.every(f => {
    const v = doc[f.field];
    if (f.op === '==') return v === f.value;
    if (f.op === 'in') return (f.value as any[]).includes(v);
    if (f.op === 'array-contains') return Array.isArray(v) && v.includes(f.value);
    return false;
  });
}

export function createDemoBackend(): Backend {
  let db: DB = { docs: {}, pass: {}, seededAt: 0 };
  let me: UserDoc | null = null;
  let ready: Promise<void>;
  const userCbs = new Set<(u: UserDoc | null) => void>();
  const watchers = new Set<() => void>();
  const tabId = Math.random().toString(36).slice(2);

  // ---------------------------------------------------------------- lưu trữ
  function loadSync(): boolean {
    if (!web) return false;
    try { const raw = localStorage.getItem(KEY); if (raw) { db = JSON.parse(raw); return true; } } catch { }
    return false;
  }
  let saveTimer: any = null;
  // nhiều tab cùng ghi: chỉ ghép những tài liệu tab này vừa đổi vào bản mới nhất trong bộ nhớ trình duyệt
  const dirty = new Set<string>(); let full = false;
  const mark = (p: string) => { dirty.add(p); };
  function save() {
    if (web) {
      if (!full && !seeding) {
        let latest: DB | null = null;
        try { latest = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { }
        if (latest && latest.seededAt === db.seededAt) {
          for (const p of dirty) { if (p === '#pass') latest.pass = { ...latest.pass, ...db.pass }; else if (p in db.docs) latest.docs[p] = db.docs[p]; else delete latest.docs[p]; }
          db = latest;
        }
      }
      full = false; dirty.clear();
      try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { trimEvents(); try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { } }
      return;
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { AsyncStorage.setItem(KEY, JSON.stringify(db)).catch(() => { }); }, 400);
  }
  function trimEvents() { for (const k of Object.keys(db.docs)) if (k.includes('/events/') && Math.random() < 0.5) delete db.docs[k]; }
  const notify = () => { for (const w of Array.from(watchers)) { try { w(); } catch { } } };

  async function init() {
    if (web) loadSync();
    else { try { const raw = await AsyncStorage.getItem(KEY); if (raw) db = JSON.parse(raw); } catch { } }
    if (!db.seededAt || Date.now() - db.seededAt > 6 * 3600e3) await seed();
    // phiên đăng nhập: mỗi tab một phiên (web) / lưu trong máy (điện thoại)
    let uid: string | null = null;
    try { uid = web ? sessionStorage.getItem(AUTH) : await AsyncStorage.getItem(AUTH); } catch { }
    me = uid ? db.docs['users/' + uid] || null : null;
    if (web) window.addEventListener('storage', e => { if (e.key === KEY && e.newValue) { try { db = JSON.parse(e.newValue); notify(); } catch { } } });
    setInterval(tick, 2500);
  }

  // ---------------------------------------------------------------- giao dịch trên kho trong máy
  function makeTx(): { tx: Tx; commit: () => void } {
    const ops: (() => void)[] = [];
    const tx: Tx = {
      async get(path) { return clone(db.docs[path] ?? null); },
      async query(coll, filters) {
        const out: any[] = [];
        for (const [k, v] of Object.entries(db.docs)) if (parentOf(k) === coll && match(v, filters)) out.push(clone(v));
        return out;
      },
      set(path, data) { ops.push(() => { db.docs[path] = clone(data); mark(path); }); },
      update(path, patch) { ops.push(() => { if (!db.docs[path]) throw new RuleError('Không có dữ liệu ' + path); db.docs[path] = { ...db.docs[path], ...clone(patch) }; mark(path); }); },
      del(path) { ops.push(() => { delete db.docs[path]; mark(path); }); }
    };
    return { tx, commit: () => { ops.forEach(f => f()); } };
  }
  let seeding = false;
  async function run(name: string, data: any, user: UserDoc, now = Date.now(), reload = true) {
    if (web && reload && !seeding) loadSync();
    const { tx, commit } = makeTx();
    const r = await handle(name, data, { uid: user.uid, user, now }, tx);
    commit(); save(); notify();
    return r;
  }

  // ---------------------------------------------------------------- dữ liệu mẫu
  async function seed() {
    seeding = true;
    try { await seedInner(); } finally { seeding = false; }
  }
  async function seedInner() {
    db = { docs: {}, pass: {}, seededAt: Date.now() };
    for (const u of [...STAFF, ...STUDENTS]) { const { username, ...doc } = u; db.docs['users/' + u.uid] = { ...doc, username }; db.pass[username] = { uid: u.uid, password: DEMO_PASSWORD }; }
    for (const q of BANK) db.docs['bank/' + q.id] = q;
    for (const e of EXAMS) db.docs['exams/' + e.id] = { id: e.id, title: e.title, subject: e.subject, durationMin: e.durationMin, questions: e.questionIds.map(id => BANK.find(q => q.id === id)), createdBy: 'u-toan', createdAt: Date.now() };
    const mgr = db.docs['users/u-toan'];
    const T = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const inDays = (n: number) => new Date(Date.now() + n * 86400e3).toISOString().slice(0, 10);
    const mk = async (data: any, at: number) => (await run('createSession', data, mgr, at)).sid as string;

    // Ca đã kết thúc, đã công bố điểm (12A1, 15 phút)
    const s3 = await mk({ examId: 'E2', name: 'Kiểm tra 15 phút — Toán 12', date: inDays(-3), start: '14:00', classNames: ['12A1'], roomSize: 12, places: ['P.204'] }, T - 3 * 86400e3);
    await run('assignProctors', { sid: s3, rid: 'R1', proctors: ['u-gt1'] }, mgr, T - 3 * 86400e3);
    await run('openSession', { sid: s3 }, mgr, T - 3 * 86400e3 + 1000);
    await run('phatAll', { sid: s3, reason: 'Kiểm tra trên lớp' }, mgr, T - 3 * 86400e3 + 60000);
    const key3: KeyedQuestion[] = db.docs['keys/' + s3].questions;
    for (const st of STUDENTS.filter(x => x.className === '12A1')) {
      const ans: Record<string, string> = {};
      key3.forEach((q, i) => { const ok = (st.uid.charCodeAt(4) + i) % 5 !== 0; ans[q.id] = q.type === 'mcq' ? (ok ? q.answer : 'C') : q.type === 'short' ? (ok ? q.answer : '7') : ''; });
      await run('progress', { sid: s3, answers: ans, events: [[T - 3 * 86400e3 + 70000, 'S'], [T - 3 * 86400e3 + 500000, 'SUB']] }, db.docs['users/' + st.uid], T - 3 * 86400e3 + 600000);
      await run('submit', { sid: s3 }, db.docs['users/' + st.uid], T - 3 * 86400e3 + 610000);
    }
    await run('closeSession', { sid: s3 }, mgr, T - 3 * 86400e3 + 1000000);
    await run('publish', { sid: s3 }, mgr, T - 3 * 86400e3 + 2000000);

    // Ca đang thi — thí sinh giả lập làm bài (12A2)
    const s2 = await mk({ examId: 'E1', name: 'Ca 2 — Toán 12 (12A2)', date: today, start: '07:00', classNames: ['12A2'], roomSize: 6, places: ['P.301', 'P.302'] }, T - 20 * 60000);
    await run('assignProctors', { sid: s2, rid: 'R1', proctors: ['u-gt3'] }, mgr, T);
    await run('assignProctors', { sid: s2, rid: 'R2', proctors: ['u-gt4'] }, mgr, T);
    await run('openSession', { sid: s2 }, mgr, T - 18 * 60000);
    await run('release', { sid: s2, note: 'Đúng giờ' }, mgr, T - 13 * 60000);
    for (const rid of ['R1', 'R2']) {
      const gt = rid === 'R1' ? db.docs['users/u-gt3'] : db.docs['users/u-gt4'];
      const room = db.docs[`sessions/${s2}/rooms/${rid}`];
      await run('checkin', { sid: s2, rid }, gt, T - 15 * 60000);
      await run('roll', { sid: s2, rid, marks: Object.fromEntries(room.students.map((x: string, i: number) => [x, rid === 'R2' && i === 5 ? 'vang' : 'co'])), done: true }, gt, T - 14 * 60000);
      await run('request', { sid: s2, rid, seal: db.docs['sessions/' + s2].seal.replace(/-/g, '').slice(-4) }, gt, T - 12 * 60000 + (rid === 'R2' ? 50000 : 0));
    }

    // Ca hôm nay đang mở phòng chờ — dùng để thử trọn quy trình phát đề và làm bài (12A1 + 12A2)
    const s1 = await mk({ examId: 'E1', name: 'Ca 1 — Toán 12', date: today, start: '07:30', classNames: ['12A1', '12A2'], roomSize: 12, places: ['P.204', 'P.205'] }, T - 60000);
    await run('assignProctors', { sid: s1, rid: 'R1', proctors: ['u-gt1', 'u-gt2'] }, mgr, T);
    await run('assignProctors', { sid: s1, rid: 'R2', proctors: ['u-gt3', 'u-gt4'] }, mgr, T);
    await run('openSession', { sid: s1 }, mgr, T);
    db.docs['meta/demo'] = { live: s2, main: s1 };
    await run('setPractice', { eid: 'E2', on: true }, mgr, T);

    // Ca sắp tới (nháp)
    const s4 = await mk({ examId: 'E2', name: 'Kiểm tra 15 phút — Toán 12 (lần 2)', date: inDays(5), start: '13:30', classNames: ['12A1'], roomSize: 12, places: ['Phòng máy 2'] }, T);
    await run('assignProctors', { sid: s4, rid: 'R1', proctors: ['u-gt2'] }, mgr, T);

    db.docs['notices/N1'] = { id: 'N1', title: 'Lịch thi giữa kì I', body: 'Các em có mặt tại phòng thi trước giờ thi 15 phút, mang thẻ học sinh. Điện thoại sạc đầy pin, tắt thông báo ứng dụng khác.', sid: null, to: 'all', by: 'u-kt', byName: 'Đỗ Tuấn', at: T - 2 * 3600e3 };
    full = true;
    db.docs['notices/N2'] = { id: 'N2', title: 'Đổi phòng thi Phòng 2', body: 'Phòng 2 ca 1 chuyển sang P.205 tầng 2.', sid: s1, to: 'session', by: 'u-kt', byName: 'Đỗ Tuấn', at: T - 40 * 60000 };
    save();
  }

  // ---------------------------------------------------------------- giả lập: thí sinh khác ở phòng chờ và đang làm bài
  function isLeader() {
    if (!web) return true;
    try {
      const l = JSON.parse(localStorage.getItem(LEADER) || 'null');
      if (!l || l.id === tabId || Date.now() - l.t > 6000) { localStorage.setItem(LEADER, JSON.stringify({ id: tabId, t: Date.now() })); return true; }
    } catch { }
    return false;
  }
  let busy = false;
  async function tick() {
    if (busy || !isLeader()) return;
    busy = true;
    try {
      if (web) loadSync();
      const meta = db.docs['meta/demo']; if (!meta) return;
      const now = Date.now();
      const realUid = me?.uid;
      // phòng chờ ca 1: phần lớn thí sinh đã vào và tải đề
      for (const [k, a] of Object.entries(db.docs) as [string, AttemptDoc][]) {
        if (!k.startsWith('attempts/') || a.sid !== meta.main || a.uid === realUid || a.uid === 'hs001') continue;
        const hash = a.uid.charCodeAt(3) + a.uid.charCodeAt(4);
        if (hash % 7 === 3) continue; // vài em chưa vào
        if (!a.startedAt) { if (now - (a.lastSeen || 0) > 15000) { db.docs[k] = { ...a, lastSeen: now, ready: true }; mark(k); } continue; }
        botStep(k, a, now);
      }
      for (const [k, a] of Object.entries(db.docs) as [string, AttemptDoc][]) {
        if (!k.startsWith('attempts/') || a.sid !== meta.live || a.uid === realUid) continue;
        if (a.startedAt) botStep(k, a, now);
      }
      save(); notify();
    } finally { busy = false; }
  }
  function botStep(k: string, a: AttemptDoc, now: number) {
    if (a.submitted || !a.startedAt || !a.order?.length) return;
    if (now > (a.deadline || 0)) return;
    const key: KeyedQuestion[] = db.docs['keys/' + a.sid].questions;
    const u = db.docs['users/' + a.uid];
    const seedN = a.uid.charCodeAt(4) + a.uid.charCodeAt(3) * 3;
    const sly = seedN % 6 === 1;              // một vài em có hành vi đáng ngờ
    if (Math.random() < 0.8) return;           // khoảng 4–5 thao tác/phút như người thật
    const evs: Ev[] = [];
    let answers: Record<string, string> | undefined;
    if (a.away) { if (Math.random() < 0.35) evs.push([now, 'FG']); }
    else if (sly && Math.random() < 0.12) { evs.push([now, 'BG']); }
    else if (Math.random() < 0.03) { evs.push([now, 'BG']); }
    else {
      const next = a.order.findIndex(id => a.answers[id] === undefined);
      if (next < 0) { if (Math.random() < 0.05) { void run('submit', { sid: a.sid }, u, now, false); } return; }
      const qid = a.order[next], q = key.find(x => x.id === qid)!;
      if (a.cur !== next) evs.push([now - 800, 'N', a.cur, next]);
      const right = (seedN + next) % 4 !== 0;
      const val = q.type === 'mcq' ? (right ? q.answer : ['A', 'B', 'C', 'D'][(seedN + next) % 4]) : q.type === 'tf' ? (right ? q.answer : 'DSDS') : q.type === 'short' ? (right ? q.answer : '12') : 'Gọi cạnh hình vuông cắt đi là x (0 < x < 6). V(x) = x(12 − 2x)²…';
      evs.push(q.type === 'essay' ? [now, 'E', qid, val.length] : [now, 'A', qid, val]);
      if (sly && Math.random() < 0.2) evs.push([now + 10, 'SS']);
      answers = { [qid]: val };
      void run('progress', { sid: a.sid, answers, cur: next, events: evs }, u, now, false).catch(() => { });
      return;
    }
    if (evs.length) void run('progress', { sid: a.sid, events: evs }, u, now, false).catch(() => { });
  }

  // ---------------------------------------------------------------- giao diện Backend
  const api: Backend = {
    mode: 'demo',
    onUser(cb) { userCbs.add(cb); ready.then(() => cb(me)); return () => { userCbs.delete(cb); }; },
    async login(username, password) {
      await ready; if (web) loadSync();
      const p = db.pass[username.trim().toLowerCase()];
      if (!p || p.password !== password) throw new Error('Sai tài khoản hoặc mật khẩu');
      me = db.docs['users/' + p.uid];
      try { if (web) sessionStorage.setItem(AUTH, p.uid); else await AsyncStorage.setItem(AUTH, p.uid); } catch { }
      userCbs.forEach(cb => cb(me));
    },
    async logout() {
      me = null;
      try { if (web) sessionStorage.removeItem(AUTH); else await AsyncStorage.removeItem(AUTH); } catch { }
      userCbs.forEach(cb => cb(null));
    },
    async changePassword(oldPass, newPass) {
      if (!me) throw new Error('Chưa đăng nhập');
      const entry = Object.values(db.pass).find(p => p.uid === me!.uid);
      if (!entry || entry.password !== oldPass) throw new Error('Mật khẩu hiện tại không đúng');
      if (newPass.length < 6) throw new Error('Mật khẩu mới cần ít nhất 6 kí tự');
      entry.password = newPass; mark('#pass'); save();
    },
    async verifyPassword(pass) {
      const entry = Object.values(db.pass).find(p => p.uid === me?.uid);
      if (!entry || entry.password !== pass) throw new Error('Mật khẩu không đúng');
    },
    async call(name, data) {
      await ready;
      if (!me) throw new Error('Chưa đăng nhập');
      try { return await run(name, data, me); }
      catch (e: any) { throw new Error(e?.message || String(e)); }
    },
    watchDoc(path, cb) {
      let last = '\u0000';
      const fn = () => { const v = db.docs[path] ?? null; const s = JSON.stringify(v); if (s !== last) { last = s; cb(clone(v)); } };
      watchers.add(fn); ready.then(fn);
      return () => { watchers.delete(fn); };
    },
    watchQuery(coll, filters, cb) {
      let last = '\u0000';
      const fn = () => {
        const out: any[] = [];
        for (const [k, v] of Object.entries(db.docs)) if (parentOf(k) === coll && match(v, filters)) out.push(v);
        const s = JSON.stringify(out); if (s !== last) { last = s; cb(clone(out)); }
      };
      watchers.add(fn); ready.then(fn);
      return () => { watchers.delete(fn); };
    },
    async getDoc(path) { await ready; return clone(db.docs[path] ?? null); },
    async query(coll, filters) {
      await ready;
      const out: any[] = [];
      for (const [k, v] of Object.entries(db.docs)) if (parentOf(k) === coll && match(v, filters)) out.push(clone(v));
      return out;
    },
    async setDoc(path, data, merge) {
      await ready; if (web) loadSync();
      db.docs[path] = merge ? { ...(db.docs[path] || {}), ...clone(data) } : clone(data); mark(path);
      save(); notify();
    },
    async deleteDoc(path) { await ready; if (web) loadSync(); delete db.docs[path]; mark(path); save(); notify(); },
    async createUser(n: NewUser) {
      await ready; if (web) loadSync();
      const username = n.username.trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new Error('Tên đăng nhập 3–32 kí tự: chữ thường, số, . _ -');
      if (db.pass[username]) throw new Error('Tên đăng nhập đã có');
      if (n.password.length < 6) throw new Error('Mật khẩu cần ít nhất 6 kí tự');
      const uid = (n.role === 'student' ? 'hs-' : 'cb-') + Date.now().toString(36);
      db.pass[username] = { uid, password: n.password };
      mark('users/' + uid); mark('#pass');
      db.docs['users/' + uid] = { uid, role: n.role, name: n.name.trim(), username, className: n.className || undefined, staffRoles: n.staffRoles, position: n.position };
      save(); notify();
    },
    async resetPassword(uid, password) {
      await ready; if (web) loadSync();
      if (!me || me.role !== 'staff') throw new Error('Không có quyền');
      if (password.length < 6) throw new Error('Mật khẩu cần ít nhất 6 kí tự');
      const e = Object.values(db.pass).find(p => p.uid === uid);
      if (!e) throw new Error('Không có tài khoản');
      e.password = password; mark('#pass'); save();
    },
    now: () => Date.now(),
    async resetDemo() { await seed(); notify(); }
  };
  ready = init();
  return api;
}
