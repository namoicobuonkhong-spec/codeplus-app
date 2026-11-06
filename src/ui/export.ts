/* Xuất bảng ra tệp CSV mở được bằng Excel (có BOM để hiện đúng tiếng Việt).
 * Web: tải tệp về máy. Điện thoại: mở bảng chia sẻ (Zalo, email, Lưu vào Tệp…). */
import { Platform } from 'react-native';

const cell = (v: any) => {
  const s = v == null ? '' : String(v);
  return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
export const toCsv = (rows: any[][]) => '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n');

export async function exportCsv(name: string, rows: any[][]) {
  const text = toCsv(rows);
  const file = name.replace(/[^\p{L}\p{N}._ -]/gu, '_').replace(/\s+/g, '_') + '.csv';
  if (Platform.OS === 'web') {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = file;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    return;
  }
  const { File, Paths } = require('expo-file-system');
  const Sharing = require('expo-sharing');
  const f = new File(Paths.cache, file);
  try { if (f.exists) f.delete(); } catch { }
  f.create();
  f.write(text);
  await Sharing.shareAsync(f.uri, { mimeType: 'text/csv', dialogTitle: name, UTI: 'public.comma-separated-values-text' });
}
