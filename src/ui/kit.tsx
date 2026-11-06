/* Bộ thành phần giao diện dùng chung. */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { C, F, brand, brandSoft, pageBg, type Tone } from './theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export const Icon = ({ name, size = 20, color = C.ink }: { name: IconName; size?: number; color?: string }) => <Ionicons name={name} size={size} color={color} />;

// ---------------------------------------------------------------- chữ
type TP = { children?: React.ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number; selectable?: boolean };
export const T = ({ children, style, numberOfLines, selectable }: TP) => <Text style={[s.t, style]} numberOfLines={numberOfLines} selectable={selectable}>{children}</Text>;
export const H1 = (p: TP) => <T {...p} style={[s.h1, p.style]} />;
export const H2 = (p: TP) => <T {...p} style={[s.h2, p.style]} />;
export const Muted = (p: TP) => <T {...p} style={[s.muted, p.style]} />;
export const Label = (p: TP) => <T {...p} style={[s.label, p.style]} />;

// ---------------------------------------------------------------- khung trang
export function Screen({ tone, title, sub, back, right, children, scroll = true, footer, pad = true, onBack }: {
  tone: Tone; title?: string; sub?: string; back?: boolean; right?: React.ReactNode; children?: React.ReactNode; scroll?: boolean; footer?: React.ReactNode; pad?: boolean; onBack?: () => void;
}) {
  const ins = useSafeAreaInsets();
  const body = scroll
    ? <ScrollView style={{ flex: 1 }} contentContainerStyle={[pad && { padding: 16, gap: 14 }, { paddingBottom: 24 + (footer ? 0 : ins.bottom) }]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    : <View style={[{ flex: 1 }, pad && { padding: 16, gap: 14 }]}>{children}</View>;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: pageBg(tone) }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {title !== undefined && (
        <View style={[s.head, { paddingTop: ins.top + 8 }]}>
          {back && <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => (onBack ? onBack() : router.canGoBack() ? router.back() : router.replace('/'))} style={s.backBtn} hitSlop={8}><Icon name="chevron-back" size={24} /></Pressable>}
          <View style={{ flex: 1, minWidth: 0 }}>
            <T style={s.headT} numberOfLines={1}>{title}</T>
            {!!sub && <Muted numberOfLines={1} style={{ fontSize: 13 }}>{sub}</Muted>}
          </View>
          {right}
        </View>
      )}
      {body}
      {footer && <View style={[s.footer, { paddingBottom: 12 + ins.bottom }]}>{footer}</View>}
    </KeyboardAvoidingView>
  );
}

export const Card = ({ children, style, pad = true, onPress, tone }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; pad?: boolean; onPress?: () => void; tone?: 'warn' | 'bad' | 'ok' }) => {
  const st = [s.card, pad && { padding: 16 }, tone === 'warn' && { borderColor: C.warnLine, borderWidth: 1.5 }, tone === 'bad' && { borderColor: C.badLine, borderWidth: 1.5 }, tone === 'ok' && { borderColor: '#9FD3B8' }, style];
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [st, pressed && { opacity: 0.85 }]}>{children}</Pressable> : <View style={st}>{children}</View>;
};

export function Btn({ title, onPress, tone = 'hs', kind = 'primary', icon, loading, disabled, small, style }: {
  title: string; onPress?: () => any; tone?: Tone; kind?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'light'; icon?: IconName; loading?: boolean; disabled?: boolean; small?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const [busy, setBusy] = useState(false);
  const b = brand(tone);
  const bg = kind === 'primary' ? b : kind === 'danger' ? C.bad : kind === 'light' ? '#FFFFFF' : kind === 'ghost' ? 'transparent' : '#FFFFFF';
  const fg = kind === 'primary' || kind === 'danger' ? '#FFFFFF' : kind === 'light' ? (tone === 'hs' ? C.hsDark : C.cbDark) : kind === 'ghost' ? b : C.ink;
  const spin = loading || busy;
  return (
    <Pressable accessibilityRole="button" disabled={disabled || spin}
      onPress={async () => { if (!onPress) return; const r = onPress(); if (r && typeof r.then === 'function') { setBusy(true); try { await r; } finally { setBusy(false); } } }}
      style={({ pressed }) => [s.btn, small && s.btnSm, { backgroundColor: bg }, kind === 'secondary' && { borderWidth: 1, borderColor: '#C9D3DF' }, (disabled || spin) && { opacity: 0.55 }, pressed && { opacity: 0.8 }, style]}>
      {spin ? <ActivityIndicator color={fg} /> : <>{icon && <Icon name={icon} size={small ? 16 : 19} color={fg} />}<T style={[s.btnT, small && { fontSize: 14 }, { color: fg }]} numberOfLines={1}>{title}</T></>}
    </Pressable>
  );
}

export const Pill = ({ text, kind = 'muted' }: { text: string; kind?: 'ok' | 'warn' | 'bad' | 'info' | 'muted' | 'orange' }) => {
  const m = { ok: [C.okBg, C.ok], warn: [C.warnBg, C.warn], bad: [C.badBg, C.bad], info: [C.infoBg, C.info], muted: ['#EEF1F5', C.ink2], orange: [C.orangeBg, C.orange] }[kind];
  return <View style={[s.pill, { backgroundColor: m[0] }]}><T style={[s.pillT, { color: m[1] }]} numberOfLines={1}>{text}</T></View>;
};
export const Dot = ({ on, color }: { on?: boolean; color?: string }) => <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color || (on ? '#1E8A5A' : '#B8C2CE') }} />;

