/*
 * MỌI THAO TÁC GHI DỮ LIỆU của hệ thống — một bản duy nhất, chạy:
 *   - trên Cloud Functions (giao dịch Firestore, quyền admin) khi dùng Firebase thật;
 *   - ngay trong app ở chế độ thử (kho dữ liệu trong máy).
 * App không ghi thẳng vào cơ sở dữ liệu (trừ ngân hàng câu hỏi/đề/tin nhắn): gọi handle(tên, dữ liệu).
 * Mỗi hàm đọc hết rồi mới ghi (đúng luật giao dịch Firestore).
 */
import {
  AttemptDoc, Ev, KeyedQuestion, Question, RoomDoc, SessionDoc, UserDoc, StaffRole,
  attemptId, blankLive, blankMetrics, dist, grade, makeSeal, receiptOf, RuleError, seededOrder, splitRooms, stepEvent, LogEntry
} from './logic';

export interface Filter { field: string; op: '==' | 'in' | 'array-contains'; value: any }
export interface Tx {
  get<T = any>(path: string): Promise<T | null>;
  query<T = any>(coll: string, filters: Filter[]): Promise<T[]>;
  set(path: string, data: any): void;
  update(path: string, patch: any): void;
  del(path: string): void;
}
export interface Ctx { uid: string; user: UserDoc; now: number }

const fail = (m: string): never => { throw new RuleError(m); };
const has = (u: UserDoc, ...roles: StaffRole[]) => u.role === 'staff' && (u.staffRoles || []).some(r => roles.includes(r) || r === 'admin');
const mustStaff = (u: UserDoc) => { if (u.role !== 'staff') fail('Chỉ cán bộ được thực hiện'); };
const mustManage = (u: UserDoc) => { if (!has(u, 'quanli', 'bgh')) fail('Chỉ người quản lí ca thi (BGH, tổ trưởng) được thực hiện'); };
const LIVE_KEYS = 'live';

async function loadSession(tx: Tx, sid: string) {
  const s = await tx.get<SessionDoc>('sessions/' + sid);
  if (!s) fail('Không có ca thi này');
  return s!;
}
async function loadRoom(tx: Tx, sid: string, rid: string) {
  const r = await tx.get<RoomDoc>(`sessions/${sid}/rooms/${rid}`);
  if (!r) fail('Không có phòng này');
  return r!;
}
const roomAttempts = (tx: Tx, sid: string, rid: string) => tx.query<AttemptDoc>('attempts', [{ field: 'sid', op: '==', value: sid }, { field: 'roomId', op: '==', value: rid }]);

/** Bắt đầu tính giờ cho danh sách thí sinh (ghi sau khi đã đọc xong). */
function startAttempts(tx: Tx, s: SessionDoc, atts: AttemptDoc[], names: string[], at: number, order: (uid: string) => string[]) {
  const set = new Set(names);
  for (const a of atts) {
    if (!set.has(a.uid) || a.startedAt) continue;
    tx.update('attempts/' + a.id, { startedAt: at, deadline: at + s.durationMin * 60000, order: order(a.uid), lastSeen: a.lastSeen || 0 });
  }
}
function orderFor(paper: Question[], sid: string) {
  return (uid: string) => {
    // trộn thứ tự câu trong từng phần (trắc nghiệm, đúng/sai, trả lời ngắn, tự luận) — giữ thứ tự các phần như đề
    const parts: Record<string, string[]> = {};
    for (const q of paper) (parts[q.type] = parts[q.type] || []).push(q.id);
    return ['mcq', 'tf', 'short', 'essay'].flatMap(t => parts[t] ? seededOrder(parts[t], sid + uid + t) : []);
  };
}
function sessionLog(s: SessionDoc, e: LogEntry) { const l = (s.log || []).slice(-80); l.push(e); return l; }

