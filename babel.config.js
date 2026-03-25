/**
 * Babel 設定
 *
 * Expo SDK 52 標準設定。
 * - babel-preset-expo: JSX transform + React Native polyfill
 * - react-native-reanimated/plugin: Reanimated 3 の worklet 変換（必ず最後に指定）
 */

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated 3 plugin は必ずプラグインリストの最後に置く
      'react-native-reanimated/plugin',
    ],
  };
};
