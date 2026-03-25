/**
 * Anthropic Claude API クライアント（クライアントサイド直接呼び出し）
 *
 * 設計:
 *  - Cloud Functions を使わず fetch で Anthropic API を直接呼ぶ
 *  - API キーは EXPO_PUBLIC_ANTHROPIC_API_KEY 環境変数で管理
 *  - ダイアログ: claude-haiku-4-5（高速・低コスト）
 *  - レポート: claude-sonnet-4-6（高品質）
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

type ClaudeModel = 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-6';

function getApiKey(): string {
  return process.env['EXPO_PUBLIC_ANTHROPIC_API_KEY'] ?? '';
}

// ─── 共通メッセージ呼び出し ──────────────────────────────────────────────────

export async function callClaude(
  model: ClaudeModel,
  systemPrompt: string,
  userMessage: string,
  maxTokens = 512,
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY が設定されていません');
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API エラー ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    content: Array<{ type: string; text: string }>;
  };

  const block = data.content[0];
  if (!block || block.type !== 'text') {
    throw new Error('予期しない Claude レスポンス形式');
  }
  return block.text;
}

// ─── ACT システムプロンプト ──────────────────────────────────────────────────

export const ACT_DIALOG_SYSTEM = `
あなたはACT（Acceptance and Commitment Therapy）に基づいた
心理的フレキシビリティ訓練アプリのAIコンパニオンです。

原則:
- 判断・評価をしない（Non-judgmental）
- 脱フュージョン（defusion）: 思考は「現実」ではなく「思考」
- アクセプタンス: 感情をあるがままに気づく
- 現在の瞬間への気づきを促す
- 温かく、穏やかで、押しつけがましくない口調

制約:
- 100文字以内で答えること
- 医療的診断・治療を行わない
- 日本語で返答する
`.trim();

export const ACT_REPORT_SYSTEM = `
あなたはACT（Acceptance and Commitment Therapy）に基づいた
心理的フレキシビリティ訓練アプリの振り返りレポートを書く専門家です。

レポートの方針:
- ユーザーの努力と継続を承認する
- パターンとして解釈する（数値の羅列にしない）
- 判断・評価をしない
- 専門用語を使わず日常語で表現する
- 500文字以内で簡潔にまとめる
- 日本語で書く
`.trim();
