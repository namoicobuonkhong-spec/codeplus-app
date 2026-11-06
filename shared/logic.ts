/*
 * LÕI NGHIỆP VỤ DÙNG CHUNG — chạy y hệt trong app (chế độ thử) và trong Cloud Functions.
 * Không phụ thuộc Firebase hay React Native: chỉ dữ liệu thuần.
 */

// ---------------------------------------------------------------- kiểu dữ liệu
export type QType = 'mcq' | 'tf' | 'short' | 'essay';
export interface Question {
  id: string;
  type: QType;
  text: string;
  options?: string[];      // mcq: 4 phương án; tf: 4 mệnh đề a–d
  points: number;
  subject?: string;
  chapter?: string;
  level?: 'biet' | 'hieu' | 'vandung';
}
export interface KeyedQuestion extends Question { answer: string } // mcq 'A'..'D'; tf 'DSDS'; short '1,5'; essay '' (chấm tay)

export type Role = 'student' | 'staff';
export type StaffRole = 'admin' | 'bgh' | 'quanli' | 'coithi' | 'kythuat';
export interface UserDoc {
  uid: string; role: Role; name: string;
  className?: string; sbd?: string; username?: string;
  staffRoles?: StaffRole[]; position?: string;
}

export type SessionStatus = 'draft' | 'waiting' | 'running' | 'closed';
export interface SessionDoc {
  id: string; name: string; examId: string; examTitle: string; subject: string;
  date: string; start: string; durationMin: number; questionCount: number;
  status: SessionStatus; studentIds: string[]; staffIds: string[];
  releasedAt?: number | null; releasedBy?: string | null; lateMin: number;
  openedAt?: number | null; startedAt?: number | null; closedAt?: number | null;
  published?: boolean; seal: string; createdBy: string; createdAt: number;
  log?: LogEntry[];
}
export type LogEntry = [number, string, string, string]; // [lúc, uid, mã bước, ghi chú]
export interface RoomDoc {
  id: string; sid: string; name: string; place: string;
  proctors: string[]; students: string[];
  checkin: Record<string, number>; roll: Record<string, 'co' | 'vang'>;
  rollDone?: number | null; req?: { by: string; at: number } | null;
  startedAt?: number | null; startedBy?: string[];
  late: { uid: string; at: number; by: string; reason: string }[];
  log: LogEntry[];
}
export type Ev = [number, string, any?, any?]; // [lúc, mã, a, b]
export interface Metrics {
  events: number; away: number; awayMs: number; longestAway: number; screenshot: number;
  paste: number; answers: number; changes: number; afterAway: number; fast: number; burst: number;
  essayJump: number; netOff: number; resume: number;
}
export interface AttemptDoc {
  id: string; sid: string; uid: string; name: string; sbd: string; className: string; roomId: string;
  startedAt: number | null; deadline: number | null; answers: Record<string, string>; flags: Record<string, boolean>;
  cur: number; order: string[]; submitted: boolean; submittedAt?: number | null; receipt?: string | null;
  score?: number | null; maxScore?: number | null; correct?: number; wrong?: number; blank?: number; pendingEssay?: number;
  perQ?: Record<string, number>; essayScores?: Record<string, number>;
  away: boolean; awaySince?: number | null; lastSeen: number; lastEv?: Ev | null; metrics: Metrics; tail: Ev[];
  late?: string | null;
  extraMin?: number;
}

// ---------------------------------------------------------------- tiện ích
export const blankMetrics = (): Metrics => ({ events: 0, away: 0, awayMs: 0, longestAway: 0, screenshot: 0, paste: 0, answers: 0, changes: 0, afterAway: 0, fast: 0, burst: 0, essayJump: 0, netOff: 0, resume: 0 });
export const attemptId = (sid: string, uid: string) => sid + '_' + uid;
export function makeSeal(seed: string): string {
  let h = 2166136261 >>> 0;
  const out: string[] = [];
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i) + r * 131; h = Math.imul(h, 16777619) >>> 0; }
    out.push((h >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 4));
  }
  return out.join('-');
}
export function receiptOf(a: { sid: string; uid: string; answers: Record<string, string> }, at: number): string {
  return makeSeal(a.sid + '|' + a.uid + '|' + at + '|' + JSON.stringify(a.answers));
}
const norm = (s: string) => String(s ?? '').trim().replace(/\s+/g, '').replace(',', '.').toUpperCase();

