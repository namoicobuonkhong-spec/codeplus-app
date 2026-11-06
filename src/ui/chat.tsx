/* Hỏi đáp giữa học sinh và cán bộ (mỗi học sinh một luồng). */
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, TextInput, View, Pressable } from 'react-native';
import { api } from '@/data/api';
import { useMe, useQuery } from './hooks';
import { Empty, Icon, Muted, T } from './kit';
import { C, F, fmtDate, fmtTime, type Tone } from './theme';

export function Chat({ tid, tone, student }: { tid: string; tone: Tone; student?: { name: string; className?: string } }) {
  const me = useMe();
  const msgs = useQuery<any>(`threads/${tid}/msgs`);
  const [text, setText] = useState('');
  const ref = useRef<any>(null);
  const list = (msgs || []).slice().sort((a, b) => a.at - b.at);
  useEffect(() => { setTimeout(() => ref.current?.scrollToEnd({ animated: false }), 50); }, [list.length]);
  useEffect(() => { // đánh dấu đã đọc
    if (!msgs) return;
    api.setDoc('threads/' + tid, me.role === 'staff' ? { unreadStaff: 0 } : { uid: tid, unreadStudent: 0 }, true).catch(() => { });
  }, [msgs?.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = async () => {
    const t = text.trim(); if (!t) return;
    setText('');
    const at = api.now(), id = at.toString(36) + Math.random().toString(36).slice(2, 6);
    await api.setDoc(`threads/${tid}/msgs/${id}`, { id, from: me.uid, fromName: me.name, staff: me.role === 'staff', text: t.slice(0, 2000), at });
    const cur = await api.getDoc<any>('threads/' + tid);
    await api.setDoc('threads/' + tid, me.role === 'staff'
      ? { last: t.slice(0, 120), lastAt: at, unreadStudent: (cur?.unreadStudent || 0) + 1, unreadStaff: 0 }
      : { uid: tid, name: me.name, className: me.className || '', last: t.slice(0, 120), lastAt: at, unreadStaff: (cur?.unreadStaff || 0) + 1, unreadStudent: 0 }, true);
  };
  const b = tone === 'hs' ? C.hs : C.cb;
  let lastDay = '';
  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={ref} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 8 }}>
        {!list.length && <Empty text={me.role === 'student' ? 'Em cần hỏi gì về lịch thi, tài khoản, phòng thi… cứ nhắn ở đây. Cán bộ kĩ thuật và giáo viên sẽ trả lời.' : `Chưa có tin nhắn với ${student?.name || 'học sinh'}`} icon="chatbubbles-outline" />}
        {list.map(m => {
          const mine = m.from === me.uid;
          const day = fmtDate(m.at);
          const showDay = day !== lastDay; lastDay = day;
          return (
            <View key={m.id} style={{ gap: 4 }}>
              {showDay && <Muted style={{ textAlign: 'center', fontSize: 12, marginVertical: 6 }}>{day}</Muted>}
              <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%', backgroundColor: mine ? b : '#fff', borderWidth: mine ? 0 : 1, borderColor: C.line, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 }}>
                {!mine && <T style={{ fontFamily: F.sb, fontSize: 12, color: m.staff ? C.cb : C.hs }}>{m.fromName}</T>}
                <T style={{ color: mine ? '#fff' : C.ink, lineHeight: 21 }} selectable>{m.text}</T>
                <T style={{ fontSize: 11, color: mine ? 'rgba(255,255,255,0.75)' : C.faint, alignSelf: 'flex-end' }}>{fmtTime(m.at)}</T>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.line, alignItems: 'flex-end' }}>
        <TextInput value={text} onChangeText={setText} placeholder="Nhập tin nhắn" placeholderTextColor={C.faint} multiline accessibilityLabel="Tin nhắn"
          style={{ flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderColor: '#CBD5D1', borderRadius: 12, paddingHorizontal: 12, paddingTop: 11, fontFamily: F.r, fontSize: 15, color: C.ink }} onSubmitEditing={send} />
        <Pressable accessibilityRole="button" accessibilityLabel="Gửi" onPress={send} style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 12, backgroundColor: b, alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.8 }]}>
          <Icon name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}
