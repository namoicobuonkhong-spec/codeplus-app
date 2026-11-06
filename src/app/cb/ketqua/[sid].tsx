/* KẾT QUẢ CA THI — phổ điểm, danh sách, chấm tự luận, công bố. */
import React from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/data/api';
import { Btn, Card, Empty, Kpi, KpiRow, Loading, Muted, Pill, Screen, Section, T, toast } from '@/ui/kit';
import { useDoc, useMe, useQuery } from '@/ui/hooks';
import { isManager } from '@/ui/staff';
import { C, F, num } from '@/ui/theme';
import type { AttemptDoc, SessionDoc } from '../../../../shared/logic';

export default function KetQua() {
  const { sid } = useLocalSearchParams<{ sid: string }>();
  const me = useMe();
  const s = useDoc<SessionDoc>('sessions/' + sid);
  const atts = useQuery<AttemptDoc>('attempts', [{ field: 'sid', op: '==', value: sid }]);
  if (!s || !atts) return <Loading tone="cb" />;
  const done = atts.filter(a => a.submitted).sort((a, b) => (b.score || 0) - (a.score || 0));
  const scores = done.map(a => a.score || 0);
  const avg = scores.length ? scores.reduce((x, y) => x + y, 0) / scores.length : 0;
  const bins = Array.from({ length: 10 }, (_, i) => scores.filter(v => (i === 9 ? v >= 9 : v >= i && v < i + 1)).length);
  const maxBin = Math.max(1, ...bins);
  const pending = done.filter(a => a.pendingEssay).length;
  return (
    <Screen tone="cb" title="Kết quả" sub={s.name} back
      footer={isManager(me) && s.status === 'closed' ? <Btn tone="cb" kind={s.published ? 'secondary' : 'primary'} title={s.published ? 'Thu hồi công bố điểm' : 'Công bố điểm cho học sinh'} onPress={async () => { try { const x = await api.call('publish', { sid }); toast(x.published ? 'Đã công bố' : 'Đã thu hồi'); } catch (e: any) { toast(e.message, true); } }} /> : undefined}>
      <KpiRow>
        <Kpi label="Đã nộp" value={`${done.length}/${atts.filter(a => a.startedAt).length}`} />
        <Kpi label="Điểm TB" value={num(avg)} />
        <Kpi label="Chờ chấm" value={pending} tone={pending ? 'warn' : undefined} sub="bài tự luận" />
      </KpiRow>
      <Card style={{ gap: 8 }}>
        <T style={{ fontFamily: F.sb }}>Phổ điểm</T>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 110 }}>
          {bins.map((b, i) => <View key={i} style={{ flex: 1, alignItems: 'center', gap: 3 }}><Muted style={{ fontSize: 10 }}>{b || ''}</Muted><View style={{ width: '100%', height: Math.max(2, (b / maxBin) * 80), borderRadius: 4, backgroundColor: i >= 8 ? C.hs : i >= 5 ? C.cb : '#9AA9BA' }} /><Muted style={{ fontSize: 10 }}>{i}</Muted></View>)}
        </View>
      </Card>
      <Section title="Danh sách" />
      <Card pad={false}>
        {done.length ? done.map((a, i) => (
          <View key={a.uid} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.lineSoft }}>
            <T style={{ width: 24, color: C.muted, fontFamily: F.sb, fontSize: 13 }}>{i + 1}</T>
            <View style={{ flex: 1 }}><T style={{ fontFamily: F.sb }} numberOfLines={1}>{a.name}</T><Muted style={{ fontSize: 12.5 }}>SBD {a.sbd} · {a.className} · đúng {a.correct}, sai {a.wrong}, trống {a.blank}</Muted></View>
            {a.pendingEssay ? <Pill text="Chấm TL" kind="warn" /> : null}
            <Pressable accessibilityRole="button" onPress={() => router.push(`/cb/ts/${sid}/${a.uid}`)} hitSlop={8}><T style={{ fontFamily: F.b, fontSize: 18, minWidth: 44, textAlign: 'right', color: C.cb }}>{num(a.score)}</T></Pressable>
          </View>
        )) : <Empty text="Chưa có bài nộp" icon="document-outline" />}
      </Card>
      <Muted style={{ fontSize: 12.5 }}>Bấm điểm để xem bài làm, chấm tự luận.</Muted>
    </Screen>
  );
}
