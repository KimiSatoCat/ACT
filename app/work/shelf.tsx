/**
 * 棚に置くワーク画面
 *
 * フロー:
 *  1. 思考入力（自由テキスト）
 *  2. クライシス検出 → 検出時: crisis 画面へ
 *  3. 認知的距離化フォーマット表示
 *     「私は今、『〇〇』という考えを持っている」
 *  4. 感情ラベル選択（12語）
 *  5. 回避シグナル確認
 *  6. セッション完了 → ball 画面へ
 */

import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSessionStore } from '@/store/useSessionStore';
import { detectCrisis } from '@/lib/crisisDetector';
import { categorize } from '@/lib/categorizer';
import { EMOTION_LABELS, EMOTION_ICONS } from '@/constants/emotions';
import type { EmotionLabel, AvoidanceSignal } from '@/types';

// ─── ステップ定義 ────────────────────────────────────────────────────────────

type Step = 'input' | 'defusion' | 'emotion' | 'avoidance';

// ─── 定数 ────────────────────────────────────────────────────────────────────

const AVOIDANCE_OPTIONS: { value: AvoidanceSignal; label: string }[] = [
  { value: 'denial', label: 'かなり否定したい・逃げたい' },
  { value: 'erase', label: '少し消し去りたい気持ちがある' },
  { value: 'none', label: 'あまり気にならない' },
];

// ─── コンポーネント ─────────────────────────────────────────────────────────