// ---------------------------------------------------------------- chấm điểm
/** Đúng/sai 4 ý theo cách tính của đề TN THPT từ 2025: đúng 1 ý 10%, 2 ý 25%, 3 ý 50%, 4 ý 100% điểm câu. */
const TF_RATE = [0, 0.1, 0.25, 0.5, 1];
export function gradeOne(q: KeyedQuestion, ans: string | undefined): { pts: number; state: 'dung' | 'sai' | 'trong' | 'chocham' | 'mot-phan' } {
  if (q.type === 'essay') return { pts: 0, state: ans && ans.trim() ? 'chocham' : 'trong' };
  if (ans === undefined || ans === null || String(ans).trim() === '' || /^_+$/.test(String(ans))) return { pts: 0, state: 'trong' };
  if (q.type === 'mcq') return norm(ans) === norm(q.answer) ? { pts: q.points, state: 'dung' } : { pts: 0, state: 'sai' };
  if (q.type === 'short') return norm(ans) === norm(q.answer) ? { pts: q.points, state: 'dung' } : { pts: 0, state: 'sai' };
  // tf
  let k = 0; const a = norm(ans), key = norm(q.answer);
  for (let i = 0; i < key.length; i++) if (a[i] && a[i] === key[i]) k++;
  const pts = Math.round(q.points * TF_RATE[Math.min(4, k)] * 100) / 100;
  return { pts, state: k === key.length ? 'dung' : k ? 'mot-phan' : 'sai' };
}
export function grade(qs: KeyedQuestion[], answers: Record<string, string>, essayScores: Record<string, number> = {}) {
  let score = 0, max = 0, correct = 0, wrong = 0, blank = 0, pendingEssay = 0;
  const perQ: Record<string, number> = {};
  for (const q of qs) {
    max += q.points;
    const g = gradeOne(q, answers[q.id]);
    let pts = g.pts;
    if (q.type === 'essay') {
      if (essayScores[q.id] !== undefined) pts = Math.min(q.points, Math.max(0, essayScores[q.id]));
      else if (g.state === 'chocham') pendingEssay++;
    }
    perQ[q.id] = pts; score += pts;
    if (g.state === 'dung') correct++; else if (g.state === 'sai' || g.state === 'mot-phan') wrong++; else if (g.state === 'trong') blank++;
  }
  const to10 = max ? Math.round(score / max * 10 * 100) / 100 : 0;
  return { score: to10, raw: Math.round(score * 100) / 100, maxScore: max, correct, wrong, blank, pendingEssay, perQ };
}

// ---------------------------------------------------------------- nhật kí thao tác + mức nghi ngờ
/*
 * Mã sự kiện từ máy thí sinh:
 *  S bắt đầu · L mở lại bài · N chuyển câu [từ, đến] · A chọn/đổi đáp án [qid, giá trị] · E tự luận [qid, số kí tự]
 *  F đánh dấu [qid, 1|0] · BG rời app (về màn hình chính, mở app khác, kéo thông báo) · FG quay lại app
 *  SS chụp màn hình/ghi màn hình · P dán [số kí tự] · NET mạng [0|1] · SUB nộp bài
 */
