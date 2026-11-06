/* THEO DÕI PHÁT ĐỀ — BGH, quản lí ca, kĩ thuật viên, mọi cán bộ coi thi của ca. */
import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Card, Dot, Kpi, KpiRow, Loading, Muted, Pill, Screen, Steps, T } from '@/ui/kit';
import { useDoc, useMe, useNow, useQuery } from '@/ui/hooks';
import { STEP_N } from '@/ui/staff';
import { C, F, fmtTime } from '@/ui/theme';
import { STEP_TEXT, fmtDur, roomStep, type AttemptDoc, type RoomDoc, type SessionDoc, type UserDoc } from '../../../../shared/logic';

export default function PhatDe() {
  const { sid } = useLocalSearchParams<{ sid: string }>();
  const me = useMe();
  const s = useDoc<SessionDoc>('sessions/' + sid);
  const rooms = useQuery<RoomDoc>(`sessions/${sid}/rooms`);
  const atts = useQuery<AttemptDoc>('attempts', [{ field: 'sid', op: '==', value: sid }]);
  const staff = useQuery<UserDoc>('users', [{ field: 'role', op: '==', value: 'staff' }]);
  const now = useNow(3000);
  if (!s || !rooms || !atts || !staff) return <Loading tone="cb" />;
  const name = (id: string) => staff.find(x => x.uid === id)?.name || id;
  const got = (a: AttemptDoc) => !!a.startedAt && ((a.metrics?.events || 0) > 0 || (a.lastSeen || 0) > a.startedAt);
  const started = atts.filter(a => a.startedAt);
  const sorted = rooms.slice().sort((a, b) => a.id.localeCompare(b.id, 'vi', { numeric: true }));
  return (
    <Screen tone="cb" title="Phát đề" sub={s.releasedAt ? `Lệnh phát đề ${fmtTime(s.releasedAt, true)} · ${name(s.releasedBy || '')}` : s.name} back>
      <KpiRow>
        <Kpi label="Phòng đã phát" value={`${rooms.filter(r => r.startedAt).length}/${rooms.length}`} sub={`${rooms.filter(r => r.req && !r.startedAt).length} chờ xác nhận`} />
        <Kpi label="Máy nhận đề" value={`${started.filter(got).length}/${started.length}`} />
        <Kpi label="Vắng" value={rooms.reduce((n, r) => n + Object.values(r.roll).filter(v => v === 'vang').length, 0)} />
      </KpiRow>
      {!s.releasedAt && s.status === 'waiting' && <Muted style={{ fontSize: 13 }}>Chưa có lệnh phát đề. Các phòng điểm danh trước, khi có lệnh mới mở niêm phong được.</Muted>}
      {sorted.map(r => {
        const step = roomStep(r, s);
        const slow = !!s.releasedAt && !r.startedAt && now - s.releasedAt > 5 * 60000;
        const ra = atts.filter(a => a.roomId === r.id);
        const st = ra.filter(a => a.startedAt), rec = st.filter(got);
        const on = ra.filter(a => !a.submitted && now - (a.lastSeen || 0) < 45000).length;
        return (
          <Card key={r.id} tone={slow ? 'bad' : undefined} onPress={() => router.push(`/cb/phong/${sid}/${r.id}`)} style={{ gap: 9 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <T style={{ fontFamily: F.b, flex: 1 }} numberOfLines={1}>{r.name}{r.place ? ' · ' + r.place : ''}{r.proctors.includes(me.uid) ? '  (phòng của bạn)' : ''}</T>
              <Pill text={slow ? 'Chậm ' + fmtDur(now - s.releasedAt!) : STEP_TEXT[step]} kind={step === 'daphat' ? 'ok' : slow ? 'bad' : step === 'chuanhan' ? 'muted' : 'warn'} />
            </View>
            <Steps n={STEP_N[step]} bad={slow} />
            <View style={{ gap: 3 }}>
              {r.proctors.length ? r.proctors.map(p => (
                <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Dot on={!!r.checkin[p]} /><T style={{ fontSize: 13 }}>{name(p)}</T><Muted style={{ fontSize: 12 }}>{r.checkin[p] ? 'nhận phòng ' + fmtTime(r.checkin[p]) : 'chưa nhận phòng'}</Muted></View>
              )) : <Muted style={{ fontSize: 13 }}>Chưa phân công CBCT</Muted>}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Muted style={{ fontSize: 12.5 }}>Phòng chờ {on}/{r.students.length} · có mặt {Object.values(r.roll).filter(v => v === 'co').length}</Muted>
              <T style={{ fontSize: 12.5, fontFamily: F.sb, color: C.ink2 }}>{r.startedAt ? `Phát ${fmtTime(r.startedAt, true)} · ${rec.length}/${st.length} máy` : r.req ? `${name(r.req.by)} đề nghị ${fmtTime(r.req.at)}` : ''}</T>
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