export default function ShelfScreen() {
  const router = useRouter();
  const completeSession = useSessionStore((s) => s.completeSession);
  const abandonSession = useSessionStore((s) => s.abandonSession);

  const [step, setStep] = useState<Step>('input');
  const [rawText, setRawText] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionLabel | null>(null);
  const [selectedAvoidance, setSelectedAvoidance] = useState<AvoidanceSignal | null>(null);

  const startTime = useRef(Date.now());
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fadeIn = useCallback(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // ─── Step 1 → 2: クライシス検出 + 距離化 ──────────────────────────────

  const handleTextSubmit = useCallback(() => {
    if (rawText.trim().length < 3) return;

    const result = detectCrisis(rawText);
    if (result.detected) {
      abandonSession();
      router.replace({
        pathname: '/crisis',
        params: { patterns: result.matchedPatterns.join(',') },
      });
      return;
    }

    setStep('defusion');
    fadeIn();
  }, [rawText, abandonSession, router, fadeIn]);

  // ─── Step 2 → 3: 感情選択へ ────────────────────────────────────────────

  const handleDefusionNext = useCallback(() => {
    setStep('emotion');
    fadeIn();
  }, [fadeIn]);

  // ─── Step 3 → 4: 回避シグナルへ ────────────────────────────────────────

  const handleEmotionSelect = useCallback((emotion: EmotionLabel) => {
    setSelectedEmotion(emotion);
    setStep('avoidance');
    fadeIn();
  }, [fadeIn]);

  // ─── Step 4 → 完了 ──────────────────────────────────────────────────────

  const handleComplete = useCallback(
    (avoidance: AvoidanceSignal) => {
      setSelectedAvoidance(avoidance);
      const durationSec = Math.floor((Date.now() - startTime.current) / 1000);

      completeSession({
        thoughtCategory: categorize(rawText),
        emotionLabel: selectedEmotion,
        avoidanceSignal: avoidance,
        durationSec,
      });

      router.replace('/ball');
    },
    [rawText, selectedEmotion, completeSession, router],
  );

  // ─── バック処理 ──────────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    if (step === 'input') {
      abandonSession();
      router.back();
    } else if (step === 'defusion') {
      setStep('input');
    } else if (step === 'emotion') {
      setStep('defusion');
    } else if (step === 'avoidance') {
      setStep('emotion');
    }
  }, [step, abandonSession, router]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ナビゲーションヘッダー */}
        <View style={styles.navHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>🗄️ 棚に置く</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ステップインジケーター */}
          <StepIndicator
            steps={['入力', '観察', '感情', '確認']}
            current={['input', 'defusion', 'emotion', 'avoidance'].indexOf(step)}
          />

          {/* Step 1: 思考入力 */}
          {step === 'input' && (
            <Animated.View style={{ opacity: 1 }}>
              <Text style={styles.heading}>今、どんな思考が浮かんでいますか？</Text>
              <Text style={styles.subHeading}>
                思い浮かんだことをそのまま書いてください。
              </Text>
              <TextInput
                style={styles.textInput}
                multiline
                placeholder="例: 仕事でミスして、自分はダメだと思っている..."
                placeholderTextColor="#B0BDA0"
                value={rawText}
                onChangeText={setRawText}
                maxLength={400}
                textAlignVertical="top"
                autoFocus
              />
              <Text style={styles.charCount}>{rawText.length} / 400</Text>
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  rawText.trim().length < 3 && styles.nextButtonDisabled,
                ]}
                onPress={handleTextSubmit}
                disabled={rawText.trim().length < 3}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>次へ</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Step 2: 認知的距離化（defusion） */}
          {step === 'defusion' && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={styles.heading}>思考を観察してみましょう</Text>
              <Text style={styles.subHeading}>
                「思考」と「自分」は別のものです。{'\n'}
                この文を声に出して読んでみてください。
              </Text>
              <View style={styles.defusionCard}>
                <Text style={styles.defusionPrefix}>私は今、</Text>
                <Text style={styles.defusionThought}>「{rawText.trim()}」</Text>
                <Text style={styles.defusionSuffix}>
                  という考えを持っている。
                </Text>
              </View>
              <Text style={styles.hintText}>
                💡 思考に気づいて観察することで、思考と少し距離を取れます。
              </Text>
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleDefusionNext}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>棚に置いた 🗄️</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Step 3: 感情ラベル選択 */}
          {step === 'emotion' && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={styles.heading}>今の感情は？</Text>
              <Text style={styles.subHeading}>
                最も近い感情を一つ選んでください。
              </Text>
              <View style={styles.emotionGrid}>
                {EMOTION_LABELS.map((label) => (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.emotionItem,
                      selectedEmotion === label && styles.emotionSelected,
                    ]}
                    onPress={() => handleEmotionSelect(label)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emotionIcon}>
                      {EMOTION_ICONS[label]}
                    </Text>
                    <Text style={styles.emotionLabel}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Step 4: 回避シグナル */}
          {step === 'avoidance' && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={styles.heading}>この思考に対して…</Text>
              <Text style={styles.subHeading}>
                今、この思考から逃げたい・避けたい気持ちはありますか？
              </Text>
              {AVOIDANCE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.avoidanceButton,
                    selectedAvoidance === opt.value &&
                      styles.avoidanceSelected,
                  ]}
                  onPress={() => handleComplete(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.avoidanceText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── ステップインジケーター ─────────────────────────────────────────────────

function StepIndicator({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <View style={styles.stepRow}>
      {steps.map((label, i) => (
        <View key={i} style={styles.stepItem}>
          <View
            style={[
              styles.stepDot,
              i < current && styles.stepDotDone,
              i === current && styles.stepDotActive,
            ]}
          >
            {i < current ? (
              <Text style={styles.stepDotText}>✓</Text>
            ) : (
              <Text style={styles.stepDotText}>{i + 1}</Text>
            )}
          </View>
          <Text
            style={[
              styles.stepLabel,
              i === current && styles.stepLabelActive,
            ]}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── スタイル ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAF7' },
  flex: { flex: 1 },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDE0',
  },
  backButton: { width: 60 },
  backText: { color: '#5A8C2A', fontSize: 15 },
  navTitle: { fontSize: 16, fontWeight: '600', color: '#2D5016' },
  scroll: { padding: 20, paddingBottom: 48 },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 28,
    gap: 8,
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E8D8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepDotDone: { backgroundColor: '#8FAB5A' },
  stepDotActive: { backgroundColor: '#5A8C2A' },
  stepDotText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  stepLabel: { fontSize: 10, color: '#9AA88A' },
  stepLabelActive: { color: '#5A8C2A', fontWeight: '600' },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D5016',
    marginBottom: 8,
    lineHeight: 28,
  },
  subHeading: {
    fontSize: 14,
    color: '#5A6644',
    lineHeight: 22,
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: '#2D3A28',
    minHeight: 140,
    borderWidth: 1.5,
    borderColor: '#D0DCC0',
    lineHeight: 24,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#9AA88A',
    marginTop: 6,
    marginBottom: 20,
  },
  nextButton: {
    backgroundColor: '#5A8C2A',
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextButtonDisabled: { backgroundColor: '#B5C9A0' },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  defusionCard: {
    backgroundColor: '#F0F6E8',
    borderRadius: 18,
    padding: 24,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8FAB5A',
  },
  defusionPrefix: {
    fontSize: 16,
    color: '#5A6644',
    marginBottom: 4,
  },
  defusionThought: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D5016',
    lineHeight: 28,
    marginBottom: 4,
  },
  defusionSuffix: {
    fontSize: 16,
    color: '#5A6644',
  },
  hintText: {
    fontSize: 13,
    color: '#7A8C6A',
    lineHeight: 20,
    marginBottom: 24,
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  emotionItem: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D0DCC0',
  },
  emotionSelected: {
    backgroundColor: '#EAF2E0',
    borderColor: '#8FAB5A',
  },
  emotionIcon: { fontSize: 24, marginBottom: 4 },
  emotionLabel: { fontSize: 12, color: '#4A5235', fontWeight: '500' },
  avoidanceButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#D0DCC0',
  },
  avoidanceSelected: {
    backgroundColor: '#EAF2E0',
    borderColor: '#8FAB5A',
  },
  avoidanceText: {
    fontSize: 15,
    color: '#4A5235',
    textAlign: 'center',
  },
});
