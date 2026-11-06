/* PHÚC KHẢO — đơn của học sinh sau khi công bố điểm; quản lí ca trả lời (chấp nhận / giữ nguyên). */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/data/api';
import { Btn, Card, Empty, Loading, Muted, Pill, Screen, Seg, T, formBox, toast } from '@/ui/kit';
import { useMe, useQuery } from '@/ui/hooks';
import { isManager } from '@/ui/staff';
import { F, fmtDate, fmtTime } from '@/ui/theme';

export default function PhucKhao() {
  const me = useMe();
  const list = useQuery<any>('appeals');
  const [tab, setTab] = useState<'cho' | 'xong'>('cho');
  if (!list) return <Loading tone="cb" />;
  const pick = list.filter(p => (tab === 'cho' ? p.status === 'cho' : p.status !== 'cho')).sort((a, b) => b.at - a.at);
  const reply = async (p: any, accept: boolean) => {
    const r = await formBox({ title: accept ? 'Chấp nhận phúc khảo' : 'Giữ nguyên điểm', tone: 'cb', ok: 'Gửi trả lời', message: accept && p.qid ? 'Nếu là câu tự luận: chấm lại ở màn hình bài làm của em (nút "Mở bài làm").' : undefined,
      fields: [{ key: 'reply', label: 'Trả lời học sinh', multiline: true, value: accept ? 'Đã chấm lại, điều chỉnh điểm.' : 'Đã kiểm tra lại, bài làm được chấm đúng.' }],
      run: async v => { await api.call('appealReply', { id: p.id, accept, reply: v.reply }); } });
    if (r) toast('Đã trả lời');
  };
  return (
    <Screen tone="cb" title="Phúc khảo" sub={`${list.filter(p => p.status === 'cho').length} đơn chờ xử lí`} back>
      <Seg tone="cb" value={tab} onChange={setTab} options={[['cho', 'Chờ xử lí'], ['xong', 'Đã trả lời']]} />
      {pick.length ? pick.map(p => (
        <Card key={p.id} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T style={{ fontFamily: F.sb, flex: 1 }}>{p.name} · {p.className}</T>
            <Pill text={p.status === 'cho' ? 'Chờ' : p.status === 'chapnhan' ? 'Chấp nhận' : 'Giữ nguyên'} kind={p.status === 'cho' ? 'warn' : p.status === 'chapnhan' ? 'ok' : 'muted'} />
          </View>
          <Muted style={{ fontSize: 13 }}>{p.sessionName}{p.qno ? ` · câu ${p.qno}` : ' · cả bài'} · {fmtTime(p.at)} {fmtDate(p.at)}</Muted>
          <T style={{ fontSize: 14, lineHeight: 20 }}>“{p.note}”</T>
          {!!p.reply && <Muted style={{ fontSize: 13 }}>Trả lời ({p.byName}): {p.reply}</Muted>}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <Btn small tone="cb" kind="secondary" title="Mở bài làm" onPress={() => router.push(`/cb/ts/${p.sid}/${p.uid}`)} style={{ flex: 1 }} />
            {isManager(me) && p.status === 'cho' && <><Btn small tone="cb" kind="secondary" title="Giữ nguyên" onPress={() => reply(p, false)} style={{ flex: 1 }} /><Btn small tone="cb" title="Chấp nhận" onPress={() => reply(p, true)} style={{ flex: 1 }} /></>}
          </View>
        </Card>
      )) : <Card><Empty text={tab === 'cho' ? 'Không có đơn chờ xử lí' : 'Chưa trả lời đơn nào'} icon="document-text-outline" /></Card>}
    </Screen>
  );
}
