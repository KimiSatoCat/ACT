/**
 * 認証フック
 *
 * 責務:
 *  - Firebase Auth の onAuthStateChanged を購読
 *  - uid / isAuthenticated / isLoading を useAuthStore に同期
 *  - ルーティング制御に必要な最小情報のみ公開
 */

import { useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/useSessionStore';
import type { AuthStore } from '@/types';

/**
 * アプリ起動時に一度だけマウントして認証状態を購読する。
 * app/_layout.tsx のルートで呼び出すこと。
 */
export function useAuthListener(): void {
  const setAuth = useAuthStore((s: AuthStore) => s.setAuth);
  const setLoading = useAuthStore((s: AuthStore) => s.setLoading);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: import('firebase/auth').User | null) => {
      setAuth(user?.uid ?? null);
      setLoading(false);
    });

    return unsubscribe;
  }, [setAuth, setLoading]);
}

/**
 * 匿名サインイン（初回起動・同意後に呼び出す）
 */
export async function signInAnon(): Promise<void> {
  await signInAnonymously(auth);
}

/**
 * 認証状態セレクタ — 各画面で使用
 *
 * @example
 * const { uid, isAuthenticated, isLoading } = useAuth();
 */
export function useAuth() {
  const uid = useAuthStore((s: AuthStore) => s.uid);
  const isAuthenticated = useAuthStore((s: AuthStore) => s.isAuthenticated);
  const isLoading = useAuthStore((s: AuthStore) => s.isLoading);

  return { uid, isAuthenticated, isLoading };
}
