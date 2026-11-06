import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Btn, Card, Icon, Kpi, KpiRow, Label, Loading, Muted, Screen, T, H1 } from '@/ui/kit';
import { useDoc, useMe } from '@/ui/hooks';
import { C, F, fmtDate, fmtTime, num } from '@/ui/theme';
import { attemptId, type AttemptDoc, type SessionDoc } from '../../../shared/logic';

export default function Nop() {
  const { sid } = useLocalSearchParams<{ sid: string }>();
  const me = useMe();
  const a = useDoc<AttemptDoc>('attempts/' + attemptId(sid, me.uid));
  const s = useDoc<SessionDoc>('sessions/' + sid);
  if (!a || !s) return <Loading tone="hs" />;
  const answered = Object.keys(a.answers || {}).length;
  return (
    <Screen tone="hs" footer={<Btn title="Về trang chủ" onPress={() => router.replace('/(hs)')} />}>
      <View style={{ alignItems: 'center', gap: 8, paddingTop: 48 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.hs, alignItems: 'center', justifyContent: 'center' }}><Icon name="checkmark" size={34} color="#fff" /></View>
        <H1 style={{ fontSize: 24, marginTop: 8 }}>Đã nộp bài</H1>
        <Muted>{s.examTitle} · lúc {fmtTime(a.submittedAt, true)} {fmtDate(a.submittedAt)}</Muted>
      </View>
      <Card>
        <Label>MÃ BIÊN NHẬN</Label>
        <T style={{ fontFamily: F.b, fontSize: 22, letterSpacing: 1.5, marginTop: 4 }} selectable>{a.receipt}</T>
        <Muted style={{ marginTop: 6, fontSize: 13, lineHeight: 19 }}>Máy chủ đã lưu {answered}/{s.questionCount} câu có trả lời. Giữ mã này nếu cần đối chiếu bài làm.</Muted>
      </Card>
      {s.published ? (
        <Card onPress={() => router.push(`/bailam/${sid}`)}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}><T style={{ fontFamily: F.sb }}>Điểm</T><Muted style={{ fontSize: 13 }}>Bấm để xem từng câu</Muted></View>
            <T style={{ fontFamily: F.b, fontSize: 36 }}>{num(a.score)}</T><Muted> /10</Muted>
          </View>
        </Card>
      ) : (
        <KpiRow><Kpi label="Câu đã làm" value={`${answered}/${s.questionCount}`} /><Kpi label="Điểm" value="Chờ công bố" /></KpiRow>
      )}
    </Screen>
  );
}
