/* MỘT THÍ SINH — màn hình bài làm trực tiếp, mức nghi ngờ, lịch sử từng thao tác (bấm một dòng để xem lại màn hình lúc đó), ghi vi phạm, chấm tự luận. */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '@/data/api';
import { Btn, Card, Kpi, KpiRow, Loading, Muted, Note, Pill, Screen, Section, Seg, T, formBox, toast } from '@/ui/kit';
import { Palette, QuestionView } from '@/ui/exam';
import { useDoc, useMe, useNow, useQuery } from '@/ui/hooks';
import { evLine, isManager, seesContent } from '@/ui/staff';
import { C, F, ago, clock, fmtTime, num } from '@/ui/theme';
import { EV_BAD, attemptId, fmtDur, suspicion, type AttemptDoc, type Ev, type Question, type RoomDoc, type SessionDoc } from '../../../../../shared/logic';

const KINDS = ['Rời phòng thi không phép', 'Sử dụng tài liệu', 'Trao đổi bài', 'Dùng thiết bị khác', 'Nhờ người làm hộ', 'Khác'];

export default function ThiSinh() {
  const { sid, uid } = useLocalSearchParams<{ sid: string; uid: string }>();
  const me = useMe();
  const aid = attemptId(sid, uid);
  const a = useDoc<AttemptDoc>('attempts/' + aid);
  const s = useDoc<SessionDoc>('sessions/' + sid);
  const room = useDoc<RoomDoc>(a?.roomId ? `sessions/${sid}/rooms/${a.roomId}` : null);
  const chunks = useQuery<{ t: number; list: string }>(`attempts/${aid}/events`);
  const incidents = useQuery<any>('incidents', [{ field: 'sid', op: '==', value: sid }, { field: 'uid', op: '==', value: uid }]);
  const now = useNow(1000);
  const [paper, setPaper] = useState<Question[] | null>(null);
  const [tab, setTab] = useState<'live' | 'log'>('live');
  const [at, setAt] = useState<number | null>(null); // xem lại tại sự kiện thứ at
  const [onlyBad, setOnlyBad] = useState(false);
  useEffect(() => { api.getDoc<{ questions: Question[] }>(`sessions/${sid}/paper/main`).then(p => setPaper(p?.questions || [])).catch(() => setPaper([])); }, [sid]);

  const events = useMemo(() => {
    const out: Ev[] = [];
    for (const c of chunks || []) { try { out.push(...JSON.parse(c.list)); } catch { } }
    return out.sort((x, y) => x[0] - y[0]);
  }, [chunks]);
  // dựng lại màn hình tại một thời điểm
  const replay = useMemo(() => {
    if (at === null) return null;
    const ans: Record<string, string> = {}, fl: Record<string, boolean> = {}; let cur = 0, away = false;
    for (let i = 0; i <= at && i < events.length; i++) {
      const [, k, x, y] = events[i];
      if (k === 'N') cur = Number(y) || 0;
      else if (k === 'A') { if (y === '' || y == null) delete ans[x]; else ans[x] = y; }
      else if (k === 'E') ans[x] = y ? `(${y} kí tự)` : '';
      else if (k === 'F') fl[x] = !!y;
      else if (k === 'BG') away = true; else if (k === 'FG') away = false;
    }
    return { ans, fl, cur, away, t: events[at]?.[0] };
  }, [at, events]);

  if (!a || !s || !paper || !chunks) return <Loading tone="cb" />;
  const show = seesContent(me, room);
  const byId = new Map(paper.map(q => [q.id, q]));
  const order = a.order?.length ? a.order : paper.map(q => q.id);
  const view = replay || { ans: a.answers || {}, fl: a.flags || {}, cur: a.cur || 0, away: a.away && !a.submitted, t: null as number | null };
  const q = byId.get(order[Math.min(view.cur, order.length - 1)]);
  const sc = suspicion(a.metrics);
  const m = a.metrics;
  const list = events.map((e, i) => [e, i] as const).filter(([e]) => !onlyBad || EV_BAD.has(e[1])).reverse();
  const essays = paper.filter(x => x.type === 'essay');

  const incident = async () => {
    const r = await formBox({ title: `Ghi vi phạm · ${a.name}`, tone: 'cb', ok: 'Ghi biên bản', message: KINDS.map((k, i) => `${i + 1}. ${k}`).join('\n'),
      fields: [{ key: 'k', label: 'Loại vi phạm (gõ số 1–6)', value: '1', keyboard: 'numeric', maxLength: 1 }, { key: 'note', label: 'Mô tả', multiline: true, placeholder: 'Diễn biến, tang vật, hình thức xử lí' }] });
    if (!r) return;
    try { await api.call('incident', { sid, uid, kind: KINDS[Math.max(0, Math.min(5, Number(r.k) - 1))] || 'Khác', note: r.note }); toast('Đã ghi biên bản'); } catch (e: any) { toast(e.message, true); }
  };
  const gradeEssay = async (eq: Question) => {
    const r = await formBox({ title: 'Chấm tự luận', tone: 'cb', ok: 'Lưu điểm', message: (a.answers?.[eq.id] || '(bỏ trống)').slice(0, 1500), fields: [{ key: 'v', label: `Điểm (tối đa ${num(eq.points)})`, keyboard: 'decimal-pad', value: a.essayScores?.[eq.id] != null ? String(a.essayScores[eq.id]) : '' }] });
    if (!r) return;
    const v = Number(String(r.v).replace(',', '.'));
    if (!isFinite(v) || v < 0 || v > eq.points) { toast('Điểm không hợp lệ', true); return; }
    try { await api.call('gradeEssay', { sid, uid, qid: eq.id, score: v }); toast('Đã lưu điểm'); } catch (e: any) { toast(e.message, true); }
  };

  return (
    <Screen tone="cb" title={a.name} sub={`SBD ${a.sbd} · ${a.className} · ${room?.name || ''}`} back
      footer={<View style={{ flexDirection: 'row', gap: 8 }}><Btn tone="cb" kind="secondary" title="Ghi vi phạm" icon="warning-outline" onPress={incident} style={{ flex: 1 }} /></View>}>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Pill text={a.submitted ? 'Đã nộp ' + fmtTime(a.submittedAt) : a.startedAt ? 'Đang làm bài' : 'Chưa nhận đề'} kind={a.submitted ? 'ok' : 'info'} />
        {view.away && <Pill text={replay ? 'Đang rời app' : `Rời app ${fmtDur(now - (a.awaySince || now))}`} kind="bad" />}
        <Pill text={sc.level === 'cao' ? `Nghi ngờ cao · ${sc.score}` : sc.level === 'vua' ? `Nghi ngờ vừa · ${sc.score}` : 'Bình thường'} kind={sc.level === 'cao' ? 'bad' : sc.level === 'vua' ? 'warn' : 'ok'} />
        {a.deadline && !a.submitted && <Pill text={'Còn ' + clock(a.deadline - now)} kind="muted" />}
      </View>
      <Seg tone="cb" value={tab} onChange={v => { setTab(v); }} options={[['live', 'Màn hình bài làm'], ['log', `Lịch sử (${events.length})`]]} />

      {tab === 'live' && (<>
        {replay && <Note kind="warn" icon="play-back-outline" text={`Đang xem lại lúc ${fmtTime(replay.t, true)} (sự kiện ${at! + 1}/${events.length}).`} />}
        {replay && <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn small tone="cb" kind="secondary" title="◀ Trước" onPress={() => setAt(x => Math.max(0, (x ?? 0) - 1))} style={{ flex: 1 }} />
          <Btn small tone="cb" kind="secondary" title="Sau ▶" onPress={() => setAt(x => Math.min(events.length - 1, (x ?? 0) + 1))} style={{ flex: 1 }} />
          <Btn small tone="cb" title="Trực tiếp" onPress={() => setAt(null)} style={{ flex: 1 }} />
        </View>}
        <Card style={{ gap: 12, borderColor: view.away ? C.badLine : C.line, borderWidth: view.away ? 2 : 1 }}>
          {view.away && <Note kind="bad" icon="exit-outline" text="Thí sinh đang ở ngoài app làm bài." />}
          {q ? <QuestionView q={q} index={view.cur} total={order.length} value={view.ans[q.id]} readOnly hidden={!show} small /> : <Muted>Chưa mở câu nào.</Muted>}
        </Card>
        <Card style={{ gap: 10 }}>
          <T style={{ fontFamily: F.sb }}>Bảng câu · đã làm {Object.keys(view.ans).length}/{order.length}</T>
          <Palette order={order} answers={view.ans} flags={view.fl} cur={view.cur} size={30} cols={10} />
        </Card>
        {!events.length && <Muted style={{ fontSize: 13 }}>Chưa nhận nhật kí thao tác từ máy thí sinh.</Muted>}
      </>)}

      {tab === 'log' && (<>
        <KpiRow>
          <Kpi label="Rời app" value={m.away} sub={fmtDur(m.awayMs)} tone={m.away ? 'bad' : undefined} />
          <Kpi label="Chụp màn hình" value={m.screenshot} tone={m.screenshot ? 'bad' : undefined} />
          <Kpi label="Đổi đáp án" value={m.changes} sub={`${m.answers} lần chọn`} />
        </KpiRow>
        {sc.reasons.length ? <Card style={{ gap: 6 }}><T style={{ fontFamily: F.sb }}>Dấu hiệu đáng chú ý</T>{sc.reasons.map(r => <T key={r} style={{ fontSize: 13.5 }}>• {r}</T>)}</Card> : <Note kind="ok" icon="checkmark-circle-outline" text="Không có dấu hiệu bất thường." />}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Section title="Từng thao tác" />
          <Pressable onPress={() => setOnlyBad(x => !x)}><T style={{ color: C.cb, fontFamily: F.sb, fontSize: 13.5 }}>{onlyBad ? 'Hiện tất cả' : 'Chỉ bất thường'}</T></Pressable>
        </View>
        <Card pad={false}>
          {list.length ? list.slice(0, 300).map(([e, i], j) => (
            <Pressable key={i} accessibilityRole="button" onPress={() => { setAt(i); setTab('live'); }} style={({ pressed }) => [{ flexDirection: 'row', gap: 10, paddingVertical: 9, paddingHorizontal: 12, borderTopWidth: j ? 1 : 0, borderTopColor: C.lineSoft }, pressed && { backgroundColor: '#F5F7FA' }]}>
              <T style={{ fontSize: 12.5, fontFamily: F.sb, width: 64, color: C.muted }}>{fmtTime(e[0], true)}</T>
              <T style={{ flex: 1, fontSize: 13.5, color: EV_BAD.has(e[1]) ? C.bad : e[1] === 'A' || e[1] === 'E' ? C.ok : C.ink, fontFamily: EV_BAD.has(e[1]) ? F.sb : F.r }}>{evLine(e)}{e[1] === 'A' || e[1] === 'E' || e[1] === 'F' ? ` · câu ${order.indexOf(e[2]) + 1}` : ''}</T>
            </Pressable>
          )) : <Muted style={{ padding: 14 }}>Chưa có thao tác.</Muted>}
        </Card>
        <Muted style={{ fontSize: 12.5 }}>Bấm một dòng để xem lại màn hình bài làm lúc đó.</Muted>
      </>)}

      {!!incidents?.length && (<>
        <Section title="Biên bản vi phạm" />
        {incidents.map(x => <Card key={x.id} tone="bad" style={{ gap: 3 }}><T style={{ fontFamily: F.sb }}>{x.kind}</T>{!!x.note && <T style={{ fontSize: 13.5 }}>{x.note}</T>}<Muted style={{ fontSize: 12 }}>{x.byName} · {ago(x.at, now)}</Muted></Card>)}
      </>)}

      {isManager(me) && a.submitted && essays.length > 0 && (<>
        <Section title="Chấm tự luận" />
        {essays.map(eq => (
          <Card key={eq.id} onPress={() => gradeEssay(eq)} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T style={{ fontFamily: F.sb }}>Câu {order.indexOf(eq.id) + 1}</T><Pill text={a.essayScores?.[eq.id] != null ? `${num(a.essayScores[eq.id])}/${num(eq.points)}` : 'Chưa chấm'} kind={a.essayScores?.[eq.id] != null ? 'ok' : 'warn'} /></View>
            <Muted style={{ fontSize: 13 }} numberOfLines={3}>{a.answers?.[eq.id] || '(bỏ trống)'}</Muted>
          </Card>
        ))}
      </>)}
    </Screen>
  );
}
