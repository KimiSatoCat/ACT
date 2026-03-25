/**
 * 同意・Google サインイン画面
 *
 * 設計:
 *  - アプリの目的と個人情報の扱いを説明
 *  - 同意チェック後に Google アカウントでサインイン
 *  - データはデバイスと自分の Google アカウントに紐づいて保存
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGoogleSignIn } from '@/hooks/useAuth';

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
  const { promptAsync, loading } = useGoogleSignIn();

  const handleGoogleSignIn = async () => {
    if (!agreed || loading) return;
    await promptAsync();
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

        {/* Google Sign-In ボタン */}
        <TouchableOpacity
          style={[styles.googleButton, !agreed && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={!agreed || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#555" />
          ) : (
            <View style={styles.googleInner}>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>Google アカウントではじめる</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          Google アカウントでサインインすることで、端末を変えてもデータが引き継がれます。
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
    marginBottom: 24,
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
  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DADCE0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  googleInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3C4043',
  },
  note: {
    fontSize: 12,
    color: '#8A9A7A',
    textAlign: 'center',
    lineHeight: 18,
  },
});
