/**
 * OTA 更新フック
 *
 * 責務:
 *  - アプリ起動時（マウント時）にクライシスパターンの OTA 更新を確認
 *  - 更新あり → バックグラウンドでダウンロード → 次のワーク完了後に再起動を提案
 *  - ユーザー体験を妨げない（更新中もアプリは通常通り動作）
 *  - Expo Go / 開発環境では自動スキップ
 *
 * 使用箇所: app/_layout.tsx にマウント
 */

import { useEffect, useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { checkAndFetchUpdate, applyUpdate } from '@/lib/otaUpdater';

export interface UseOtaUpdateReturn {
  /** 更新が利用可能でダウンロード済み */
  readyToApply: boolean;
  /** 手動で更新を適用（再起動） */
  triggerApply: () => Promise<void>;
}

/**
 * OTA 更新を管理するフック。
 * app/_layout.tsx の RootLayout に1回だけ配置すること。
 */
export function useOtaUpdate(): UseOtaUpdateReturn {
  const [readyToApply, setReadyToApply] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const result = await checkAndFetchUpdate();

      if (cancelled) return;

      if (result.readyToReload) {
        setReadyToApply(true);
        // クライシスパターンが更新された旨をユーザーに通知し、再起動を促す
        Alert.alert(
          'アプリを更新しました',
          '安全に関するデータを更新しました。次にアプリを起動したとき、最新の状態が適用されます。',
          [
            { text: '後で', style: 'cancel' },
            {
              text: '今すぐ再起動',
              onPress: () => {
                applyUpdate().catch((err: unknown) => {
                  console.warn('[OtaUpdate] Apply failed:', err);
                });
              },
            },
          ],
        );
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []); // 起動時1回のみ

  const triggerApply = useCallback(async () => {
    await applyUpdate();
  }, []);

  return { readyToApply, triggerApply };
}
