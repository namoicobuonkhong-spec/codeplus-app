/* Web: Auth mặc định (lưu phiên trong trình duyệt). */
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
export const makeAuth = (app: FirebaseApp) => getAuth(app);
