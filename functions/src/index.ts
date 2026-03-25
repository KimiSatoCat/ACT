/**
 * ACTアプリ Cloud Functions エントリポイント
 *
 * エンドポイント一覧:
 *  POST /dialog/turn1   — ACT ダイアログ Turn 1
 *  POST /dialog/turn2   — ACT ダイアログ Turn 2
 *  POST /dialog/turn3   — ACT ダイアログ Turn 3
 *  POST /reports/weekly  — 週次レポート生成
 *  POST /reports/monthly — 月次レポート生成
 *  POST /sessions/sync  — セッション Firestore 同期
 *  POST /crisis/record  — クライシスイベント記録
 *
 * 認証: Firebase Anonymous Auth ID トークン (Bearer)
 * リージョン: asia-northeast1 (東京)
 */

import * as admin from 'firebase-admin';
import {
  onRequest,
  HttpsError,
  type Request,
} from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';

import { verifyAuth } from './auth';
import {
  handleDialogTurn1,
  handleDialogTurn2,
  handleDialogTurn3,
} from './dialog';
import { generateWeeklyReport, generateMonthlyReport } from './reports';
import { syncSessions } from './sessions';
import { recordCrisisEvent } from './crisis';

// ─── 初期化 ──────────────────────────────────────────────────────────────────

admin.initializeApp();

setGlobalOptions({
  region: 'asia-northeast1',
  maxInstances: 10,
  memory: '256MiB',
  timeoutSeconds: 60,
});

// ─── CORS ヘルパー ─────────────────────────────────────────────────────────────

function setCorsHeaders(res: { setHeader: (k: string, v: string) => void }): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function handleCors(
  req: Request,
  res: { setHeader: (k: string, v: string) => void; status: (n: number) => { end: () => void } },
): boolean {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

// ─── ダイアログ ──────────────────────────────────────────────────────────────

export const dialogTurn1 = onRequest(async (req, res) => {
  if (handleCors(req, res)) return;
  try {
    const uid = await verifyAuth(req);
    const body = req.body as Record<string, unknown>;
    const result = await handleDialogTurn1({
      thoughtCategory: String(body['thoughtCategory'] ?? ''),
      emotionLabel: String(body['emotionLabel'] ?? ''),
      avoidanceSignal: body['avoidanceSignal'] != null ? String(body['avoidanceSignal']) : null,
    });
    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
});

export const dialogTurn2 = onRequest(async (req, res) => {
  if (handleCors(req, res)) return;
  try {
    await verifyAuth(req);
    const body = req.body as Record<string, unknown>;
    const result = await handleDialogTurn2({
      thoughtCategory: String(body['thoughtCategory'] ?? ''),
      emotionLabel: String(body['emotionLabel'] ?? ''),
      avoidanceSignal: body['avoidanceSignal'] != null ? String(body['avoidanceSignal']) : null,
      turn1Response: String(body['turn1Response'] ?? ''),
      userChoice: String(body['userChoice'] ?? ''),
    });
    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
});

export const dialogTurn3 = onRequest(async (req, res) => {
  if (handleCors(req, res)) return;
  try {
    await verifyAuth(req);
    const body = req.body as Record<string, unknown>;
    const result = await handleDialogTurn3({
      thoughtCategory: String(body['thoughtCategory'] ?? ''),
      emotionLabel: String(body['emotionLabel'] ?? ''),
      avoidanceSignal: body['avoidanceSignal'] != null ? String(body['avoidanceSignal']) : null,
      turn1Response: String(body['turn1Response'] ?? ''),
      userChoice: String(body['userChoice'] ?? ''),
      turn2Response: String(body['turn2Response'] ?? ''),
    });
    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
});

// ─── レポート ────────────────────────────────────────────────────────────────

export const reportsWeekly = onRequest(
  { timeoutSeconds: 120, memory: '512MiB' },
  async (req, res) => {
    if (handleCors(req, res)) return;
    try {
      const uid = await verifyAuth(req);
      const result = await generateWeeklyReport(uid, req.body);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  },
);

export const reportsMonthly = onRequest(
  { timeoutSeconds: 120, memory: '512MiB' },
  async (req, res) => {
    if (handleCors(req, res)) return;
    try {
      const uid = await verifyAuth(req);
      const result = await generateMonthlyReport(uid, req.body);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  },
);

// ─── セッション同期 ──────────────────────────────────────────────────────────

export const sessionsSync = onRequest(async (req, res) => {
  if (handleCors(req, res)) return;
  try {
    const uid = await verifyAuth(req);
    const result = await syncSessions(uid, req.body);
    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
});

// ─── クライシス ──────────────────────────────────────────────────────────────

export const crisisRecord = onRequest(async (req, res) => {
  if (handleCors(req, res)) return;
  try {
    const uid = await verifyAuth(req);
    await recordCrisisEvent(uid, req.body);
    res.status(200).json({ ok: true });
  } catch (err) {
    handleError(err, res);
  }
});

// ─── エラーハンドラー ────────────────────────────────────────────────────────

type ResponseLike = {
  status: (n: number) => { json: (body: unknown) => void };
};

function handleError(err: unknown, res: ResponseLike): void {
  if (err instanceof HttpsError) {
    const statusMap: Record<string, number> = {
      unauthenticated: 401,
      'permission-denied': 403,
      'invalid-argument': 400,
      'not-found': 404,
      internal: 500,
    };
    const status = statusMap[err.code] ?? 500;
    res.status(status).json({ error: err.message });
  } else {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[Functions] Unhandled error:', err);
    res.status(500).json({ error: message });
  }
}
