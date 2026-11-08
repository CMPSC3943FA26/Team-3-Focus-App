import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusPill } from '@/components/ui/StatusPill';
import { parseLocal } from '@/lib/dates';
import { formatDuration, minutesLoggedOn, PACE_LABELS, PACE_URGENCY, paceFor } from '@/lib/pace';
import { urgencyColors } from '@/lib/urgency';
import { startTimer, stopTimer, type ReplanOffer } from '@/services/timeTracking';
import type { Task } from '@/types/task';
import type { TimeEntry } from '@/types/timeEntry';
import { useTheme } from '../../theme/ThemeContext';

function clockOf(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

function PulsingDot() {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width: 10,
        height: 10,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.calm,
        opacity,
      }}
    />
  );
}

export function TodayCard({
  entries,
  running,
  tasks,
  openTasks,
  target,
  onChanged,
  onReplan,
}: {
  entries: TimeEntry[];
  running: TimeEntry | null;
  tasks: Task[];
  openTasks: Task[];
  target: number;
  onChanged: () => void;
  onReplan: (offer: ReplanOffer) => void;
}) {
  const { theme } = useTheme();
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNow(new Date());
    if (!running) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [running, entries]);

  const logged = minutesLoggedOn(entries, now, now);
  const pace = paceFor(logged, target, now);
  const paceUrgency = PACE_URGENCY[pace.status];
  const runningTask = running ? tasks.find((task) => task.id === running.task_id) : null;
  const elapsed = running
    ? Math.max(0, Math.floor((now.getTime() - parseLocal(running.started_at).getTime()) / 1000))
    : 0;

  const start = async (taskId: number | null) => {
    setPicking(false);
    setBusy(true);
    try {
      await startTimer(taskId);
    } finally {
      setBusy(false);
      onChanged();
    }
  };

  const stop = async () => {
    setBusy(true);
    try {
      const offer = await stopTimer();
      if (offer) onReplan(offer);
    } finally {
      setBusy(false);
      onChanged();
    }
  };

  const caption = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.caption,
    fontFamily: theme.typography.family.medium,
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={caption}>Today</Text>
        <Text style={caption}>
          {openTasks.length} open {openTasks.length === 1 ? 'task' : 'tasks'}
        </Text>
      </View>

      <Text
        style={{
          color: theme.colors.textPrimary,
          fontSize: theme.typography.size.display,
          fontFamily: theme.typography.family.bold,
          marginTop: theme.spacing.sm,
        }}>
        {formatDuration(logged)}
      </Text>
      <Text style={{ ...caption, marginTop: theme.spacing.xs }}>of {formatDuration(target)} target</Text>

      <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md }}>
        <ProgressBar progress={pace.progress} color={urgencyColors(theme.colors, paceUrgency).base} />
        <StatusPill label={PACE_LABELS[pace.status]} urgency={paceUrgency} />
      </View>

      <View style={{ marginTop: theme.spacing.lg }}>
        {running ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <PulsingDot />
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.body,
                fontFamily: theme.typography.family.medium,
              }}>
              {runningTask?.title ?? 'No task'}
            </Text>
            <Text
              style={{
                color: theme.colors.calmText,
                fontSize: theme.typography.size.body,
                fontFamily: theme.typography.family.semibold,
              }}>
              {clockOf(elapsed)}
            </Text>
            <Pressable
              onPress={stop}
              disabled={busy}
              style={{
                height: 44,
                justifyContent: 'center',
                paddingHorizontal: theme.spacing.xl,
                borderRadius: theme.radius.pill,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.body,
                  fontFamily: theme.typography.family.semibold,
                }}>
                Stop
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setPicking(true)}
            disabled={busy}
            style={{
              alignSelf: 'flex-start',
              height: 44,
              justifyContent: 'center',
              paddingHorizontal: theme.spacing.xl,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.accent,
            }}>
            <Text
              style={{
                color: theme.colors.accentText,
                fontSize: theme.typography.size.body,
                fontFamily: theme.typography.family.semibold,
              }}>
              Start timer
            </Text>
          </Pressable>
        )}
      </View>

      <Pressable onPress={() => router.push('/time-log')} style={{ marginTop: theme.spacing.lg }}>
        <Text
          style={{
            color: theme.colors.accent,
            fontSize: theme.typography.size.body,
            fontFamily: theme.typography.family.semibold,
          }}>
          See today&apos;s log
        </Text>
      </Pressable>

      <BottomSheet visible={picking} title="Start timer on" onClose={() => setPicking(false)}>
        {[{ id: null as number | null, title: 'No task' }, ...openTasks.map((task) => ({ id: task.id, title: task.title }))].map(
          (option) => (
            <Pressable
              key={option.id ?? 'none'}
              onPress={() => start(option.id)}
              style={{
                paddingVertical: theme.spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.body,
                  fontFamily: theme.typography.family.medium,
                }}>
                {option.title}
              </Text>
            </Pressable>
          ),
        )}
      </BottomSheet>
    </Card>
  );
}
