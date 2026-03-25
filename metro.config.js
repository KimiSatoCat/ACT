/**
 * Metro バンドラー設定
 *
 * Expo SDK 52 + Expo Router v3 標準設定。
 * withNativeWind 等のカスタマイズが必要な場合はここに追加する。
 */

const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// JSON アセット（crisis-patterns.json 等）を明示的に許可
config.resolver.assetExts.push('json');

// TypeScript パスエイリアス (@/*) は babel-plugin-module-resolver または
// tsconfig paths で解決される（Metro 側の設定変更は不要）

module.exports = config;
