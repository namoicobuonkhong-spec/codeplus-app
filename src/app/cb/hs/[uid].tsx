/* HỒ SƠ HỌC SINH — thông tin, bảng điểm, luyện tập, vi phạm; đặt lại mật khẩu, nhắn tin. */
import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/data/api';
import { Avatar, Card, Loading, Muted, Row, Screen, Section, T, formBox, toast } from '@/ui/kit';
import { useDoc, useMe, useQuery } from '@/ui/hooks';
import { can } from '@/ui/staff';
import { Transcript, useScores } from '@/ui/scores';
import { exportCsv } from '@/ui/export';
import { F, fmtDate, initials, num } from '@/ui/theme';
import { View } from 'react-native';
import type { UserDoc } from '../../../../shared/logic';

export default function HoSo() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const me = useMe();
  const u = useDoc<UserDoc>('users/' + uid);
  const rows = useScores(uid, true);
  const practice = useQuery<any>('practice', [{ field: 'uid', op: '==', value: uid }]);
  const inc = useQuery<any>('incidents', [{ field: 'uid', op: '==', value: uid }]);
  if (!u || !rows || !practice || !inc) return <Loading tone="cb" />;
  const reset = async () => {
    const r = await formBox({ title: `Đặt lại mật khẩu · ${u.name}`, tone: 'cb', ok: 'Đặt lại', fields: [{ key: 'p', label: 'Mật khẩu mới', value: Math.random().toString(36).slice(2, 10), hint: 'Ghi lại để giao cho học sinh' }], run: async v => { await api.resetPassword(uid, v.p); } });
    if (r) toast(`Mật khẩu mới: ${r.p}`);
  };
  const done = practice.filter(p => p.submitted);
  return (
    <Screen tone="cb" title={u.name} sub={`Lớp ${u.className} · tài khoản ${u.username || uid}`} back>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar text={initials(u.name)} tone="cb" size={52} />
        <View style={{ flex: 1 }}><T style={{ fontFamily: F.b, fontSize: 17 }}>{u.name}</T><Muted style={{ fontSize: 13 }}>Lớp {u.className} · {rows.length} bài thi · {done.length} lần luyện tập · {inc.length} vi phạm</Muted></View>
      </Card>
      <Card pad={false}>
        <Row first tone="cb" icon="chatbubble-ellipses-outline" title="Nhắn tin" onPress={() => router.push(`/cb/chat/${uid}`)} />
        {can(me, 'kythuat', 'bgh') && <Row tone="cb" icon="key-outline" title="Đặt lại mật khẩu" onPress={reset} />}
        <Row tone="cb" icon="download-outline" title="Xuất bảng điểm" onPress={() => exportCsv(`Bang_diem_${u.name}`, [['Môn', 'Bài thi', 'Ngày', 'Điểm'], ...rows.map(r => [r.s.subject, r.s.examTitle, fmtDate(r.s.date), r.a?.submitted ? num(r.a.score) : 'vắng'])])} />
      </Card>
      <Section title="Bảng điểm" />
      <Transcript rows={rows} tone="cb" onOpen={r => router.push(`/cb/ts/${r.s.id}/${uid}`)} />
      {done.length > 0 && <><Section title="Luyện tập" /><Card pad={false}>{done.sort((a, b) => b.submittedAt - a.submittedAt).slice(0, 10).map((p, i) => <Row key={p.id} first={i === 0} tone="cb" title={p.title} sub={fmtDate(p.submittedAt)} right={<T style={{ fontFamily: F.b }}>{num(p.score)}</T>} />)}</Card></>}
      {inc.length > 0 && <><Section title="Vi phạm" /><Card pad={false}>{inc.map((x, i) => <Row key={x.id} first={i === 0} tone="cb" danger title={x.kind} sub={`${fmtDate(x.at)} · ${x.note || ''}`} onPress={() => router.push(`/cb/ts/${x.sid}/${uid}`)} />)}</Card></>}
    </Screen>
  );
}
