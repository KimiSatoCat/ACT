/**
 * ホーム画面
 *
 * 設計:
 *  - 今日のワーク種別（ローテーション）を表示
 *  - ワーク開始ボタン → 対応するワーク画面へ遷移
 *  - 過去7日間の完了記録を簡易カレンダーで表示
 *  - スキップは同一ワークを維持（advanceWorkType は呼ばない）
 */

import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useWorkRotation } from '@/hooks/useWorkRotation';
import { useSessionStore } from '@/store/useSessionStore';
import type { WorkType } from '@/types';

// ─── ワーク表示設定 ─────────────────────────────────────────────────────────

const WORK_CONFIG: Record<WorkType, { label: string; icon: string; description: string; route: string }> = {
  shelf: {
    label: '棚に置く',
    icon: '🗄️',
    description: '思考を観察して、棚にそっと置きましょう。',
    route: '/work/shelf',
  },
  label: {
    label: 'ラベルを貼る',
    icon: '🏷️',
    description: '思考に名前をつけて、距離を取りましょう。',
    route: '/work/label',
  },
  river: {
    label: '川に流す',
    icon: '🍃',
    description: '思考を葉っぱの舟に乗せて流しましょう。',
    route: '/work/river',
  },
};

// ─── 日付ユーティリティ ─────────────────────────────────────────────────────

function getLast7Days(): Date[] {
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

// ─── コンポーネント ─────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { todayWorkType, advance } = useWorkRotation();
  const sessions = useSessionStore((s) => s.sessions);
  const startSession = useSessionStore((s) => s.startSession);

  const config = WORK_CONFIG[todayWorkType];
  const last7 = getLast7Days();

  // 今日完了済みのワーク種別
  const today = new Date();
  const completedToday = sessions
    .filter((s) => s.completedAt !== null && isSameDay(new Date(s.completedAt), today))
    .map((s) => s.workType);

  const isAlreadyDone = completedToday.includes(todayWorkType);

  const handleStart = useCallback(() => {
    startSession(todayWorkType);
    router.push(config.route as `/${string}`);
  }, [todayWorkType, config.route, startSession, router]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.greeting}>おはようございます 🌿</Text>
          <Text style={styles.dateText}>
            {today.toLocaleDateString('ja-JP', {
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}
          </Text>
        </View>

        {/* 今日のワーク */}
        <View style={styles.workCard}>
          <Text style={styles.workLabel}>今日のワーク</Text>
          <Text style={styles.workIcon}>{config.icon}</Text>
          <Text style={styles.workTitle}>{config.label}</Text>
          <Text style={styles.workDescription}>{config.description}</Text>

          {isAlreadyDone ? (
            <View style={styles.doneBadge}>
              <Text style={styles.doneText}>✅ 今日は完了しました</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStart}
              activeOpacity={0.8}
            >
              <Text style={styles.startButtonText}>はじめる</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 7日間カレンダー */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>この1週間</Text>
          <View style={styles.calendarRow}>
            {last7.map((day, i) => {
              const completedOnDay = sessions.filter(
                (s) => s.completedAt !== null && isSameDay(new Date(s.completedAt), day),
              );
              const isToday = isSameDay(day, today);

              return (
                <View
                  key={i}
                  style={[styles.dayCell, isToday && styles.dayCellToday]}
                >
                  <Text
                    style={[styles.dayLabel, isToday && styles.dayLabelToday]}
                  >
                    {DAY_LABELS[day.getDay()]}
                  </Text>
                  <Text style={styles.dayNumber}>{day.getDate()}</Text>
                  <View style={styles.dotRow}>
                    {completedOnDay.length > 0 ? (
                      <View style={styles.dot} />
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* 連続日数 */}
        <StreakBanner sessions={sessions} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 連続日数バナー ─────────────────────────────────────────────────────────

function StreakBanner({
  sessions,
}: {
  sessions: ReturnType<typeof useSessionStore.getState>['sessions'];
}) {
  // 連続した日数を計算
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const hasSession = sessions.some(
      (s) => s.completedAt !== null && isSameDay(new Date(s.completedAt), d),
    );
    if (!hasSession) break;
    streak++;
  }

  if (streak === 0) return null;

  return (
    <View style={styles.streakBanner}>
      <Text style={styles.streakIcon}>🔥</Text>
      <Text style={styles.streakText}>
        <Text style={styles.streakNumber}>{streak}</Text>
        {' 日連続で取り組んでいます'}
      </Text>
    </View>
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
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D5016',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#7A8C6A',
  },
  workCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#3D6B20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  workLabel: {
    fontSize: 12,
    color: '#8FAB5A',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  workIcon: {
    fontSize: 52,
    marginBottom: 12,
  },
  workTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D5016',
    marginBottom: 8,
  },
  workDescription: {
    fontSize: 14,
    color: '#5A6644',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: '#5A8C2A',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  doneBadge: {
    backgroundColor: '#EAF2E0',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  doneText: {
    color: '#5A8C2A',
    fontSize: 14,
    fontWeight: '600',
  },
  calendarSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A5235',
    marginBottom: 12,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  dayCellToday: {
    backgroundColor: '#EAF2E0',
  },
  dayLabel: {
    fontSize: 11,
    color: '#9AA88A',
    marginBottom: 4,
  },
  dayLabelToday: {
    color: '#5A8C2A',
    fontWeight: '700',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5235',
    marginBottom: 4,
  },
  dotRow: {
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8FAB5A',
  },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  streakIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  streakText: {
    fontSize: 14,
    color: '#5D4C00',
  },
  streakNumber: {
    fontWeight: '700',
    fontSize: 16,
  },
});