export function Field({ label, value, onChange, placeholder, secure, multiline, keyboard, hint, autoCap = 'none', maxLength, style, inputStyle, autoFocus }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; secure?: boolean; multiline?: boolean; keyboard?: 'default' | 'numeric' | 'email-address' | 'decimal-pad'; hint?: string; autoCap?: 'none' | 'sentences' | 'words' | 'characters'; maxLength?: number; style?: StyleProp<ViewStyle>; inputStyle?: StyleProp<TextStyle>; autoFocus?: boolean;
}) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {!!label && <T style={s.fieldL}>{label}</T>}
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.faint} secureTextEntry={secure} multiline={multiline}
        keyboardType={keyboard} autoCapitalize={autoCap} autoCorrect={false} maxLength={maxLength} autoFocus={autoFocus} accessibilityLabel={label || placeholder}
        style={[s.input, multiline && { height: 120, paddingTop: 12, textAlignVertical: 'top' }, inputStyle]} />
      {!!hint && <Muted style={{ fontSize: 12.5 }}>{hint}</Muted>}
    </View>
  );
}

export function Seg<V extends string>({ options, value, onChange, tone = 'hs' }: { options: [V, string][]; value: V; onChange: (v: V) => void; tone?: Tone }) {
  return (
    <View style={s.seg}>
      {options.map(([v, l]) => (
        <Pressable key={v} accessibilityRole="button" accessibilityState={{ selected: v === value }} onPress={() => onChange(v)} style={[s.segB, v === value && s.segOn]}>
          <T style={[s.segT, v === value && { color: tone === 'hs' ? C.hsDark : C.cbDark }]} numberOfLines={1}>{l}</T>
        </Pressable>
      ))}
    </View>
  );
}

export const Row = ({ title, sub, right, onPress, icon, first, tone = 'hs', danger }: { title: string; sub?: string; right?: React.ReactNode; onPress?: () => void; icon?: IconName; first?: boolean; tone?: Tone; danger?: boolean }) => (
  <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={onPress} style={({ pressed }) => [s.row, !first && { borderTopWidth: 1, borderTopColor: C.lineSoft }, pressed && { backgroundColor: '#F7F9FA' }]}>
    {icon && <View style={[s.rowIc, { backgroundColor: danger ? C.badBg : brandSoft(tone) }]}><Icon name={icon} size={18} color={danger ? C.bad : brand(tone)} /></View>}
    <View style={{ flex: 1, minWidth: 0 }}>
      <T style={[s.rowT, danger && { color: C.bad }]} numberOfLines={2}>{title}</T>
      {!!sub && <Muted style={{ fontSize: 13 }} numberOfLines={2}>{sub}</Muted>}
    </View>
    {right}
    {onPress && !right && <Icon name="chevron-forward" size={18} color={C.faint} />}
  </Pressable>
);

export const Kpi = ({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: 'bad' | 'warn' }) => (
  <View style={[s.kpi, tone === 'bad' && { backgroundColor: C.badBg }, tone === 'warn' && { backgroundColor: C.warnBg }]}>
    <T style={s.kpiL} numberOfLines={1}>{label}</T>
    <T style={[s.kpiV, tone === 'bad' && { color: C.bad }]} numberOfLines={1}>{value}</T>
    {!!sub && <Muted style={{ fontSize: 12 }} numberOfLines={1}>{sub}</Muted>}
  </View>
);
export const KpiRow = ({ children }: { children: React.ReactNode }) => <View style={{ flexDirection: 'row', gap: 8 }}>{children}</View>;

