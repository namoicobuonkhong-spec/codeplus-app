/* KẾT QUẢ CA THI — danh sách điểm, phổ điểm, thống kê từng câu (độ khó, phương án nhiễu), phúc khảo, xuất Excel. */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/data/api';
import { Bar, Btn, Card, Empty, Kpi, KpiRow, Loading, Muted, Pill, Screen, Section, Seg, T, toast } from '@/ui/kit';
import { TYPE_TEXT } from '@/ui/exam';
import { useDoc, useMe, useQuery } from '@/ui/hooks';
import { isManager } from '@/ui/staff';
import { exportCsv } from '@/ui/export';
import { avg, rank } from '@/ui/scores';
import { C, F, fmtDate, num } from '@/ui/theme';
import { viCompare, type AttemptDoc, type KeyedQuestion, type RoomDoc, type SessionDoc } from '../../../../shared/logic';

export default function KetQua() {
  const { sid } = useLocalSearchParams<{ sid: string }>();
  const me = useMe();
  const s = useDoc<SessionDoc>('sessions/' + sid);
  const atts = useQuery<AttemptDoc>('attempts', [{ field: 'sid', op: '==', value: sid }]);
  const rooms = useQuery<RoomDoc>(`sessions/${sid}/rooms`);
  const appeals = useQuery<any>('appeals', [{ field: 'sid', op: '==', value: sid }]);
  const [key, setKey] = useState<KeyedQuestion[] | null>(null);
  const [tab, setTab] = useState<'ds' | 'cau' | 'lop'>('ds');
  const [sort, setSort] = useState<'diem' | 'ten'>('diem');
  useEffect(() => { if (isManager(me)) api.getDoc<any>('keys/' + sid).then(k => setKey(k?.questions || [])).catch(() => setKey([])); else setKey([]); }, [sid]); // eslint-disable-line react-hooks/exhaustive-deps
  const items = useMemo(() => {
    if (!key || !atts) return [];
    const done = atts.filter(a => a.submitted);
    return key.map((q, i) => {
      const got = done.map(a => a.perQ?.[q.id] ?? 0);
      const blank = done.filter(a => !a.answers?.[q.id]).length;
      const full = got.filter(g => g >= q.points).length;
      const dist: Record<string, number> = {};
      if (q.type === 'mcq') for (const a of done) { const v = a.answers?.[q.id]; if (v) dist[v] = (dist[v] || 0) + 1; }
      return { q, i, n: done.length, rate: done.length ? full / done.length : 0, blank, dist };
    });
  }, [key, atts]);
  if (!s || !atts || !rooms || !appeals || !key) return <Loading tone="cb" />;
  const done = atts.filter(a => a.submitted);
  const list = done.slice().sort(sort === 'diem' ? (a, b) => (b.score || 0) - (a.score || 0) || viCompare(a.name, b.name) : (a, b) => viCompare(a.name, b.name));
  const scores = done.map(a => a.score || 0);
  const mean = avg(scores);
  const bins = Array.from({ length: 10 }, (_, i) => scores.filter(v => (i === 9 ? v >= 9 : v >= i && v < i + 1)).length);
  const maxBin = Math.max(1, ...bins);
  const pending = done.filter(a => a.pendingEssay).length;
  const absent = atts.filter(a => !a.startedAt).length;
  const classes = Array.from(new Set(atts.map(a => a.className))).sort();
  const roomName = (id: string) => rooms.find(r => r.id === id)?.name || '';
  const exp = () => exportCsv(`Ket_qua_${s.name}_${s.date}`, [
    ['STT', 'SBD', 'Họ và tên', 'Lớp', 'Phòng', 'Điểm', 'Đúng', 'Sai', 'Bỏ trống', 'Xếp loại', 'Ghi chú'],
    ...atts.slice().sort((a, b) => a.sbd.localeCompare(b.sbd)).map((a, i) => [i + 1, a.sbd, a.name, a.className, roomName(a.roomId), a.submitted ? num(a.score) : '', a.correct ?? '', a.wrong ?? '', a.blank ?? '', a.submitted ? rank(a.score ?? 0) : '', !a.startedAt ? 'Vắng' : a.pendingEssay ? 'Chờ chấm tự luận' : (a.extraMin ? `Cộng ${a.extraMin} phút` : '')])
  ]);
  return (
    <Screen tone="cb" title="Kết quả" sub={`${s.name} · ${fmtDate(s.date)}`} back right={<Btn small tone="cb" kind="secondary" title="Xuất Excel" icon="download-outline" onPress={exp} />}
      footer={isManager(me) && s.status === 'closed' ? <Btn tone="cb" kind={s.published ? 'secondary' : 'primary'} title={s.published ? 'Thu hồi công bố điểm' : 'Công bố điểm và đáp án'} onPress={async () => { try { const x = await api.call('publish', { sid }); toast(x.published ? 'Đã công bố' : 'Đã thu hồi'); } catch (e: any) { toast(e.message, true); } }} /> : undefined}>
      <KpiRow>
        <Kpi label="Đã nộp" value={`${done.length}/${atts.length}`} sub={`${absent} vắng`} />
        <Kpi label="Điểm TB" value={num(mean)} sub={`≥5: ${scores.filter(x => x >= 5).length} em`} />
        <Kpi label="Chờ chấm" value={pending} tone={pending ? 'warn' : undefined} sub={`${appeals.filter(p => p.status === 'cho').length} phúc khảo`} />
      </KpiRow>
      <Seg tone="cb" value={tab} onChange={setTab} options={[['ds', 'Bảng điểm'], ['cau', 'Từng câu'], ['lop', 'Theo lớp']]} />

      {tab === 'ds' && <>
        <Card style={{ gap: 8 }}>
          <T style={{ fontFamily: F.sb }}>Phổ điểm</T>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 110 }}>
            {bins.map((b, i) => <View key={i} style={{ flex: 1, alignItems: 'center', gap: 3 }}><Muted style={{ fontSize: 10 }}>{b || ''}</Muted><View style={{ width: '100%', height: Math.max(2, (b / maxBin) * 80), borderRadius: 4, backgroundColor: i >= 8 ? C.hs : i >= 5 ? C.cb : '#9AA9BA' }} /><Muted style={{ fontSize: 10 }}>{i}</Muted></View>)}
          </View>
        </Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Section title={`Danh sách (${done.length})`} />
          <Pressable onPress={() => setSort(x => (x === 'diem' ? 'ten' : 'diem'))}><T style={{ color: C.cb, fontFamily: F.sb, fontSize: 13.5 }}>{sort === 'diem' ? 'Xếp theo tên' : 'Xếp theo điểm'}</T></Pressable>
        </View>
        <Card pad={false}>
          {list.length ? list.map((a, i) => (
            <Pressable key={a.uid} accessibilityRole="button" onPress={() => router.push(`/cb/ts/${sid}/${a.uid}`)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.lineSoft }, pressed && { backgroundColor: '#F6F8FA' }]}>
              <T style={{ width: 24, color: C.muted, fontFamily: F.sb, fontSize: 13 }}>{i + 1}</T>
              <View style={{ flex: 1 }}><T style={{ fontFamily: F.sb }} numberOfLines={1}>{a.name}</T><Muted style={{ fontSize: 12.5 }}>SBD {a.sbd} · {a.className} · đúng {a.correct}, sai {a.wrong}, trống {a.blank}</Muted></View>
              {a.pendingEssay ? <Pill text="Chấm TL" kind="warn" /> : null}
              <T style={{ fontFamily: F.b, fontSize: 18, minWidth: 44, textAlign: 'right', color: (a.score || 0) < 5 ? C.bad : C.ink }}>{num(a.score)}</T>
            </Pressable>
          )) : <Empty text="Chưa có bài nộp" icon="document-outline" />}
        </Card>
        <Muted style={{ fontSize: 12.5 }}>Bấm một em để xem bài, chấm tự luận, xem lịch sử làm bài.</Muted>
      </>}

      {tab === 'cau' && (key.length ? <>
        <Muted style={{ fontSize: 13 }}>Tỉ lệ làm đúng từng câu (xếp từ khó đến dễ). Câu trắc nghiệm có phân bố phương án: phương án nhiễu nào nhiều em chọn.</Muted>
        {items.slice().sort((a, b) => a.rate - b.rate).map(({ q, i, n, rate, blank, dist }) => (
          <Card key={q.id} style={{ gap: 8 }} tone={rate < 0.3 && n ? 'warn' : undefined}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <T style={{ fontFamily: F.b, fontSize: 13, color: C.cb }}>CÂU {i + 1} · {TYPE_TEXT[q.type]} · {q.chapter}</T>
              <Pill text={rate >= 0.8 ? 'Dễ' : rate >= 0.4 ? 'Vừa' : 'Khó'} kind={rate >= 0.8 ? 'ok' : rate >= 0.4 ? 'info' : 'bad'} />
            </View>
            <T numberOfLines={2} style={{ fontSize: 14, lineHeight: 20 }}>{q.text}</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ flex: 1 }}><Bar ratio={rate} color={C.cb} /></View><T style={{ fontFamily: F.sb, fontSize: 13 }}>{Math.round(rate * 100)}% đúng</T></View>
            {q.type === 'mcq' && <View style={{ flexDirection: 'row', gap: 6 }}>{['A', 'B', 'C', 'D'].map(L => <View key={L} style={{ flex: 1, borderRadius: 8, padding: 6, alignItems: 'center', backgroundColor: L === q.answer ? C.okBg : '#F1F4F7' }}><T style={{ fontFamily: F.b, fontSize: 13, color: L === q.answer ? C.ok : C.ink2 }}>{L}</T><Muted style={{ fontSize: 12 }}>{n ? Math.round(((dist[L] || 0) / n) * 100) : 0}%</Muted></View>)}</View>}
            <Muted style={{ fontSize: 12 }}>{blank} em bỏ trống · {n} bài</Muted>
          </Card>
        ))}
      </> : <Card><Empty text="Chỉ quản lí ca xem được thống kê từng câu (cần đáp án)" icon="lock-closed-outline" /></Card>)}

      {tab === 'lop' && <Card pad={false}>
        {classes.map((c, i) => {
          const xs = done.filter(a => a.className === c).map(a => a.score || 0), all = atts.filter(a => a.className === c).length;
          const m = avg(xs);
          return (
            <View key={c} style={{ padding: 14, gap: 6, borderTopWidth: i ? 1 : 0, borderTopColor: C.lineSoft }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T style={{ fontFamily: F.b }}>{c}</T><T style={{ fontFamily: F.b }}>TB {num(m)}</T></View>
              <Bar ratio={(m || 0) / 10} color={C.cb} />
              <Muted style={{ fontSize: 12.5 }}>{xs.length}/{all} bài · ≥8: {xs.filter(x => x >= 8).length} · 5–8: {xs.filter(x => x >= 5 && x < 8).length} · dưới 5: {xs.filter(x => x < 5).length} · cao nhất {num(xs.length ? Math.max(...xs) : null)}</Muted>
            </View>
          );
        })}
      </Card>}
    </Screen>
  );
}
