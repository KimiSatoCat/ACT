/**
 * ボール画面（AIダイアログ）
 *
 * 設計:
 *  - セッション完了後に遷移
 *  - 「こころのボール」を中央に表示（感情エネルギー可視化）
 *  - 3ターンのAIダイアログを順次展開
 *  - Turn 2 は3択ボタンを表示
 *  - プライバシー: category + emotion + avoidance のみ送信
 */

import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSessionStore } from '@/store/useSessionStore';
import {
  callDialogTurn1,
  callDialogTurn2,
  callDialogTurn3,
} from '@/lib/api';
import { useWorkRotation } from '@/hooks/useWorkRotation';
import type { EmotionLabel, ThoughtCategory, AvoidanceSignal } from '@/types';

// ─── ターンの状態 ────────────────────────────────────────────────────────────

type TurnState = 'idle' | 'loading' | 'done';

interface DialogState {
  turn1: { state: TurnState; message: string };
  turn2: {
    state: TurnState;
    message: string;
    choices: [string, string, string];
    selected: string | null;
  };
  turn3: { state: TurnState; message: string };
}

// ─── コンポーネント ─────────────────────────────────────────────────────────

interface BallScreenParams {
  thoughtCategory?: ThoughtCategory;
  emotionLabel?: EmotionLabel;
  avoidanceSignal?: AvoidanceSignal;
}

