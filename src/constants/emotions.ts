import type { EmotionLabel } from '@/types';

/**
 * 感情語彙セット — Russell (1980) Circumplex Model of Affect 準拠
 * 日本語検証版参照: 大平・坂本 (2003)
 * 覚醒度（高/低）× 感情価（Pos/Neg）の四象限にバランス配置
 */
export const EMOTION_LABELS: readonly EmotionLabel[] = [
  // 高覚醒・ネガティブ
  '不安', '恐れ', '苛立ち', '怒り',
  // 低覚醒・ネガティブ
  '悲しさ', '落ち込み', '疲れ', '空虚感',
  // 低覚醒・ポジティブ
  '穏やか', 'ほっとした',
  // 高覚醒・ポジティブ
  '晴れやか', '高ぶり',
] as const;

/** 感情アイコン（UIヒント用） */
export const EMOTION_ICONS: Record<EmotionLabel, string> = {
  '不安':     '😰',
  '恐れ':     '😨',
  '苛立ち':   '😤',
  '怒り':     '😠',
  '悲しさ':   '😢',
  '落ち込み': '😔',
  '疲れ':     '😩',
  '空虚感':   '😶',
  '穏やか':   '😌',
  'ほっとした':'😮‍💨',
  '晴れやか': '😊',
  '高ぶり':   '✨',
};