export const Section = ({ title, right }: { title: string; right?: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}><H2>{title}</H2>{right}</View>
);
export const Empty = ({ text, icon = 'file-tray-outline' }: { text: string; icon?: IconName }) => (
  <View style={{ alignItems: 'center', padding: 28, gap: 8 }}><Icon name={icon} size={32} color={C.faint} /><Muted style={{ textAlign: 'center' }}>{text}</Muted></View>
);
export const Note = ({ text, kind = 'info', icon = 'information-circle-outline' }: { text: string; kind?: 'info' | 'ok' | 'warn' | 'bad'; icon?: IconName }) => {
  const m = { info: [C.infoBg, C.info], ok: [C.hsSoft, C.hsDark], warn: [C.warnBg, C.warn], bad: [C.badBg, C.bad] }[kind];
  return <View style={[s.note, { backgroundColor: m[0] }]}><Icon name={icon} size={19} color={m[1]} /><T style={{ flex: 1, color: m[1], fontSize: 13.5, lineHeight: 20 }}>{text}</T></View>;
};
export const Avatar = ({ text, tone = 'hs', size = 44 }: { text: string; tone?: Tone; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tone === 'hs' ? C.hsTint : C.cbTint, alignItems: 'center', justifyContent: 'center' }}>
    <T style={{ fontFamily: F.b, color: tone === 'hs' ? C.hsDark : C.cbDark, fontSize: size * 0.36 }}>{text}</T>
  </View>
);
export const Steps = ({ n, total = 5, color = C.cb, bad }: { n: number; total?: number; color?: string; bad?: boolean }) => (
  <View style={{ flexDirection: 'row', gap: 3 }}>{Array.from({ length: total }, (_, i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < n ? (bad ? C.badLine : color) : '#DDE3EA' }} />)}</View>
);
export const Bar = ({ ratio, color = C.hs }: { ratio: number; color?: string }) => (
  <View style={{ height: 6, borderRadius: 3, backgroundColor: '#EEF2F0', overflow: 'hidden' }}><View style={{ width: `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`, height: 6, backgroundColor: color }} /></View>
);
export const Loading = ({ tone }: { tone: Tone }) => <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: pageBg(tone) }}><ActivityIndicator color={brand(tone)} size="large" /></View>;

export const Chip = ({ on, text, onPress }: { on: boolean; text: string; onPress: () => void }) => (
  <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={onPress} style={{ height: 38, paddingHorizontal: 14, borderRadius: 10, justifyContent: 'center', backgroundColor: on ? C.cb : '#fff', borderWidth: 1, borderColor: on ? C.cb : '#C9D3DF' }}>
    <T style={{ fontFamily: F.sb, fontSize: 14, color: on ? '#fff' : C.ink }}>{text}</T>
  </Pressable>
);

// ---------------------------------------------------------------- hộp thoại (chạy cả trên web, nơi Alert không có nút)
type FieldSpec = { key: string; label: string; secure?: boolean; multiline?: boolean; placeholder?: string; value?: string; keyboard?: 'default' | 'numeric' | 'decimal-pad'; maxLength?: number; hint?: string };
type DialogReq = { title: string; message?: string; ok?: string; cancel?: string | null; danger?: boolean; tone?: Tone; fields?: FieldSpec[]; checks?: { key: string; label: string }[]; run?: (v: Record<string, any>) => Promise<any> | any; resolve: (v: any) => void };
let pushDialog: ((d: DialogReq) => void) | null = null;
let pushToast: ((t: string, bad?: boolean) => void) | null = null;
export const confirmBox = (o: Omit<DialogReq, 'resolve'>) => new Promise<boolean>(res => pushDialog?.({ ...o, resolve: res }));
export const formBox = (o: Omit<DialogReq, 'resolve'>) => new Promise<Record<string, any> | null>(res => pushDialog?.({ ...o, resolve: res }));
export const toast = (t: string, bad?: boolean) => pushToast?.(t, bad);