export interface LiveState { cur: number; away: boolean; awayAt: number; lastBack: number; lastNav: number; win: number[]; essayLen: Record<string, number> }
export const blankLive = (): LiveState => ({ cur: 0, away: false, awayAt: 0, lastBack: 0, lastNav: 0, win: [], essayLen: {} });
export function stepEvent(m: Metrics, st: LiveState, answered: Record<string, any>, e: Ev) {
  const [t, k, a, b] = e;
  m.events++;
  if (k === 'L') m.resume++;
  else if (k === 'N') { st.cur = Number(b) || 0; st.lastNav = t; }
  else if (k === 'A') {
    const q = String(a), had = answered[q] !== undefined && answered[q] !== '';
    m.answers++; if (had) m.changes++;
    if (!had && st.lastNav && t - st.lastNav < 1500) m.fast++;
    if (st.lastBack && t - st.lastBack < 15000) m.afterAway++;
    if (b === '' || b === null || b === undefined) delete answered[q]; else answered[q] = b;
    st.win.push(t); while (st.win.length && t - st.win[0] > 60000) st.win.shift(); m.burst = Math.max(m.burst, st.win.length);
  } else if (k === 'E') {
    const q = String(a), len = Number(b) || 0, prev = st.essayLen[q] || 0;
    if (len - prev > 300) m.essayJump++;
    if (st.lastBack && t - st.lastBack < 15000 && len > prev) m.afterAway++;
    st.essayLen[q] = len; answered[q] = len ? 'x' : undefined;
  } else if (k === 'BG') { if (!st.away) { st.away = true; st.awayAt = t; m.away++; } }
  else if (k === 'FG') { if (st.away) { const d = t - st.awayAt; m.awayMs += d; m.longestAway = Math.max(m.longestAway, d); st.away = false; if (d >= 5000) st.lastBack = t; } }
  else if (k === 'SS') m.screenshot++;
  else if (k === 'P') m.paste++;
  else if (k === 'NET' && !a) m.netOff++;
}
export function suspicion(m: Metrics) {
  const r: [number, string][] = [];
  const add = (c: boolean, p: number, s: string) => { if (c) r.push([p, s]); };
  add(m.away > 0, Math.min(10, m.away), `Rời app ${m.away} lần`);
  add(m.awayMs >= 30000, Math.min(12, Math.round(m.awayMs / 30000) * 2), `Tổng thời gian rời app ${fmtDur(m.awayMs)}`);
  add(m.afterAway >= 1, m.afterAway * 3, `${m.afterAway} lần trả lời ngay sau khi quay lại (dưới 15 giây)`);
  add(m.screenshot >= 1, m.screenshot * 5, `Chụp/ghi màn hình ${m.screenshot} lần`);
  add(m.paste >= 1, m.paste * 3, `Dán ${m.paste} lần`);
  add(m.essayJump >= 1, m.essayJump * 4, `Tự luận tăng đột ngột nhiều chữ ${m.essayJump} lần`);
  add(m.burst >= 12, 4, `Trả lời dồn dập ${m.burst} câu trong 1 phút`);
  add(m.fast >= 8, 3, `${m.fast} câu trả lời chưa đầy 1,5 giây sau khi mở câu`);
  add(m.resume >= 2, m.resume, `Thoát hẳn rồi mở lại bài ${m.resume} lần`);
  const score = r.reduce((s, x) => s + x[0], 0);
  return { score, level: (score >= 14 ? 'cao' : score >= 6 ? 'vua' : 'thap') as 'cao' | 'vua' | 'thap', reasons: r.sort((a, b) => b[0] - a[0]).map(x => x[1]) };
}
export function fmtDur(ms: number) {
  const s = Math.round(Math.abs(ms) / 1000);
  return s >= 60 ? `${Math.floor(s / 60)} phút ${s % 60} giây` : `${s} giây`;
}
export const EV_TEXT: Record<string, string> = {
  S: 'Bắt đầu làm bài', L: 'Mở lại bài', N: 'Chuyển câu', A: 'Chọn đáp án', E: 'Viết tự luận', F: 'Đánh dấu xem lại',
  BG: 'Rời app', FG: 'Quay lại app', SS: 'Chụp/ghi màn hình', P: 'Dán nội dung', NET: 'Mạng', SUB: 'Nộp bài'
};
export const EV_BAD = new Set(['BG', 'SS', 'P']);

