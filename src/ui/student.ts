/* Dữ liệu dùng chung cho các màn hình học sinh. */
import { useMemo } from 'react';
import type { AttemptDoc, SessionDoc } from '../../shared/logic';
import { useMe, useQuery } from './hooks';

export function useMyExams() {
  const me = useMe();
  const sessions = useQuery<SessionDoc>('sessions', [{ field: 'studentIds', op: 'array-contains', value: me.uid }]);
  const attempts = useQuery<AttemptDoc>('attempts', [{ field: 'uid', op: '==', value: me.uid }]);
  return useMemo(() => {
    if (!sessions || !attempts) return undefined;
    const byS = new Map(attempts.map(a => [a.sid, a]));
    return sessions.map(s => ({ s, a: byS.get(s.id) || null })).sort((x, y) => (x.s.date + x.s.start).localeCompare(y.s.date + y.s.start));
  }, [sessions, attempts]);
}
export type MyExam = { s: SessionDoc; a: AttemptDoc | null };

export function examState(x: MyExam): { text: string; kind: 'ok' | 'warn' | 'bad' | 'info' | 'muted'; action?: 'wait' | 'work' | 'result' } {
  const { s, a } = x;
  if (s.status === 'draft') return { text: 'Sắp thi', kind: 'muted' };
  if (s.status === 'closed') return s.published ? { text: 'Đã có điểm', kind: 'ok', action: 'result' } : { text: 'Chờ công bố điểm', kind: 'muted' };
  if (a?.submitted) return { text: 'Đã nộp bài', kind: 'ok' };
  if (a?.startedAt) return { text: 'Đang làm bài', kind: 'warn', action: 'work' };
  return { text: 'Phòng chờ đã mở', kind: 'info', action: 'wait' };
}
