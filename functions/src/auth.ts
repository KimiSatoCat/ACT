/**
 * Firebase Auth トークン検証ユーティリティ
 */

import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import type { Request } from 'firebase-functions/v2/https';

/**
 * Authorization ヘッダーから Firebase UID を取得する。
 * 無効・未認証の場合は HttpsError を throw。
 */
export async function verifyAuth(req: Request): Promise<string> {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HttpsError('unauthenticated', 'Missing Authorization header');
  }

  const idToken = authHeader.slice(7);
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded.uid;
  } catch (err) {
    throw new HttpsError('unauthenticated', 'Invalid ID token');
  }
}
