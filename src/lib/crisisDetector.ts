/**
 * クライシス検出エンジン — Aho-Corasick アルゴリズム実装
 *
 * 設計原則:
 *  - ネットワーク不要のオンデバイス処理
 *  - O(n) — 入力長に対して線形時間
 *  - 全角/半角・カタカナ/ひらがな正規化を前処理として適用
 *  - パターンリストは OTA で更新可能（crisis-patterns.json）
 */

import patterns from '@/constants/crisis-patterns.json';

// ─── 正規化 ────────────────────────────────────────────────────────────────

/** 全角英数字・記号 → 半角 */
function toHalfWidth(str: string): string {
  return str
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0),
    )
    .replace(/　/g, ' ');
}

/** カタカナ → ひらがな */
function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60),
  );
}

/** 正規化パイプライン */
function normalize(input: string): string {
  return katakanaToHiragana(toHalfWidth(input.toLowerCase()));
}

// ─── Aho-Corasick ─────────────────────────────────────────────────────────

interface AhoCorasickNode {
  children: Map<string, AhoCorasickNode>;
  failure: AhoCorasickNode | null;
  /** このノードで終了するパターン（output function） */
  output: string[];
}

function createNode(): AhoCorasickNode {
  return { children: new Map(), failure: null, output: [] };
}

function buildAutomaton(patternList: string[]): AhoCorasickNode {
  const root = createNode();

  // Phase 1: Trie 構築
  for (const pat of patternList) {
    let node = root;
    for (const ch of pat) {
      if (!node.children.has(ch)) {
        node.children.set(ch, createNode());
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      node = node.children.get(ch)!;
    }
    node.output.push(pat);
  }

  // Phase 2: Failure リンク構築（BFS）
  const queue: AhoCorasickNode[] = [];
  for (const child of root.children.values()) {
    child.failure = root;
    queue.push(child);
  }

  let qi = 0;
  while (qi < queue.length) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const current = queue[qi]!;
    qi++;

    for (const [ch, child] of current.children.entries()) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      let failure = current.failure!;
      while (failure !== root && !failure.children.has(ch)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        failure = failure.failure!;
      }
      child.failure = failure.children.get(ch) ?? root;
      if (child.failure === child) child.failure = root;
      child.output = [...child.output, ...(child.failure?.output ?? [])];
      queue.push(child);
    }
  }

  return root;
}

/** シングルトン — 起動時に一度だけ構築 */
let _automaton: AhoCorasickNode | null = null;

function getAutomaton(): AhoCorasickNode {
  if (_automaton) return _automaton;
  const normalized = patterns.patterns.map(normalize);
  _automaton = buildAutomaton(normalized);
  return _automaton;
}

// ─── 公開 API ─────────────────────────────────────────────────────────────

export interface CrisisDetectionResult {
  detected: boolean;
  /** 検出されたパターン（デバッグ・監査用） */
  matchedPatterns: string[];
}

/**
 * 入力テキストにクライシスワードが含まれるか検出する。
 *
 * @param rawInput — ユーザー入力（未正規化）
 * @returns CrisisDetectionResult
 *
 * @example
 * detectCrisis("もう消えたいな") // → { detected: true, matchedPatterns: ['消えたい'] }
 * detectCrisis("今日疲れた")     // → { detected: false, matchedPatterns: [] }
 */
export function detectCrisis(rawInput: string): CrisisDetectionResult {
  const text = normalize(rawInput);
  const root = getAutomaton();
  const matched: string[] = [];

  let node = root;
  for (const ch of text) {
    while (node !== root && !node.children.has(ch)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      node = node.failure!;
    }
    node = node.children.get(ch) ?? root;
    if (node.output.length > 0) {
      matched.push(...node.output);
    }
  }

  return { detected: matched.length > 0, matchedPatterns: matched };
}

/**
 * オートマトンキャッシュをリセットする（OTA更新後に呼び出す）
 */
export function resetAutomaton(): void {
  _automaton = null;
}
