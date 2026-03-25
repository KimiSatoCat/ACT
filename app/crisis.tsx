/**
 * クライシス画面
 *
 * 設計原則:
 *  - バックスワイプ無効（_layout.tsx で gestureEnabled: false）
 *  - 医療的・診断的言語を避け「一緒に考える」姿勢
 *  - 相談窓口情報を常に表示
 *  - セッションは記録しない（abandonSession を呼ぶ）
 *  - クライシスイベントはサーバーに匿名記録（パターンのみ）
 */

import { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSessionStore } from '@/store/useSessionStore';
import { recordCrisisEvent } from '@/lib/api';

// ─── 相談窓口情報 ────────────────────────────────────────────────────────────

const SUPPORT_LINES = [
  {
    name: 'よりそいホットライン',
    number: '0120-279-338',
    hours: '24時間・無料',
    tel: 'tel:0120279338',
  },
  {
    name: 'いのちの電話',
    number: '0120-783-556',
    hours: '毎日16時〜21時、毎月10日は8時〜翌8時',
    tel: 'tel:0120783556',
  },
  {
    name: '子ども・若者総合相談センター',
    number: '0120-279-338',
    hours: '24時間（よりそいホットライン）',
    tel: 'tel:0120279338',
  },
] as const;

// ─── コンポーネント ─────────────────────────────────────────────────────────

export default function CrisisScreen() {
  const router = useRouter();
  const { patterns } = useLocalSearchParams<{ patterns?: string }>();
  const abandonSession = useSessionStore((s) => s.abandonSession);

  // クライシスイベントをサーバーに匿名記録
  useEffect(() => {
    const matched = patterns ? patterns.split(',') : [];
    if (matched.length > 0) {
      recordCrisisEvent({
        detectedAt: new Date().toISOString(),
        matchedPatterns: matched,
      }).catch((err) => {
        // ネットワークエラーは無視（ユーザー体験を阻害しない）
        console.warn('Crisis event record failed:', err);
      });
    }

    // セッションを破棄
    abandonSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCall = useCallback(async (tel: string, name: string) => {
    const supported = await Linking.canOpenURL(tel);
    if (supported) {
      Alert.alert(name, `${name} に電話しますか？`, [
        { text: 'キャンセル', style: 'cancel' },
        { text: '電話する', onPress: () => Linking.openURL(tel) },
      ]);
    }
  }, []);

  const handleReturn = useCallback(() => {
    router.replace('/');
  }, [router]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* メッセージ */}
        <View style={styles.messageCard}>
          <Text style={styles.heartIcon}>🤝</Text>
          <Text style={styles.mainMessage}>
            今、つらい気持ちを抱えているのですね。
          </Text>
          <Text style={styles.subMessage}>
            一人で抱え込まずに、話を聴いてくれる人に連絡してみませんか。
            {'\n\n'}
            以下の窓口は、今すぐ無料で話を聴いてもらえます。
          </Text>
        </View>

        {/* 相談窓口リスト */}
        <Text style={styles.sectionTitle}>相談窓口</Text>
        {SUPPORT_LINES.map((line, i) => (
          <TouchableOpacity
            key={i}
            style={styles.supportCard}
            onPress={() => handleCall(line.tel, line.name)}
            activeOpacity={0.7}
          >
            <View style={styles.supportInfo}>
              <Text style={styles.supportName}>{line.name}</Text>
              <Text style={styles.supportNumber}>{line.number}</Text>
              <Text style={styles.supportHours}>{line.hours}</Text>
            </View>
            <View style={styles.callButton}>
              <Text style={styles.callIcon}>📞</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* ホームへ戻る */}
        <TouchableOpacity
          style={styles.returnButton}
          onPress={handleReturn}
          activeOpacity={0.7}
        >
          <Text style={styles.returnText}>ホームに戻る</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          このアプリは医療サービスではありません。{'\n'}
          緊急の場合は 119（救急）または 110（警察）にご連絡ください。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── スタイル ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAFAF7',
  },
  scroll: {
    padding: 20,
    paddingBottom: 48,
  },
  messageCard: {
    backgroundColor: '#FFF8F0',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#FFD6A0',
  },
  heartIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  mainMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7A3B00',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 28,
  },
  subMessage: {
    fontSize: 14,
    color: '#6B4C2A',
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A5235',
    marginBottom: 12,
  },
  supportCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  supportInfo: {
    flex: 1,
  },
  supportName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3A28',
    marginBottom: 4,
  },
  supportNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A6B4A',
    marginBottom: 2,
  },
  supportHours: {
    fontSize: 12,
    color: '#7A8C6A',
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EAF6EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  callIcon: {
    fontSize: 22,
  },
  returnButton: {
    marginTop: 16,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#8FAB5A',
    alignItems: 'center',
  },
  returnText: {
    color: '#5A8C2A',
    fontSize: 15,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    color: '#9AA88A',
    textAlign: 'center',
    lineHeight: 18,
  },
});
