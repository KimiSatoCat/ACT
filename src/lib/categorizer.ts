/**
 * テキストカテゴライザ
 * 生テキスト → ThoughtCategory に変換する。
 * AI には生テキストを渡さず、カテゴリラベルのみを渡す（プライバシー設計）。
 */

import { CATEGORY_KEYWORDS } from '@/constants/categories';
import type { ThoughtCategory } from '@/types';

/**
 * 入力テキストを6カテゴリのいずれかに分類する。
 * 複数カテゴリに一致する場合は最初にマッチしたものを返す。
 * どれにも一致しない場合は 'その他' を返す。
 *
 * @param text — ユーザー入力テキスト（生）
 * @returns ThoughtCategory
 */
export function categorize(text: string): ThoughtCategory {
  const lower = text.toLowerCase();

  const order: ThoughtCategory[] = [
    '仕事・評価',
    '人間関係',
    '健康・身体',
    '将来への不安',
    '日常の出来事',
  ];

  for (const cat of order) {
    const keywords = CATEGORY_KEYWORDS[cat];
    if (keywords.some((kw) => lower.includes(kw))) {
      return cat;
    }
  }

  return 'その他';
}
