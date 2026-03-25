/**
 * ワークローテーション管理フック
 *
 * 設計原則:
 *  - fixed order: shelf → label → river（固定サイクル）
 *  - スキップ時は同一ワーク種別を維持（呼び出し側が advanceWorkType を呼ばない）
 *  - WORK_ORDER と nextWorkType はストアからも import 可能なようにエクスポート
 */

import { useCallback } from 'react';
import type { WorkType, SessionStore } from '@/types';
import { useSessionStore } from '@/store/useSessionStore';

// ─── 定数・ユーティリティ ────────────────────────────────────────────────────

/** 固定ローテーション順序 */
export const WORK_ORDER: readonly WorkType[] = ['shelf', 'label', 'river'] as const;

/**
 * 次のワーク種別を返す（循環）
 * shelf → label → river → shelf → ...
 */
export function nextWorkType(current: WorkType): WorkType {
  const idx = WORK_ORDER.indexOf(current);
  const nextIdx = (idx + 1) % WORK_ORDER.length;
  // WORK_ORDER は長さ3の固定配列。modulo により nextIdx は必ず 0-2 の範囲
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return WORK_ORDER[nextIdx]!;
}

// ─── フック ────────────────────────────────────────────────────────────────

export interface UseWorkRotationReturn {
  /** 今日のワーク種別 */
  todayWorkType: WorkType;
  /** ワーク完了後に次へ進める */
  advance: () => void;
  /** 完全ローテーション済みか（全3種完了）*/
  isRotationComplete: (completedToday: WorkType[]) => boolean;
}

/**
 * 今日のワーク種別と進行管理を提供するカスタムフック。
 *
 * @example
 * const { todayWorkType, advance } = useWorkRotation();
 * // todayWorkType === 'shelf'
 * advance(); // → 'label'
 */
export function useWorkRotation(): UseWorkRotationReturn {
  const todayWorkType = useSessionStore((s: SessionStore) => s.todayWorkType);
  const advanceWorkType = useSessionStore((s: SessionStore) => s.advanceWorkType);

  const advance = useCallback(() => {
    advanceWorkType();
  }, [advanceWorkType]);

  const isRotationComplete = useCallback(
    (completedToday: WorkType[]): boolean => {
      return WORK_ORDER.every((wt) => completedToday.includes(wt));
    },
    [],
  );

  return { todayWorkType, advance, isRotationComplete };
}
