import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/data/api';
import { Btn, Card, Empty, Loading, Muted, Note, Pill, Screen, Section, T, toast } from '@/ui/kit';
import { useMe, useQuery } from '@/ui/hooks';
import { F, fmtDate, num } from '@/ui/theme';

export default function LuyenTap() {
  const me = useMe();
  const list = useQuery<any>('practiceList');
  const mine = useQuery<any>('practice', [{ field: 'uid', op: '==', value: me.uid }]);
  if (!list || !mine) return <Loading tone="hs" />;
  const open = list.filter(p => !p.classNames?.length || p.classNames.includes(me.className)).sort((a, b) => b.at - a.at);
  const going = mine.filter(p => !p.submitted && Date.now() < p.deadline);
  const start = async (eid: string) => { try { const r = await api.call('practiceStart', { eid }); router.push(`/luyen/${r.id}`); } catch (e: any) { toast(e.message, true); } };
  return (
    <Screen tone="hs" title="Luyện tập" sub="Làm đề ôn, chấm ngay, xem đáp án — không tính vào bảng điểm">
      {going.map(p => <Card key={p.id} onPress={() => router.push(`/luyen/${p.id}`)}><T style={{ fontFamily: F.sb }}>Đang làm dở: {p.title}</T><Muted style={{ fontSize: 13 }}>Bấm để làm tiếp</Muted></Card>)}
      <Section title="Đề đang mở" />
      {open.length ? open.map(p => {
        const tries = mine.filter(x => x.eid === p.id && x.submitted);
        const best = tries.length ? Math.max(...tries.map(x => x.score || 0)) : null;
        return (
          <Card key={p.id} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}><T style={{ fontFamily: F.sb }}>{p.title}</T><Muted style={{ fontSize: 13 }}>{p.subject} · {p.count} câu · {p.durationMin} phút</Muted></View>
              {best != null && <Pill text={`Cao nhất ${num(best)}`} kind="ok" />}
            </View>
            <Btn tone="hs" kind={tries.length ? 'secondary' : 'primary'} title={tries.length ? `Làm lại (đã làm ${tries.length} lần)` : 'Bắt đầu làm'} onPress={() => start(p.id)} />
          </Card>
        );
      }) : <Card><Empty text="Thầy cô chưa mở đề luyện tập nào" icon="barbell-outline" /></Card>}
      <Note kind="ok" text="Mỗi lần làm, thứ tự câu được trộn lại. Nộp xong em thấy ngay điểm và đáp án từng câu." />
      {mine.filter(p => p.submitted).length > 0 && <Muted style={{ textAlign: 'center', fontSize: 12.5 }}>Lịch sử luyện tập: Bảng điểm → Luyện tập · lần gần nhất {fmtDate(Math.max(...mine.filter(p => p.submitted).map(p => p.submittedAt)))}</Muted>}
    </Screen>
  );
}
