/**
 * (auth) ルートグループレイアウト
 *
 * Expo Router v3 の仕様: グループ内のルートには必ず _layout.tsx が必要。
 * 認証画面はシンプルな 1画面構成なのでヘッダー非表示の Stack を使用。
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
