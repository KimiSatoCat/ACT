/**
 * Firebase 初期化モジュール
 *
 * 設計原則:
 *  - シングルトン — React Native では複数 initializeApp を避ける
 *  - Firestore オフライン永続化を有効化（enableIndexedDbPersistence は Web 向け;
 *    React Native では Firestore SDK がデフォルトで SQLite 永続化を使用）
 *  - 認証: Anonymous Auth のみ（UID でユーザー識別）
 *  - 本番 / 開発の切替は EXPO_PUBLIC_FIREBASE_* 環境変数で制御
 */

import { getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── 設定 ──────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: process.env['EXPO_PUBLIC_FIREBASE_API_KEY'] ?? '',
  authDomain: process.env['EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'] ?? '',
  projectId: process.env['EXPO_PUBLIC_FIREBASE_PROJECT_ID'] ?? '',
  storageBucket: process.env['EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'] ?? '',
  messagingSenderId: process.env['EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'] ?? '',
  appId: process.env['EXPO_PUBLIC_FIREBASE_APP_ID'] ?? '',
};

// ─── 初期化（重複防止）─────────────────────────────────────────────────────

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;

// ─── Auth — React Native 用永続化設定 ────────────────────────────────────

/**
 * React Native では getAuth() ではなく initializeAuth() + getReactNativePersistence を使う。
 * 既に初期化済みの場合は getAuth() にフォールバック。
 */
export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // すでに初期化済み（HMR リロード等）
    return getAuth(app);
  }
})();

// ─── Firestore ──────────────────────────────────────────────────────────────

export const db = getFirestore(app);

export default app;
