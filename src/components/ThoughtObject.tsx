/**
 * ThoughtObject コンポーネント
 *
 * 思考テキストをビジュアル的に表現する共有コンポーネント。
 * 認知的距離化フォーマット「私は今、〇〇という考えを持っている」を表示する。
 *
 * 使用箇所: 各ワーク画面の defusion ステップ
 */

import { View, Text, StyleSheet } from 'react-native';

interface ThoughtObjectProps {
  text: string;
  /** 表示モード: 'shelf' | 'label' | 'river' */
  mode?: 'shelf' | 'label' | 'river';
  /** カテゴリラベル（labelモード時に表示） */
  categoryLabel?: string;
  categoryColor?: string;
  categoryBg?: string;
}

export function ThoughtObject({
  text,
  mode = 'shelf',
  categoryLabel,
  categoryColor = '#5A8C2A',
  categoryBg = '#EAF2E0',
}: ThoughtObjectProps) {
  if (mode === 'label' && categoryLabel) {
    return (
      <View style={styles.card}>
        <View style={[styles.badge, { backgroundColor: categoryBg }]}>
          <Text style={[styles.badgeText, { color: categoryColor }]}>
            🏷️ {categoryLabel}
          </Text>
        </View>
        <Text style={styles.prefix}>私はいま、</Text>
        <Text style={[styles.highlight, { color: categoryColor }]}>
          「{categoryLabel}」
        </Text>
        <Text style={styles.suffix}>という思考にラベルを貼っている。</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.prefix}>私は今、</Text>
      <Text style={styles.thought}>「{text.trim()}」</Text>
      <Text style={styles.suffix}>という考えを持っている。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F0F6E8',
    borderRadius: 18,
    padding: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#8FAB5A',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  prefix: {
    fontSize: 15,
    color: '#5A6644',
    lineHeight: 24,
  },
  thought: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2D5016',
    lineHeight: 28,
  },
  highlight: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 28,
  },
  suffix: {
    fontSize: 15,
    color: '#5A6644',
    lineHeight: 24,
  },
});
