/**
 * 同意・匿名サインイン画面
 *
 * 設計:
 *  - アプリの目的と個人情報の扱いを説明
 *  - 同意チェック後に匿名 Firebase Auth でサインイン
 *  - 生テキストはデバイス外に出ない旨を明示（プライバシー設計の可視化）
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInAnon } from '@/hooks/useAuth';

// ─── 同意文言 ───────────────────────────────────────────────────────────────

const CONSENT_ITEMS = [
  'このアプリはACT（アクセプタンス＆コミットメント・セラピー）の理論に基づいた自己成長ツールです。医療行為ではありません。',
  'あなたが入力した思考テキストは端末内でのみ処理され、外部サーバーには送信されません。',
  'アプリが収集するのは「思考のカテゴリ」「感情ラベル」「ワーク完了状況」のみです。',
  '危機的な状態が検出された場合、適切なサポート情報をご案内します。',
  '本ツールは精神科・心療内科の治療の代替ではありません。必要に応じて専門家にご相談ください。',
] as const;

// ─── コンポーネント ─────────────────────────────────────────────────────────

export default function AuthScreen() {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!agreed) return;
    setLoading(true);
    try {
      await signInAnon();
      // AuthGuard が自動でホームへリダイレクト
    } catch (e) {
      console.error('Sign in failed:', e);
      Alert.alert(
        'エラー',
        '接続に失敗しました。インターネット接続を確認してください。',
      );
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.logo}>🌿</Text>
          <Text style={styles.title}>こころの柔軟体操</Text>
          <Text style={styles.subtitle}>
            思考との距離を、少しだけ広げてみましょう。
          </Text>
        </View>

        {/* 同意事項 */}
        <View style={styles.consentBox}>
          <Text style={styles.consentTitle}>はじめる前に</Text>
          {CONSENT_ITEMS.map((item, i) => (
            <View key={i} style={styles.consentItem}>
              <Text style={styles.consentBullet}>・</Text>
              <Text style={styles.consentText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* 同意チェック */}
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setAgreed((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkLabel}>上記の内容を理解し、同意します</Text>
        </TouchableOpacity>

        {/* 開始ボタン */}
        <TouchableOpacity
          style={[styles.button, !agreed && styles.buttonDisabled]}
          onPress={handleStart}
          disabled={!agreed || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>はじめる</Text>
          )}
        </TouchableOpacity>
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
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 24,
  },
  logo: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D5016',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#5A6644',
    textAlign: 'center',
    lineHeight: 22,
  },
  consentBox: {
    backgroundColor: '#F0F4E8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  consentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D5016',
    marginBottom: 12,
  },
  consentItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  consentBullet: {
    color: '#5A6644',
    marginRight: 4,
    fontSize: 14,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    color: '#4A5235',
    lineHeight: 20,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#8FAB5A',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#8FAB5A',
    borderColor: '#8FAB5A',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  checkLabel: {
    fontSize: 14,
    color: '#4A5235',
    flex: 1,
  },
  button: {
    backgroundColor: '#5A8C2A',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#B5C9A0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
