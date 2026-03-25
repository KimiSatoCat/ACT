/**
 * Firestore バックグラウンド同期フック（クライアント直接書き込み版）
 *
 * 設計:
 *  - Cloud Functions を使わず Firestore SDK で直接書き込む
 *  - セキュリティルールで UID ベースのアクセス制御
 *  - AppState 変化（フォアグラウンド復帰）で自動再試行
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useSessionStore } from '@/store/useSessionStore';
import { useAuth } from '@/hooks/useAuth';
import type { Session, SessionStore } from '@/types';

// ─── フック ────────────────────────────────────────────────────────────────

export function useFirestoreSync(): void {
  const { isAuthenticated } = useAuth();
  const sessions = useSessionStore((s: SessionStore) => s.sessions);

  const isSyncing = useRef(false);

  const syncPending = useCallback(async () => {
    if (!isAuthenticated || isSyncing.current) return;

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsynced = sessions.filter(
      (s: Session) => !s.synced && s.completedAt !== null,
    );
    if (unsynced.length === 0) return;

    isSyncing.current = true;
    try {
      // Firestore に直接バッチ書き込み
      await Promise.all(
        unsynced.map(async (session: Session) => {
          if (!session.completedAt) return;
          const ref = doc(db, 'users', uid, 'sessions', session.id);
          await setDoc(
            ref,
            {
              id: session.id,
              workType: session.workType,
              completedAt: session.completedAt,
              durationSec: session.durationSec,
              uid,
              syncedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }),
      );

      // 同期済みフラグを更新
      const syncedIds = new Set(unsynced.map((s: Session) => s.id));
      const updated = sessions.map((s: Session) =>
        syncedIds.has(s.id) ? { ...s, synced: true as const } : s,
      );
      useSessionStore.setState({ sessions: updated });
    } catch (err) {
      console.warn('[FirestoreSync] 同期失敗、次回フォアグラウンド時に再試行:', err);
    } finally {
      isSyncing.current = false;
    }
  }, [isAuthenticated, sessions]);

  useEffect(() => { void syncPending(); }, [syncPending]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') void syncPending();
    });
    return () => sub.remove();
  }, [syncPending]);

  useEffect(() => {
    if (isAuthenticated) void syncPending();
  }, [isAuthenticated, syncPending]);
}
