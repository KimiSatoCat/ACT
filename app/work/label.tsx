/**
 * ラベルを貼るワーク画面
 *
 * フロー:
 *  1. 思考入力
 *  2. クライシス検出
 *  3. 「私はいま〇〇という思考にラベルを貼っている」形式で表示
 *  4. カテゴリを可視化（自動分類結果を表示）
 *  5. 感情ラベル選択
 *  6. 回避シグナル確認
 *  7. セッション完了 → ball 画面へ
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
import type { EmotionLabel, ThoughtCategory, AvoidanceSignal } from '@/types';

// ─── ステップ定義 ────────────────────────────────────────────────────────────

type Step = 'input' | 'label' | 'emotion' | 'avoidance';

const AVOIDANCE_OPTIONS: { value: AvoidanceSignal; label: string }[] = [
  { value: 'denial', label: 'かなり否定したい・逃げたい' },
  { value: 'erase', label: '少し消し去りたい気持ちがある' },
  { value: 'none', label: 'あまり気にならない' },
];

// カテゴリ別の表示ラベルと色
const CATEGORY_DISPLAY: Record<
  ThoughtCategory,
  { label: string; color: string; bg: string }
> = {
  '仕事・評価': { label: '仕事・評価への思考', color: '#2E5DB0', bg: '#D6E8FF' },
  '人間関係': { label: '人間関係への思考', color: '#B03A2E', bg: '#FFD6D6' },
  '健康・身体': { label: '健康・身体への思考', color: '#1A6B4A', bg: '#D6F5E8' },
  '将来への不安': { label: '将来への不安の思考', color: '#7A3B00', bg: '#FFE8C4' },
  '日常の出来事': { label: '日常の出来事への思考', color: '#5A3B8C', bg: '#EAD6FF' },
  'その他': { label: '思考のラベル', color: '#4A5235', bg: '#E8EDE0' },
};

// ─── コンポーネント ─────────────────────────────────────────────────────────

export default function LabelScreen() {
  const router = useRouter();
  const completeSession = useSessionStore((s) => s.completeSession);
  const abandonSession = useSessionStore((s) => s.abandonSession);

  const [step, setStep] = useState<Step>('input');
  const [rawText, setRawText] = useState('');
  const [category, setCategory] = useState<ThoughtCategory>('その他');
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

  // Step 1 → 2
  const handleTextSubmit = useCallback(() => {
    if (rawText.trim().length < 3) return;

    const crisisResult = detectCrisis(rawText);
    if (crisisResult.detected) {
      abandonSession();
      router.replace({
        pathname: '/crisis',
        params: { patterns: crisisResult.matchedPatterns.join(',') },
      });
      return;
    }

    const cat = categorize(rawText);
    setCategory(cat);
    setStep('label');
    fadeIn();
  }, [rawText, abandonSession, router, fadeIn]);

  // Step 2 → 3
  const handleLabelNext = useCallback(() => {
    setStep('emotion');
    fadeIn();
  }, [fadeIn]);

  // Step 3 → 4
  const handleEmotionSelect = useCallback(
    (emotion: EmotionLabel) => {
      setSelectedEmotion(emotion);
      setStep('avoidance');
      fadeIn();
    },
    [fadeIn],
  );

  // Step 4 → 完了
  const handleComplete = useCallback(
    (avoidance: AvoidanceSignal) => {
      const durationSec = Math.floor((Date.now() - startTime.current) / 1000);
      completeSession({
        thoughtCategory: category,
        emotionLabel: selectedEmotion,
        avoidanceSignal: avoidance,
        durationSec,
      });
      router.replace('/ball');
    },
    [category, selectedEmotion, completeSession, router],
  );

  const handleBack = useCallback(() => {
    if (step === 'input') {
      abandonSession();
      router.back();
    } else {
      const prev: Record<Step, Step> = {
        input: 'input',
        label: 'input',
        emotion: 'label',
        avoidance: 'emotion',
      };
      setStep(prev[step]);
    }
  }, [step, abandonSession, router]);

  const catDisplay = CATEGORY_DISPLAY[category];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.navHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>🏷️ ラベルを貼る</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <StepIndicator
            steps={['入力', 'ラベル', '感情', '確認']}
            current={(['input', 'label', 'emotion', 'avoidance'] as Step[]).indexOf(step)}
          />

          {/* Step 1: 思考入力 */}
          {step === 'input' && (
            <View>
              <Text style={styles.heading}>今、どんな思考が浮かんでいますか？</Text>
              <Text style={styles.subHeading}>
                思い浮かんだことをそのまま書いてください。
              </Text>
              <TextInput
                style={styles.textInput}
                multiline
                placeholder="例: 上司に怒られて、自分のせいだと思っている..."
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
            </View>
          )}

          {/* Step 2: ラベル表示 */}
          {step === 'label' && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={styles.heading}>思考にラベルを貼りましょう</Text>
              <Text style={styles.subHeading}>
                この思考に名前をつけることで、思考を外側から眺められます。
              </Text>

              {/* カテゴリバッジ */}
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: catDisplay.bg },
                ]}
              >
                <Text style={[styles.categoryText, { color: catDisplay.color }]}>
                  🏷️ {catDisplay.label}
                </Text>
              </View>

              {/* 距離化フォーマット */}
              <View style={styles.labelCard}>
                <Text style={styles.labelFormula}>
                  私はいま、
                </Text>
                <Text
                  style={[
                    styles.labelHighlight,
                    { color: catDisplay.color },
                  ]}
                >
                  「{catDisplay.label}」
                </Text>
                <Text style={styles.labelFormula}>
                  という思考にラベルを貼っている。
                </Text>
              </View>

              <Text style={styles.hintText}>
                💡 「私 ＝ この思考」ではなく、「私はこの思考を観察している」という視点です。
              </Text>

              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleLabelNext}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>ラベルを貼った 🏷️</Text>
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
                    <Text style={styles.emotionIcon}>{EMOTION_ICONS[label]}</Text>
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
                  style={styles.avoidanceButton}
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
            <Text style={styles.stepDotText}>
              {i < current ? '✓' : String(i + 1)}
            </Text>
          </View>
          <Text
            style={[styles.stepLabel, i === current && styles.stepLabelActive]}
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
  categoryBadge: {
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  categoryText: { fontSize: 15, fontWeight: '600' },
  labelCard: {
    backgroundColor: '#F0F6E8',
    borderRadius: 18,
    padding: 24,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8FAB5A',
  },
  labelFormula: { fontSize: 16, color: '#5A6644', lineHeight: 28 },
  labelHighlight: { fontSize: 18, fontWeight: '700', lineHeight: 32 },
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
  emotionSelected: { backgroundColor: '#EAF2E0', borderColor: '#8FAB5A' },
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
  avoidanceText: { fontSize: 15, color: '#4A5235', textAlign: 'center' },
});
