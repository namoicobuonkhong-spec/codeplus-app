/* BẢNG ĐIỂM LỚP — học sinh × bài thi đã kết thúc, điểm trung bình, xếp loại; xuất Excel. */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Btn, Card, Chip, Empty, Loading, Muted, Screen, T } from '@/ui/kit';
import { useQuery } from '@/ui/hooks';
import { exportCsv } from '@/ui/export';
import { avg, rank } from '@/ui/scores';
import { C, F, fmtDate, num } from '@/ui/theme';
import { viCompare, type AttemptDoc, type SessionDoc, type UserDoc } from '../../../shared/logic';

export default function BangDiemLop() {
  const { lop } = useLocalSearchParams<{ lop?: string }>();
  const studs = useQuery<UserDoc>('users', [{ field: 'role', op: '==', value: 'student' }]);
  const sessions = useQuery<SessionDoc>('sessions');
  const classes = useMemo(() => Array.from(new Set((studs || []).map(s => s.className || ''))).filter(Boolean).sort(), [studs]);
  const [cls, setCls] = useState(lop || '');
  const [sub, setSub] = useState('');
  const c = cls || classes[0] || '';
  const atts = useQuery<AttemptDoc>(c ? 'attempts' : null, [{ field: 'className', op: '==', value: c }]);
  if (!studs || !sessions || (c && !atts)) return <Loading tone="cb" />;
  const members = studs.filter(s => s.className === c).sort((a, b) => viCompare(a.name, b.name));
  const ids = new Set(members.map(m => m.uid));
  const closed = sessions.filter(s => s.status === 'closed' && s.studentIds.some(x => ids.has(x)));
  const subjects = Array.from(new Set(closed.map(s => s.subject))).sort();
  const cols = closed.filter(s => !sub || s.subject === sub).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const cell = new Map((atts || []).map(a => [a.sid + '|' + a.uid, a]));
  const rowAvg = (uid: string) => avg(cols.map(s => cell.get(s.id + '|' + uid)).filter(a => a?.submitted).map(a => a!.score || 0));
  const colAvg = (sid: string) => avg(members.map(m => cell.get(sid + '|' + m.uid)).filter(a => a?.submitted).map(a => a!.score || 0));
  const W = 64;
  const exp = () => exportCsv(`Bang_diem_${c}${sub ? '_' + sub : ''}`, [
    ['STT', 'Họ và tên', ...cols.map(s => `${s.examTitle} (${fmtDate(s.date)})`), 'TB', 'Xếp loại'],
    ...members.map((m, i) => { const t = rowAvg(m.uid); return [i + 1, m.name, ...cols.map(s => { const a = cell.get(s.id + '|' + m.uid); return !a ? '' : a.submitted ? num(a.score) : 'vắng'; }), num(t), rank(t)]; }),
    ['', 'TB lớp', ...cols.map(s => num(colAvg(s.id))), '', '']
  ]);
  return (
    <Screen tone="cb" title="Bảng điểm lớp" sub={c ? `${c} · ${members.length} học sinh · ${cols.length} bài` : ''} back right={cols.length ? <Btn small tone="cb" kind="secondary" title="Xuất Excel" icon="download-outline" onPress={exp} /> : undefined}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{classes.map(x => <Chip key={x} on={x === c} text={x} onPress={() => setCls(x)} />)}</View>
      {subjects.length > 1 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Chip on={!sub} text="Mọi môn" onPress={() => setSub('')} />{subjects.map(x => <Chip key={x} on={sub === x} text={x} onPress={() => setSub(x)} />)}</View>}
      {!cols.length ? <Card><Empty text="Lớp chưa có bài thi nào kết thúc" icon="grid-outline" /></Card> : (
        <Card pad={false} style={{ overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 150, borderRightWidth: 1, borderRightColor: C.line }}>
              <View style={{ height: 64, justifyContent: 'flex-end', padding: 8, backgroundColor: '#F6F8FA', borderBottomWidth: 1, borderBottomColor: C.line }}><T style={{ fontFamily: F.sb, fontSize: 12.5 }}>Họ và tên</T></View>
              {members.map((m, i) => (
                <Pressable key={m.uid} onPress={() => router.push(`/cb/hs/${m.uid}`)} style={{ height: 40, justifyContent: 'center', paddingHorizontal: 8, borderTopWidth: i ? 1 : 0, borderTopColor: C.lineSoft }}>
                  <T style={{ fontSize: 13, fontFamily: F.m, color: C.cb }} numberOfLines={1}>{i + 1}. {m.name}</T>
                </Pressable>
              ))}
              <View style={{ height: 40, justifyContent: 'center', paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: '#F6F8FA' }}><T style={{ fontSize: 13, fontFamily: F.b }}>TB lớp</T></View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={{ flexDirection: 'row', height: 64, backgroundColor: '#F6F8FA', borderBottomWidth: 1, borderBottomColor: C.line }}>
                  {cols.map(s => <Pressable key={s.id} onPress={() => router.push(`/cb/ketqua/${s.id}`)} style={{ width: W, padding: 6, justifyContent: 'flex-end', borderRightWidth: 1, borderRightColor: C.lineSoft }}><T style={{ fontSize: 10.5, fontFamily: F.sb, color: C.cb }} numberOfLines={3}>{s.subject} {fmtDate(s.date).slice(0, 5)}</T></Pressable>)}
                  <View style={{ width: W, padding: 6, justifyContent: 'flex-end' }}><T style={{ fontSize: 12, fontFamily: F.b }}>TB</T></View>
                  <View style={{ width: 84, padding: 6, justifyContent: 'flex-end' }}><T style={{ fontSize: 12, fontFamily: F.b }}>Xếp loại</T></View>
                </View>
                {members.map((m, i) => {
                  const t = rowAvg(m.uid);
                  return (
                    <View key={m.uid} style={{ flexDirection: 'row', height: 40, borderTopWidth: i ? 1 : 0, borderTopColor: C.lineSoft }}>
                      {cols.map(s => { const a = cell.get(s.id + '|' + m.uid); return <View key={s.id} style={{ width: W, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: C.lineSoft }}>{!a ? <Muted style={{ fontSize: 12 }}>—</Muted> : a.submitted ? <T style={{ fontFamily: F.sb, fontSize: 14, color: (a.score || 0) < 5 ? C.bad : C.ink }}>{num(a.score)}</T> : <T style={{ fontSize: 11, color: C.bad }}>vắng</T>}</View>; })}
                      <View style={{ width: W, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFBFC' }}><T style={{ fontFamily: F.b, fontSize: 14 }}>{num(t)}</T></View>
                      <View style={{ width: 84, justifyContent: 'center', paddingHorizontal: 6 }}><T style={{ fontSize: 12.5, color: t != null && t < 5 ? C.bad : C.ink2 }}>{rank(t)}</T></View>
                    </View>
                  );
                })}
                <View style={{ flexDirection: 'row', height: 40, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: '#F6F8FA' }}>
                  {cols.map(s => <View key={s.id} style={{ width: W, alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: F.b, fontSize: 13 }}>{num(colAvg(s.id))}</T></View>)}
                  <View style={{ width: W + 84 }} />
                </View>
              </View>
            </ScrollView>
          </View>
        </Card>
      )}
      <Muted style={{ fontSize: 12.5 }}>Bấm tên học sinh xem hồ sơ; bấm tên bài xem kết quả bài đó. Kéo ngang để xem thêm cột.</Muted>
    </Screen>
  );
}
