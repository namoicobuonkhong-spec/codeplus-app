import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/data/api';
import { SCHOOL_NAME } from '@/data/config';
import { Btn, Field, Icon, Muted, Note, Seg, T, H1 } from '@/ui/kit';
import { C, F } from '@/ui/theme';

const DEMO = {
  hs: [['hs001', 'Nguyễn Văn An · 12A1'], ['hs002', 'Trần Thị Bình · 12A1']],
  cb: [['giamthi1', 'CBCT1 phòng 1'], ['giamthi2', 'CBCT2 phòng 1'], ['toan', 'Tổ trưởng — quản lí ca'], ['hieutruong', 'Hiệu trưởng'], ['kythuat', 'Kĩ thuật viên'], ['giamthi3', 'Coi ca đang thi']]
} as const;

export default function Login() {
  const ins = useSafeAreaInsets();
  const [kind, setKind] = useState<'hs' | 'cb'>('hs');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const tone = kind;
  const go = async () => {
    setErr('');
    if (!user.trim() || !pass) { setErr('Nhập tài khoản và mật khẩu'); return; }
    try { await api.login(user, pass); router.replace('/'); }
    catch (e: any) { setErr(e.message); }
  };
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 24, paddingTop: ins.top + 48, paddingBottom: ins.bottom + 24, gap: 0, maxWidth: 520, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: tone === 'hs' ? C.hs : C.cb, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="code-slash" size={26} color="#fff" />
        </View>
        <View>
          <T style={{ fontFamily: F.b, fontSize: 22, letterSpacing: -0.3 }}>codeplus</T>
          <Muted style={{ fontSize: 13 }}>{SCHOOL_NAME}</Muted>
        </View>
      </View>
      <H1 style={{ marginTop: 40 }}>Đăng nhập</H1>
      <Muted style={{ marginTop: 6, lineHeight: 21 }}>{kind === 'hs' ? 'Học sinh dùng tài khoản hoặc số báo danh do nhà trường cấp.' : 'Cán bộ, giáo viên dùng tài khoản trường.'}</Muted>
      <View style={{ marginTop: 24 }}><Seg tone={tone} options={[['hs', 'Học sinh'], ['cb', 'Cán bộ']]} value={kind} onChange={v => { setKind(v); setErr(''); }} /></View>
      <View style={{ gap: 16, marginTop: 22 }}>
        <Field label="Tài khoản" value={user} onChange={setUser} placeholder={kind === 'hs' ? 'ví dụ hs001' : 'ví dụ giamthi1'} />
        <Field label="Mật khẩu" value={pass} onChange={setPass} secure placeholder="••••••••" />
        {!!err && <Note text={err} kind="bad" icon="alert-circle-outline" />}
        <Btn title="Đăng nhập" tone={tone} onPress={go} />
      </View>
      <View style={{ marginTop: 28, flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14 }}>
        <Icon name="lock-closed-outline" size={19} color={tone === 'hs' ? C.hs : C.cb} />
        <T style={{ flex: 1, fontSize: 13, lineHeight: 19, color: C.ink2 }}>Trong giờ thi, mỗi thao tác trên bài (chuyển câu, chọn đáp án, rời app, chụp màn hình…) đều được ghi lại.</T>
      </View>
      {api.mode === 'demo' && (
        <View style={{ marginTop: 22, gap: 10 }}>
          <T style={{ fontFamily: F.sb, fontSize: 13, color: C.muted }}>CHẾ ĐỘ THỬ · bấm để điền (mật khẩu demo1234)</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DEMO[kind].map(([u, l]) => (
              <Pressable key={u} accessibilityRole="button" onPress={() => { setUser(u); setPass('demo1234'); setErr(''); }}
                style={({ pressed }) => [{ borderWidth: 1, borderColor: '#C9D3DF', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }, pressed && { opacity: 0.7 }]}>
                <T style={{ fontFamily: F.sb, fontSize: 13 }}>{u}</T>
                <Muted style={{ fontSize: 12 }}>{l}</Muted>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
