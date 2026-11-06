/* LỊCH SỬ LÀM BÀI — xếp thí sinh theo mức nghi ngờ, kèm cặp trùng nhiều đáp án sai (quản lí ca). */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/data/api';
import { Card, Empty, Loading, Muted, Note, Pill, Screen, Section, T } from '@/ui/kit';
import { useDoc, useMe, useQuery } from '@/ui/hooks';
import { isManager, watchesAll } from '@/ui/staff';
import { C, F } from '@/ui/theme';
import { fmtDur, suspicion, type AttemptDoc, type KeyedQuestion, type RoomDoc, type SessionDoc } from '../../../../shared/logic';

export default function LichSu() {
  const { sid } = useLocalSearchParams<{ sid: string }>();
  const me = useMe();
  const s = useDoc<SessionDoc>('sessions/' + sid);
  const rooms = useQuery<RoomDoc>(`sessions/${sid}/rooms`);
  const atts = useQuery<AttemptDoc>('attempts', [{ field: 'sid', op: '==', value: sid }]);
  const [key, setKey] = useState<KeyedQuestion[] | null>(null);
  useEffect(() => { if (isManager(me)) api.getDoc<any>('keys/' + sid).then(k => setKey(k?.questions || null)).catch(() => { }); }, [sid]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s || !rooms || !atts) return <Loading tone="cb" />;
  const ids = new Set((watchesAll(me) ? rooms : rooms.filter(r => r.proctors.includes(me.uid))).map(r => r.id));
  const rows = atts.filter(a => a.startedAt && ids.has(a.roomId)).map(a => ({ a, sc: suspicion(a.metrics) })).sort((x, y) => y.sc.score - x.sc.score);
  // cặp cùng phòng trùng nhiều đáp án SAI giống nhau
  const pairs: { x: AttemptDoc; y: AttemptDoc; n: number }[] = [];
  if (key) {
    const ans = new Map(key.filter(q => q.type !== 'essay').map(q => [q.id, q.answer]));
    const wrong = (a: AttemptDoc) => Object.entries(a.answers || {}).filter(([q, v]) => ans.has(q) && v && v !== ans.get(q));
    const byRoom = new Map<string, AttemptDoc[]>();
    rows.forEach(({ a }) => { (byRoom.get(a.roomId) || byRoom.set(a.roomId, []).get(a.roomId)!).push(a); });
    for (const list of byRoom.values()) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const wy = new Map(wrong(list[j]));
      const n = wrong(list[i]).filter(([q, v]) => wy.get(q) === v).length;
      if (n >= 3) pairs.push({ x: list[i], y: list[j], n });
    }
    pairs.sort((p, q) => q.n - p.n);
  }
  const roomName = (id: string) => rooms.find(r => r.id === id)?.name || '';
  return (
    <Screen tone="cb" title="Lịch sử làm bài" sub={s.name} back>
      <Note kind="info" text="Mỗi thao tác của thí sinh được ghi lại. Điểm nghi ngờ cộng từ: rời app, trả lời ngay sau khi quay lại, chụp màn hình, trả lời dồn dập… Bấm một em để xem lại từng thao tác." />
      {pairs.length > 0 && (<>
        <Section title="Trùng nhiều đáp án sai" />
        {pairs.slice(0, 5).map((p, i) => <Card key={i} tone="warn"><T style={{ fontFamily: F.sb }}>{p.x.name} · {p.y.name}</T><Muted style={{ fontSize: 13 }}>{roomName(p.x.roomId)} · {p.n} câu sai giống hệt nhau</Muted></Card>)}
      </>)}
      <Section title={`Thí sinh (${rows.length})`} />
      {rows.length ? rows.map(({ a, sc }) => (
        <Card key={a.uid} onPress={() => router.push(`/cb/ts/${sid}/${a.uid}`)} tone={sc.level === 'cao' ? 'bad' : sc.level === 'vua' ? 'warn' : undefined} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}><T style={{ fontFamily: F.sb }}>{a.name}</T><Muted style={{ fontSize: 12.5 }}>SBD {a.sbd} · {roomName(a.roomId)} · {Object.keys(a.answers || {}).length} câu đã làm</Muted></View>
            <Pill text={sc.level === 'cao' ? `Cao · ${sc.score}` : sc.level === 'vua' ? `Vừa · ${sc.score}` : 'Bình thường'} kind={sc.level === 'cao' ? 'bad' : sc.level === 'vua' ? 'warn' : 'ok'} />
          </View>
          {sc.reasons.slice(0, 3).map(r => <T key={r} style={{ fontSize: 13, color: C.ink2 }}>• {r}</T>)}
          {!sc.reasons.length && <Muted style={{ fontSize: 12.5 }}>Rời app {a.metrics.away} lần · {fmtDur(a.metrics.awayMs)}</Muted>}
        </Card>
      )) : <Card><Empty text="Chưa có thí sinh nào nhận đề" icon="analytics-outline" /></Card>}
    </Screen>
  );
}
