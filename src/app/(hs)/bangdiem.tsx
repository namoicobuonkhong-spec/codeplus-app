import React, { useState } from 'react';
import { router } from 'expo-router';
import { Btn, Card, Loading, Muted, Row, Screen, Section, Seg } from '@/ui/kit';
import { useMe, useQuery } from '@/ui/hooks';
import { Transcript, bySubject, useScores } from '@/ui/scores';
import { exportCsv } from '@/ui/export';
import { fmtDate, num } from '@/ui/theme';

export default function BangDiem() {
  const me = useMe();
  const rows = useScores(me.uid, false);
  const practice = useQuery<any>('practice', [{ field: 'uid', op: '==', value: me.uid }]);
  const appeals = useQuery<any>('appeals', [{ field: 'uid', op: '==', value: me.uid }]);
  const [tab, setTab] = useState<'thi' | 'luyen' | 'pk'>('thi');
  if (!rows || !practice || !appeals) return <Loading tone="hs" />;
  const done = practice.filter(p => p.submitted).sort((a, b) => b.submittedAt - a.submittedAt);
  const exp = () => exportCsv(`Bang_diem_${me.name}`, [['Môn', 'Bài thi', 'Ngày', 'Điểm', 'Đúng', 'Số câu'], ...bySubject(rows).flatMap(g => g.list.map(r => [g.subject, r.s.examTitle, fmtDate(r.s.date), r.a?.submitted ? num(r.a.score) : 'vắng', r.a?.correct ?? '', r.s.questionCount]))]);
  return (
    <Screen tone="hs" title="Bảng điểm" sub={`${me.name} · lớp ${me.className}`} right={rows.length ? <Btn small tone="hs" kind="secondary" title="Xuất" icon="download-outline" onPress={exp} /> : undefined}>
      <Seg tone="hs" value={tab} onChange={setTab} options={[['thi', 'Bài thi'], ['luyen', `Luyện tập (${done.length})`], ['pk', `Phúc khảo (${appeals.length})`]]} />
      {tab === 'thi' && <>
        <Transcript rows={rows} tone="hs" onOpen={r => router.push(`/bailam/${r.s.id}`)} />
        <Muted style={{ fontSize: 12.5, textAlign: 'center' }}>Bấm một bài để xem từng câu, đáp án, đề nghị phúc khảo.</Muted>
      </>}
      {tab === 'luyen' && <Card pad={false}>
        {done.length ? done.map((p, i) => <Row key={p.id} first={i === 0} title={p.title} sub={`${fmtDate(p.submittedAt)} · đúng ${p.correct}/${p.order.length}`} right={<Muted style={{ fontSize: 17, color: '#0F1B2D' }}>{num(p.score)}</Muted>} onPress={() => router.push(`/luyen/${p.id}`)} />)
          : <Row first title="Chưa làm bài luyện tập nào" sub="Vào tab Luyện tập để làm đề ôn" />}
      </Card>}
      {tab === 'pk' && <>
        <Section title="Đơn phúc khảo" />
        <Card pad={false}>
          {appeals.length ? appeals.sort((a, b) => b.at - a.at).map((p, i) => (
            <Row key={p.id} first={i === 0} title={`${p.sessionName}${p.qno ? ' · câu ' + p.qno : ''}`}
              sub={(p.status === 'cho' ? 'Đang chờ xử lí' : p.status === 'chapnhan' ? 'Chấp nhận' : 'Giữ nguyên điểm') + (p.reply ? ' — ' + p.reply : '') + ' · ' + p.note}
              right={<Muted style={{ fontSize: 12 }}>{fmtDate(p.at)}</Muted>} />
          )) : <Row first title="Chưa có đơn phúc khảo" sub="Mở một bài thi đã công bố điểm để gửi đơn" />}
        </Card>
      </>}
    </Screen>
  );
}
