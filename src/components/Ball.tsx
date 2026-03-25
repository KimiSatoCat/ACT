/**
 * Ball コンポーネント — こころのボール
 *
 * 感情エネルギーを可視化する「こころのボール」。
 * 覚醒度（arousal）に応じた色と大きさで表現する。
 *
 * 設計:
 *  - React Native Animated でふわふわと揺れる
 *  - 感情ラベルに応じて色が変わる（Russell Circumplex Model 準拠）
 *  - サイズ: small（カード内）/ large（full画面）
 */

import { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import type { EmotionLabel } from '@/types';

// ─── 感情→覚醒度マッピング ─────────────────────────────────────────────────

type ArousalLevel = 'high' | 'mid' | 'low' | 'neutral';

function getArousalLevel(emotion: EmotionLabel | null | undefined): ArousalLevel {
  if (!emotion) return 'neutral';
  // 高覚醒（ネガティブ + ポジティブ）
  const high: EmotionLabel[] = ['不安', '恐れ', '苛立ち', '怒り', '晴れやか', '高ぶり'];
  // 低覚醒・ネガティブ
  const mid: EmotionLabel[] = ['悲しさ', '落ち込み', '疲れ', '空虚感'];
  // 低覚醒・ポジティブ
  const low: EmotionLabel[] = ['穏やか', 'ほっとした'];
  if (high.includes(emotion)) return 'high';
  if (mid.includes(emotion)) return 'mid';
  if (low.includes(emotion)) return 'low';
  return 'neutral';
}

const AROUSAL_COLORS: Record<ArousalLevel, { bg: string; glow: string; text: string }> = {
  high: { bg: '#FFD6D6', glow: 'rgba(176, 58, 46, 0.15)', text: '#B03A2E' },
  mid: { bg: '#D6E8FF', glow: 'rgba(46, 93, 176, 0.15)', text: '#2E5DB0' },
  low: { bg: '#E8F5E9', glow: 'rgba(46, 125, 50, 0.12)', text: '#2E7D32' },
  neutral: { bg: '#DDE8CC', glow: 'rgba(90, 140, 42, 0.12)', text: '#5A8C2A' },
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface BallProps {
  emotion?: EmotionLabel | null;
  size?: 'small' | 'large';
  /** アニメーションを外部から制御するトリガー（変化するたびにパルスが起きる） */
  pulseKey?: number;
}

// ─── コンポーネント ─────────────────────────────────────────────────────────

export function Ball({ emotion, size = 'large', pulseKey = 0 }: BallProps) {
  const arousal = getArousalLevel(emotion);
  const colors = AROUSAL_COLORS[arousal];
  const diameter = size === 'large' ? 140 : 72;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  // 常時ふわふわアニメーション
  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 8,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );
    float.start();
    return () => float.stop();
  }, [floatAnim]);

  // パルスアニメーション（外部トリガー）
  useEffect(() => {
    if (pulseKey === 0) return;
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.12,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pulseKey, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { scale: scaleAnim },
            { translateY: floatAnim },
          ],
        },
      ]}
    >
      {/* 光彩エフェクト */}
      <View
        style={[
          styles.glow,
          {
            width: diameter + 32,
            height: diameter + 32,
            borderRadius: (diameter + 32) / 2,
            backgroundColor: colors.glow,
          },
        ]}
      />
      {/* ボール本体 */}
      <View
        style={[
          styles.ball,
          {
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            backgroundColor: colors.bg,
          },
        ]}
      >
        <Text style={[styles.emoji, size === 'small' && styles.emojiSmall]}>
          {emotion ? '🌀' : '✨'}
        </Text>
      </View>
      {/* 感情バッジ */}
      {emotion && size === 'large' && (
        <Text style={[styles.emotionLabel, { color: colors.text }]}>
          {emotion}
        </Text>
      )}
    </Animated.View>
  );
}

// ─── スタイル ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
  },
  ball: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  emoji: {
    fontSize: 48,
  },
  emojiSmall: {
    fontSize: 24,
  },
  emotionLabel: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
});
