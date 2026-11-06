import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/data/api';
import { Btn, Card, Icon, Kpi, KpiRow, Label, Loading, Muted, Note, Pill, Row, Screen, Section, T, confirmBox, formBox, toast } from '@/ui/kit';
import { useMe, useNow, useQuery, useDoc } from '@/ui/hooks';
import { SSTATUS, can, isManager, verifyMe, watchesAll } from '@/ui/staff';
import { C, F, fmtDate, fmtTime } from '@/ui/theme';
import { LOG_TEXT, STEP_TEXT, roomStep, type AttemptDoc, type RoomDoc, type SessionDoc, type UserDoc } from '../../../../shared/logic';

function ProctorPicker({ room, staff, rooms, onClose, sid }: { room: RoomDoc; staff: UserDoc[]; rooms: RoomDoc[]; onClose: () => void; sid: string }) {
  const ins = useSafeAreaInsets();
  const [sel, setSel] = useState<string[]>(room.proctors);
  const busy = new Map<string, string>(); rooms.forEach(r => r.id !== room.id && r.proctors.forEach(p => busy.set(p, r.name)));
  const list = staff.filter(u => (u.staffRoles || []).includes('coithi'));
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,27,45,0.4)' }} onPress={onClose} />
      <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: ins.bottom + 16, gap: 12, maxHeight: '80%' }}>
        <T style={{ fontFamily: F.b, fontSize: 18 }}>Cán bộ coi thi · {room.name}</T>
        <Muted style={{ fontSize: 13 }}>Chọn 1–3 người. Người chọn đầu tiên là CBCT1.</Muted>
        <ScrollView style={{ maxHeight: 380 }}>
          {list.map(u => {
            const i = sel.indexOf(u.uid), other = busy.get(u.uid);
            return (
              <Pressable key={u.uid} accessibilityRole="checkbox" accessibilityState={{ checked: i >= 0 }} disabled={!!other} onPress={() => setSel(s => (i >= 0 ? s.filter(x => x !== u.uid) : s.length < 3 ? [...s, u.uid] : s))}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.lineSoft, opacity: other ? 0.45 : 1 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: i >= 0 ? C.cb : '#AEB9C6', backgroundColor: i >= 0 ? C.cb : '#fff', alignItems: 'center', justifyContent: 'center' }}>{i >= 0 && <T style={{ color: '#fff', fontFamily: F.b, fontSize: 12 }}>{i + 1}</T>}</View>
                <View style={{ flex: 1 }}><T style={{ fontFamily: F.sb }}>{u.name}</T><Muted style={{ fontSize: 12.5 }}>{other ? 'đang coi ' + other : u.position}</Muted></View>
              </Pressable>
            );
          })}
        </ScrollView>
        <Btn tone="cb" title="Lưu phân công" onPress={async () => { try { await api.call('assignProctors', { sid, rid: room.id, proctors: sel }); toast('Đã phân công'); onClose(); } catch (e: any) { toast(e.message, true); } }} />
      </View>
    </Modal>
  );
}

