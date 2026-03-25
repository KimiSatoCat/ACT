// ─────────────────────────────────────────────────────────────────────────────
// ACTアプリ 型定義
// ─────────────────────────────────────────────────────────────────────────────

/** ワーク種別 — 固定順序: shelf → label → river */
export type WorkType = 'shelf' | 'label' | 'river';

/** セッションステータス */
export type SessionStatus = 'completed' | 'abandoned';

/** 感情ラベル — Russellモデル準拠12語 */
export type EmotionLabel =
  | '不安' | '恐れ' | '苛立ち' | '怒り'
  | '悲しさ' | '落ち込み' | '疲れ' | '空虚感'
  | '穏やか' | 'ほっとした' | '晴れやか' | '高ぶり';

/** 思考カテゴリ — 6分類 */
export type ThoughtCategory =
  | '仕事・評価'
  | '人間関係'
  | '健康・身体'
  | '将来への不安'
  | '日常の出来事'
  | 'その他';

/** 回避シグナル */
export type AvoidanceSignal = 'denial' | 'erase' | 'none';

/** セッションレコード */
export interface Session {
  id: string;
  workType: WorkType;
  status: SessionStatus;
  completedAt: Date | null;
  durationSec: number;
  thoughtCategory: ThoughtCategory | null;
  emotionLabel: EmotionLabel | null;
  avoidanceSignal: AvoidanceSignal | null;
  synced: boolean;
}

/** 週次レポート入力サマリー（AI送信用） */
export interface WeeklyReportInput {
  period_days: 7;
  session_count: number;
  work_frequency: Record<WorkType, number>;
  emotion_labels: Array<{ label: EmotionLabel; count: number }>;
  thought_categories: ThoughtCategory[];
  dropout_sessions: number;
  avoidance_signals: {
    denial_responses: number;
    erase_responses: number;
  };
}

/** 月次レポート入力サマリー — period_days を Omit して上書き */
export interface MonthlyReportInput extends Omit<WeeklyReportInput, 'period_days'> {
  period_days: 28 | 29 | 30 | 31;
  completed_days: number;
}

/** レポートレコード */
export interface Report {
  id: string;
  type: 'weekly' | 'monthly';
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  content: string;
  inputSummary: WeeklyReportInput | MonthlyReportInput;
}

/** AIダイアログセッション */
export interface DialogSession {
  id: string;
  turn: 1 | 2 | 3;
  thoughtCategory: ThoughtCategory | null;
  avoidanceSignal: AvoidanceSignal | null;
  summary: string | null;
}

/** クライシスイベント */
export interface CrisisEvent {
  id: string;
  detectedAt: Date;
  sessionRef: string;
  action: 'hotline_shown';
}

/** ユーザープロフィール */
export interface UserProfile {
  uid: string;
  createdAt: Date;
  lastActiveAt: Date;
  consentVersion: string;
}

/** Zustand セッションストア */
export interface SessionStore {
  currentSession: Partial<Session> | null;
  todayWorkType: WorkType;
  sessions: Session[];
  // actions
  startSession: (workType: WorkType) => void;
  completeSession: (data: Partial<Session>) => void;
  abandonSession: () => void;
  advanceWorkType: () => void;
  loadSessions: (sessions: Session[]) => void;
}

/** Zustand 認証ストア */
export interface AuthStore {
  uid: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (uid: string | null) => void;
  setLoading: (v: boolean) => void;
}
