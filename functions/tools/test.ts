/* Kiểm thử nghiệp vụ (không cần Firebase): node lib/functions/tools/test.js */
import { handle, type Tx, type Filter } from '../../shared/handlers';
import { BANK, EXAMS, STAFF, STUDENTS } from '../../shared/seed';
import { suspicion } from '../../shared/logic';
const docs: Record<string, any> = {};
const parent = (p: string) => p.slice(0, p.lastIndexOf('/'));
const m = (d: any, fs: Filter[]) => fs.every(f => f.op === '==' ? d[f.field] === f.value : f.op === 'in' ? f.value.includes(d[f.field]) : (d[f.field] || []).includes(f.value));
let T = Date.now();
async function run(name: string, data: any, uid: string, now = T) {
  const ops: (() => void)[] = [];
  const tx: Tx = {
    async get(p) { return docs[p] ? JSON.parse(JSON.stringify(docs[p])) : null; },
    async query(c, fs) { return Object.entries(docs).filter(([k, v]) => parent(k) === c && m(v, fs)).map(([, v]) => JSON.parse(JSON.stringify(v))); },
    set(p, d) { ops.push(() => { docs[p] = JSON.parse(JSON.stringify(d)); }); },
    update(p, d) { ops.push(() => { if (!docs[p]) throw new Error('missing ' + p); docs[p] = { ...docs[p], ...JSON.parse(JSON.stringify(d)) }; }); },
    del(p) { ops.push(() => { delete docs[p]; }); }
  };
  const r = await handle(name, data, { uid, user: docs['users/' + uid], now }, tx);
  ops.forEach(f => f()); return r;
}
let pass = 0, fail = 0;
const ok = (c: any, t: string) => { if (c) pass++; else { fail++; console.log('✗', t); } };
const err = async (p: Promise<any>, re: RegExp, t: string) => { try { await p; ok(false, t + ' (không báo lỗi)'); } catch (e: any) { ok(re.test(e.message), t + ' — ' + e.message); } };
(async () => {
  for (const u of [...STAFF, ...STUDENTS]) docs['users/' + u.uid] = u;
  for (const e of EXAMS) docs['exams/' + e.id] = { ...e, questions: e.questionIds.map(id => BANK.find(q => q.id === id)) };
  await err(run('createSession', { examId: 'E1', classNames: ['12A1'] }, 'u-gt1'), /quản lí/, 'Giáo viên coi thi không tạo được ca');
  const { sid } = await run('createSession', { examId: 'E1', date: '2026-11-06', classNames: ['12A1', '12A2'], roomSize: 12 }, 'u-toan');
  const s = docs['sessions/' + sid];
  ok(s.studentIds.length === 24 && docs[`sessions/${sid}/rooms/R2`].students.length === 12, 'Tạo ca, chia 2 phòng theo tên');
  ok(!JSON.stringify(docs[`sessions/${sid}/paper/main`]).includes('"answer"'), 'Đề phát cho thí sinh không chứa đáp án');
  await err(run('openSession', { sid }, 'u-toan'), /phân công/, 'Chưa phân công CBCT thì chưa mở phòng chờ');
  await run('assignProctors', { sid, rid: 'R1', proctors: ['u-gt1', 'u-gt2'] }, 'u-toan');
  await err(run('assignProctors', { sid, rid: 'R2', proctors: ['u-gt2'] }, 'u-toan'), /một phòng/, 'Một CBCT không coi 2 phòng');
  await run('assignProctors', { sid, rid: 'R2', proctors: ['u-gt3'] }, 'u-toan');
  await run('openSession', { sid }, 'u-toan');
  const r1 = docs[`sessions/${sid}/rooms/R1`].students as string[];
  ok(Object.keys(docs).filter(k => k.startsWith('attempts/')).length === 24, 'Mở phòng chờ: 24 bài trống');
  await err(run('progress', { sid, answers: { q01: 'A' } }, r1[0]), /Chưa được phát/, 'Chưa phát đề thì không lưu bài được');
  await err(run('checkin', { sid, rid: 'R1' }, 'u-gt3'), /không được phân công/, 'CBCT phòng khác không thao tác được');
  await err(run('roll', { sid, rid: 'R1', marks: {} }, 'u-gt1'), /Nhận phòng/, 'Phải nhận phòng trước');
  await run('checkin', { sid, rid: 'R1' }, 'u-gt1'); await run('checkin', { sid, rid: 'R1' }, 'u-gt2');
  await err(run('roll', { sid, rid: 'R1', marks: {}, done: true }, 'u-gt1'), /chưa điểm danh/, 'Chưa điểm danh hết thì không chốt');
  await run('roll', { sid, rid: 'R1', marks: Object.fromEntries(r1.map((x, i) => [x, i === 11 ? 'vang' : 'co'])), done: true }, 'u-gt1');
  const seal4 = s.seal.replace(/-/g, '').slice(-4);
  await err(run('request', { sid, rid: 'R1', seal: seal4 }, 'u-gt1'), /lệnh/, 'Chưa có lệnh thì chưa phát');
  await run('release', { sid }, 'u-toan');
  await err(run('request', { sid, rid: 'R1', seal: 'ZZZZ' }, 'u-gt1'), /niêm phong/, 'Sai mã niêm phong');
  ok((await run('request', { sid, rid: 'R1', seal: seal4 }, 'u-gt1')).waiting, 'CBCT1 mở niêm phong → chờ CBCT2');
  await err(run('confirm', { sid, rid: 'R1' }, 'u-gt1'), /thứ hai/, 'CBCT1 không tự xác nhận');
  T += 1000;
  ok((await run('confirm', { sid, rid: 'R1' }, 'u-gt2')).phat === 11, 'CBCT2 xác nhận → 11 em có mặt nhận đề');
  const a0 = docs[`attempts/${sid}_${r1[0]}`];
  ok(a0.startedAt === T && a0.deadline === T + 60 * 60000 && a0.order.length === 15, 'Bài bắt đầu tính giờ, có thứ tự câu riêng');
  ok(!docs[`attempts/${sid}_${r1[11]}`].startedAt, 'Em vắng không nhận đề');
  ok(docs['sessions/' + sid].status === 'running', 'Ca chuyển sang đang thi');
  // làm bài + nhật kí
  await run('progress', { sid, answers: { q01: 'B', q11: 'DDDS', q13: '10' }, cur: 2, events: [[T + 1000, 'S'], [T + 5000, 'BG'], [T + 45000, 'FG'], [T + 47000, 'A', 'q01', 'B'], [T + 48000, 'SS']] }, r1[0], T + 50000);
  const a1 = docs[`attempts/${sid}_${r1[0]}`];
  ok(a1.metrics.away === 1 && a1.metrics.afterAway === 1 && a1.metrics.screenshot === 1, 'Nhật kí: rời app, trả lời ngay khi quay lại, chụp màn hình');
  ok(suspicion(a1.metrics).score >= 9, 'Điểm nghi ngờ tăng: ' + suspicion(a1.metrics).reasons.join('; '));
  const sub = await run('submit', { sid, answers: { q02: 'A' } }, r1[0], T + 60000);
  const a2 = docs[`attempts/${sid}_${r1[0]}`];
  ok(sub.receipt && a2.submitted && a2.correct === 4 && a2.pendingEssay === 0, `Nộp bài, chấm: ${a2.correct} đúng, điểm ${a2.score}`);
  ok(Math.abs(a2.score - (0.25 * 2 + 1 + 0.5) / 6.5 * 10) < 0.01, 'Điểm quy về thang 10 đúng');
  const late = await run('progress', { sid, answers: { q03: 'B' } }, r1[1], T + 62 * 60000);
  ok(late.saved === false, 'Hết giờ thì không lưu thêm đáp án');
  await run('late', { sid, rid: 'R1', uid: r1[11], reason: 'Xe hỏng' }, 'u-gt1', T + 5 * 60000).catch(e => ok(false, e.message));
  ok(docs[`attempts/${sid}_${r1[11]}`].deadline === a0.deadline, 'Phát bổ sung: giờ nộp như cả phòng');
  await run('checkin', { sid, rid: 'R2' }, 'u-gt3');
  const r2 = docs[`sessions/${sid}/rooms/R2`].students as string[];
  await run('roll', { sid, rid: 'R2', marks: Object.fromEntries(r2.map(x => [x, 'co'])), done: true }, 'u-gt3');
  ok((await run('request', { sid, rid: 'R2', seal: seal4 }, 'u-gt3')).phat === 12, 'Phòng 1 CBCT: mở niêm phong là phát luôn');
  const c = await run('closeSession', { sid }, 'u-toan', T + 70 * 60000);
  ok(c.autoSubmitted === 23, 'Kết thúc ca: tự nộp 23 bài còn lại');
  await run('gradeEssay', { sid, uid: r1[1], qid: 'q15', score: 0.75 }, 'u-toan');
  ok(docs[`attempts/${sid}_${r1[1]}`].perQ.q15 === 0.75, 'Chấm tự luận');
  ok((await run('publish', { sid }, 'u-toan')).published, 'Công bố điểm');
  console.log(`\n${fail ? '✗' : '✓'} ${pass} đạt, ${fail} chưa đạt`);
  process.exit(fail ? 1 : 0);
})();