export function DialogHost() {
  const [d, setD] = useState<DialogReq | null>(null);
  const [vals, setVals] = useState<Record<string, any>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [tst, setTst] = useState<{ t: string; bad?: boolean } | null>(null);
  const timer = useRef<any>(null);
  const ins = useSafeAreaInsets();
  useEffect(() => {
    pushDialog = x => { setD(x); setErr(''); setBusy(false); setVals(Object.fromEntries([...(x.fields || []).map(f => [f.key, f.value || '']), ...(x.checks || []).map(c => [c.key, false])])); };
    pushToast = (t, bad) => { setTst({ t, bad }); clearTimeout(timer.current); timer.current = setTimeout(() => setTst(null), 2600); };
    return () => { pushDialog = null; pushToast = null; };
  }, []);
  const close = (v: any) => { const r = d?.resolve; setD(null); r?.(v); };
  const ok = async () => {
    if (!d) return;
    if (!d.fields && !d.checks && !d.run) return close(true);
    if (d.run) {
      setBusy(true); setErr('');
      try { const r = await d.run(vals); setBusy(false); close(r === undefined ? vals : r); }
      catch (e: any) { setBusy(false); setErr(e?.message || String(e)); }
    } else close(vals);
  };
  return (
    <>
      <Modal visible={!!d} transparent animationType="fade" onRequestClose={() => close(d?.fields ? null : false)}>
        <KeyboardAvoidingView style={s.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.sheet, { paddingBottom: 18 + ins.bottom }]}>
            <View style={s.grab} />
            <H2 style={{ fontSize: 20 }}>{d?.title}</H2>
            {!!d?.message && <T style={{ color: C.ink2, lineHeight: 21 }}>{d.message}</T>}
            {(d?.checks || []).map(c => (
              <Pressable key={c.key} accessibilityRole="checkbox" accessibilityState={{ checked: !!vals[c.key] }} onPress={() => setVals(v => ({ ...v, [c.key]: !v[c.key] }))} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View style={[s.check, vals[c.key] && { backgroundColor: brand(d!.tone || 'cb'), borderColor: brand(d!.tone || 'cb') }]}>{vals[c.key] && <Icon name="checkmark" size={16} color="#fff" />}</View>
                <T style={{ flex: 1, lineHeight: 21 }}>{c.label}</T>
              </Pressable>
            ))}
            {(d?.fields || []).map((f, i) => <Field key={f.key} label={f.label} value={vals[f.key] || ''} onChange={v => setVals(x => ({ ...x, [f.key]: v }))} secure={f.secure} multiline={f.multiline} placeholder={f.placeholder} keyboard={f.keyboard} maxLength={f.maxLength} hint={f.hint} autoFocus={i === 0} />)}
            {!!err && <Note text={err} kind="bad" icon="alert-circle-outline" />}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              {d?.cancel !== null && <Btn title={d?.cancel || 'Huỷ'} kind="secondary" tone={d?.tone || 'cb'} onPress={() => close(d?.fields ? null : false)} style={{ flex: 1 }} />}
              <Btn title={d?.ok || 'Đồng ý'} kind={d?.danger ? 'danger' : 'primary'} tone={d?.tone || 'cb'} onPress={ok} loading={busy} style={{ flex: 1.4 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {tst && <View pointerEvents="none" style={[s.toast, { bottom: 90 + ins.bottom }, tst.bad && { backgroundColor: C.bad }]}><T style={{ color: '#fff', fontFamily: F.sb }}>{tst.t}</T></View>}
    </>
  );
}

const s = StyleSheet.create({
  t: { fontFamily: F.r, color: C.ink, fontSize: 15 },
  h1: { fontFamily: F.b, fontSize: 26, letterSpacing: -0.4, lineHeight: 32 },
  h2: { fontFamily: F.b, fontSize: 17 },
  muted: { color: C.muted, fontSize: 14 },
  label: { fontFamily: F.sb, fontSize: 12, color: C.muted, letterSpacing: 0.3 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: C.line },
  headT: { fontFamily: F.b, fontSize: 18 },
  backBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -6 },
  footer: { padding: 12, paddingHorizontal: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: C.line, gap: 8 },
  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line },
  btn: { minHeight: 50, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnSm: { minHeight: 40, borderRadius: 11, paddingHorizontal: 12 },
  btnT: { fontFamily: F.sb, fontSize: 16 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  pillT: { fontFamily: F.b, fontSize: 12 },
  fieldL: { fontFamily: F.sb, fontSize: 14 },
  input: { minHeight: 50, borderWidth: 1, borderColor: '#CBD5D1', borderRadius: 12, paddingHorizontal: 14, fontFamily: F.m, fontSize: 16, backgroundColor: '#FFFFFF', color: C.ink },
  seg: { flexDirection: 'row', backgroundColor: '#E4E9E6', borderRadius: 12, padding: 4, gap: 4 },
  segB: { flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segOn: { backgroundColor: '#FFFFFF', shadowColor: '#0F1B2D', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segT: { fontFamily: F.sb, fontSize: 14, color: '#4A5A6E' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, minHeight: 56 },
  rowIc: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowT: { fontFamily: F.sb, fontSize: 15 },
  kpi: { flex: 1, backgroundColor: '#F1F4F7', borderRadius: 12, padding: 10, gap: 1 },
  kpiL: { fontFamily: F.sb, fontSize: 12, color: C.muted },
  kpiV: { fontFamily: F.b, fontSize: 20 },
  note: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, alignItems: 'flex-start' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,27,45,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 10, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' },
  grab: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#D3DAE3', alignSelf: 'center', marginBottom: 4 },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: '#AEB9C6', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  toast: { position: 'absolute', alignSelf: 'center', backgroundColor: C.ink, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, maxWidth: '90%' }
});
