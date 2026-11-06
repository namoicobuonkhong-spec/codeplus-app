/* ĐỀ THI — danh sách đề */
import React from 'react';
import { router } from 'expo-router';
import { Btn, Card, Empty, Loading, Muted, Screen, T } from '@/ui/kit';
import { useQuery } from '@/ui/hooks';
import { F } from '@/ui/theme';

export default function DeThi() {
  const exams = useQuery<any>('exams');
  if (!exams) return <Loading tone="cb" />;
  return (
    <Screen tone="cb" title="Đề thi" sub={`${exams.length} đề`} back right={<Btn small tone="cb" title="Tạo đề" icon="add" onPress={() => router.push('/cb/de/moi')} />}>
      {exams.length ? exams.sort((a, b) => b.createdAt - a.createdAt).map(e => {
        const pts = (e.questions || []).reduce((s: number, q: any) => s + q.points, 0);
        return (
          <Card key={e.id} onPress={() => router.push(`/cb/de/${e.id}`)} style={{ gap: 3 }}>
            <T style={{ fontFamily: F.sb }}>{e.title}</T>
            <Muted style={{ fontSize: 13 }}>{e.subject} · {e.questions?.length || 0} câu · {String(pts).replace('.', ',')} điểm thô · {e.durationMin} phút</Muted>
          </Card>
        );
      }) : <Card><Empty text="Chưa có đề" icon="document-text-outline" /></Card>}
    </Screen>
  );
}
