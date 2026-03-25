/**
 * クライシスイベント記録 Cloud Functions
 *
 * - デバイス上でのクライシス検出結果を Firestore に記録
 * - マッチしたパターンのみ保存（生テキストは保存しない）
 * - 将来的な安全性分析のためのデータ収集
 */

import * as admin from 'firebase-admin';
import type { CrisisRecordRequest } from './types';

export async function recordCrisisEvent(
  uid: string,
  req: CrisisRecordRequest,
): Promise<void> {
  if (!req.detectedAt || !Array.isArray(req.matchedPatterns)) {
    throw new Error('Invalid crisis record request');
  }

  const db = admin.firestore();
  const eventRef = db
    .collection('users')
    .doc(uid)
    .collection('crisisEvents')
    .doc();

  await eventRef.set({
    detectedAt: admin.firestore.Timestamp.fromDate(new Date(req.detectedAt)),
    matchedPatterns: req.matchedPatterns,
    recordedAt: admin.firestore.FieldValue.serverTimestamp(),
    uid,
  });
}
