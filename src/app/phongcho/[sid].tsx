import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { api } from '@/data/api';
import { Btn, Card, Icon, Kpi, KpiRow, Loading, Muted, Note, Screen, T, H1, Label } from '@/ui/kit';
import { useDoc, useMe, useNow } from '@/ui/hooks';
import { C, F, fmtTime } from '@/ui/theme';
import { STEP_TEXT_HS, attemptId, roomStep, type AttemptDoc, type RoomDoc, type SessionDoc } from '../../../shared/logic';

function Check({ ok, warn, title, sub, first }: { ok: boolean; warn?: boolean; title: string; sub: string; first?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', padding: 15, borderTopWidth: first ? 0 : 1, borderTopColor: C.lineSoft }}>
      {ok ? <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.hs, alignItems: 'center', justifyContent: 'center' }}><Icon name="checkmark" size={17} color="#fff" /></View>
        : <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: warn ? C.bad : '#B45309', alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: warn ? C.bad : '#B45309' }} /></View>}
      <View style={{ flex: 1 }}><T style={{ fontFamily: F.sb }}>{title}</T><Muted style={{ fontSize: 13, color: warn ? C.bad : ok ? C.muted : C.warn }}>{sub}</Muted></View>
    </View>
  );
}

export default function PhongCho() {
  const { sid } = useLocalSearchParams<{ sid: string }>();
  const me = useMe();
  const s = useDoc<SessionDoc>('sessions/' + sid);
  const a = useDoc<AttemptDoc>('attempts/' + attemptId(sid, me.uid));
  const room = useDoc<RoomDoc>(a?.roomId ? `sessions/${sid}/rooms/${a.roomId}` : null);
  const now = useNow(1000);
  const [online, setOnline] = useState<boolean | null>(null);
  const [guard, setGuard] = useState<boolean | null>(null);

  useEffect(() => { // báo đang ở phòng chờ
    let alive = true;
    const ping = () => api.call('presence', { sid }).then(() => alive && setOnline(true)).catch(() => alive && setOnline(false));
    ping(); const t = setInterval(ping, 20000);
    return () => { alive = false; clearInterval(t); };
  }, [sid]);
  useEffect(() => { ScreenCapture.isAvailableAsync().then(setGuard).catch(() => setGuard(false)); }, []);
  useEffect(() => { if (a?.startedAt && !a.submitted) router.replace(`/thi/${sid}`); }, [a?.startedAt, a?.submitted, sid]);

  if (s === undefined || a === undefined) return <Loading tone="hs" />;
  if (!s || !a) return <Screen tone="hs" title="Phòng chờ" back><Note kind="bad" text="Em không có tên trong ca thi này." /></Screen>;
  const step = room ? roomStep(room, s) : 'chuanhan';
  const vang = room?.roll?.[me.uid] === 'vang';
  return (
    <Screen tone="hs" title={room ? `${room.name}${room.place ? ' · ' + room.place : ''}` : 'Phòng chờ'} sub={`SBD ${a.sbd} · ${me.name}`} back
      footer={<Btn title="Nhắn cán bộ coi thi" kind="secondary" icon="chatbubble-ellipses-outline" onPress={() => router.push('/hoidap')} />}>
      <View style={{ gap: 6, marginTop: 4 }}>
        <Label style={{ color: C.hs }}>PHÒNG CHỜ</Label>
        <H1 style={{ fontSize: 25 }}>{a.submitted ? 'Em đã nộp bài' : s.status === 'closed' ? 'Ca thi đã kết thúc' : step === 'daphat' && !a.startedAt ? 'Phòng đã phát đề' : 'Đang chờ cán bộ coi thi phát đề'}</H1>
        <Muted>{s.examTitle} · {s.questionCount} câu · {s.durationMin} phút</Muted>
      </View>
      <Card pad={false}>
        <Check first ok={online === true} warn={online === false} title="Kết nối máy chủ" sub={online === null ? 'Đang kiểm tra…' : online ? 'Ổn định' : 'Mất kết nối — kiểm tra wifi/4G'} />
        <Check ok={guard !== false || Platform.OS === 'web'} title="Chế độ thi" sub={Platform.OS === 'web' ? 'Bản web: chỉ ghi lại việc rời trang' : guard ? 'Chặn chụp màn hình, ghi lại khi rời app' : 'Máy không hỗ trợ chặn chụp màn hình — mọi lần rời app vẫn được ghi'} />
        <Check ok={step === 'daphat' || step === 'choxacnhan' || step === 'sansang' || step === 'cholenh'} warn={vang} title="Phòng thi"
          sub={vang ? 'Em đang bị ghi VẮNG — giơ tay báo cán bộ coi thi' : step === 'daphat' && !a.startedAt ? 'Phòng đã phát đề — báo cán bộ coi thi để được phát bổ sung' : STEP_TEXT_HS[step]} />
      </Card>
      <KpiRow>
        <Kpi label="Giờ máy chủ" value={fmtTime(now, true)} />
        <Kpi label="Giờ thi dự kiến" value={s.start} />
      </KpiRow>
      <Note kind="ok" icon="information-circle-outline" text="Khi cán bộ coi thi phát đề, bài thi tự mở — em không cần bấm gì. Trong giờ thi, thoát app, chuyển ứng dụng khác hay chụp màn hình đều được ghi lại." />
    </Screen>
  );
}
