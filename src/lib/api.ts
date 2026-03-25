/**
 * Cloud Functions クライアント
 *
 * 設計原則:
 *  - 生テキストは一切送信しない（プライバシー設計）
 *  - カテゴリラベル・感情ラベル・回避シグナルのみ送信
 *  - Claude API (Haiku / Sonnet) は Cloud Functions 側で呼び出す
 *  - TanStack Query のキャッシュキーと組み合わせて使用
 *  - 全エンドポイントはリトライ不可（べき等でないため）
 */

import { auth } from '@/lib/firebase';
import type {
  DialogSession,
  Report,
  WeeklyReportInput,
  MonthlyReportInput,
} from '@/types';

// ─── ベース URL ─────────────────────────────────────────────────────────────

const BASE_URL = process.env['EXPO_PUBLIC_FUNCTIONS_BASE_URL'] ?? '';

// ─── HTTP ヘルパー ──────────────────────────────────────────────────────────

async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const token = await getIdToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ─── ダイアログ API ─────────────────────────────────────────────────────────

export interface DialogTurn1Request {
  thoughtCategory: string;
  emotionLabel: string;
  avoidanceSignal: string | null;
}

export interface DialogTurn2Request extends DialogTurn1Request {
  turn1Response: string;
  userChoice: string; // Turn 2 の3択ラベル
}

export interface DialogTurn3Request extends DialogTurn2Request {
  turn2Response: string;
}

export interface DialogResponse {
  message: string;
  /** サーバー側でキャッシュされたセッション ID */
  sessionId: string;
}

/** Turn 1 — 共感＋認知的距離化の問いかけ */
export async function callDialogTurn1(
  req: DialogTurn1Request,
): Promise<DialogResponse> {
  // Firebase Cloud Functions のエクスポート名がそのままパスになる
  return post<DialogResponse>('/dialogTurn1', req);
}

/** Turn 2 — 3択提示から選択後のフォローアップ */
export async function callDialogTurn2(
  req: DialogTurn2Request,
): Promise<DialogResponse> {
  return post<DialogResponse>('/dialogTurn2', req);
}

/** Turn 3 — クロージング＋次ワークへの橋渡し */
export async function callDialogTurn3(
  req: DialogTurn3Request,
): Promise<DialogResponse> {
  return post<DialogResponse>('/dialogTurn3', req);
}

// ─── レポート API ────────────────────────────────────────────────────────────

/** 週次レポート生成（14日以上のデータが溜まった初回から有効化） */
export async function generateWeeklyReport(
  input: WeeklyReportInput,
): Promise<Report> {
  return post<Report>('/reportsWeekly', input);
}

/** 月次レポート生成 */
export async function generateMonthlyReport(
  input: MonthlyReportInput,
): Promise<Report> {
  return post<Report>('/reportsMonthly', input);
}

// ─── Firestore 同期 API ──────────────────────────────────────────────────────

/**
 * 未同期セッションを Firestore にバッチ書き込みする。
 * Cloud Functions 側で UID 検証を行う。
 */
export async function syncSessions(
  sessions: { id: string; workType: string; completedAt: string; durationSec: number }[],
): Promise<{ synced: number }> {
  return post<{ synced: number }>('/sessionsSync', { sessions });
}

/** クライシスイベントを即時記録（重要なので専用エンドポイント） */
export async function recordCrisisEvent(event: {
  detectedAt: string;
  matchedPatterns: string[];
}): Promise<void> {
  await post<void>('/crisisRecord', event);
}

// ─── 型エクスポート ──────────────────────────────────────────────────────────

export type { DialogSession, Report };
