/* Bảng điểm cá nhân: dùng cho học sinh (chỉ ca đã công bố) và cán bộ (mọi ca đã kết thúc). */
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Card, Empty, Muted, Pill, T } from './kit';
import { useQuery } from './hooks';
import { C, F, fmtDate, num, type Tone } from './theme';
import type { AttemptDoc, SessionDoc } from '../../shared/logic';

export type ScoreRow = { s: SessionDoc; a: AttemptDoc | null };
export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const rank = (x: number | null) => (x == null ? '' : x >= 8 ? 'Giỏi' : x >= 6.5 ? 'Khá' : x >= 5 ? 'Trung bình' : x >= 3.5 ? 'Yếu' : 'Kém');

export function useScores(uid: string, staff: boolean): ScoreRow[] | undefined {
  const sessions = useQuery<SessionDoc>('sessions', [{ field: 'studentIds', op: 'array-contains', value: uid }]);
  const atts = useQuery<AttemptDoc>('attempts', [{ field: 'uid', op: '==', value: uid }]);
  return useMemo(() => {
    if (!sessions || !atts) return undefined;
    const byS = new Map(atts.map(a => [a.sid, a]));
    return sessions.filter(s => s.status === 'closed' && (staff || s.published)).map(s => ({ s, a: byS.get(s.id) || null }))
      .sort((x, y) => (y.s.date + y.s.start).localeCompare(x.s.date + x.s.start));
  }, [sessions, atts, staff]);
}
export function bySubject(rows: ScoreRow[]) {
  const m = new Map<string, ScoreRow[]>();
  for (const r of rows) { const k = r.s.subject || 'Khác'; (m.get(k) || m.set(k, []).get(k)!).push(r); }
  return Array.from(m).map(([subject, list]) => ({ subject, list, avg: avg(list.filter(r => r.a?.submitted && r.a.score != null).map(r => r.a!.score!)) })).sort((a, b) => a.subject.localeCompare(b.subject, 'vi'));
}

export function Transcript({ rows, tone, onOpen }: { rows: ScoreRow[]; tone: Tone; onOpen?: (r: ScoreRow) => void }) {
  const groups = bySubject(rows);
  const all = avg(rows.filter(r => r.a?.submitted && r.a.score != null).map(r => r.a!.score!));
  if (!rows.length) return <Card><Empty text="Chưa có điểm bài thi nào" icon="ribbon-outline" /></Card>;
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, backgroundColor: tone === 'hs' ? C.hs : C.cb, borderRadius: 16, padding: 16 }}>
          <T style={{ color: '#fff', opacity: 0.85, fontSize: 13, fontFamily: F.sb }}>Điểm trung bình</T>
          <T style={{ color: '#fff', fontFamily: F.b, fontSize: 34, letterSpacing: -0.5 }}>{num(all)}</T>
          <T style={{ color: '#fff', opacity: 0.9, fontSize: 13 }}>{rank(all)} · {rows.filter(r => r.a?.submitted).length} bài · {groups.length} môn</T>
        </View>
      </View>
      {groups.map(g => (
        <Card key={g.subject} pad={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: C.lineSoft, backgroundColor: '#FAFBFC', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <T style={{ fontFamily: F.b, flex: 1 }}>{g.subject}</T>
            <Muted style={{ fontSize: 12.5, marginRight: 8 }}>TB môn</Muted>
            <T style={{ fontFamily: F.b, fontSize: 18, color: tone === 'hs' ? C.hsDark : C.cbDark }}>{num(g.avg)}</T>
          </View>
          {g.list.map((r, i) => (
            <Pressable key={r.s.id} accessibilityRole={onOpen ? 'button' : undefined} disabled={!onOpen || !r.a?.submitted} onPress={() => onOpen?.(r)}
              style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.lineSoft }, pressed && { backgroundColor: '#F6F8FA' }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T style={{ fontFamily: F.sb, fontSize: 14.5 }} numberOfLines={1}>{r.s.examTitle}</T>
                <Muted style={{ fontSize: 12.5 }}>{fmtDate(r.s.date)} · {r.s.durationMin} phút{r.a?.submitted ? ` · đúng ${r.a.correct}/${r.s.questionCount}` : ''}</Muted>
              </View>
              {r.a?.submitted ? (<>
                {!!r.a.pendingEssay && <Pill text="chờ chấm TL" kind="warn" />}
                {!r.s.published && <Pill text="chưa công bố" kind="muted" />}
                <T style={{ fontFamily: F.b, fontSize: 18, minWidth: 42, textAlign: 'right', color: (r.a.score ?? 0) < 5 ? C.bad : C.ink }}>{num(r.a.score)}</T>
              </>) : <Pill text={r.a?.startedAt ? 'không nộp' : 'vắng'} kind="bad" />}
            </Pressable>
          ))}
        </Card>
      ))}
    </View>
  );
}
