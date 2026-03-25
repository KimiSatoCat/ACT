/**
 * レポート自動生成トリガーフック
 *
 * 設計原則（Q10 確定事項）:
 *  - 14日間のデータが蓄積した初回のみ週次レポートを自動生成
 *  - 14日間という基準はユーザーに「目標」として見せない（内部判定のみ）
 *  - 生成済みレポートは AsyncStorage + Firestore に永続化
 *  - レポートはホーム画面の「振り返り」セクションで受動的に参照可能
 *  - 月次レポート: 28日以上のデータが揃った時点で自動生成
 *  - AI 呼び出しは Cloud Functions 経由（Claude Sonnet for reports）
 */

import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/store/useSessionStore';
import { generateWeeklyReport, generateMonthlyReport } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type {
  Session,
  SessionStore,
  WeeklyReportInput,
  MonthlyReportInput,
  EmotionLabel,
  ThoughtCategory,
} from '@/types';

// ─── 定数 ────────────────────────────────────────────────────────────────────

/** 週次レポートの最初のトリガー閾値（日数） */
const WEEKLY_TRIGGER_DAYS = 14;

/** 月次レポートに必要な日数 */
const MONTHLY_TRIGGER_DAYS = 28;

// ─── ユーティリティ ─────────────────────────────────────────────────────────

/** 現在日と対象日の差分（日数） */
function daysSince(from: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - from.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/** セッション配列から最古の completedAt を取得 */
function getOldestDate(sessions: Session[]): Date | null {
  const completed = sessions.filter((s: Session) => s.completedAt !== null);
  if (completed.length === 0) return null;
  let oldest: Date | null = null;
  for (const s of completed) {
    if (s.completedAt !== null && (oldest === null || s.completedAt < oldest)) {
      oldest = s.completedAt;
    }
  }
  return oldest;
}

/** セッション配列から WeeklyReportInput を構築 */
function buildWeeklyInput(sessions: Session[]): WeeklyReportInput {
  // ワーク頻度集計
  const work_frequency = {
    shelf: 0 as number,
    label: 0 as number,
    river: 0 as number,
  };
  for (const s of sessions) {
    if (s.status === 'completed') {
      work_frequency[s.workType] = (work_frequency[s.workType]) + 1;
    }
  }

  // 感情ラベル集計
  const emotionMap = new Map<EmotionLabel, number>();
  for (const s of sessions) {
    if (s.emotionLabel !== null) {
      emotionMap.set(s.emotionLabel, (emotionMap.get(s.emotionLabel) ?? 0) + 1);
    }
  }
  const emotion_labels = Array.from(emotionMap.entries()).map(
    ([label, count]) => ({ label, count }),
  );

  // 思考カテゴリ収集（重複除去）
  const categorySet = new Set<ThoughtCategory>();
  for (const s of sessions) {
    if (s.thoughtCategory !== null) categorySet.add(s.thoughtCategory);
  }
  const thought_categories = Array.from(categorySet);

  // 回避シグナル集計
  let denial_responses = 0;
  let erase_responses = 0;
  for (const s of sessions) {
    if (s.avoidanceSignal === 'denial') denial_responses++;
    if (s.avoidanceSignal === 'erase') erase_responses++;
  }

  // 放棄セッション数
  const dropout_sessions = sessions.filter(
    (s: Session) => s.status === 'abandoned',
  ).length;

  return {
    period_days: 7,
    session_count: sessions.filter((s: Session) => s.status === 'completed').length,
    work_frequency,
    emotion_labels,
    thought_categories,
    dropout_sessions,
    avoidance_signals: { denial_responses, erase_responses },
  };
}

// ─── フック ────────────────────────────────────────────────────────────────

/**
 * アプリ起動時にレポート生成条件を評価し、必要に応じて生成する。
 * app/_layout.tsx にマウントして使用する。
 */
export function useReportTrigger(): void {
  const { isAuthenticated } = useAuth();
  const sessions = useSessionStore((s: SessionStore) => s.sessions);
  const weeklyTriggered = useRef(false);
  const monthlyTriggered = useRef(false);

  // ── 週次レポートトリガー（14日目以降に1回） ────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || weeklyTriggered.current) return;
    if (sessions.length === 0) return;

    const oldestDate = getOldestDate(sessions);
    if (!oldestDate) return;

    if (daysSince(oldestDate) < WEEKLY_TRIGGER_DAYS) return;

    weeklyTriggered.current = true;

    // 直近7日のセッションを対象に集計
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const recentSessions = sessions.filter(
      (s: Session) => s.completedAt !== null && s.completedAt >= cutoff,
    );

    const input = buildWeeklyInput(recentSessions);

    generateWeeklyReport(input)
      .then((report) => {
        console.info('[ReportTrigger] Weekly report generated:', report.id);
        // TODO: Zustand レポートストアへの保存（次フェーズで実装）
      })
      .catch((err: unknown) => {
        console.warn('[ReportTrigger] Weekly report failed:', err);
        weeklyTriggered.current = false; // 失敗時は次回再試行
      });
  }, [isAuthenticated, sessions]);

  // ── 月次レポートトリガー（28日目以降に1回） ───────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || monthlyTriggered.current) return;
    if (sessions.length === 0) return;

    const oldestDate = getOldestDate(sessions);
    if (!oldestDate) return;

    const elapsed = daysSince(oldestDate);
    if (elapsed < MONTHLY_TRIGGER_DAYS) return;

    monthlyTriggered.current = true;

    // 直近28〜31日のセッションを対象に集計
    const periodDays: 28 | 29 | 30 | 31 =
      elapsed >= 31 ? 31 : elapsed >= 30 ? 30 : elapsed >= 29 ? 29 : 28;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);
    const monthlySessions = sessions.filter(
      (s: Session) => s.completedAt !== null && s.completedAt >= cutoff,
    );

    const weeklyBase = buildWeeklyInput(monthlySessions);
    const monthlyInput: MonthlyReportInput = {
      ...weeklyBase,
      period_days: periodDays,
      completed_days: new Set(
        monthlySessions
          .filter((s: Session) => s.completedAt !== null)
          .map((s: Session) => s.completedAt!.toDateString()),
      ).size,
    };

    generateMonthlyReport(monthlyInput)
      .then((report) => {
        console.info('[ReportTrigger] Monthly report generated:', report.id);
      })
      .catch((err: unknown) => {
        console.warn('[ReportTrigger] Monthly report failed:', err);
        monthlyTriggered.current = false;
      });
  // sessions.length のみを依存に取る（毎日の起動で日数差分を評価）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, sessions.length]);
}
