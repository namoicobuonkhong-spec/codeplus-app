/* Màu, chữ, khoảng cách. Học sinh: xanh lá; cán bộ: xanh dương — nhìn là biết đang ở chế độ nào. */
export const C = {
  bg: '#F4F6F5', bgStaff: '#F3F5F8', card: '#FFFFFF', line: '#E2E8E5', lineSoft: '#EEF2F0',
  ink: '#0F1B2D', ink2: '#3E4C5E', muted: '#5B6B7F', faint: '#8A97A6',
  hs: '#1E6B4A', hsDark: '#14513A', hsSoft: '#E8F3EE', hsTint: '#D6EDE2',
  cb: '#1D4E89', cbDark: '#163C6A', cbSoft: '#E6EEF8', cbTint: '#DCE6F3',
  ok: '#14513A', okBg: '#DCF0E5', warn: '#92400E', warnBg: '#FEF3C7', warnLine: '#E8A33A',
  bad: '#B42318', badBg: '#FEE4E2', badLine: '#D92D20', info: '#1D4E89', infoBg: '#E6EEF8',
  orange: '#9A3412', orangeBg: '#FFEDD5'
};
export const F = {
  r: 'BeVietnamPro_400Regular', m: 'BeVietnamPro_500Medium', sb: 'BeVietnamPro_600SemiBold', b: 'BeVietnamPro_700Bold'
};
export type Tone = 'hs' | 'cb';
export const brand = (t: Tone) => (t === 'hs' ? C.hs : C.cb);
export const brandSoft = (t: Tone) => (t === 'hs' ? C.hsSoft : C.cbSoft);
export const pageBg = (t: Tone) => (t === 'hs' ? C.bg : C.bgStaff);

export const fmtTime = (t?: number | null, sec = false) => (t ? new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', ...(sec ? { second: '2-digit' } : {}) }) : '');
export const fmtDate = (d?: string | number | null) => {
  if (!d) return '';
  const x = typeof d === 'number' ? new Date(d) : new Date(d + 'T00:00:00');
  return x.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
export const weekday = (d: string) => ['CN', 'TH 2', 'TH 3', 'TH 4', 'TH 5', 'TH 6', 'TH 7'][new Date(d + 'T00:00:00').getDay()];
export const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(x)}` : `${p(m)}:${p(x)}`;
};
export const ago = (t?: number | null, now = Date.now()) => {
  if (!t) return '';
  const s = Math.round((now - t) / 1000);
  if (s < 10) return 'vừa xong';
  if (s < 60) return `${s} giây trước`;
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return fmtDate(t);
};
export const initials = (name: string) => {
  const p = name.replace(/\(.*?\)/g, '').trim().split(/\s+/);
  return ((p.length > 1 ? p[p.length - 2][0] : '') + (p[p.length - 1]?.[0] || '')).toUpperCase();
};
export const num = (x: number | null | undefined, d = 2) => (x == null ? '—' : String(Math.round(x * 10 ** d) / 10 ** d).replace('.', ','));
