/**
 * セッション同期 Cloud Functions
 *
 * - クライアントから未同期セッションを受け取り Firestore に保存
 * - UID 単位でユーザーデータを分離
 * - 生テキストは受け取らない（workType / completedAt / durationSec のみ）
 */

import * as admin from 'firebase-admin';
import type { SyncRequest, SyncResponse } from './types';

export async function syncSessions(
  uid: string,
  req: SyncRequest,
): Promise<SyncResponse> {
  if (!req.sessions || req.sessions.length === 0) {
    return { synced: 0 };
  }

  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);
  const batch = db.batch();

  for (const session of req.sessions) {
    // 入力バリデーション
    if (!session.id || !session.workType || !session.completedAt) {
      continue;
    }

    const sessionRef = userRef.collection('sessions').doc(session.id);
    batch.set(
      sessionRef,
      {
        id: session.id,
        workType: session.workType,
        completedAt: admin.firestore.Timestamp.fromDate(
          new Date(session.completedAt),
        ),
        durationSec: session.durationSec,
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        uid,
      },
      { merge: true },
    );
  }

  await batch.commit();

  return { synced: req.sessions.length };
}
