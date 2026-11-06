/* MÀN HÌNH BÀI LÀM — lưới thu nhỏ từng thí sinh, cập nhật trực tiếp (Firestore đẩy về khi máy thí sinh lưu bài). */
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Card, Empty, Loading, Muted, Screen, T } from '@/ui/kit';
import { useDoc, useMe, useNow, useQuery } from '@/ui/hooks';
import { evLine, watchesAll } from '@/ui/staff';
import { C, F, ago, clock } from '@/ui/theme';
import { fmtDur, suspicion, type AttemptDoc, type Ev, type RoomDoc, type SessionDoc } from '../../../../shared/logic';


type F = 'all' | 'away' | 'sus' | 'off' | 'done';
export default function ManHinh() {
  const { sid, room } = useLocalSearchParams<{ sid: string; room?: string }>();
  const me = useMe();
  const s = useDoc<SessionDoc>('sessions/' + sid);
  const rooms = useQuery<RoomDoc>(`sessions/${sid}/rooms`);
  const atts = useQuery<AttemptDoc>('attempts', [{ field: 'sid', op: '==', value: sid }]);
  const now = useNow(1000);
  const [rid, setRid] = useState<string | 'all'>(room || 'all');
  const [f, setF] = useState<F>('all');
  if (!s || !rooms || !atts) return <Loading tone="cb" />;
  const allowed = watchesAll(me) ? rooms : rooms.filter(r => r.proctors.includes(me.uid));
  const ids = new Set(allowed.map(r => r.id));
  const base = atts.filter(a => ids.has(a.roomId) && a.startedAt && (rid === 'all' || a.roomId === rid));
  const sus = (a: AttemptDoc) => suspicion(a.metrics).level !== 'thap';
  const off = (a: AttemptDoc) => !a.submitted && now - (a.lastSeen || 0) > 60000;
  const count = { all: base.length, away: base.filter(a => a.away && !a.submitted).length, sus: base.filter(sus).length, off: base.filter(off).length, done: base.filter(a => a.submitted).length };
  const list = base.filter(a => f === 'all' || (f === 'away' ? a.away && !a.submitted : f === 'sus' ? sus(a) : f === 'off' ? off(a) : a.submitted))
    .sort((a, b) => Number(b.away && !b.submitted) - Number(a.away && !a.submitted) || suspicion(b.metrics).score - suspicion(a.metrics).score || a.sbd.localeCompare(b.sbd));
  const deadline = base[0]?.deadline;
  const chips: [F, string, string, string][] = [['all', 'Tất cả', C.ink, '#fff'], ['away', 'Rời app', C.bad, C.badBg], ['sus', 'Nghi ngờ', C.warn, C.warnBg], ['off', 'Mất mạng', C.ink2, '#EEF1F5'], ['done', 'Đã nộp', C.ok, C.okBg]];
  return (
    <Screen tone="cb" title="Màn hình bài làm" sub={`${s.name}${deadline ? ' · còn ' + clock(deadline - now) : ''}`} back pad={false}>
      <View style={{ paddingHorizontal: 12, paddingTop: 12, gap: 10 }}>
        {allowed.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[{ id: 'all', name: 'Mọi phòng' } as any, ...allowed.slice().sort((a, b) => a.id.localeCompare(b.id, 'vi', { numeric: true }))].map(r => (
              <Pressable key={r.id} accessibilityRole="button" onPress={() => setRid(r.id)} style={{ height: 34, paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center', backgroundColor: rid === r.id ? C.cb : '#fff', borderWidth: 1, borderColor: rid === r.id ? C.cb : '#C9D3DF' }}>
                <T style={{ fontFamily: F.sb, fontSize: 13, color: rid === r.id ? '#fff' : C.ink }}>{r.name}</T>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {chips.map(([k, l, fg, bg]) => (
            <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: f === k }} onPress={() => setF(k)}
              style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: f === k ? C.ink : bg, borderWidth: k === 'all' && f !== k ? 1 : 0, borderColor: '#C9D3DF' }}>
              <T style={{ fontFamily: F.sb, fontSize: 13, color: f === k ? '#fff' : fg }}>{l} {count[k]}</T>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={{ padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {!list.length && <Card style={{ flex: 1 }}><Empty text={s.status === 'waiting' ? 'Chưa phòng nào phát đề' : 'Không có thí sinh nào'} icon="desktop-outline" /></Card>}
        {list.map(a => {
          const sc = suspicion(a.metrics);
          const away = a.away && !a.submitted, warn = !away && sc.level !== 'thap';
          const total = a.order?.length || s.questionCount;
          const done = Object.keys(a.answers || {}).length;
          const tag = a.submitted ? `Đã nộp · ${ago(a.submittedAt, now)}` : away ? `Rời app ${fmtDur(now - (a.awaySince || now))}` : off(a) ? `Mất kết nối ${ago(a.lastSeen, now)}` : warn ? sc.reasons[0] : evLine(a.lastEv);
          return (
            <Pressable key={a.uid} accessibilityRole="button" onPress={() => router.push(`/cb/ts/${sid}/${a.uid}`)}
              style={({ pressed }) => [{ flexBasis: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 14, padding: 10, gap: 8, borderWidth: away || warn ? 2 : 1, borderColor: away ? C.badLine : warn ? C.warnLine : '#DDE3EA' }, a.submitted && { opacity: 0.7 }, pressed && { opacity: 0.85 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
                <T style={{ fontFamily: F.b, fontSize: 13, flex: 1 }} numberOfLines={1}>{a.name}</T>
                <Muted style={{ fontSize: 11 }}>{a.sbd}</Muted>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
                {(a.order?.length ? a.order : Array.from({ length: total }, (_, i) => 'x' + i)).map((id, i) => (
                  <View key={id} style={{ width: '8.4%', height: 6, borderRadius: 1.5, backgroundColor: i === a.cur && !a.submitted ? C.ink : a.flags?.[id] ? '#F0A35E' : a.answers?.[id] !== undefined ? '#7CC3A0' : '#E3E8EE' }} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T style={{ fontSize: 12, fontFamily: F.sb }}>Câu {(a.cur || 0) + 1}</T><Muted style={{ fontSize: 12 }}>{done}/{total}</Muted></View>
              <T style={{ fontSize: 11.5, fontFamily: F.sb, lineHeight: 15, color: away ? C.bad : warn ? C.warn : C.muted }} numberOfLines={2}>{tag}</T>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
