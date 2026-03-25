/**
 * EmotionSelector コンポーネント
 *
 * Russell Circumplex Model に基づく 12語感情選択グリッド。
 * 各ワーク画面の感情ラベル選択ステップで使用する共有コンポーネント。
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { EMOTION_LABELS, EMOTION_ICONS } from '@/constants/emotions';
import type { EmotionLabel } from '@/types';

interface EmotionSelectorProps {
  selected: EmotionLabel | null;
  onSelect: (label: EmotionLabel) => void;
}

export function EmotionSelector({ selected, onSelect }: EmotionSelectorProps) {
  return (
    <View style={styles.grid}>
      {EMOTION_LABELS.map((label) => (
        <TouchableOpacity
          key={label}
          style={[
            styles.item,
            selected === label && styles.itemSelected,
          ]}
          onPress={() => onSelect(label)}
          activeOpacity={0.7}
        >
          <Text style={styles.icon}>{EMOTION_ICONS[label]}</Text>
          <Text style={[styles.label, selected === label && styles.labelSelected]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  item: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D0DCC0',
  },
  itemSelected: {
    backgroundColor: '#EAF2E0',
    borderColor: '#8FAB5A',
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#4A5235',
    fontWeight: '500',
  },
  labelSelected: {
    color: '#2D5016',
    fontWeight: '700',
  },
});
