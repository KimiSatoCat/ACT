/**
 * 認証フック（Google Sign-In 版）
 *
 * 設計:
 *  - Firebase Auth + Google OAuth（expo-auth-session 経由）
 *  - Cloud Functions 不要・無料プランで動作
 *  - 認証状態を useAuthStore に同期
 */

import { useEffect } from 'react';
import { onAuthStateChanged, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/useSessionStore';
import type { AuthStore } from '@/types';

// Expo Go / スタンドアロン共通でセッションを閉じる
WebBrowser.maybeCompleteAuthSession();

// ─── Auth リスナー（RootLayout に一度だけマウント） ─────────────────────────

export function useAuthListener(): void {
  const setAuth = useAuthStore((s: AuthStore) => s.setAuth);
  const setLoading = useAuthStore((s: AuthStore) => s.setLoading);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user: import('firebase/auth').User | null) => {
        setAuth(user?.uid ?? null);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [setAuth, setLoading]);
}

// ─── Google Sign-In フック（認証画面内で使う） ──────────────────────────────

/**
 * Google OAuth フローを管理するフック。
 * app/(auth)/index.tsx 内で呼び出し、promptAsync() でサインイン開始。
 */
export function useGoogleSignIn() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    // Firebase Console → Authentication → Google → ウェブ クライアント ID
    clientId: process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'] ?? '',
    androidClientId: process.env['EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'],
    iosClientId: process.env['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params['id_token'];
      if (idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        signInWithCredential(auth, credential).catch((err) => {
          console.error('[Google SignIn] credential error:', err);
        });
      }
    }
  }, [response]);

  return {
    promptAsync,
    loading: !request,
  };
}

// ─── 認証状態セレクタ ────────────────────────────────────────────────────────

export function useAuth() {
  const uid = useAuthStore((s: AuthStore) => s.uid);
  const isAuthenticated = useAuthStore((s: AuthStore) => s.isAuthenticated);
  const isLoading = useAuthStore((s: AuthStore) => s.isLoading);

  return { uid, isAuthenticated, isLoading };
}
