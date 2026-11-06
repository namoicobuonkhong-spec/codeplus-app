/* Android/iOS: lưu phiên đăng nhập trong máy để mở lại app không phải đăng nhập lại. */
import type { FirebaseApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeAuth, getAuth } from 'firebase/auth';
// getReactNativePersistence chỉ có trong bản React Native của firebase/auth (Metro tự chọn bản này)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getReactNativePersistence } = require('firebase/auth') as any;

export function makeAuth(app: FirebaseApp) {
  try { return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }); }
  catch { return getAuth(app); }
}