export default function CaHub() {
  const { sid } = useLocalSearchParams<{ sid: string }>();
  const me = useMe();
  const s = useDoc<SessionDoc>('sessions/' + sid);
  const rooms = useQuery<RoomDoc>(`sessions/${sid}/rooms`);
  const atts = useQuery<AttemptDoc>('attempts', [{ field: 'sid', op: '==', value: sid }]);
  const staff = useQuery<UserDoc>('users', [{ field: 'role', op: '==', value: 'staff' }]);
  const now = useNow(5000);
  const [pick, setPick] = useState<RoomDoc | null>(null);
  if (!s || !rooms || !atts || !staff) return <Loading tone="cb" />;
  const mg = isManager(me);
  const name = (id: string) => staff.find(x => x.uid === id)?.name || id;
  const online = atts.filter(a => !a.submitted && now - (a.lastSeen || 0) < 45000).length;
  const phat = rooms.filter(r => r.startedAt).length;
  const submitted = atts.filter(a => a.submitted).length;
  const sorted = rooms.slice().sort((a, b) => a.id.localeCompare(b.id, 'vi', { numeric: true }));
  const act = (title: string, fn: () => Promise<any>) => async () => { try { await fn(); } catch (e: any) { toast(e.message, true); } };
  const handover = () => Share.share({ message: `BIÊN BẢN GIAO NHẬN ĐỀ THI\n${s.name} — ${s.examTitle}\nNgày ${fmtDate(s.date)} · ${s.start} · ${s.durationMin} phút\nMã niêm phong: ${s.seal}\n(CBCT nhập 4 kí tự cuối khi mở niêm phong)\n\n${sorted.map(r => `${r.name}${r.place ? ' (' + r.place + ')' : ''}: ${r.students.length} TS — CBCT: ${r.proctors.map(name).join(', ') || 'chưa phân công'}`).join('\n')}` }).catch(() => { });
  return (
    <Screen tone="cb" title={s.name} sub={`${fmtDate(s.date)} · ${s.start} · ${s.durationMin} phút`} back>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Pill text={SSTATUS[s.status][0]} kind={SSTATUS[s.status][1]} />
        {s.releasedAt && s.status !== 'closed' && <Pill text={`Lệnh phát đề ${fmtTime(s.releasedAt)}`} kind="info" />}
        {s.published && <Pill text="Đã công bố điểm" kind="ok" />}
      </View>
      <Muted>{s.examTitle} · {s.questionCount} câu</Muted>
      <KpiRow>
        <Kpi label="Thí sinh" value={s.studentIds.length} sub={`${rooms.length} phòng`} />
        <Kpi label="Đang kết nối" value={online} sub={s.status === 'draft' ? 'chưa mở' : ''} />
        <Kpi label={s.status === 'closed' ? 'Đã nộp' : 'Phòng đã phát'} value={s.status === 'closed' ? submitted : `${phat}/${rooms.length}`} />
      </KpiRow>

      {mg && s.status === 'draft' && <Note kind="info" text="Phân công cán bộ coi thi cho từng phòng rồi mở phòng chờ. Khi mở, học sinh thấy phòng, số báo danh và vào phòng chờ được." />}
      {mg && (s.status === 'draft' || s.status === 'waiting') && <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn small tone="cb" kind="secondary" title="Sửa giờ, thời gian" icon="create-outline" style={{ flex: 1 }} onPress={async () => {
          const r = await formBox({ title: 'Sửa ca thi', tone: 'cb', ok: 'Lưu', fields: [{ key: 'name', label: 'Tên ca', value: s.name }, { key: 'date', label: 'Ngày (năm-tháng-ngày)', value: s.date }, { key: 'start', label: 'Giờ bắt đầu', value: s.start }, { key: 'dur', label: 'Thời gian làm bài (phút)', value: String(s.durationMin), keyboard: 'numeric' }, { key: 'late', label: 'Đến muộn tối đa (phút)', value: String(s.lateMin), keyboard: 'numeric' }],
            run: async v => { await api.call('updateSession', { sid, name: v.name, date: v.date, start: v.start, durationMin: Number(v.dur), lateMin: Number(v.late) }); } });
          if (r) toast('Đã lưu');
        }} />
        {s.status === 'draft' && <Btn small tone="cb" kind="secondary" title="Xoá ca" icon="trash-outline" style={{ flex: 0.7 }} onPress={async () => {
          if (!(await confirmBox({ title: 'Xoá ca thi?', message: 'Xoá ca, phòng thi và bản đề của ca. Không khôi phục được.', ok: 'Xoá', danger: true, tone: 'cb' }))) return;
          await api.call('deleteSession', { sid }); toast('Đã xoá ca'); router.back();
        }} />}
      </View>}
      {mg && s.status === 'draft' && <Btn tone="cb" title="Mở phòng chờ" icon="enter-outline" onPress={act('', async () => { await api.call('openSession', { sid }); toast('Đã mở phòng chờ'); })} />}
      {mg && s.status === 'waiting' && !s.releasedAt && <Btn tone="cb" title="Ra lệnh phát đề" icon="megaphone-outline" onPress={act('', async () => {
        if (!(await confirmBox({ title: 'Ra lệnh phát đề?', message: 'Cán bộ coi thi các phòng đã điểm danh xong sẽ được mở niêm phong và phát đề. Mỗi phòng tính giờ từ lúc phòng đó phát.', ok: 'Ra lệnh', tone: 'cb' }))) return;
        if (!(await verifyMe('Xác nhận ra lệnh phát đề'))) return;
        await api.call('release', { sid }); toast('Đã ra lệnh phát đề');
      })} />}
      {mg && (s.status === 'waiting' || s.status === 'running') && phat < rooms.length && <Btn tone="cb" kind="secondary" title={s.status === 'running' ? 'Phát đồng loạt phòng còn lại' : 'Phát đồng loạt mọi phòng'} icon="flash-outline" onPress={act('', async () => {
        const r = await formBox({ title: 'Phát đồng loạt?', message: 'Bỏ qua các bước của cán bộ coi thi: khoá đề gửi ngay tới mọi phòng chưa phát (trừ em đã ghi vắng).', ok: 'Phát đồng loạt', danger: true, tone: 'cb', fields: [{ key: 'reason', label: 'Lí do', value: 'Phát cùng lúc cả ca' }] });
        if (!r) return; if (!(await verifyMe('Xác nhận phát đồng loạt'))) return;
        const x = await api.call('phatAll', { sid, reason: r.reason }); toast(`Đã phát cho ${x.phat} thí sinh`);
      })} />}
      {mg && s.status === 'running' && <Btn tone="cb" kind="danger" title="Kết thúc ca thi" icon="stop-circle-outline" onPress={act('', async () => {
        const left = atts.filter(a => a.startedAt && !a.submitted).length;
        if (!(await confirmBox({ title: 'Kết thúc ca thi?', message: left ? `${left} bài chưa nộp sẽ được tự nộp với phần đã lưu.` : 'Mọi bài đã nộp.', ok: 'Kết thúc', danger: true, tone: 'cb' }))) return;
        const x = await api.call('closeSession', { sid }); toast(`Đã kết thúc · tự nộp ${x.autoSubmitted} bài`);
      })} />}
      {mg && s.status === 'closed' && <Btn tone="cb" kind={s.published ? 'secondary' : 'primary'} title={s.published ? 'Thu hồi công bố điểm' : 'Công bố điểm cho học sinh'} icon="ribbon-outline" onPress={act('', async () => { const x = await api.call('publish', { sid }); toast(x.published ? 'Đã công bố điểm' : 'Đã thu hồi'); })} />}

      <Section title="Theo dõi" />
      <Card pad={false}>
        {s.status !== 'draft' && <Row first tone="cb" icon="lock-open-outline" title="Phát đề" sub={`${phat}/${rooms.length} phòng đã phát`} onPress={() => router.push(`/cb/phatde/${sid}`)} />}
        {s.status !== 'draft' && <Row tone="cb" icon="desktop-outline" title="Màn hình bài làm" sub="Từng thí sinh, trực tiếp" onPress={() => router.push(`/cb/manhinh/${sid}`)} />}
        {s.status !== 'draft' && <Row tone="cb" icon="analytics-outline" title="Lịch sử làm bài" sub="Xếp theo mức nghi ngờ, xem lại từng thao tác" onPress={() => router.push(`/cb/lichsu/${sid}`)} />}
        {(mg || can(me, 'kythuat')) && s.status !== 'draft' && <Row tone="cb" icon="bar-chart-outline" title="Kết quả, chấm tự luận" sub={`${submitted} bài đã nộp`} onPress={() => router.push(`/cb/ketqua/${sid}`)} />}
        {s.status === 'closed' && <Row tone="cb" icon="grid-outline" title="Bảng điểm các lớp" sub="Học sinh × các bài đã thi" onPress={() => router.push(`/cb/bangdiem?lop=${atts[0]?.className || ''}`)} />}
        <Row first={s.status === 'draft'} tone="cb" icon="warning-outline" title="Biên bản vi phạm" onPress={() => router.push(`/cb/vipham?sid=${sid}`)} />
        {mg && <Row tone="cb" icon="share-outline" title="Biên bản giao nhận đề" sub="Mã niêm phong, phòng, cán bộ coi thi" onPress={handover} />}
      </Card>

      {mg && <Card style={{ gap: 4 }}><Label>MÃ NIÊM PHONG ĐỀ</Label><T style={{ fontFamily: F.b, fontSize: 20, letterSpacing: 1.5 }} selectable>{s.seal}</T><Muted style={{ fontSize: 12.5 }}>Chỉ quản lí ca thấy mã này. Giao cho CBCT qua biên bản giao đề.</Muted></Card>}

      <Section title="Phòng thi" />
      <Card pad={false}>
        {sorted.map((r, i) => (
          <Row key={r.id} first={i === 0} tone="cb" title={`${r.name}${r.place ? ' · ' + r.place : ''} · ${r.students.length} TS`}
            sub={(r.proctors.map(name).join(', ') || 'Chưa phân công CBCT') + (s.status !== 'draft' ? ' · ' + STEP_TEXT[roomStep(r, s)] : '')}
            onPress={mg && s.status === 'draft' ? () => setPick(r) : watchesAll(me) || r.proctors.includes(me.uid) ? () => router.push(`/cb/phong/${sid}/${r.id}`) : undefined}
            right={mg && s.status === 'draft' ? <Icon name="person-add-outline" size={18} color={C.cb} /> : undefined} />
        ))}
      </Card>

      {!!s.log?.length && (<>
        <Section title="Nhật kí ca thi" />
        <Card style={{ gap: 6 }}>{s.log.slice().reverse().map((e, i) => <T key={i} style={{ fontSize: 13.5 }}><T style={{ fontFamily: F.sb, fontSize: 13.5 }}>{fmtTime(e[0], true)}</T> · {LOG_TEXT[e[2]] || (e[2] === 'tao' ? 'Tạo ca thi' : e[2])} · {name(e[1])}{e[3] ? ' · ' + e[3] : ''}</T>)}</Card>
      </>)}
      {pick && <ProctorPicker room={pick} rooms={rooms} staff={staff} sid={sid} onClose={() => setPick(null)} />}
    </Screen>
  );
}
