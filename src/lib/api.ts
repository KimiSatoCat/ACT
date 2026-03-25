/**
 * ACT ダイアログ API（クライアントサイド直接呼び出し）
 *
 * 設計:
 *  - Cloud Functions を使わず Anthropic API を直接呼ぶ
 *  - 生テキストは送信しない（カテゴリ・感情ラベルのみ使用）
 *  - ダイアログは 3 ターン構成
 */

import { callClaude, ACT_DIALOG_SYSTEM } from '@/lib/claudeClient';
import type { DialogSession, Report, WeeklyReportInput, MonthlyReportInput } from '@/types';

// ─── 思考カテゴリ 日本語ラベル ───────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  self_criticism: '自己批判',
  future_worry: '未来への不安',
  comparison: '他者との比較',
  rumination: '過去の後悔',
  helplessness: '無力感',
  rejection: '拒絶への恐れ',
};

// ─── ダイアログリクエスト型 ──────────────────────────────────────────────────

export interface DialogTurn1Request {
  thoughtCategory: string;
  emotionLabel: string;
  avoidanceSignal: string | null;
}

export interface DialogTurn2Request extends DialogTurn1Request {
  turn1Response: string;
  userChoice: string;
}

export interface DialogTurn3Request extends DialogTurn2Request {
  turn2Response: string;
}

export interface DialogResponse {
  message: string;
  sessionId: string;
}

// ─── Turn 1: 共感 + 認知的距離化 ────────────────────────────────────────────

export async function callDialogTurn1(
  req: DialogTurn1Request,
): Promise<DialogResponse> {
  const categoryLabel = CATEGORY_LABELS[req.thoughtCategory] ?? req.thoughtCategory;
  const avoidanceNote =
    req.avoidanceSignal === 'denial'
      ? '（ユーザーは今の気持ちを認めたくない様子です）'
      : req.avoidanceSignal === 'erase'
        ? '（ユーザーはこの気持ちを消し去りたいと感じています）'
        : '';

  const userMessage = `
ユーザーの状態:
- 思考パターン: ${categoryLabel}
- 感情: ${req.emotionLabel}
${avoidanceNote}

ACTの脱フュージョン技法に基づいた共感的な問いかけを1文で。
  `.trim();

  const message = await callClaude(
    'claude-haiku-4-5-20251001',
    ACT_DIALOG_SYSTEM,
    userMessage,
    150,
  );
  const sessionId = `dialog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return { message, sessionId };
}

// ─── Turn 2: 3択への応答 ────────────────────────────────────────────────────

export async function callDialogTurn2(
  req: DialogTurn2Request,
): Promise<DialogResponse> {
  const categoryLabel = CATEGORY_LABELS[req.thoughtCategory] ?? req.thoughtCategory;

  const userMessage = `
思考パターン: ${categoryLabel} / 感情: ${req.emotionLabel}
前のAI: ${req.turn1Response}
ユーザーの選択: ${req.userChoice}

その体験をアクセプタンスへ導く短いメッセージを1〜2文で。
  `.trim();

  const message = await callClaude(
    'claude-haiku-4-5-20251001',
    ACT_DIALOG_SYSTEM,
    userMessage,
    150,
  );
  return { message, sessionId: `turn2_${Date.now()}` };
}

// ─── Turn 3: クロージング ────────────────────────────────────────────────────

export async function callDialogTurn3(
  req: DialogTurn3Request,
): Promise<DialogResponse> {
  const categoryLabel = CATEGORY_LABELS[req.thoughtCategory] ?? req.thoughtCategory;

  const userMessage = `
思考パターン: ${categoryLabel} / 感情: ${req.emotionLabel}
Turn1 AI: ${req.turn1Response} / 選択: ${req.userChoice}
Turn2 AI: ${req.turn2Response}

クロージング: 気づきを承認し、小さな励ましのメッセージを1〜2文で。
  `.trim();

  const message = await callClaude(
    'claude-haiku-4-5-20251001',
    ACT_DIALOG_SYSTEM,
    userMessage,
    150,
  );
  return { message, sessionId: `turn3_${Date.now()}` };
}

// ─── レポート生成 ────────────────────────────────────────────────────────────

export async function generateWeeklyReport(
  input: WeeklyReportInput,
): Promise<Report> {
  const { callClaude: _call, ACT_REPORT_SYSTEM } = await import('@/lib/claudeClient');

  const topEmotions = input.emotion_labels
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((e) => `${e.label}(${e.count}回)`)
    .join('、');

  const userMessage = `
【7日間の練習データ】
完了: ${input.session_count}回 / 棚: ${input.work_frequency.shelf} / ラベル: ${input.work_frequency.label} / 川: ${input.work_frequency.river}
よく出た感情: ${topEmotions || 'なし'}
思考パターン: ${input.thought_categories.join('、') || 'なし'}
途中でやめた: ${input.dropout_sessions}回
「認めたくない」: ${input.avoidance_signals.denial_responses}回 / 「消したい」: ${input.avoidance_signals.erase_responses}回
`.trim();

  const content = await _call('claude-sonnet-4-6', ACT_REPORT_SYSTEM, userMessage, 600);

  return {
    id: `report_${Date.now()}`,
    type: 'weekly',
    content,
    createdAt: new Date().toISOString(),
    periodDays: 7,
  };
}

export async function generateMonthlyReport(
  input: MonthlyReportInput,
): Promise<Report> {
  const { callClaude: _call, ACT_REPORT_SYSTEM } = await import('@/lib/claudeClient');

  const topEmotions = input.emotion_labels
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((e) => `${e.label}(${e.count}回)`)
    .join('、');

  const userMessage = `
【${input.period_days}日間の練習データ】
練習日数: ${input.completed_days}日 / 完了: ${input.session_count}回
棚: ${input.work_frequency.shelf} / ラベル: ${input.work_frequency.label} / 川: ${input.work_frequency.river}
よく出た感情: ${topEmotions || 'なし'}
思考パターン: ${input.thought_categories.join('、') || 'なし'}
途中でやめた: ${input.dropout_sessions}回
`.trim();

  const content = await _call('claude-sonnet-4-6', ACT_REPORT_SYSTEM, userMessage, 800);

  return {
    id: `report_${Date.now()}`,
    type: 'monthly',
    content,
    createdAt: new Date().toISOString(),
    periodDays: input.period_days,
  };
}

// ─── 型エクスポート ──────────────────────────────────────────────────────────

export type { DialogSession, Report };
