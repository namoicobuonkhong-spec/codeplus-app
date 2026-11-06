import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/data/api';
import { SCHOOL_NAME } from '@/data/config';
import { Avatar, Card, Muted, Row, Screen, T, confirmBox, formBox, toast } from '@/ui/kit';
import { useMe } from '@/ui/hooks';
import { F, initials, type Tone } from '@/ui/theme';

export function AccountScreen({ tone }: { tone: Tone }) {
  const me = useMe();
  return (
    <Screen tone={tone} title="Tài khoản">
      <Card>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <Avatar text={initials(me.name)} tone={tone} size={56} />
          <View style={{ flex: 1, gap: 2 }}>
            <T style={{ fontFamily: F.b, fontSize: 18 }}>{me.name}</T>
            <Muted style={{ fontSize: 13 }}>{me.role === 'student' ? `Học sinh lớp ${me.className}` : me.position || 'Cán bộ'}</Muted>
            <Muted style={{ fontSize: 13 }}>Tài khoản: {me.username || me.uid}</Muted>
          </View>
        </View>
      </Card>
      <Card pad={false}>
        {me.role === 'student' && <Row first tone={tone} icon="chatbubble-ellipses-outline" title="Hỏi đáp" sub="Nhắn cán bộ kĩ thuật, giáo viên" onPress={() => router.push('/hoidap')} />}
        <Row first={me.role !== 'student'} tone={tone} icon="key-outline" title="Đổi mật khẩu" onPress={() => formBox({
          title: 'Đổi mật khẩu', tone, ok: 'Đổi mật khẩu',
          fields: [{ key: 'o', label: 'Mật khẩu hiện tại', secure: true }, { key: 'n', label: 'Mật khẩu mới', secure: true, hint: 'Ít nhất 6 kí tự' }, { key: 'n2', label: 'Nhập lại mật khẩu mới', secure: true }],
          run: async v => { if (v.n !== v.n2) throw new Error('Hai lần nhập mật khẩu mới không khớp'); await api.changePassword(v.o, v.n); }
        }).then(r => r && toast('Đã đổi mật khẩu'))} />
        {api.mode === 'demo' && <Row tone={tone} icon="refresh-outline" title="Đặt lại dữ liệu thử" sub="Tạo lại ca thi, học sinh, câu hỏi mẫu" onPress={async () => {
          if (!(await confirmBox({ title: 'Đặt lại dữ liệu thử?', message: 'Mọi thay đổi trong chế độ thử sẽ mất.', ok: 'Đặt lại', danger: true, tone }))) return;
          await api.resetDemo?.(); toast('Đã đặt lại dữ liệu thử');
        }} />}
        <Row tone={tone} icon="log-out-outline" danger title="Đăng xuất" onPress={async () => {
          if (!(await confirmBox({ title: 'Đăng xuất?', ok: 'Đăng xuất', tone }))) return;
          await api.logout(); router.replace('/login');
        }} />
      </Card>
      <Muted style={{ textAlign: 'center', fontSize: 12.5 }}>{SCHOOL_NAME} · codeplus {api.mode === 'demo' ? '· chế độ thử' : ''}</Muted>
    </Screen>
  );
}
