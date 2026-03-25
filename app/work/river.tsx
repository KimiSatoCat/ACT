/**
 * 川に流すワーク画面
 *
 * フロー:
 *  1. 思考入力
 *  2. クライシス検出
 *  3. 「葉っぱの舟に乗せる」アニメーション表示
 *     — 思考テキストを書いた葉っぱが川を流れる
 *  4. 感情ラベル選択
 *  5. 回避シグナル確認
 *  6. セッション完了 → ball 画面へ
 *
 * アニメーション:
 *  - Animated.timing で葉っぱを右端から消える方向へ移動
 *  - 思考テキストは葉っぱ内に表示
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSessionStore } from '@/store/useSessionStore';
import { detectCrisis } from '@/lib/crisisDetector';
import { categorize } from '@/lib/categorizer';
import { EMOTION_LABELS, EMOTION_ICONS } from '@/constants/emotions';
import type { EmotionLabel, AvoidanceSignal } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Step = 'input' | 'river' | 'emotion' | 'avoidance';

const AVOIDANCE_OPTIONS: { value: AvoidanceSignal; label: string }[] = [
  { value: 'denial', label: 'かなり否定したい・逃げたい' },
  { value: 'erase', label: '少し消し去りたい気持ちがある' },
  { value: 'none', label: 'あまり気にならない' },
];

// ─── コンポーネント ─────────────────────────────────────────────────────────

export default function RiverScreen() {
  const router = useRouter();
  const completeSession = useSessionStore((s) => s.completeSession);
  const abandonSession = useSessionStore((s) => s.abandonSession);

  const [step, setStep] = useState<Step>('input');
  const [rawText, setRawText] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionLabel | null>(null);

  const startTime = useRef(Date.now());
  const leafX = useRef(new Animated.Value(-160)).current;
  const leafY = useRef(new Animated.Value(0)).current;
  const leafOpacity = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fadeIn = useCallback(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // 葉っぱを川に乗せて流すアニメーション
  const animateLeaf = useCallback(() => {
    leafX.setValue(-80);
    leafY.setValue(0);
    leafOpacity.setValue(0);

    Animated.sequence([
      // フェードイン + 右へ流れる
      Animated.parallel([
        Animated.timing(leafOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(leafX, {
          toValue: SCREEN_WIDTH * 0.3,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(leafY, {
            toValue: -10,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(leafY, {
            toValue: 8,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(leafY, {
            toValue: -5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(leafY, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // 右端でフェードアウト
      Animated.parallel([
        Animated.timing(leafOpacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(leafX, {
          toValue: SCREEN_WIDTH,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // アニメーション完了後 → 感情選択ステップへ
      setStep('emotion');
      fadeIn();
    });
  }, [leafX, leafY, leafOpacity, fadeIn]);

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

    setStep('river');
    fadeIn();
    // 少し遅らせてアニメーション開始
    setTimeout(animateLeaf, 600);
  }, [rawText, abandonSession, router, fadeIn, animateLeaf]);

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
        thoughtCategory: categorize(rawText),
        emotionLabel: selectedEmotion,
        avoidanceSignal: avoidance,
        durationSec,
      });
      router.replace('/ball');
    },
    [rawText, selectedEmotion, completeSession, router],
  );

  const handleBack = useCallback(() => {
    if (step === 'input') {
      abandonSession();
      router.back();
    } else if (step === 'river') {
      setStep('input');
    } else if (step === 'emotion') {
      setStep('input');
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
        <View style={styles.navHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>🍃 川に流す</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <StepIndicator
            steps={['入力', '流す', '感情', '確認']}
            current={(['input', 'river', 'emotion', 'avoidance'] as Step[]).indexOf(step)}
          />

          {/* Step 1: 入力 */}
          {step === 'input' && (
            <View>
              <Text style={styles.heading}>今、どんな思考が浮かんでいますか？</Text>
              <Text style={styles.subHeading}>
                思い浮かんだことをそのまま書いてください。
              </Text>
              <TextInput
                style={styles.textInput}
                multiline
                placeholder="例: 友達に嫌われているかもしれない..."
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

          {/* Step 2: 川のアニメーション */}
          {step === 'river' && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={styles.heading}>思考を川に流しましょう</Text>
              <Text style={styles.subHeading}>
                葉っぱの舟に思考を乗せて、川を眺めてください。
              </Text>

              {/* 川のシーン */}
              <View style={styles.riverScene}>
                {/* 川の背景 */}
                <View style={styles.riverBg}>
                  {/* 波の表現 */}
                  <View style={styles.waveRow}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Text key={i} style={styles.waveChar}>〜</Text>
                    ))}
                  </View>
                  <View style={[styles.waveRow, styles.waveRow2]}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Text key={i} style={styles.waveChar}>〜</Text>
                    ))}
                  </View>

                  {/* 葉っぱの舟 */}
                  <Animated.View
                    style={[
                      styles.leaf,
                      {
                        opacity: leafOpacity,
                        transform: [
                          { translateX: leafX },
                          { translateY: leafY },
                        ],
                      },
                    ]}
                  >
                    <Text style={styles.leafEmoji}>🍃</Text>
                    <Text style={styles.leafText} numberOfLines={2}>
                      {rawText.trim().slice(0, 30)}
                      {rawText.trim().length > 30 ? '…' : ''}
                    </Text>
                  </Animated.View>
                </View>
              </View>

              <Text style={styles.hintText}>
                💡 思考は川の流れのように、やってきては去っていきます。
              </Text>
            </Animated.View>
          )}

          {/* Step 3: 感情選択 */}
          {step === 'emotion' && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={styles.heading}>今の感情は？</Text>
              <Text style={styles.subHeading}>
                思考を流してみて、今どんな感情がありますか？
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
  riverScene: {
    marginBottom: 20,
    overflow: 'hidden',
    borderRadius: 20,
  },
  riverBg: {
    height: 160,
    backgroundColor: '#A8D8EA',
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  waveRow: {
    flexDirection: 'row',
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    justifyContent: 'space-around',
  },
  waveRow2: {
    top: 80,
    opacity: 0.5,
  },
  waveChar: {
    fontSize: 28,
    color: 'rgba(255,255,255,0.6)',
  },
  leaf: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
    width: 120,
  },
  leafEmoji: { fontSize: 48 },
  leafText: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    fontSize: 9,
    color: '#2D5016',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 13,
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
