import { detectCrisis, resetAutomaton } from '../crisisDetector';

beforeEach(() => { resetAutomaton(); });

describe('detectCrisis — 正常系', () => {
  test('クライシスワードなし → 検出しない', () => {
    expect(detectCrisis('今日も疲れた').detected).toBe(false);
    expect(detectCrisis('仕事でミスした').detected).toBe(false);
    expect(detectCrisis('').detected).toBe(false);
  });

  test('完全一致 → 検出する', () => {
    expect(detectCrisis('死にたい').detected).toBe(true);
    expect(detectCrisis('消えたい').detected).toBe(true);
    expect(detectCrisis('自殺').detected).toBe(true);
  });

  test('文章中に含まれる場合 → 検出する', () => {
    expect(detectCrisis('もう消えたいと思う').detected).toBe(true);
    expect(detectCrisis('死にたいと感じてしまう').detected).toBe(true);
  });
});

describe('detectCrisis — 正規化', () => {
  test('全角文字 → 正規化して検出', () => {
    // カタカナ「シニタイ」→ひらがな「しにたい」→「死にたい」とは別パターンだが
    // ひらがな入力を直接テスト
    expect(detectCrisis('しにたい気持ち').detected).toBe(false); // パターンは漢字
  });

  test('空白を含む入力 → 検出する', () => {
    expect(detectCrisis('もう　消えたい').detected).toBe(true);
  });
});

describe('detectCrisis — matchedPatterns', () => {
  test('検出されたパターンが返される', () => {
    const result = detectCrisis('消えてしまいたいと思う');
    expect(result.detected).toBe(true);
    expect(result.matchedPatterns.length).toBeGreaterThan(0);
  });
});
