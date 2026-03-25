/**
 * ACT レポート生成 Cloud Functions
 *
 * - 週次レポート: 直近7日のセッションデータを Claude Sonnet で分析
 * - 月次レポート: 直近28〜31日の集計データを分析
 * - 生テキストは送信しない（集計データのみ）
 */

import * as admin from 'firebase-admin';
import { callClaude } from './claude';
import type {
  WeeklyReportInput,
  MonthlyReportInput,
  Report,
} from './types';

// ─── レポート生成プロンプト ──────────────────────────────────────────────────

const REPORT_SYSTEM = `
あなたはACT（Acceptance and Commitment Therapy）に基づいた
心理的フレキシビリティ訓練アプリの振り返りレポートを書く専門家です。

レポートの方針:
- ユーザーの努力と継続を承認する
- 数値をそのまま読み上げるのではなく、パターンとして解釈する
- 判断・評価をしない（Non-judgmental）
- 心理的な成長の可能性を穏やかに示す
- 専門用語（ACT、脱フュージョン等）は使わず日常語で表現する
- 500文字以内で簡潔にまとめる
- マークダウン記法は使わない
- 日本語で書く
`.trim();

// ─── ユーティリティ ──────────────────────────────────────────────────────────

function generateReportId(): string {
  return `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── 週次レポート ────────────────────────────────────────────────────────────

export async function generateWeeklyReport(
  uid: string,
  input: WeeklyReportInput,
): Promise<Report> {
  const topEmotions = input.emotion_labels
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((e) => `${e.label}(${e.count}回)`)
    .join('、');

  const workSummary = [
    `棚に置く: ${input.work_frequency.shelf}回`,
    `ラベル貼り: ${input.work_frequency.label}回`,
    `川の流れ: ${input.work_frequency.river}回`,
  ].join('、');

  const userMessage = `
【7日間の練習データ】
- 完了セッション数: ${input.session_count}回
- ワーク内訳: ${workSummary}
- よく出てきた気持ち: ${topEmotions || 'データなし'}
- 思考のパターン: ${input.thought_categories.join('、') || 'なし'}
- 途中でやめたセッション: ${input.dropout_sessions}回
- 「認めたくない」反応: ${input.avoidance_signals.denial_responses}回
- 「消し去りたい」反応: ${input.avoidance_signals.erase_responses}回

上記データをもとに、ユーザーへの温かい振り返りメッセージを書いてください。
  `.trim();

  const content = await callClaude(
    'claude-sonnet-4-6',
    REPORT_SYSTEM,
    userMessage,
    600,
  );

  const report: Report = {
    id: generateReportId(),
    type: 'weekly',
    content,
    createdAt: new Date().toISOString(),
    periodDays: 7,
  };

  // Firestore に保存
  await admin
    .firestore()
    .collection('users')
    .doc(uid)
    .collection('reports')
    .doc(report.id)
    .set(report);

  return report;
}

// ─── 月次レポート ────────────────────────────────────────────────────────────

export async function generateMonthlyReport(
  uid: string,
  input: MonthlyReportInput,
): Promise<Report> {
  const topEmotions = input.emotion_labels
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((e) => `${e.label}(${e.count}回)`)
    .join('、');

  const workSummary = [
    `棚に置く: ${input.work_frequency.shelf}回`,
    `ラベル貼り: ${input.work_frequency.label}回`,
    `川の流れ: ${input.work_frequency.river}回`,
  ].join('、');

  const userMessage = `
【${input.period_days}日間の練習データ】
- 練習した日数: ${input.completed_days}日
- 完了セッション数: ${input.session_count}回
- ワーク内訳: ${workSummary}
- よく出てきた気持ち: ${topEmotions || 'データなし'}
- 思考のパターン: ${input.thought_categories.join('、') || 'なし'}
- 途中でやめたセッション: ${input.dropout_sessions}回
- 「認めたくない」反応: ${input.avoidance_signals.denial_responses}回
- 「消し去りたい」反応: ${input.avoidance_signals.erase_responses}回

上記データをもとに、約1ヶ月間の振り返りレポートを書いてください。
変化のパターンや今後へのさりげない示唆も含めてください。
  `.trim();

  const content = await callClaude(
    'claude-sonnet-4-6',
    REPORT_SYSTEM,
    userMessage,
    800,
  );

  const report: Report = {
    id: generateReportId(),
    type: 'monthly',
    content,
    createdAt: new Date().toISOString(),
    periodDays: input.period_days,
  };

  // Firestore に保存
  await admin
    .firestore()
    .collection('users')
    .doc(uid)
    .collection('reports')
    .doc(report.id)
    .set(report);

  return report;
}