export default function BallScreen() {
  const router = useRouter();
  const { advance } = useWorkRotation();
  const sessions = useSessionStore((s) => s.sessions);

  // 最後に完了したセッションからパラメータを取得
  const lastSession = sessions.at(-1);
  const params: BallScreenParams = {
    thoughtCategory: lastSession?.thoughtCategory ?? undefined,
    emotionLabel: lastSession?.emotionLabel ?? undefined,
    avoidanceSignal: lastSession?.avoidanceSignal ?? undefined,
  };

  const [dialog, setDialog] = useState<DialogState>({
    turn1: { state: 'idle', message: '' },
    turn2: {
      state: 'idle',
      message: '',
      choices: ['', '', ''],
      selected: null,
    },
    turn3: { state: 'idle', message: '' },
  });

  const ballScale = useRef(new Animated.Value(1)).current;

  // ボールをふわっと揺らすアニメーション
  const pulseBall = useCallback(() => {
    Animated.sequence([
      Animated.timing(ballScale, {
        toValue: 1.08,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(ballScale, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [ballScale]);

  // ─── Turn 1 ──────────────────────────────────────────────────────────────

  const handleTurn1 = useCallback(async () => {
    if (!params.thoughtCategory || !params.emotionLabel) return;

    setDialog((d) => ({
      ...d,
      turn1: { state: 'loading', message: '' },
    }));
    pulseBall();

    try {
      const res = await callDialogTurn1({
        thoughtCategory: params.thoughtCategory,
        emotionLabel: params.emotionLabel,
        avoidanceSignal: params.avoidanceSignal ?? null,
      });

      setDialog((d) => ({
        ...d,
        turn1: { state: 'done', message: res.message },
        turn2: {
          ...d.turn2,
          state: 'idle',
          // Turn 2 用の3択はサーバーから返す設計だが、
          // フォールバックとしてクライアント側で固定の3択を用意
          choices: [
            'そうかもしれない',
            '少し距離を感じた',
            'まだモヤモヤしている',
          ],
        },
      }));
    } catch {
      setDialog((d) => ({
        ...d,
        turn1: {
          state: 'done',
          message:
            'ただいまAIに接続できません。後ほどもう一度お試しください。',
        },
      }));
    }
  }, [params, pulseBall]);

  // ─── Turn 2 ──────────────────────────────────────────────────────────────

  const handleTurn2Choice = useCallback(
    async (choice: string) => {
      setDialog((d) => ({
        ...d,
        turn2: { ...d.turn2, state: 'loading', selected: choice },
      }));

      try {
        const res = await callDialogTurn2({
          thoughtCategory: params.thoughtCategory ?? 'その他',
          emotionLabel: params.emotionLabel ?? '平静',
          avoidanceSignal: params.avoidanceSignal ?? null,
          turn1Response: dialog.turn1.message,
          userChoice: choice,
        });

        setDialog((d) => ({
          ...d,
          turn2: { ...d.turn2, state: 'done', message: res.message },
          turn3: { state: 'idle', message: '' },
        }));
        pulseBall();
      } catch {
        setDialog((d) => ({
          ...d,
          turn2: {
            ...d.turn2,
            state: 'done',
            message: 'その感覚、大切にしていきましょう。',
          },
        }));
      }
    },
    [params, dialog.turn1.message, pulseBall],
  );

  // ─── Turn 3 ──────────────────────────────────────────────────────────────

  const handleTurn3 = useCallback(async () => {
    setDialog((d) => ({
      ...d,
      turn3: { state: 'loading', message: '' },
    }));

    try {
      const res = await callDialogTurn3({
        thoughtCategory: params.thoughtCategory ?? 'その他',
        emotionLabel: params.emotionLabel ?? '平静',
        avoidanceSignal: params.avoidanceSignal ?? null,
        turn1Response: dialog.turn1.message,
        userChoice: dialog.turn2.selected ?? '',
        turn2Response: dialog.turn2.message,
      });

      setDialog((d) => ({
        ...d,
        turn3: { state: 'done', message: res.message },
      }));
      pulseBall();
    } catch {
      setDialog((d) => ({
        ...d,
        turn3: {
          state: 'done',
          message:
            'お疲れさまでした。また明日もここで練習しましょう。',
        },
      }));
    }
  }, [params, dialog.turn1.message, dialog.turn2, pulseBall]);

  // ─── ワーク完了 ──────────────────────────────────────────────────────────

  const handleFinish = useCallback(() => {
    advance(); // 次のワーク種別へ
    router.replace('/');
  }, [advance, router]);

  // ─── 感情ラベルに応じたボール色 ──────────────────────────────────────────

  const ballColor = getBallColor(params.emotionLabel);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ボール */}
        <Animated.View
          style={[
            styles.ballContainer,
            { transform: [{ scale: ballScale }] },
          ]}
        >
          <View style={[styles.ball, { backgroundColor: ballColor.bg }]}>
            <Text style={styles.ballEmoji}>{params.emotionLabel ? '🌀' : '✨'}</Text>
          </View>
          {params.emotionLabel && (
            <Text style={[styles.emotionBadge, { color: ballColor.text }]}>
              {params.emotionLabel}
            </Text>
          )}
        </Animated.View>

        {/* Turn 1 */}
        <View style={styles.turnSection}>
          {dialog.turn1.state === 'idle' && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleTurn1}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>AIと話してみる</Text>
            </TouchableOpacity>
          )}
          {dialog.turn1.state === 'loading' && (
            <ActivityIndicator color="#5A8C2A" size="large" />
          )}
          {dialog.turn1.state === 'done' && (
            <AIBubble message={dialog.turn1.message} />
          )}
        </View>

        {/* Turn 2 — 3択 */}
        {dialog.turn1.state === 'done' && dialog.turn2.state !== 'done' && (
          <View style={styles.choicesSection}>
            {dialog.turn2.state === 'loading' ? (
              <ActivityIndicator color="#5A8C2A" size="large" />
            ) : (
              dialog.turn2.choices.map((choice, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.choiceButton,
                    dialog.turn2.selected === choice && styles.choiceSelected,
                  ]}
                  onPress={() => handleTurn2Choice(choice)}
                  disabled={dialog.turn2.state === 'loading'}
                  activeOpacity={0.7}
                >
                  <Text style={styles.choiceText}>{choice}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Turn 2 レスポンス */}
        {dialog.turn2.state === 'done' && (
          <AIBubble message={dialog.turn2.message} />
        )}

        {/* Turn 3 */}
        {dialog.turn2.state === 'done' && dialog.turn3.state !== 'done' && (
          <View style={styles.turnSection}>
            {dialog.turn3.state === 'loading' ? (
              <ActivityIndicator color="#5A8C2A" size="large" />
            ) : (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleTurn3}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>もう少し話す</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Turn 3 レスポンス */}
        {dialog.turn3.state === 'done' && (
          <>
            <AIBubble message={dialog.turn3.message} />
            <TouchableOpacity
              style={styles.finishButton}
              onPress={handleFinish}
              activeOpacity={0.8}
            >
              <Text style={styles.finishButtonText}>ワークを終える 🌿</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── AIバブル ────────────────────────────────────────────────────────────────

function AIBubble({ message }: { message: string }) {
  return (
    <View style={styles.aiBubble}>
      <Text style={styles.aiIcon}>🌱</Text>
      <Text style={styles.aiText}>{message}</Text>
    </View>
  );
}

// ─── ボール色マッピング（感情の覚醒度に応じた色） ──────────────────────────

function getBallColor(emotion: EmotionLabel | undefined): {
  bg: string;
  text: string;
} {
  // 高覚醒（ネガティブ＋ポジティブ）
  const highArousal: EmotionLabel[] = ['不安', '恐れ', '苛立ち', '怒り', '晴れやか', '高ぶり'];
  // 低覚醒・ネガティブ
  const midArousal: EmotionLabel[] = ['悲しさ', '落ち込み', '疲れ', '空虚感'];

  if (!emotion) return { bg: '#DDE8CC', text: '#5A8C2A' };
  if (highArousal.includes(emotion)) return { bg: '#FFD6D6', text: '#B03A2E' };
  if (midArousal.includes(emotion)) return { bg: '#D6E8FF', text: '#2E5DB0' };
  return { bg: '#E8F5E9', text: '#2E7D32' };
}

// ─── スタイル ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAFAF7',
  },
  scroll: {
    padding: 20,
    paddingBottom: 56,
    alignItems: 'center',
  },
  ballContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  ball: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  ballEmoji: {
    fontSize: 48,
  },
  emotionBadge: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  turnSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#5A8C2A',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: '#8FAB5A',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  secondaryButtonText: {
    color: '#5A8C2A',
    fontSize: 15,
    fontWeight: '600',
  },
  choicesSection: {
    width: '100%',
    marginBottom: 24,
    gap: 10,
  },
  choiceButton: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#D0DCC0',
  },
  choiceSelected: {
    backgroundColor: '#EAF2E0',
    borderColor: '#8FAB5A',
  },
  choiceText: {
    fontSize: 15,
    color: '#4A5235',
    textAlign: 'center',
  },
  aiBubble: {
    width: '100%',
    backgroundColor: '#F0F6E8',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  aiIcon: {
    fontSize: 22,
    marginTop: 2,
  },
  aiText: {
    flex: 1,
    fontSize: 15,
    color: '#3A4A2A',
    lineHeight: 24,
  },
  finishButton: {
    backgroundColor: '#5A8C2A',
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 8,
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
