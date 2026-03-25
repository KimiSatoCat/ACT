/**
 * Firestore バックグラウンド同期フック
 *
 * 設計原則:
 *  - 未同期セッション（synced: false）をネットワーク復帰時に一括送信
 *  - プライバシー: raw テキストは送らず workType / category / emotion / duration のみ
 *  - べき等性: 同期済みフラグを Zustand ストアに書き戻す
 *  - 失敗時はサイレントリトライ（ユーザーに影響させない）
 *  - AppState 変化を監視（バックグラウンド→フォアグラウンドで再試行）
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useSessionStore } from '@/store/useSessionStore';
import { syncSessions } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { Session, SessionStore } from '@/types';

// ─── 同期対象セッションの変換 ─────────────────────────────────────────────

function toSyncPayload(
  session: Session,
): { id: string; workType: string; completedAt: string; durationSec: number } | null {
  if (!session.completedAt) return null;
  return {
    id: session.id,
    workType: session.workType,
    // completedAt は Date 型なので ISO 文字列に変換して送信
    completedAt: session.completedAt.toISOString(),
    durationSec: session.durationSec,
  };
}

// ─── フック ────────────────────────────────────────────────────────────────

/**
 * アプリ起動時・フォアグラウンド復帰時に未同期セッションを Firestore へ送信する。
 * app/_layout.tsx にマウントして使用すること。
 */
export function useFirestoreSync(): void {
  const { isAuthenticated } = useAuth();
  const sessions = useSessionStore((s: SessionStore) => s.sessions);
  const loadSessions = useSessionStore((s: SessionStore) => s.loadSessions);

  const isSyncing = useRef(false);

  const syncPending = useCallback(async () => {
    if (!isAuthenticated || isSyncing.current) return;

    const unsynced = sessions.filter((s: Session) => !s.synced && s.completedAt !== null);
    if (unsynced.length === 0) return;

    isSyncing.current = true;
    try {
      type Payload = { id: string; workType: string; completedAt: string; durationSec: number };
      const rawPayloads: (Payload | null)[] = (unsynced as Session[]).map(toSyncPayload);
      const payloads: Payload[] = rawPayloads.filter(
        (p: Payload | null): p is Payload => p !== null,
      );

      if (payloads.length === 0) return;

      const result = await syncSessions(payloads);

      if (result.synced > 0) {
        // 同期済みフラグを立てる（ストアを更新してから AsyncStorage に永続化）
        const syncedIds = new Set(payloads.map((p: { id: string }) => p.id));
        const updated = sessions.map((s: Session) =>
          syncedIds.has(s.id) ? { ...s, synced: true as const } : s,
        );
        // ストアの sessions を直接更新
        useSessionStore.setState({ sessions: updated });
      }
    } catch (err) {
      // ネットワークエラーは無視（次回フォアグラウンド時に再試行）
      console.warn('[FirestoreSync] sync failed, will retry:', err);
    } finally {
      isSyncing.current = false;
    }
  }, [isAuthenticated, sessions]);

  // 初回マウント時に同期
  useEffect(() => {
    void syncPending();
  }, [syncPending]);

  // フォアグラウンド復帰時に同期
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          void syncPending();
        }
      },
    );
    return () => subscription.remove();
  }, [syncPending]);

  // 認証直後にも同期（ログイン後に未同期セッションを送る）
  useEffect(() => {
    if (isAuthenticated) {
      void syncPending();
    }
  }, [isAuthenticated, syncPending]);
}
