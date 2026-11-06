/* PHÁT ĐỀ TẠI PHÒNG — CBCT: nhận phòng → điểm danh → (lệnh của quản lí ca) → mở niêm phong → CBCT2 xác nhận → phát bổ sung. */
import React from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/data/api';
import { Btn, Card, Dot, Kpi, KpiRow, Loading, Muted, Note, Pill, Screen, Section, Steps, T, formBox, toast } from '@/ui/kit';
import { useDoc, useMe, useNow, useQuery } from '@/ui/hooks';
import { STEP_N, isManager, verifyMe } from '@/ui/staff';
import { C, F, fmtTime } from '@/ui/theme';
import { LOG_TEXT, STEP_TEXT, fmtDur, roomStep, viCompare, type AttemptDoc, type RoomDoc, type SessionDoc, type UserDoc } from '../../../../../shared/logic';

const STEP_LABELS = ['Nhận phòng', 'Điểm danh', 'Lệnh', 'Niêm phong', 'Xác nhận'];

export default function Phong() {
  const { sid, rid } = useLocalSearchParams<{ sid: string; rid: string }>();
  const me = useMe();
  const s = useDoc<SessionDoc>('sessions/' + sid);
  const r = useDoc<RoomDoc>(`sessions/${sid}/rooms/${rid}`);
  const atts = useQuery<AttemptDoc>('attempts', [{ field: 'sid', op: '==', value: sid }, { field: 'roomId', op: '==', value: rid }]);
  const staff = useQuery<UserDoc>('users', [{ field: 'role', op: '==', value: 'staff' }]);
  const now = useNow(2000);
  if (!s || !r || !atts || !staff) return <Loading tone="cb" />;
  const name = (id: string) => staff.find(x => x.uid === id)?.name || id;
  const step = roomStep(r, s);
  const mine = r.proctors.includes(me.uid);
  const mg = isManager(me);
  const open = s.status === 'waiting' || s.status === 'running';
  const call = async (fn: string, data: any = {}, ok?: string) => { try { const x = await api.call(fn, { sid, rid, ...data }); if (ok) toast(ok); return x; } catch (e: any) { toast(e.message, true); return null; } };
  const list = atts.slice().sort((a, b) => viCompare(a.name, b.name));
  const online = (a: AttemptDoc) => !a.submitted && now - (a.lastSeen || 0) < 45000;
  const co = list.filter(a => r.roll[a.uid] === 'co').length, vang = list.filter(a => r.roll[a.uid] === 'vang').length;
  const rollEdit = mine && !!r.checkin[me.uid] && !r.rollDone && open;
  const lateLeft = r.startedAt ? s.lateMin * 60000 - (now - r.startedAt) : 0;
  const twoProctors = r.proctors.length > 1;

  const request = async () => {
    const v = await formBox({
      title: 'Mở niêm phong đề', tone: 'cb', ok: twoProctors ? 'Tiếp tục' : 'Tiếp tục',
      message: `Đề nằm trên máy thí sinh ở dạng khoá; chưa máy nào mở được. ${co} em có mặt sẽ nhận đề, ${vang} em vắng không nhận.`,
      checks: [{ key: 'ok', label: 'Đã cho thí sinh chứng kiến: đề còn niêm phong, chưa máy nào mở được' }],
      fields: [{ key: 'seal', label: '4 kí tự cuối mã niêm phong', maxLength: 4, placeholder: 'trên biên bản giao đề', hint: 'Mã in trên biên bản giao nhận đề của hội đồng thi' }],
      run: async x => { if (!x.ok) throw new Error('Cần xác nhận niêm phong còn nguyên vẹn'); if (String(x.seal || '').trim().length !== 4) throw new Error('Nhập đủ 4 kí tự'); }
    });
    if (!v) return;
    if (!(await verifyMe(twoProctors ? 'Xác nhận mở niêm phong, đề nghị phát đề' : 'Xác nhận phát đề'))) return;
    const x = await call('request', { seal: v.seal });
    if (x) toast(x.phat != null ? `Đã phát đề cho ${x.phat} thí sinh` : 'Đã đề nghị — chờ CBCT2 xác nhận');
  };
  const confirm = async () => { if (!(await verifyMe(`Xác nhận phát đề ${r.name}`))) return; const x = await call('confirm'); if (x) toast(`Đã phát đề cho ${x.phat} thí sinh`); };
  const force = async () => {
    const v = await formBox({ title: 'Phát thay phòng này', tone: 'cb', ok: 'Phát đề', danger: true, fields: [{ key: 'reason', label: 'Lí do', placeholder: 'Ví dụ: CBCT2 vắng, đã thay người' }] });
    if (!v) return; if (!(await verifyMe('Xác nhận phát thay'))) return;
    const x = await call('force', { reason: v.reason }); if (x) toast(`Đã phát đề cho ${x.phat} thí sinh`);
  };
  const late = async (a: AttemptDoc) => {
    const v = await formBox({ title: `Phát bổ sung · ${a.name}`, tone: 'cb', ok: 'Phát đề cho em này', message: 'Giờ nộp bài vẫn như cả phòng.', fields: [{ key: 'reason', label: 'Lí do', value: 'Đến muộn' }] });
    if (v) await call('late', { uid: a.uid, reason: v.reason }, 'Đã phát bổ sung');
  };

  const extendRoom = async () => {
    const v = await formBox({ title: `Cộng giờ cả ${r.name}`, tone: 'cb', ok: 'Cộng giờ', message: 'Áp dụng cho mọi em đang làm bài trong phòng.', fields: [{ key: 'm', label: 'Số phút', value: '5', keyboard: 'numeric' }, { key: 'reason', label: 'Lí do', placeholder: 'Ví dụ: mất điện 5 phút' }] });
    if (v) { const x = await call('extend', { minutes: Number(v.m), reason: v.reason }); if (x) toast(`Đã cộng giờ cho ${x.n} em`); }
  };
  let action: React.ReactNode = null;
  if (mine && open) {
    if (!r.checkin[me.uid]) action = <Note kind="info" text={`Bước 1 · Bấm "Nhận phòng" khi bạn đã có mặt tại ${r.name}. Hệ thống ghi giờ nhận phòng.`} />;
    else if (step === 'diemdanh') action = <Note kind="info" text="Bước 2 · Đối chiếu thẻ dự thi, bấm Có mặt hoặc Vắng từng em rồi chốt điểm danh. Chấm xanh: em đang ở phòng chờ." />;
    else if (step === 'cholenh') action = <Note kind="warn" icon="time-outline" text="Bước 3 · Đã điểm danh xong. Chờ quản lí ca thi ra lệnh phát đề." />;
    else if (step === 'sansang') action = <Note kind="ok" icon="lock-open-outline" text={`Bước 4 · Đã có lệnh phát đề lúc ${fmtTime(s.releasedAt, true)}. Mở niêm phong${twoProctors ? ' rồi CBCT2 xác nhận trên máy của mình' : ' để phát đề'}.`} />;
    else if (step === 'choxacnhan') action = r.req?.by === me.uid ? <Note kind="warn" icon="hourglass-outline" text={`Đã mở niêm phong lúc ${fmtTime(r.req.at, true)}. Chờ CBCT2 bấm "Xác nhận phát đề" trên máy của mình.`} /> : <Note kind="warn" icon="shield-checkmark-outline" text={`Bước 5 · ${name(r.req!.by)} đã mở niêm phong. Xác nhận thì đề mở trên ${co} máy cùng lúc, bắt đầu tính ${s.durationMin} phút.`} />;
  }
  const footer = mine && open ? (
    !r.checkin[me.uid] ? <Btn tone="cb" title="Nhận phòng" icon="log-in-outline" onPress={() => call('checkin', {}, 'Đã nhận phòng')} />
      : step === 'diemdanh' ? (<>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn small tone="cb" kind="secondary" title="Có mặt: em ở phòng chờ" style={{ flex: 1 }} onPress={() => call('roll', { marks: Object.fromEntries(list.filter(a => online(a) && !r.roll[a.uid]).map(a => [a.uid, 'co'])) })} />
          <Btn small tone="cb" kind="secondary" title="Vắng: em chưa vào" style={{ flex: 1 }} onPress={() => call('roll', { marks: Object.fromEntries(list.filter(a => !online(a) && !r.roll[a.uid]).map(a => [a.uid, 'vang'])) })} />
        </View>
        <Btn tone="cb" title={list.length - co - vang ? `Chốt điểm danh (còn ${list.length - co - vang})` : 'Chốt điểm danh'} disabled={list.length - co - vang > 0} onPress={() => call('roll', { done: true }, 'Đã chốt điểm danh')} />
      </>)
        : step === 'sansang' ? <Btn tone="cb" title={twoProctors ? 'Mở niêm phong, đề nghị phát' : 'Mở niêm phong, phát đề'} icon="lock-open-outline" onPress={request} />
          : step === 'choxacnhan' ? (r.req?.by === me.uid ? <Btn tone="cb" kind="secondary" title="Huỷ đề nghị" onPress={() => call('cancel', {}, 'Đã huỷ')} /> : <Btn tone="cb" title="Xác nhận phát đề" icon="shield-checkmark-outline" onPress={confirm} />)
            : step === 'daphat' ? <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn tone="cb" kind="secondary" title="Màn hình bài làm" icon="desktop-outline" onPress={() => router.push(`/cb/manhinh/${sid}?room=${rid}`)} style={{ flex: 1.3 }} />
              {s.status === 'running' && <Btn tone="cb" kind="secondary" title="Cộng giờ phòng" icon="time-outline" onPress={extendRoom} style={{ flex: 1 }} />}
            </View> : undefined
  ) : mg && open && !r.startedAt ? <Btn tone="cb" kind="secondary" title="Quản lí ca: phát thay phòng này" onPress={force} />
    : mg && s.status === 'running' && r.startedAt ? <Btn tone="cb" kind="secondary" title="Cộng giờ cả phòng" icon="time-outline" onPress={extendRoom} /> : undefined;

  return (
    <Screen tone="cb" title={`${r.name}${r.place ? ' · ' + r.place : ''}`} sub={`${s.examTitle} · ${r.students.length} thí sinh`} back footer={footer}>
      <View style={{ gap: 6 }}>
        <Steps n={STEP_N[step]} />
        <View style={{ flexDirection: 'row' }}>{STEP_LABELS.map((l, i) => <T key={l} style={{ flex: 1, fontSize: 10.5, fontFamily: F.sb, color: i < STEP_N[step] ? C.cb : C.muted }}>{l}</T>)}</View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Pill text={STEP_TEXT[step]} kind={step === 'daphat' ? 'ok' : step === 'chuanhan' ? 'muted' : 'warn'} />
        {mine && <Pill text={r.proctors[0] === me.uid ? 'Bạn là CBCT1' : 'Bạn là CBCT2'} kind="info" />}
      </View>
      {action}
      <KpiRow>
        <Kpi label="Phòng chờ" value={`${list.filter(online).length}/${list.length}`} />
        <Kpi label="Có mặt" value={co} sub={`${vang} vắng`} />
        <Kpi label={r.startedAt ? 'Phát lúc' : 'CBCT'} value={r.startedAt ? fmtTime(r.startedAt) : `${Object.keys(r.checkin).length}/${r.proctors.length}`} sub={r.startedAt && s.releasedAt ? 'sau lệnh ' + fmtDur(r.startedAt - s.releasedAt) : 'đã nhận phòng'} />
      </KpiRow>
      {r.startedAt && s.status === 'running' && <Muted style={{ fontSize: 13 }}>Phát bổ sung cho em đến muộn: {lateLeft > 0 ? 'còn ' + fmtDur(lateLeft) : `đã quá ${s.lateMin} phút${mg ? ' (quản lí ca vẫn cho được)' : ''}`}</Muted>}

      <Section title="Thí sinh" />
      <Card pad={false}>
        {list.map((a, i) => {
          const m = r.roll[a.uid];
          return (
            <View key={a.uid} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.lineSoft }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T style={{ fontFamily: F.sb }} numberOfLines={1}>{a.name}</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Dot on={online(a)} /><Muted style={{ fontSize: 12 }} numberOfLines={1}>SBD {a.sbd} · {a.submitted ? 'đã nộp' : a.startedAt ? 'đang làm bài' : online(a) ? 'ở phòng chờ' : a.lastSeen ? 'mất kết nối' : 'chưa vào'}{a.late ? ' · bổ sung' : ''}</Muted></View>
              </View>
              {rollEdit ? (
                <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: '#C9D3DF', borderRadius: 10, overflow: 'hidden' }}>
                  {(['co', 'vang'] as const).map((k, j) => (
                    <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: m === k }} onPress={() => call('roll', { marks: { [a.uid]: m === k ? '' : k } })}
                      style={{ height: 38, paddingHorizontal: 12, justifyContent: 'center', borderLeftWidth: j ? 1 : 0, borderLeftColor: '#C9D3DF', backgroundColor: m === k ? (k === 'co' ? C.okBg : C.badBg) : '#fff' }}>
                      <T style={{ fontFamily: F.sb, fontSize: 13, color: m === k ? (k === 'co' ? C.ok : C.bad) : C.muted }}>{k === 'co' ? 'Có mặt' : 'Vắng'}</T>
                    </Pressable>
                  ))}
                </View>
              ) : a.startedAt ? <Pill text={a.submitted ? 'Đã nộp' : 'Đã nhận đề'} kind="ok" />
                : m === 'vang' && r.startedAt && (mine || mg) && s.status === 'running' && (lateLeft > 0 || mg) ? <Btn small tone="cb" kind="secondary" title="Phát bổ sung" onPress={() => late(a)} />
                  : m ? <Pill text={m === 'co' ? 'Có mặt' : 'Vắng'} kind={m === 'co' ? 'ok' : 'bad'} /> : <Muted style={{ fontSize: 12 }}>chưa</Muted>}
            </View>
          );
        })}
      </Card>

      <Section title="Nhật kí phát đề" />
      <Card style={{ gap: 10 }}>
        {r.log.length ? r.log.slice().reverse().map((e, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
            <T style={{ fontFamily: F.sb, fontSize: 13, width: 64 }}>{fmtTime(e[0], true)}</T>
            <View style={{ flex: 1 }}><T style={{ fontFamily: F.sb, fontSize: 13.5, color: e[2] === 'phat' || e[2] === 'phatthay' || e[2] === 'dongloat' ? C.ok : e[2] === 'huy' ? C.bad : C.ink }}>{LOG_TEXT[e[2]] || e[2]}</T><Muted style={{ fontSize: 12.5 }}>{name(e[1])}{e[3] ? ' · ' + e[3] : ''}</Muted></View>
          </View>
        )) : <Muted style={{ fontSize: 13 }}>Chưa có thao tác.</Muted>}
      </Card>
    </Screen>
  );
}
