/*
 * MÀN HÌNH LÀM BÀI
 * - Đề chỉ tải được khi cán bộ coi thi đã phát (Security Rules kiểm tra).
 * - Đáp án lưu ngay trong máy, gửi lên máy chủ theo lô (5 giây/lần hoặc ngay sau khi chọn); mất mạng vẫn làm tiếp, có mạng tự gửi.
 * - Chế độ thi: chặn chụp/ghi màn hình (Android chặn hẳn, iOS phát hiện), giữ màn hình sáng, chặn nút quay lại,
 *   ghi lại mỗi lần rời app / quay lại app / chụp màn hình — cán bộ thấy ngay trên "Màn hình bài làm".
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenCapture from 'expo-screen-capture';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { api } from '@/data/api';
import { Btn, Icon, Loading, Muted, Note, T, confirmBox, toast } from '@/ui/kit';
import { Palette, QuestionView } from '@/ui/exam';
import { useDoc, useMe, useNow } from '@/ui/hooks';
import { C, F, clock } from '@/ui/theme';
import { attemptId, type AttemptDoc, type Ev, type Question, type SessionDoc } from '../../../shared/logic';

type SaveState = 'ok' | 'saving' | 'offline';

export default function Thi() {
  const { sid } = useLocalSearchParams<{ sid: string }>();
  const me = useMe();
  const ins = useSafeAreaInsets();
  const aid = attemptId(sid, me.uid);
  const a = useDoc<AttemptDoc>('attempts/' + aid);
  const s = useDoc<SessionDoc>('sessions/' + sid);
  const now = useNow(1000);
  const [paper, setPaper] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [cur, setCur] = useState(0);
  const [save, setSave] = useState<SaveState>('ok');
  const [palette, setPalette] = useState(false);
  const [ready, setReady] = useState(false);
  const queue = useRef<Ev[]>([]);
  const dirty = useRef<Record<string, string>>({});
  const dirtyFlags = useRef<Record<string, boolean>>({});
  const busy = useRef(false);
  const submitting = useRef(false);
  const curRef = useRef(0);
  const LOCAL = `cp-bai-${aid}`;

  const jr = useCallback((k: string, x?: any, y?: any) => { queue.current.push(y === undefined ? (x === undefined ? [api.now(), k] : [api.now(), k, x]) : [api.now(), k, x, y]); }, []);
  const backup = useCallback(() => {
    AsyncStorage.setItem(LOCAL, JSON.stringify({ dirty: dirty.current, flags: dirtyFlags.current, q: queue.current.slice(-200) })).catch(() => { });
  }, [LOCAL]);

  const sync = useCallback(async () => {
    if (busy.current || submitting.current) return;
    const evs = queue.current.splice(0), ans = dirty.current, fl = dirtyFlags.current;
    if (!evs.length && !Object.keys(ans).length && !Object.keys(fl).length) return;
    dirty.current = {}; dirtyFlags.current = {};
    busy.current = true; setSave('saving');
    try {
      await api.call('progress', { sid, answers: ans, flags: fl, cur: curRef.current, events: evs });
      setSave('ok'); backup();
    } catch {
      queue.current = evs.concat(queue.current); dirty.current = { ...ans, ...dirty.current }; dirtyFlags.current = { ...fl, ...dirtyFlags.current };
      setSave('offline'); backup();
    } finally { busy.current = false; }
  }, [sid, backup]);

  // tải đề + khôi phục phần chưa gửi
  useEffect(() => {
    if (!a?.startedAt || paper) return;
    let stop = false;
    const load = async () => {
      try {
        const p = await api.getDoc<{ questions: Question[] }>(`sessions/${sid}/paper/main`);
        if (!p || stop) return;
        const byId = new Map(p.questions.map(q => [q.id, q]));
        const ordered = (a.order?.length ? a.order : p.questions.map(q => q.id)).map(id => byId.get(id)!).filter(Boolean);
        let local: any = null;
        try { local = JSON.parse((await AsyncStorage.getItem(LOCAL)) || 'null'); } catch { }
        dirty.current = local?.dirty || {}; dirtyFlags.current = local?.flags || {};
        if (local?.q?.length) queue.current = local.q.concat(queue.current);
        setAnswers({ ...a.answers, ...dirty.current });
        setFlags({ ...a.flags, ...dirtyFlags.current });
        setCur(a.cur || 0); curRef.current = a.cur || 0;
        jr(a.metrics?.events ? 'L' : 'S');
        setPaper(ordered); setReady(true);
      } catch { if (!stop) setTimeout(load, 3000); }
    };
    load();
    return () => { stop = true; };
  }, [a?.startedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // chế độ thi
  useEffect(() => {
    if (!ready) return;
    const subs: { remove: () => void }[] = [];
    activateKeepAwakeAsync('thi').catch(() => { });
    if (Platform.OS !== 'web') {
      ScreenCapture.preventScreenCaptureAsync('thi').catch(() => { });
      ScreenCapture.enableAppSwitcherProtectionAsync?.(0.6)?.catch?.(() => { });
      try { subs.push(ScreenCapture.addScreenshotListener(() => { jr('SS'); void sync(); })); } catch { }
    }
    let state = AppState.currentState;
    subs.push(AppState.addEventListener('change', next => {
      if (state === 'active' && next !== 'active') { jr('BG'); void sync(); }
      if (state !== 'active' && next === 'active') { jr('FG'); void sync(); }
      state = next;
    }));
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const vis = () => { if (document.hidden) jr('BG'); else jr('FG'); void sync(); };
      document.addEventListener('visibilitychange', vis);
      subs.push({ remove: () => document.removeEventListener('visibilitychange', vis) });
    }
    subs.push(BackHandler.addEventListener('hardwareBackPress', () => { setPalette(true); return true; }));
    const t = setInterval(() => void sync(), 5000);
    return () => {
      clearInterval(t); subs.forEach(x => { try { x.remove(); } catch { } });
      try { Promise.resolve(deactivateKeepAwake('thi')).catch(() => { }); } catch { }
      if (Platform.OS !== 'web') ScreenCapture.allowScreenCaptureAsync('thi').catch(() => { });
    };
  }, [ready, jr, sync]);

  const submit = useCallback(async (auto: boolean) => {
    if (submitting.current) return;
    if (!auto) {
      const left = (paper || []).filter(q => !answers[q.id]).length;
      const fl = Object.values(flags).filter(Boolean).length;
      const ok = await confirmBox({ title: 'Nộp bài?', tone: 'hs', ok: 'Nộp bài', message: left ? `Còn ${left} câu chưa làm${fl ? `, ${fl} câu đánh dấu xem lại` : ''}. Nộp rồi không sửa được.` : 'Em đã làm hết các câu. Nộp rồi không sửa được.' });
      if (!ok) return;
    }
    jr('SUB', auto ? 'het-gio' : 'tu-nop');
    await sync();
    submitting.current = true;
    try {
      await api.call('submit', { sid, answers });
      await AsyncStorage.removeItem(LOCAL).catch(() => { });
      router.replace(`/nop/${sid}`);
    } catch (e: any) {
      submitting.current = false;
      toast(auto ? 'Hết giờ — đang thử nộp lại…' : e.message, true);
      if (auto) setTimeout(() => submit(true), 4000);
    }
  }, [paper, answers, flags, sid, sync, jr, LOCAL]);

  // hết giờ → tự nộp; bài đã nộp (máy khác/máy chủ tự nộp) → sang biên nhận
  const left = a?.deadline ? a.deadline - now : 0;
  useEffect(() => { if (a?.submitted) router.replace(`/nop/${sid}`); }, [a?.submitted, sid]);
  useEffect(() => { if (ready && a?.deadline && left <= 0 && !a.submitted) void submit(true); }, [ready, left <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (a === undefined || s === undefined) return <Loading tone="hs" />;
  if (!a || !a.startedAt) return <View style={{ flex: 1, padding: 24, paddingTop: ins.top + 40, backgroundColor: C.bg }}><Note kind="warn" text="Chưa được phát đề." /><Btn title="Về phòng chờ" onPress={() => router.replace(`/phongcho/${sid}`)} style={{ marginTop: 16 }} /></View>;
  if (!paper) return <Loading tone="hs" />;

  const q = paper[Math.min(cur, paper.length - 1)];
  const done = paper.filter(x => answers[x.id]).length;
  const nFlag = Object.values(flags).filter(Boolean).length;
  const go = (i: number) => { if (i < 0 || i >= paper.length || i === cur) return; jr('N', cur, i); setCur(i); curRef.current = i; };
  const setAns = (v: string) => {
    setAnswers(x => { const n = { ...x }; if (v) n[q.id] = v; else delete n[q.id]; return n; });
    dirty.current[q.id] = v; backup();
    if (q.type === 'essay') { jr('E', q.id, v.length); } else jr('A', q.id, v);
    if (q.type === 'mcq' || q.type === 'tf') setTimeout(() => void sync(), 800);
  };
  const low = left < 5 * 60000;
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ paddingTop: ins.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Muted style={{ fontSize: 13 }} numberOfLines={1}>{s?.subject} · SBD {a.sbd}</Muted>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T style={{ fontFamily: F.sb }}>Đã làm {done}/{paper.length}{nFlag ? ` · đánh dấu ${nFlag}` : ''}</T>
            <Icon name={save === 'offline' ? 'cloud-offline-outline' : save === 'saving' ? 'cloud-upload-outline' : 'cloud-done-outline'} size={16} color={save === 'offline' ? C.bad : C.muted} />
          </View>
        </View>
        <View accessibilityLabel={`Còn ${clock(left)}`} style={{ height: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: low ? C.badBg : '#EEF2F0', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="timer-outline" size={17} color={low ? C.bad : C.ink} />
          <T style={{ fontFamily: F.b, fontSize: 18, color: low ? C.bad : C.ink, fontVariant: ['tabular-nums'] }}>{clock(left)}</T>
        </View>
      </View>
      {save === 'offline' && <View style={{ backgroundColor: C.badBg, paddingHorizontal: 16, paddingVertical: 6 }}><T style={{ color: C.bad, fontSize: 13 }}>Mất mạng — bài vẫn lưu trong máy, có mạng sẽ tự gửi.</T></View>}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16, maxWidth: 760, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <QuestionView key={q.id} q={q} index={cur} total={paper.length} value={answers[q.id]} onChange={setAns} />
        <Pressable accessibilityRole="button" onPress={() => { const v = !flags[q.id]; setFlags(f => ({ ...f, [q.id]: v })); dirtyFlags.current[q.id] = v; jr('F', q.id, v ? 1 : 0); }}
          style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: flags[q.id] ? '#F2C48D' : '#D5DDD9', backgroundColor: flags[q.id] ? C.orangeBg : '#fff' }}>
          <Icon name={flags[q.id] ? 'flag' : 'flag-outline'} size={15} color={C.orange} />
          <T style={{ fontFamily: F.sb, fontSize: 13, color: C.orange }}>{flags[q.id] ? 'Đã đánh dấu xem lại' : 'Đánh dấu xem lại'}</T>
        </Pressable>
      </ScrollView>

      <View style={{ borderTopWidth: 1, borderTopColor: C.line, paddingHorizontal: 16, paddingTop: 10, paddingBottom: ins.bottom + 12, gap: 10 }}>
        <Pressable accessibilityRole="button" onPress={() => setPalette(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: '#EEF2F0', overflow: 'hidden' }}><View style={{ width: `${(done / paper.length) * 100}%`, height: 6, backgroundColor: C.hs }} /></View>
          <T style={{ fontFamily: F.sb, fontSize: 13, color: C.hs }}>Bảng câu</T>
          <Icon name="grid-outline" size={16} color={C.hs} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn title="Trước" icon="chevron-back" kind="secondary" onPress={() => go(cur - 1)} disabled={cur === 0} style={{ flex: 1 }} />
          <Btn title="Nộp bài" kind="secondary" onPress={() => submit(false)} style={{ flex: 1 }} />
          <Btn title="Sau" onPress={() => go(cur + 1)} disabled={cur >= paper.length - 1} style={{ flex: 1 }} />
        </View>
      </View>

      <Modal visible={palette} transparent animationType="slide" onRequestClose={() => setPalette(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,27,45,0.4)' }} onPress={() => setPalette(false)} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: ins.bottom + 20, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T style={{ fontFamily: F.b, fontSize: 18 }}>Bảng câu</T>
            <Muted style={{ fontSize: 13 }}>Đã làm {done} · chưa làm {paper.length - done} · đánh dấu {nFlag}</Muted>
          </View>
          <Palette order={paper.map(x => x.id)} answers={answers} flags={flags} cur={cur} onPick={i => { go(i); setPalette(false); }} size={40} cols={8} />
          <Btn title="Nộp bài" onPress={() => { setPalette(false); void submit(false); }} />
        </View>
      </Modal>
    </View>
  );
}