// ---------------------------------------------------------------- phát đề tại phòng thi
export type RoomStep = 'chuanhan' | 'diemdanh' | 'cholenh' | 'sansang' | 'choxacnhan' | 'daphat';
export const STEP_TEXT: Record<RoomStep, string> = {
  chuanhan: 'Chưa nhận phòng', diemdanh: 'Đang điểm danh', cholenh: 'Chờ lệnh phát đề', sansang: 'Chờ mở niêm phong', choxacnhan: 'Chờ CBCT2 xác nhận', daphat: 'Đã phát đề'
};
export const STEP_TEXT_HS: Record<RoomStep, string> = {
  chuanhan: 'Chờ cán bộ coi thi nhận phòng', diemdanh: 'Cán bộ coi thi đang điểm danh', cholenh: 'Đã điểm danh — chờ lệnh phát đề',
  sansang: 'Sắp phát đề — chuẩn bị làm bài', choxacnhan: 'Đang mở niêm phong đề…', daphat: 'Phòng đã phát đề'
};
export const LOG_TEXT: Record<string, string> = {
  mophong: 'Mở phòng chờ', nhan: 'Nhận phòng', diemdanh: 'Chốt điểm danh', lenh: 'Lệnh phát đề', yeucau: 'Mở niêm phong, đề nghị phát',
  huy: 'Huỷ đề nghị', xacnhan: 'CBCT2 xác nhận', phat: 'Đã phát đề', phatthay: 'Quản lí ca phát thay', dongloat: 'Phát đồng loạt',
  bosung: 'Phát bổ sung (đến muộn)', dong: 'Kết thúc ca thi', congbo: 'Công bố điểm', conggio: 'Cộng giờ', lamlai: 'Cho làm lại bài'
};
export function roomStep(r: RoomDoc, s: SessionDoc): RoomStep {
  if (r.startedAt) return 'daphat';
  if (r.req) return 'choxacnhan';
  if (r.rollDone) return s.releasedAt ? 'sansang' : 'cholenh';
  return Object.keys(r.checkin || {}).length ? 'diemdanh' : 'chuanhan';
}
export class RuleError extends Error { code = 'failed-precondition' }
const fail = (m: string): never => { throw new RuleError(m); };
const pushLog = (list: LogEntry[], e: LogEntry) => { list.push(e); if (list.length > 300) list.splice(0, list.length - 300); };

