/**
 * Zustand セッションストア
 *
 * 責務:
 *  - 進行中セッションの状態管理
 *  - 今日のワーク種別（ローテーション）の管理
 *  - 完了セッション履歴の保持
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StoreApi } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, SessionStore, WorkType } from '@/types';
import { WORK_ORDER, nextWorkType } from '@/hooks/useWorkRotation';

// ─── ストア ────────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionStore>()(
  persist(
    (set: StoreApi<SessionStore>['setState'], get: StoreApi<SessionStore>['getState']) => ({
      currentSession: null,
      // WORK_ORDER[0] は noUncheckedIndexedAccess で WorkType | undefined になるため
      // フォールバックを明示指定（固定配列なので実際には必ず 'shelf'）
      todayWorkType: WORK_ORDER[0] ?? 'shelf',
      sessions: [],

      /** セッション開始 — クライシス検出後に呼ばれないこと */
      startSession: (workType: WorkType) => {
        const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        set({
          currentSession: {
            id,
            workType,
            status: 'completed',
            completedAt: null,
            durationSec: 0,
            thoughtCategory: null,
            emotionLabel: null,
            avoidanceSignal: null,
            synced: false,
          },
        });
      },

      /** セッション完了 */
      completeSession: (data: Partial<Session>) => {
        const { currentSession, sessions } = get();
        if (!currentSession?.id) return;

        const completed: Session = {
          id: currentSession.id ?? '',
          workType: currentSession.workType ?? 'shelf',
          status: 'completed',
          completedAt: new Date(),
          durationSec: data.durationSec ?? 0,
          thoughtCategory: data.thoughtCategory ?? null,
          emotionLabel: data.emotionLabel ?? null,
          avoidanceSignal: data.avoidanceSignal ?? null,
          synced: false,
        };

        set({
          sessions: [...sessions, completed],
          currentSession: null,
        });
      },

      /** セッション放棄（途中離脱） — データ保存なし */
      abandonSession: () => {
        set({ currentSession: null });
      },

      /** ワーク種別を次に進める（スキップ時も同じ種別を維持するロジックは呼び出し側で制御） */
      advanceWorkType: () => {
        const { todayWorkType } = get();
        set({ todayWorkType: nextWorkType(todayWorkType) });
      },

      /** Firestore から同期したセッション群をロード */
      loadSessions: (sessions: Session[]) => {
        set({ sessions });
      },
    }),
    {
      name: 'act-session-store',
      storage: createJSONStorage(() => AsyncStorage),
      /** 永続化対象を限定（currentSession は揮発性） */
      partialize: (state: SessionStore) => ({
        todayWorkType: state.todayWorkType,
        sessions: state.sessions,
      }),
    },
  ),
);

// ─── 認証ストア ────────────────────────────────────────────────────────────

import type { AuthStore } from '@/types';

export const useAuthStore = create<AuthStore>()((set: StoreApi<AuthStore>['setState']) => ({
  uid: null,
  isAuthenticated: false,
  isLoading: true,
  setAuth: (uid: string | null) => set({ uid, isAuthenticated: uid !== null }),
  setLoading: (v: boolean) => set({ isLoading: v }),
}));
