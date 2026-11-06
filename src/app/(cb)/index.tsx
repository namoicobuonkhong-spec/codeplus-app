import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Btn, Card, Empty, Icon, Kpi, KpiRow, Loading, Muted, Pill, Section, Steps, T, type IconName } from '@/ui/kit';
import { useMe, useNow, useQuery } from '@/ui/hooks';
import { SSTATUS, STEP_N, can, watchesAll } from '@/ui/staff';
import { C, F, fmtDate, initials } from '@/ui/theme';
import { roomStep, type AttemptDoc, type RoomDoc, type SessionDoc } from '../../../shared/logic';


function MyRoom({ s, uid }: { s: SessionDoc; uid: string }) {
  const rooms = useQuery<RoomDoc>(`sessions/${s.id}/rooms`, [{ field: 'proctors', op: 'array-contains', value: uid }]);
  const atts = useQuery<AttemptDoc>('attempts', [{ field: 'sid', op: '==', value: s.id }]);
  const now = useNow(5000);
  if (!rooms || !atts) return null;
  return <>{rooms.map(r => {
    const step = roomStep(r, s);
    const mine = atts.filter(a => a.roomId === r.id);
    const online = mine.filter(a => !a.submitted && now - (a.lastSeen || 0) < 45000).length;
    const second = r.proctors.filter(p => p !== uid);
    return (
      <Card key={r.id} style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pill text={`Coi thi · ${s.start}`} kind="warn" />
          <Muted style={{ fontSize: 13 }}>{r.proctors[0] === uid ? 'CBCT1' : 'CBCT2'}{second.length ? '' : ' · phòng 1 CBCT'}</Muted>
        </View>
        <View>
          <T style={{ fontFamily: F.b, fontSize: 20 }}>{r.name}{r.place ? ' · ' + r.place : ''}</T>
          <Muted style={{ fontSize: 14 }}>{s.examTitle} · {r.students.length} thí sinh</Muted>
        </View>
        <Steps n={STEP_N[step]} />
        <KpiRow>
          <Kpi label="Đang kết nối" value={`${online}/${r.students.length}`} />
          <Kpi label="Bước" value={STEP_SHORT[step]} />
        </KpiRow>
        <Btn tone="cb" title={step === 'daphat' ? 'Xem phòng thi' : step === 'chuanhan' ? 'Nhận phòng, điểm danh' : 'Tiếp tục phát đề'} icon={step === 'daphat' ? 'eye-outline' : 'lock-open-outline'} onPress={() => router.push(`/cb/phong/${s.id}/${r.id}`)} />
        {step === 'daphat' && <Btn tone="cb" kind="secondary" title="Màn hình bài làm phòng này" icon="desktop-outline" onPress={() => router.push(`/cb/manhinh/${s.id}?room=${r.id}`)} />}
      </Card>
    );
  })}</>;
}

const STEP_SHORT: Record<string, string> = { chuanhan: 'Chưa nhận', diemdanh: 'Điểm danh', cholenh: 'Chờ lệnh', sansang: 'Sẵn sàng', choxacnhan: 'Chờ CBCT2', daphat: 'Đã phát' };

const Tile = ({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress: () => void }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [{ flexBasis: '48%', flexGrow: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDE3EA', borderRadius: 16, padding: 14, gap: 10 }, pressed && { opacity: 0.85 }]}>
    <Icon name={icon} size={22} color={C.cb} />
    <View><T style={{ fontFamily: F.sb }}>{title}</T><Muted style={{ fontSize: 13 }} numberOfLines={1}>{sub}</Muted></View>
  </Pressable>
);

export default function CbHome() {
  const me = useMe();
  const ins = useSafeAreaInsets();
  const all = useQuery<SessionDoc>('sessions', watchesAll(me) ? [] : [{ field: 'staffIds', op: 'array-contains', value: me.uid }]);
  if (!all) return <Loading tone="cb" />;
  const live = all.filter(s => s.status === 'waiting' || s.status === 'running').sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bgStaff }} contentContainerStyle={{ padding: 20, paddingTop: ins.top + 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}><Muted style={{ fontSize: 13 }}>{today}</Muted><T style={{ fontFamily: F.b, fontSize: 20 }}>Chào {me.name.split(' ').slice(-1)[0]}</T></View>
        <Avatar text={initials(me.name)} tone="cb" />
      </View>
      {can(me, 'coithi') && live.map(s => <MyRoom key={s.id} s={s} uid={me.uid} />)}
      <Section title="Ca thi đang diễn ra" />
      {live.length ? live.map(s => (
        <Card key={s.id} onPress={() => router.push(`/cb/ca/${s.id}`)} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <T style={{ fontFamily: F.sb, flex: 1 }} numberOfLines={1}>{s.name}</T>
            <Pill text={SSTATUS[s.status][0]} kind={SSTATUS[s.status][1]} />
          </View>
          <Muted style={{ fontSize: 13 }}>{fmtDate(s.date)} · {s.start} · {s.durationMin} phút · {s.studentIds.length} thí sinh</Muted>
          {(watchesAll(me) || can(me, 'coithi')) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
              <Tile icon="lock-open-outline" title="Phát đề" sub="Từng phòng" onPress={() => router.push(`/cb/phatde/${s.id}`)} />
              <Tile icon="desktop-outline" title="Màn hình bài làm" sub={s.status === 'running' ? 'Trực tiếp' : 'Chưa bắt đầu'} onPress={() => router.push(`/cb/manhinh/${s.id}`)} />
              <Tile icon="analytics-outline" title="Lịch sử làm bài" sub="Xếp theo nghi ngờ" onPress={() => router.push(`/cb/lichsu/${s.id}`)} />
              <Tile icon="warning-outline" title="Biên bản vi phạm" sub="Ghi tại phòng" onPress={() => router.push(`/cb/vipham?sid=${s.id}`)} />
            </View>
          )}
        </Card>
      )) : <Card><Empty text="Không có ca thi nào đang mở" icon="cafe-outline" /></Card>}
    </ScrollView>
  );
}
