/**
 * OTA クライシスパターン更新モジュール
 *
 * 設計:
 *  - Expo OTA (expo-updates) でバンドルを更新することで
 *    crisis-patterns.json を App Store / Google Play 審査なしに更新できる
 *  - 更新後は Aho-Corasick オートマトンをリセット（resetAutomaton() 呼び出し）
 *  - バージョン比較: crisis-patterns.json の "version" フィールドで管理
 *  - ネットワークエラー時はサイレント失敗（既存パターンを継続使用）
 *
 * OTA 更新フロー:
 *  1. checkForUpdateAsync() で新バンドルがあるか確認
 *  2. あれば fetchUpdateAsync() でダウンロード
 *  3. reloadAsync() でアプリを再起動（次回起動時に新パターンが適用される）
 *
 * 注意:
 *  - Expo Go（開発中）では OTA 更新は動作しない
 *  - EAS Build でビルドした本番バイナリでのみ有効
 */

import * as Updates from 'expo-updates';
import { resetAutomaton } from '@/lib/crisisDetector';
import currentPatterns from '@/constants/crisis-patterns.json';

// ─── 型定義 ─────────────────────────────────────────────────────────────────

export interface OtaUpdateResult {
  checked: boolean;
  updateAvailable: boolean;
  /** 新しいバンドルをダウンロードして再起動準備完了 */
  readyToReload: boolean;
  error?: string;
}

// ─── 現在のパターンバージョン ────────────────────────────────────────────────

export function getCurrentPatternVersion(): string {
  return String(currentPatterns.version);
}

// ─── OTA 更新チェック + 取得 ─────────────────────────────────────────────────

/**
 * OTA 更新を確認し、新バンドルがあればダウンロードする。
 *
 * - Expo Go 実行中（__DEV__）はスキップ
 * - エラー時はサイレント失敗して既存パターンを継続
 *
 * @returns OtaUpdateResult — 結果サマリー
 */
export async function checkAndFetchUpdate(): Promise<OtaUpdateResult> {
  // 開発環境では OTA は動作しない
  if (__DEV__) {
    return { checked: false, updateAvailable: false, readyToReload: false };
  }

  try {
    const update = await Updates.checkForUpdateAsync();

    if (!update.isAvailable) {
      return { checked: true, updateAvailable: false, readyToReload: false };
    }

    // 新バンドルをダウンロード
    await Updates.fetchUpdateAsync();

    // Aho-Corasick オートマトンをリセット（次回起動時に新パターンが再構築される）
    resetAutomaton();

    return { checked: true, updateAvailable: true, readyToReload: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[OtaUpdater] Update check failed (non-critical):', message);
    return {
      checked: true,
      updateAvailable: false,
      readyToReload: false,
      error: message,
    };
  }
}

/**
 * OTA 更新を適用してアプリを再起動する。
 * readyToReload === true のときのみ呼び出すこと。
 *
 * @throws 再起動に失敗した場合（通常は発生しない）
 */
export async function applyUpdate(): Promise<void> {
  if (__DEV__) return;
  await Updates.reloadAsync();
}
