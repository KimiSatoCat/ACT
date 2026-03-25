/**
 * Expo Router ルートレイアウト
 *
 * 責務:
 *  - Firebase Auth リスナーの起動
 *  - 認証状態に応じたルーティング制御
 *  - QueryClient プロバイダーのセットアップ
 *  - グローバルフォント・カラースキームの適用
 */

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useAuthListener, useAuth } from '@/hooks/useAuth';
import { useFirestoreSync } from '@/hooks/useFirestoreSync';
import { useReportTrigger } from '@/hooks/useReportTrigger';
import { useOtaUpdate } from '@/hooks/useOtaUpdate';

// ─── QueryClient シングルトン ───────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 分
      retry: 2,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

// ─── ルーティングガード ─────────────────────────────────────────────────────

function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // 未認証 → 同意・ログイン画面へ
      router.replace('/(auth)');
    } else if (isAuthenticated && inAuthGroup) {
      // 認証済み → ホームへ
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  return null;
}

// ─── ルートレイアウト ───────────────────────────────────────────────────────

export default function RootLayout() {
  // Firebase Auth リスナー起動（アプリ全体で一度だけ）
  useAuthListener();
  // 未同期セッションのバックグラウンド Firestore 同期
  useFirestoreSync();
  // 14日目以降のレポート自動生成トリガー
  useReportTrigger();
  // OTA クライシスパターン更新チェック（起動時1回）
  useOtaUpdate();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#FAFAF7' },
        }}
      >
        {/* 認証グループ */}
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />

        {/* メイン画面 */}
        <Stack.Screen name="index" />
        <Stack.Screen name="ball" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="crisis"
          options={{
            animation: 'fade',
            // クライシス画面はバックスワイプを無効化
            gestureEnabled: false,
          }}
        />

        {/* ワーク画面 */}
        <Stack.Screen name="work/shelf" />
        <Stack.Screen name="work/label" />
        <Stack.Screen name="work/river" />
      </Stack>
    </QueryClientProvider>
  );
}
