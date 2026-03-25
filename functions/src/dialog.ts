/**
 * ACT ダイアログ Cloud Functions
 *
 * 3ターン構成:
 *  Turn 1 — 共感 + 認知的距離化の問いかけ（脱フュージョン）
 *  Turn 2 — 3択への反応 + 体験の受容を促す
 *  Turn 3 — クロージング + 次のワークへの橋渡し
 *
 * プライバシー: 生テキストは受け取らない。カテゴリ・感情ラベルのみ。
 */

import { callClaude } from './claude';
import type {
  DialogTurn1Request,
  DialogTurn2Request,
  DialogTurn3Request,
  DialogResponse,
} from './types';

// ─── ACT システムプロンプト ──────────────────────────────────────────────────

const ACT_SYSTEM = `
あなたは認知行動療法（特にACT: Acceptance and Commitment Therapy）に基づいた
心理的フレキシビリティ訓練アプリのAIコンパニオンです。

原則:
- 判断・評価をしない（Non-judgmental）
- 感情や思考を「良い/悪い」で分類しない
- 脱フュージョン（defusion）を促す：思考は「現実」ではなく「思考」である
- アクセプタンス：感情を排除しようとせず、あるがままに気づく
- 現在の瞬間への気づきを促す
- 温かく、穏やかで、押しつけがましくない口調

制約:
- 100文字以内で答えること
- 医療的診断・治療を行わない
- 危機的状況（自傷・自殺念慮）は専門家への相談を促す
- 日本語で返答する
`.trim();

// ─── 思考カテゴリと感情ラベルの日本語ラベル ─────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  self_criticism: '自己批判',
  future_worry: '未来への不安',
  comparison: '他者との比較',
  rumination: '過去の後悔',
  helplessness: '無力感',
  rejection: '拒絶への恐れ',
};

// ─── Turn 1: 共感 + 認知的距離化 ────────────────────────────────────────────

export async function handleDialogTurn1(
  req: DialogTurn1Request,
): Promise<DialogResponse> {
  const categoryLabel = CATEGORY_LABELS[req.thoughtCategory] ?? req.thoughtCategory;
  const avoidanceNote = req.avoidanceSignal === 'denial'
    ? '（ユーザーは今の気持ちを認めたくない様子です）'
    : req.avoidanceSignal === 'erase'
    ? '（ユーザーはこの気持ちを消し去りたいと感じています）'
    : '';

  const userMessage = `
ユーザーの状態:
- 思考パターン: ${categoryLabel}
- 感情: ${req.emotionLabel}
${avoidanceNote}

上記の状態のユーザーに、ACTの脱フュージョン技法に基づいた
共感的で短い問いかけを1文で返してください。
思考や感情に気づくことを促してください。
  `.trim();

  const message = await callClaude('claude-haiku-4-5-20251001', ACT_SYSTEM, userMessage, 150);
  const sessionId = `dialog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return { message, sessionId };
}

// ─── Turn 2: 3択への応答 ────────────────────────────────────────────────────

export async function handleDialogTurn2(
  req: DialogTurn2Request,
): Promise<DialogResponse> {
  const categoryLabel = CATEGORY_LABELS[req.thoughtCategory] ?? req.thoughtCategory;

  const userMessage = `
ユーザーの状態:
- 思考パターン: ${categoryLabel}
- 感情: ${req.emotionLabel}
- 前のAIメッセージ: ${req.turn1Response}
- ユーザーが選んだ選択肢: ${req.userChoice}

ユーザーの選択を受け止め、その体験を受容（アクセプタンス）へ導く
短いメッセージを1〜2文で返してください。
次のステップへの小さな問いかけも含めてください。
  `.trim();

  const message = await callClaude('claude-haiku-4-5-20251001', ACT_SYSTEM, userMessage, 150);

  return { message, sessionId: req.turn1Response.slice(0, 6) };
}

// ─── Turn 3: クロージング ────────────────────────────────────────────────────

export async function handleDialogTurn3(
  req: DialogTurn3Request,
): Promise<DialogResponse> {
  const categoryLabel = CATEGORY_LABELS[req.thoughtCategory] ?? req.thoughtCategory;

  const userMessage = `
ユーザーの状態:
- 思考パターン: ${categoryLabel}
- 感情: ${req.emotionLabel}
- これまでの対話の流れ:
  Turn1 AI: ${req.turn1Response}
  ユーザー選択: ${req.userChoice}
  Turn2 AI: ${req.turn2Response}

この対話のクロージングとして、ユーザーの気づきを承認し、
現在の瞬間への意識と自分の価値観に沿った行動への
小さな励ましのメッセージを1〜2文で返してください。
  `.trim();

  const message = await callClaude('claude-haiku-4-5-20251001', ACT_SYSTEM, userMessage, 150);

  return { message, sessionId: `turn3_${Date.now()}` };
}
