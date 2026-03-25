/**
 * Cloud Functions 共有型定義
 */

// ─── ダイアログ ──────────────────────────────────────────────────────────────

export interface DialogTurn1Request {
  thoughtCategory: string;
  emotionLabel: string;
  avoidanceSignal: string | null;
}

export interface DialogTurn2Request extends DialogTurn1Request {
  turn1Response: string;
  userChoice: string;
}

export interface DialogTurn3Request extends DialogTurn2Request {
  turn2Response: string;
}

export interface DialogResponse {
  message: string;
  sessionId: string;
}

// ─── セッション同期 ──────────────────────────────────────────────────────────

export interface SyncSession {
  id: string;
  workType: string;
  completedAt: string;
  durationSec: number;
}

export interface SyncRequest {
  sessions: SyncSession[];
}

export interface SyncResponse {
  synced: number;
}

// ─── レポート ────────────────────────────────────────────────────────────────

export interface WorkFrequency {
  shelf: number;
  label: number;
  river: number;
}

export interface EmotionLabelCount {
  label: string;
  count: number;
}

export interface AvoidanceSignals {
  denial_responses: number;
  erase_responses: number;
}

export interface WeeklyReportInput {
  period_days: number;
  session_count: number;
  work_frequency: WorkFrequency;
  emotion_labels: EmotionLabelCount[];
  thought_categories: string[];
  dropout_sessions: number;
  avoidance_signals: AvoidanceSignals;
}

export interface MonthlyReportInput extends WeeklyReportInput {
  completed_days: number;
}

export interface Report {
  id: string;
  type: 'weekly' | 'monthly';
  content: string;
  createdAt: string;
  periodDays: number;
}

// ─── クライシス ──────────────────────────────────────────────────────────────

export interface CrisisRecordRequest {
  detectedAt: string;
  matchedPatterns: string[];
}
