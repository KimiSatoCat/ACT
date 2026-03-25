/**
 * work ルートグループレイアウト
 *
 * 3つのワーク画面（shelf / label / river）を束ねるレイアウト。
 * 各ワーク画面は右スライドで遷移し、ヘッダーは各画面が独自に実装する。
 */

import { Stack } from 'expo-router';

export default function WorkLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#FAFAF7' },
      }}
    >
      <Stack.Screen name="shelf" />
      <Stack.Screen name="label" />
      <Stack.Screen name="river" />
    </Stack>
  );
}
