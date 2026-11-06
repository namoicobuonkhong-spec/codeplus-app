/*
 * CẤU HÌNH FIREBASE
 * Firebase Console → Project settings → Your apps → Web app → "SDK setup and configuration" → Config.
 * Dán các giá trị vào đây. Để trống apiKey thì app chạy CHẾ ĐỘ THỬ (dữ liệu mẫu trong máy).
 * Có thể đặt bằng biến môi trường EXPO_PUBLIC_FIREBASE_* thay vì sửa tệp này.
 */
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || ''
};

/** Vùng chạy Cloud Functions — gần Việt Nam nhất là Singapore. Phải trùng với functions/src/index.ts */
export const FUNCTIONS_REGION = 'asia-southeast1';

/** Đuôi email nội bộ: tài khoản "hs001" đăng nhập Firebase Auth bằng hs001@<đuôi> */
export const LOGIN_DOMAIN = 'hvt.codeplus.app';

/** Tên trường hiển thị trong app */
export const SCHOOL_NAME = 'THPT Chuyên Hoàng Văn Thụ';