export const dist = {
  mustProctor(r: RoomDoc, uid: string) { if (!r.proctors.includes(uid)) fail('Bạn không được phân công coi ' + r.name); },
  checkin(r: RoomDoc, s: SessionDoc, uid: string, now: number) {
    dist.mustProctor(r, uid);
    if (s.status === 'closed') fail('Ca thi đã kết thúc');
    if (!r.checkin[uid]) { r.checkin[uid] = now; pushLog(r.log, [now, uid, 'nhan', '']); }
  },
  roll(r: RoomDoc, uid: string, marks: Record<string, 'co' | 'vang' | ''>, done: boolean, now: number, startedUids: Set<string>) {
    dist.mustProctor(r, uid);
    if (!r.checkin[uid]) fail('Bấm "Nhận phòng" trước khi điểm danh');
    if (r.rollDone && !r.startedAt && Object.keys(marks).length) fail('Đã chốt điểm danh');
    const inRoom = new Set(r.students);
    for (const [x, v] of Object.entries(marks)) {
      if (!inRoom.has(x)) continue;
      if (v === 'vang' && startedUids.has(x)) continue;
      if (v) r.roll[x] = v; else delete r.roll[x];
    }
    if (done) {
      const left = r.students.filter(x => !r.roll[x]);
      if (left.length) fail(`Còn ${left.length} thí sinh chưa điểm danh`);
      if (!r.rollDone) { r.rollDone = now; const co = r.students.filter(x => r.roll[x] === 'co').length; pushLog(r.log, [now, uid, 'diemdanh', `${co} có mặt, ${r.students.length - co} vắng`]); }
    }
  },
  /** CBCT1 mở niêm phong. Trả về danh sách thí sinh nhận đề nếu phòng chỉ 1 CBCT (phát luôn), ngược lại null (chờ CBCT2). */
  request(r: RoomDoc, s: SessionDoc, uid: string, seal4: string, now: number): string[] | null {
    dist.mustProctor(r, uid);
    if (s.status !== 'waiting' && s.status !== 'running') fail('Ca thi chưa mở phòng chờ hoặc đã kết thúc');
    if (r.startedAt) fail('Phòng đã phát đề');
    if (!s.releasedAt) fail('Chưa có lệnh phát đề của quản lí ca thi');
    if (!r.rollDone) fail('Điểm danh xong mới được phát đề');
    if (String(seal4 || '').toUpperCase().replace(/[^0-9A-F]/g, '') !== s.seal.replace(/-/g, '').slice(-4)) fail('Mã niêm phong không khớp — đọc 4 kí tự cuối trên biên bản giao đề');
    pushLog(r.log, [now, uid, 'yeucau', 'Mã niêm phong khớp']);
    if (r.proctors.length < 2) { r.startedBy = [uid]; return dist.phat(r, now, uid, 'phat', 'phòng 1 CBCT'); }
    r.req = { by: uid, at: now }; return null;
  },
  confirm(r: RoomDoc, uid: string, now: number): string[] {
    dist.mustProctor(r, uid);
    if (r.startedAt) fail('Phòng đã phát đề');
    if (!r.req) fail('Chưa có đề nghị phát đề');
    if (r.req!.by === uid) fail('CBCT thứ hai phải xác nhận trên tài khoản của mình');
    if (!r.checkin[uid]) fail('Bấm "Nhận phòng" trước');
    r.startedBy = [r.req!.by, uid];
    pushLog(r.log, [now, uid, 'xacnhan', '']);
    return dist.phat(r, now, uid, 'phat', '');
  },
  cancel(r: RoomDoc, uid: string, now: number) {
    dist.mustProctor(r, uid);
    if (!r.req || r.startedAt) fail('Không có đề nghị đang chờ');
    r.req = null; pushLog(r.log, [now, uid, 'huy', '']);
  },
  phat(r: RoomDoc, now: number, uid: string, code: string, note: string): string[] {
    const names = r.students.filter(x => r.roll[x] !== 'vang');
    r.startedAt = now; r.req = null;
    pushLog(r.log, [now, uid, code, `${names.length} thí sinh nhận đề${note ? ' · ' + note : ''}`]);
    return names;
  },
  late(r: RoomDoc, s: SessionDoc, uid: string, target: string, reason: string, isManager: boolean, startedUids: Set<string>, now: number, studentName: string) {
    if (!isManager) dist.mustProctor(r, uid);
    if (!r.startedAt || s.status !== 'running') fail('Phòng chưa phát đề');
    if (!r.students.includes(target)) fail('Thí sinh không thuộc phòng này');
    if (startedUids.has(target)) fail('Thí sinh đã nhận đề');
    const late = now - r.startedAt!;
    if (late > s.lateMin * 60000 && !isManager) fail(`Đã quá ${s.lateMin} phút sau khi phát đề — chỉ quản lí ca thi được cho vào thi`);
    if (!reason.trim()) fail('Ghi lí do đến muộn');
    r.roll[target] = 'co'; r.late.push({ uid: target, at: now, by: uid, reason });
    pushLog(r.log, [now, uid, 'bosung', `${studentName} — muộn ${Math.round(late / 60000)} phút · ${reason}`]);
  }
};

// ---------------------------------------------------------------- chia phòng, xếp tên tiếng Việt
export function viSortKey(name: string) {
  const parts = name.trim().split(/\s+/);
  const ten = parts.pop() || '';
  return [ten, parts.join(' ')];
}
export function viCompare(a: string, b: string) {
  const [t1, h1] = viSortKey(a), [t2, h2] = viSortKey(b);
  return t1.localeCompare(t2, 'vi') || h1.localeCompare(h2, 'vi');
}
export function splitRooms(students: { uid: string; name: string }[], size: number, places: string[] = []) {
  const sorted = students.slice().sort((a, b) => viCompare(a.name, b.name));
  const rooms: { name: string; place: string; students: string[]; sbd: Record<string, string> }[] = [];
  sorted.forEach((st, i) => {
    const k = Math.floor(i / size);
    if (!rooms[k]) rooms[k] = { name: `Phòng ${k + 1}`, place: places[k] || '', students: [], sbd: {} };
    rooms[k].students.push(st.uid);
    rooms[k].sbd[st.uid] = String(i + 1).padStart(3, '0');
  });
  return rooms;
}
/** Xáo trộn có hạt giống: mỗi thí sinh một thứ tự câu khác nhau nhưng mở lại vẫn như cũ. */
export function seededOrder(ids: string[], seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  const rnd = () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const a = ids.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