export async function handle(name: string, d: any, c: Ctx, tx: Tx): Promise<any> {
  const u = c.user, now = c.now;
  switch (name) {
    // ============================================================ thí sinh
    case 'presence': { // ở phòng chờ: báo đang kết nối, đã tải đề
      const a = await tx.get<AttemptDoc>('attempts/' + attemptId(d.sid, c.uid));
      if (!a) fail('Em không có tên trong ca thi này');
      tx.update('attempts/' + a!.id, { lastSeen: now, ready: true });
      return { ok: true };
    }
    case 'progress': { // lưu bài + nhật kí thao tác (máy thí sinh gửi theo lô)
      const a = await tx.get<AttemptDoc>('attempts/' + attemptId(d.sid, c.uid));
      if (!a || a.uid !== c.uid) fail('Không có bài làm');
      const A = a!;
      if (!A.startedAt) fail('Chưa được phát đề');
      const patch: any = { lastSeen: now };
      const evs: Ev[] = (Array.isArray(d.events) ? d.events : []).slice(0, 400).filter((e: any) => Array.isArray(e) && typeof e[1] === 'string').map((e: any) => [Math.min(Number(e[0]) || now, now), String(e[1]).slice(0, 4), e[2] ?? null, e[3] ?? null]);
      const open = !A.submitted && now <= (A.deadline || 0) + 60000;
      if (open) {
        if (d.answers && typeof d.answers === 'object') {
          const ans = { ...A.answers };
          for (const [k, v] of Object.entries(d.answers)) { if (v === '' || v === null) delete ans[k]; else ans[k] = String(v).slice(0, 20000); }
          patch.answers = ans;
        }
        if (d.flags && typeof d.flags === 'object') patch.flags = { ...A.flags, ...d.flags };
        if (typeof d.cur === 'number') patch.cur = d.cur;
      }
      if (evs.length) {
        const m = { ...blankMetrics(), ...A.metrics };
        const live = { ...blankLive(), ...((A as any)[LIVE_KEYS] || {}) };
        const answered: Record<string, any> = { ...A.answers };
        for (const e of evs) stepEvent(m, live, answered, e);
        patch.metrics = m; patch[LIVE_KEYS] = live;
        patch.away = live.away; patch.awaySince = live.away ? live.awayAt : null;
        patch.lastEv = evs[evs.length - 1];
        patch.tail = [...(A.tail || []), ...evs.filter(e => e[1] !== 'E')].slice(-8);
        tx.set(`attempts/${A.id}/events/${now}-${Math.random().toString(36).slice(2, 7)}`, { t: now, list: JSON.stringify(evs) });
      }
      tx.update('attempts/' + A.id, patch);
      return { ok: true, saved: open };
    }
    case 'submit': {
      const a = await tx.get<AttemptDoc>('attempts/' + attemptId(d.sid, c.uid));
      if (!a || a.uid !== c.uid) fail('Không có bài làm');
      const key = await tx.get<{ questions: KeyedQuestion[] }>('keys/' + d.sid);
      if (a!.submitted) return { receipt: a!.receipt };
      if (!a!.startedAt) fail('Chưa được phát đề');
      return finish(tx, a!, key!.questions, now, d.answers);
    }

    // ============================================================ quản lí ca
    case 'createSession': {
      mustManage(u);
      const exam = await tx.get<{ id: string; title: string; subject: string; durationMin: number; questions: KeyedQuestion[] }>('exams/' + d.examId);
      if (!exam) fail('Không có đề này');
      const classes: string[] = (d.classNames || []).slice(0, 30);
      if (!classes.length) fail('Chọn ít nhất một lớp');
      const studs = await tx.query<UserDoc>('users', [{ field: 'role', op: '==', value: 'student' }, { field: 'className', op: 'in', value: classes }]);
      if (!studs.length) fail('Các lớp đã chọn chưa có học sinh');
      const size = Math.max(1, Math.min(60, Number(d.roomSize) || 24));
      const rooms = splitRooms(studs.map(x => ({ uid: x.uid, name: x.name })), size, d.places || []);
      const sid = 'S' + now.toString(36).toUpperCase();
      const qs = exam!.questions;
      const s: SessionDoc = {
        id: sid, name: String(d.name || exam!.title).slice(0, 120), examId: exam!.id, examTitle: exam!.title, subject: exam!.subject,
        date: d.date, start: d.start || '07:30', durationMin: Number(d.durationMin) || exam!.durationMin, questionCount: qs.length,
        status: 'draft', studentIds: studs.map(x => x.uid), staffIds: [u.uid], lateMin: Number(d.lateMin ?? 15),
        seal: makeSeal(sid + ':' + now + ':' + Math.random()), createdBy: u.uid, createdAt: now, published: false, log: [[now, u.uid, 'tao', '']]
      };
      const sbd: Record<string, string> = {};
      rooms.forEach(r => Object.assign(sbd, r.sbd));
      (s as any).sbd = sbd;
      tx.set('sessions/' + sid, s);
      rooms.forEach((r, i) => {
        const rid = 'R' + (i + 1);
        const doc: RoomDoc = { id: rid, sid, name: r.name, place: r.place, proctors: [], students: r.students, checkin: {}, roll: {}, rollDone: null, req: null, startedAt: null, startedBy: [], late: [], log: [] };
        tx.set(`sessions/${sid}/rooms/${rid}`, doc);
      });
      tx.set(`sessions/${sid}/paper/main`, { questions: qs.map(({ answer, ...q }) => q) });
      tx.set('keys/' + sid, { questions: qs });
      return { sid };
    }
    case 'assignProctors': {
      mustManage(u);
      const s = await loadSession(tx, d.sid);
      const r = await loadRoom(tx, d.sid, d.rid);
      const ids: string[] = (d.proctors || []).slice(0, 3);
      const others = await tx.query<RoomDoc>(`sessions/${d.sid}/rooms`, []);
      for (const o of others) if (o.id !== r.id && o.proctors.some(p => ids.includes(p))) fail('Một cán bộ chỉ coi một phòng trong ca');
      tx.update(`sessions/${d.sid}/rooms/${d.rid}`, { proctors: ids });
      tx.update('sessions/' + d.sid, { staffIds: Array.from(new Set([...s.staffIds, ...ids])) });
      return { ok: true };
    }
    case 'openSession': { // mở phòng chờ: tạo bài làm trống cho từng em
      mustManage(u);
      const s = await loadSession(tx, d.sid);
      if (s.status !== 'draft') fail('Ca thi đã mở');
      const rooms = await tx.query<RoomDoc>(`sessions/${d.sid}/rooms`, []);
      if (rooms.some(r => !r.proctors.length)) fail('Còn phòng chưa phân công cán bộ coi thi');
      const users = await tx.query<UserDoc>('users', [{ field: 'role', op: '==', value: 'student' }]);
      const byId = new Map(users.map(x => [x.uid, x]));
      const sbd = (s as any).sbd || {};
      for (const r of rooms) for (const uid of r.students) {
        const st = byId.get(uid);
        const a: AttemptDoc = { id: attemptId(s.id, uid), sid: s.id, uid, name: st?.name || uid, sbd: sbd[uid] || '', className: st?.className || '', roomId: r.id,
          startedAt: null, deadline: null, answers: {}, flags: {}, cur: 0, order: [], submitted: false, away: false, lastSeen: 0, metrics: blankMetrics(), tail: [] };
        tx.set('attempts/' + a.id, a);
      }
      tx.update('sessions/' + s.id, { status: 'waiting', openedAt: now, log: sessionLog(s, [now, u.uid, 'mophong', '']) });
      return { ok: true };
    }
    case 'release': {
      mustManage(u);
      const s = await loadSession(tx, d.sid);
      if (s.status !== 'waiting' && s.status !== 'running') fail('Cần mở phòng chờ trước');
      if (s.releasedAt) fail('Đã ra lệnh phát đề');
      tx.update('sessions/' + s.id, { releasedAt: now, releasedBy: u.uid, log: sessionLog(s, [now, u.uid, 'lenh', String(d.note || '').slice(0, 120)]) });
      return { ok: true };
    }
    case 'phatAll': {
      mustManage(u);
      const s = await loadSession(tx, d.sid);
      if (s.status !== 'waiting' && s.status !== 'running') fail('Cần mở phòng chờ trước');
      const rooms = await tx.query<RoomDoc>(`sessions/${d.sid}/rooms`, []);
      const atts = await tx.query<AttemptDoc>('attempts', [{ field: 'sid', op: '==', value: d.sid }]);
      const paper = await tx.get<{ questions: Question[] }>(`sessions/${d.sid}/paper/main`);
      let n = 0;
      for (const r of rooms) {
        if (r.startedAt) continue;
        r.startedBy = [u.uid];
        const names = dist.phat(r, now, u.uid, 'dongloat', String(d.reason || ''));
        startAttempts(tx, s, atts, names, now, orderFor(paper!.questions, s.id)); n += names.length;
        tx.update(`sessions/${d.sid}/rooms/${r.id}`, { startedAt: r.startedAt, startedBy: r.startedBy, req: null, log: r.log });
      }
      tx.update('sessions/' + s.id, { status: 'running', startedAt: s.startedAt || now, releasedAt: s.releasedAt || now, releasedBy: s.releasedBy || u.uid });
      return { phat: n };
    }
    case 'closeSession': {
      mustManage(u);
      const s = await loadSession(tx, d.sid);
      if (s.status === 'closed') fail('Ca thi đã kết thúc');
      const atts = await tx.query<AttemptDoc>('attempts', [{ field: 'sid', op: '==', value: d.sid }]);
      const key = await tx.get<{ questions: KeyedQuestion[] }>('keys/' + d.sid);
      let n = 0;
      for (const a of atts) if (a.startedAt && !a.submitted) { finish(tx, a, key!.questions, now); n++; }
      tx.update('sessions/' + s.id, { status: 'closed', closedAt: now, log: sessionLog(s, [now, u.uid, 'dong', `${n} bài tự nộp`]) });
      return { autoSubmitted: n };
    }
    case 'publish': {
      mustManage(u);
      const s = await loadSession(tx, d.sid);
      if (s.status !== 'closed') fail('Kết thúc ca thi rồi mới công bố điểm');
      tx.update('sessions/' + s.id, { published: !s.published, log: sessionLog(s, [now, u.uid, 'congbo', s.published ? 'thu hồi' : '']) });
      return { published: !s.published };
    }
    case 'gradeEssay': {
      mustStaff(u); if (!has(u, 'quanli', 'bgh')) fail('Chỉ giáo viên chấm/quản lí ca chấm tự luận');
      const a = await tx.get<AttemptDoc>('attempts/' + attemptId(d.sid, d.uid));
      const key = await tx.get<{ questions: KeyedQuestion[] }>('keys/' + d.sid);
      if (!a) fail('Không có bài làm');
      const es = { ...(a!.essayScores || {}), [d.qid]: Number(d.score) || 0 };
      const g = grade(key!.questions, a!.answers, es);
      tx.update('attempts/' + a!.id, { essayScores: es, score: g.score, perQ: g.perQ, pendingEssay: g.pendingEssay, correct: g.correct, wrong: g.wrong, blank: g.blank });
      return { score: g.score };
    }

    // ============================================================ phát đề tại phòng (cán bộ coi thi)
    case 'checkin': {
      const s = await loadSession(tx, d.sid); const r = await loadRoom(tx, d.sid, d.rid);
      dist.checkin(r, s, u.uid, now);
      tx.update(`sessions/${d.sid}/rooms/${d.rid}`, { checkin: r.checkin, log: r.log });
      return { ok: true };
    }
    case 'roll': {
      const r = await loadRoom(tx, d.sid, d.rid);
      const atts = await roomAttempts(tx, d.sid, d.rid);
      dist.roll(r, u.uid, d.marks || {}, !!d.done, now, new Set(atts.filter(a => a.startedAt).map(a => a.uid)));
      tx.update(`sessions/${d.sid}/rooms/${d.rid}`, { roll: r.roll, rollDone: r.rollDone || null, log: r.log });
      return { ok: true };
    }
    case 'request': case 'confirm': case 'force': {
      const s = await loadSession(tx, d.sid); const r = await loadRoom(tx, d.sid, d.rid);
      const atts = await roomAttempts(tx, d.sid, d.rid);
      const paper = await tx.get<{ questions: Question[] }>(`sessions/${d.sid}/paper/main`);
      let names: string[] | null;
      if (name === 'request') names = dist.request(r, s, u.uid, d.seal, now);
      else if (name === 'confirm') names = dist.confirm(r, u.uid, now);
      else {
        mustManage(u);
        if (s.status !== 'waiting' && s.status !== 'running') fail('Ca thi chưa mở phòng chờ hoặc đã kết thúc');
        if (r.startedAt) fail('Phòng đã phát đề');
        if (!String(d.reason || '').trim()) fail('Ghi lí do phát thay');
        r.startedBy = [u.uid]; names = dist.phat(r, now, u.uid, 'phatthay', String(d.reason));
      }
      if (names) {
        startAttempts(tx, s, atts, names, now, orderFor(paper!.questions, s.id));
        if (s.status === 'waiting') tx.update('sessions/' + s.id, { status: 'running', startedAt: now });
      }
      tx.update(`sessions/${d.sid}/rooms/${d.rid}`, { req: r.req || null, startedAt: r.startedAt || null, startedBy: r.startedBy || [], log: r.log });
      return names ? { phat: names.length } : { waiting: true };
    }
    case 'cancel': {
      const r = await loadRoom(tx, d.sid, d.rid);
      dist.cancel(r, u.uid, now);
      tx.update(`sessions/${d.sid}/rooms/${d.rid}`, { req: null, log: r.log });
      return { ok: true };
    }
    case 'late': {
      const s = await loadSession(tx, d.sid); const r = await loadRoom(tx, d.sid, d.rid);
      const atts = await roomAttempts(tx, d.sid, d.rid);
      const paper = await tx.get<{ questions: Question[] }>(`sessions/${d.sid}/paper/main`);
      const target = atts.find(a => a.uid === d.uid);
      dist.late(r, s, u.uid, d.uid, String(d.reason || ''), has(u, 'quanli', 'bgh'), new Set(atts.filter(a => a.startedAt).map(a => a.uid)), now, target?.name || d.uid);
      // giờ nộp như cả phòng
      if (target) tx.update('attempts/' + target.id, { startedAt: r.startedAt, deadline: r.startedAt! + s.durationMin * 60000, order: orderFor(paper!.questions, s.id)(target.uid), late: String(d.reason) });
      tx.update(`sessions/${d.sid}/rooms/${d.rid}`, { roll: r.roll, late: r.late, log: r.log });
      return { ok: true };
    }

    // ============================================================ vi phạm, thông báo
    case 'incident': {
      mustStaff(u);
      const a = await tx.get<AttemptDoc>('attempts/' + attemptId(d.sid, d.uid));
      if (!a) fail('Không có bài làm');
      const id = 'I' + now.toString(36) + Math.random().toString(36).slice(2, 5);
      tx.set('incidents/' + id, { id, sid: d.sid, uid: d.uid, name: a!.name, roomId: a!.roomId, kind: String(d.kind || 'Khác').slice(0, 60), note: String(d.note || '').slice(0, 500), by: u.uid, byName: u.name, at: now });
      return { id };
    }
    case 'notice': {
      mustStaff(u);
      if (!String(d.title || '').trim()) fail('Nhập tiêu đề');
      const id = 'N' + now.toString(36);
      tx.set('notices/' + id, { id, title: String(d.title).slice(0, 120), body: String(d.body || '').slice(0, 2000), sid: d.sid || null, to: d.sid ? 'session' : 'all', studentIds: d.studentIds || null, by: u.uid, byName: u.name, at: now });
      return { id };
    }
  }
  fail('Không có chức năng ' + name);
}

function finish(tx: Tx, a: AttemptDoc, key: KeyedQuestion[], now: number, lastAnswers?: Record<string, string>) {
  const answers = { ...a.answers };
  if (lastAnswers && now <= (a.deadline || 0) + 60000) for (const [k, v] of Object.entries(lastAnswers)) { if (v === '' || v == null) delete answers[k]; else answers[k] = String(v); }
  const g = grade(key, answers, a.essayScores || {});
  const receipt = receiptOf({ sid: a.sid, uid: a.uid, answers }, now);
  tx.update('attempts/' + a.id, { answers, submitted: true, submittedAt: now, receipt, score: g.score, maxScore: 10, correct: g.correct, wrong: g.wrong, blank: g.blank, pendingEssay: g.pendingEssay, perQ: g.perQ, away: false });
  return { receipt };
}
