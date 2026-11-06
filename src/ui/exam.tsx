/* Hiển thị một câu hỏi: dùng khi làm bài (chọn được) và khi cán bộ xem màn hình bài làm (chỉ xem). */
import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import type { Question } from '../../shared/logic';
import { Muted, T } from './kit';
import { C, F } from './theme';

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
export const TYPE_TEXT: Record<string, string> = { mcq: 'Trắc nghiệm', tf: 'Đúng / Sai', short: 'Trả lời ngắn', essay: 'Tự luận' };

export function QuestionView({ q, value, onChange, index, total, readOnly, hidden, small }: {
  q: Question; value?: string; onChange?: (v: string) => void; index: number; total?: number; readOnly?: boolean; hidden?: boolean; small?: boolean;
}) {
  const fs = small ? 14 : 17;
  const sel = (on: boolean) => ({ borderWidth: on ? 2 : 1, borderColor: on ? C.hs : '#D5DDD9', backgroundColor: on ? C.hsSoft : '#fff' });
  return (
    <View style={{ gap: small ? 10 : 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T style={{ fontFamily: F.b, color: C.hs, fontSize: 14 }}>CÂU {index + 1}{total ? `/${total}` : ''}</T>
        <Muted style={{ fontSize: 12.5 }}>{TYPE_TEXT[q.type]} · {String(q.points).replace('.', ',')} điểm</Muted>
      </View>
      {hidden
        ? <View style={{ backgroundColor: '#F1F4F7', borderRadius: 12, padding: 14 }}><Muted style={{ fontSize: 13.5 }}>Nội dung đề ẩn với kĩ thuật viên — chỉ thấy phương án thí sinh chọn.</Muted></View>
        : <T style={{ fontSize: fs, lineHeight: fs * 1.55 }} selectable={!onChange}>{q.text}</T>}

      {q.type === 'mcq' && (q.options || []).map((o, i) => {
        const L = LETTERS[i], on = value === L;
        return (
          <Pressable key={L} accessibilityRole="radio" accessibilityState={{ checked: on }} disabled={readOnly} onPress={() => onChange?.(on ? '' : L)}
            style={({ pressed }) => [{ minHeight: small ? 44 : 56, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 8 }, sel(on), pressed && { opacity: 0.85 }]}>
            <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.hs : '#EEF2F0' }}>
              <T style={{ fontFamily: F.b, color: on ? '#fff' : C.ink2 }}>{L}</T>
            </View>
            <T style={{ flex: 1, fontSize: small ? 14 : 16 }}>{hidden ? 'Phương án ' + L : o}</T>
          </Pressable>
        );
      })}

      {q.type === 'tf' && (q.options || []).map((o, i) => {
        const v = (value || '____')[i];
        return (
          <View key={i} style={{ borderWidth: 1, borderColor: '#D5DDD9', borderRadius: 14, padding: 12, gap: 10, backgroundColor: '#fff' }}>
            <T style={{ fontSize: small ? 14 : 15.5, lineHeight: 22 }}><T style={{ fontFamily: F.b }}>{'abcd'[i]}) </T>{hidden ? 'Mệnh đề ' + 'abcd'[i] : o}</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['D', 'S'] as const).map(k => {
                const on = v === k;
                return (
                  <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: on }} disabled={readOnly}
                    onPress={() => { const arr = (value || '____').padEnd(4, '_').split(''); arr[i] = on ? '_' : k; const nv = arr.join(''); onChange?.(/^_+$/.test(nv) ? '' : nv); }}
                    style={[{ flex: 1, height: small ? 36 : 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, on ? { backgroundColor: k === 'D' ? C.okBg : C.badBg, borderWidth: 2, borderColor: k === 'D' ? C.hs : C.bad } : { borderWidth: 1, borderColor: '#D5DDD9' }]}>
                    <T style={{ fontFamily: F.sb, color: on ? (k === 'D' ? C.hsDark : C.bad) : C.ink2 }}>{k === 'D' ? 'Đúng' : 'Sai'}</T>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}

      {q.type === 'short' && (
        <View style={{ gap: 6 }}>
          <TextInput editable={!readOnly} value={value || ''} onChangeText={t => onChange?.(t.replace(/[^0-9,.\-]/g, '').slice(0, 12))} keyboardType="numbers-and-punctuation" placeholder="Nhập đáp số" placeholderTextColor={C.faint} accessibilityLabel="Đáp số"
            style={{ height: 56, borderWidth: 2, borderColor: value ? C.hs : '#CBD5D1', borderRadius: 14, paddingHorizontal: 16, fontFamily: F.b, fontSize: 22, color: C.ink, backgroundColor: '#fff' }} />
          {!readOnly && <Muted style={{ fontSize: 12.5 }}>Chỉ điền số; dùng dấu phẩy cho số thập phân (ví dụ 1,5).</Muted>}
        </View>
      )}

      {q.type === 'essay' && (
        hidden && readOnly
          ? <Muted>Đã viết {(value || '').length} kí tự</Muted>
          : <TextInput editable={!readOnly} multiline value={value || ''} onChangeText={t => onChange?.(t.slice(0, 20000))} placeholder="Trình bày lời giải" placeholderTextColor={C.faint} accessibilityLabel="Bài tự luận"
            style={{ minHeight: small ? 100 : 220, borderWidth: 1, borderColor: '#CBD5D1', borderRadius: 14, padding: 14, fontFamily: F.r, fontSize: 16, lineHeight: 24, color: C.ink, backgroundColor: '#fff', textAlignVertical: 'top' }} />
      )}
    </View>
  );
}

/** Bảng câu: ô xanh = đã làm, cam = đánh dấu xem lại, viền đậm = đang mở. */
export function Palette({ order, answers, flags, cur, onPick, size = 34, cols = 8 }: { order: string[]; answers: Record<string, any>; flags: Record<string, boolean>; cur: number; onPick?: (i: number) => void; size?: number; cols?: number }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {order.map((id, i) => {
        const done = answers[id] !== undefined && answers[id] !== '', fl = !!flags[id];
        return (
          <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Câu ${i + 1}${done ? ', đã làm' : ''}${fl ? ', đánh dấu' : ''}`} disabled={!onPick} onPress={() => onPick?.(i)}
            style={{ width: size, height: size, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: fl ? C.orangeBg : done ? C.hsTint : '#F1F4F2', borderWidth: i === cur ? 2 : 0, borderColor: C.ink, flexBasis: `${100 / cols - 2}%` as any }}>
            <T style={{ fontFamily: F.sb, fontSize: 12.5, color: fl ? C.orange : done ? C.hsDark : C.muted }}>{i + 1}</T>
          </Pressable>
        );
      })}
    </View>
  );
}
