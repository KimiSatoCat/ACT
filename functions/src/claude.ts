/**
 * Anthropic Claude API クライアント
 *
 * - ダイアログ: claude-haiku-4-5 (高速・低コスト)
 * - レポート生成: claude-sonnet-4-6 (高品質)
 * - API キーは Secret Manager 経由で取得
 */

import Anthropic from '@anthropic-ai/sdk';

// ─── クライアントシングルトン ────────────────────────────────────────────────

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// ─── 共通呼び出し ────────────────────────────────────────────────────────────

export async function callClaude(
  model: 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-6',
  systemPrompt: string,
  userMessage: string,
  maxTokens = 512,
): Promise<string> {
  const client = getClient();
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const block = response.content[0];
  if (!block || block.type !== 'text') {
    throw new Error('Unexpected Claude response type');
  }
  return block.text;
}
