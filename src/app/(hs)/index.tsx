import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Card, Empty, Icon, Loading, Muted, Pill, Section, T } from '@/ui/kit';
import { useMe, useQuery } from '@/ui/hooks';
import { examState, useMyExams } from '@/ui/student';
import { C, F, ago, fmtDate, initials, weekday } from '@/ui/theme';

export default function HsHome() {
  const me = useMe();
  const ins = useSafeAreaInsets();
  const list = useMyExams();
  const notices = useQuery<any>('notices');
  if (!list || !notices) return <Loading tone="hs" />;
  const mine = new Set(list.map(x => x.s.id));
  const nts = notices.filter(n => n.to === 'all' || mine.has(n.sid)).sort((a, b) => b.at - a.at).slice(0, 5);
  const now = list.filter(x => { const st = examState(x); return st.action === 'wait' || st.action === 'work'; });
  const next = list.filter(x => x.s.status === 'draft').slice(0, 3);
  const sbd = (x: any) => (x.a?.sbd ? ` · SBD ${x.a.sbd}` : '');
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: ins.top + 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar text={initials(me.name)} />
        <View style={{ flex: 1 }}>
          <Muted style={{ fontSize: 13 }}>Lớp {me.className}</Muted>
          <T style={{ fontFamily: F.b, fontSize: 18 }}>{me.name}</T>
        </View>
      </View>

      {now.length === 0 && (
        <Card><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Icon name="cafe-outline" size={24} color={C.hs} /><View style={{ flex: 1 }}><T style={{ fontFamily: F.sb }}>Hiện không có ca thi nào đang mở</T><Muted style={{ fontSize: 13 }}>Khi phòng chờ mở, ca thi hiện ở đây.</Muted></View></View></Card>
      )}
      {now.map(x => {
        const st = examState(x);
        return (
          <View key={x.s.id} style={{ backgroundColor: C.hs, borderRadius: 20, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}><T style={{ color: '#fff', fontFamily: F.sb, fontSize: 13 }}>{st.text}</T></View>
              <T style={{ color: '#fff', opacity: 0.85, fontSize: 13 }}>{fmtDate(x.s.date)} · {x.s.start}</T>
            </View>
            <T style={{ color: '#fff', fontFamily: F.b, fontSize: 22, marginTop: 14, letterSpacing: -0.3 }}>{x.s.examTitle}</T>
            <T style={{ color: '#fff', opacity: 0.9, marginTop: 6, fontSize: 14 }}>{x.s.durationMin} phút · {x.s.questionCount} câu{sbd(x)}</T>
            <Pressable accessibilityRole="button" onPress={() => router.push(st.action === 'work' ? `/thi/${x.s.id}` : `/phongcho/${x.s.id}`)}
              style={({ pressed }) => [{ marginTop: 18, height: 50, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.85 }]}>
              <T style={{ color: C.hsDark, fontFamily: F.b, fontSize: 16 }}>{st.action === 'work' ? 'Tiếp tục làm bài' : 'Vào phòng chờ'}</T>
            </Pressable>
          </View>
        );
      })}

      <Section title="Lịch thi sắp tới" right={<Pressable onPress={() => router.push('/(hs)/lich')}><T style={{ color: C.hs, fontFamily: F.sb, fontSize: 14 }}>Xem tất cả</T></Pressable>} />
      <Card pad={false}>
        {next.length ? next.map((x, i) => (
          <View key={x.s.id} style={{ flexDirection: 'row', gap: 14, alignItems: 'center', padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.lineSoft }}>
            <View style={{ width: 52, alignItems: 'center' }}><Muted style={{ fontSize: 12, fontFamily: F.sb }}>{weekday(x.s.date)}</Muted><T style={{ fontFamily: F.b, fontSize: 19 }}>{fmtDate(x.s.date).slice(0, 5)}</T></View>
            <View style={{ flex: 1 }}><T style={{ fontFamily: F.sb }}>{x.s.examTitle}</T><Muted style={{ fontSize: 13 }}>{x.s.start} · {x.s.durationMin} phút</Muted></View>
          </View>
        )) : <Empty text="Chưa có lịch thi mới" icon="calendar-clear-outline" />}
      </Card>

      <Section title="Thông báo" />
      {nts.length ? nts.map(n => (
        <Card key={n.id}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#C2410C', marginTop: 7 }} />
            <View style={{ flex: 1, gap: 3 }}>
              <T style={{ fontFamily: F.sb }}>{n.title}</T>
              {!!n.body && <Muted style={{ fontSize: 13.5, lineHeight: 20 }}>{n.body}</Muted>}
              <T style={{ fontSize: 12, color: C.faint, marginTop: 3 }}>{n.byName} · {ago(n.at)}</T>
            </View>
          </View>
        </Card>
      )) : <Card><Empty text="Chưa có thông báo" icon="notifications-off-outline" /></Card>}
      <View style={{ height: 8 }} />
      <Pill text="Mọi thông báo của nhà trường hiện ở đây" kind="muted" />
    </ScrollView>
  );
}
