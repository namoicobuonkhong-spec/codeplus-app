/* THÔNG BÁO — gửi tới mọi học sinh hoặc thí sinh một ca. */
import React from 'react';
import { api } from '@/data/api';
import { Btn, Card, Empty, Loading, Muted, Screen, T, formBox, toast } from '@/ui/kit';
import { useQuery } from '@/ui/hooks';
import { F, ago } from '@/ui/theme';
import type { SessionDoc } from '../../../shared/logic';

export default function ThongBao() {
  const notices = useQuery<any>('notices');
  const sessions = useQuery<SessionDoc>('sessions');
  if (!notices || !sessions) return <Loading tone="cb" />;
  const open = sessions.filter(s => s.status !== 'closed');
  const send = async () => {
    const r = await formBox({ title: 'Gửi thông báo', tone: 'cb', ok: 'Gửi', message: open.length ? 'Gửi riêng một ca: nhập số thứ tự ca\n' + open.map((s, i) => `${i + 1}. ${s.name}`).join('\n') : undefined,
      fields: [{ key: 'title', label: 'Tiêu đề' }, { key: 'body', label: 'Nội dung', multiline: true }, ...(open.length ? [{ key: 'ca', label: 'Gửi cho ca số (để trống = mọi học sinh)', keyboard: 'numeric' as const, maxLength: 2 }] : [])],
      run: async v => { const s = open[Number(v.ca) - 1]; await api.call('notice', { title: v.title, body: v.body, sid: s?.id || null }); } });
    if (r) toast('Đã gửi thông báo');
  };
  return (
    <Screen tone="cb" title="Thông báo" sub={`${notices.length} đã gửi`} back right={<Btn small tone="cb" title="Gửi" icon="send-outline" onPress={send} />}>
      {notices.length ? notices.sort((a, b) => b.at - a.at).map(n => (
        <Card key={n.id} style={{ gap: 4 }}>
          <T style={{ fontFamily: F.sb }}>{n.title}</T>
          {!!n.body && <Muted style={{ fontSize: 13.5, lineHeight: 20 }}>{n.body}</Muted>}
          <Muted style={{ fontSize: 12 }}>{n.byName} · {ago(n.at)} · {n.sid ? 'thí sinh ' + (sessions.find(s => s.id === n.sid)?.name || 'một ca') : 'mọi học sinh'}</Muted>
        </Card>
      )) : <Card><Empty text="Chưa gửi thông báo nào" icon="megaphone-outline" /></Card>}
    </Screen>
  );
}
