import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TaskRow } from '@/components/TaskRow';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Fab } from '@/components/ui/Fab';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { parseLocal, weekDays } from '@/lib/dates';
import {
  byMostUrgent,
  GOAL_STATUS_LABELS,
  GOAL_STATUS_URGENCY,
  goalStatus,
  type GoalStatus,
} from '@/lib/goalStatus';
import { describeDue, dueUrgency, urgencyColors } from '@/lib/urgency';
import { listCategories } from '@/services/categories';
import { listGoals } from '@/services/goals';
import { listTasks, toggleTask } from '@/services/tasks';
import type { Category } from '@/types/category';
import type { Goal } from '@/types/goal';
import type { Task } from '@/types/task';
import { useTheme } from '../../../theme/ThemeContext';

export default function GoalsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(() => {
    Promise.all([listGoals(), listTasks(), listCategories()])
      .then(([loadedGoals, loadedTasks, loadedCategories]) => {
        setGoals(loadedGoals);
        setTasks(loadedTasks);
        setCategories(loadedCategories);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const now = new Date();
  const items = useMemo(() => {
    const decorated = goals.map((goal) => {
      const own = tasks.filter((task) => task.goal_id === goal.id);
      return { goal, tasks: own, status: goalStatus(goal, own) };
    });
    return {
      active: decorated.filter((item) => item.status !== 'done').sort((a, b) => byMostUrgent(a.goal, b.goal)),
      done: decorated.filter((item) => item.status === 'done'),
    };
  }, [goals, tasks]);

  const counts: Record<GoalStatus, number> = { done: 0, on_pace: 0, behind: 0, overdue: 0 };
  for (const item of items.active) counts[item.status] += 1;
  const days = weekDays(now);

  const onToggle = (id: number) => {
    toggleTask(id)
      .then(refresh)
      .catch(() => setFailed(true));
  };

  const caption = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.caption,
    fontFamily: theme.typography.family.medium,
  };

  const renderGoal = ({ goal, tasks: own, status }: (typeof items.active)[number]) => {
    const total = own.length;
    const finished = own.filter((task) => task.is_completed).length;
    const share = total ? finished / total : 0;
    const statusUrgency = GOAL_STATUS_URGENCY[status];
    const target = goal.target_date ? parseLocal(`${goal.target_date}T23:59:00`) : null;
    const dueColors = target && status !== 'done' ? urgencyColors(theme.colors, dueUrgency(target, now)) : null;

    return (
      <Card key={goal.id} style={{ padding: theme.spacing.xl }}>
        <Pressable onPress={() => router.push(`/goals/${goal.id}`)}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.heading,
                  fontFamily: theme.typography.family.bold,
                }}>
                {goal.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xs }}>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={dueColors?.base ?? theme.colors.textSecondary}
                />
                <Text style={{ ...caption, color: dueColors?.text ?? theme.colors.textSecondary }}>
                  {target ? describeDue(target, now) : 'No target date'}
                </Text>
              </View>
            </View>
            <StatusPill label={GOAL_STATUS_LABELS[status]} urgency={statusUrgency} />
          </View>
        </Pressable>

        <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.sm }}>
          <ProgressBar progress={share} color={urgencyColors(theme.colors, statusUrgency).base} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={caption}>
              {finished} of {total} tasks
            </Text>
            <Text style={caption}>{Math.round(share * 100)}%</Text>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.md }} />

        {own.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            category={categories.find((item) => item.id === task.category_id)}
            onToggle={() => onToggle(task.id)}
            onPress={() => router.push(`/tasks/${task.id}`)}
          />
        ))}

        <Pressable
          onPress={() => router.push(`/tasks/new?goal=${goal.id}`)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.md }}>
          <Ionicons name="add-circle-outline" size={22} color={theme.colors.accent} />
          <Text
            style={{
              color: theme.colors.accent,
              fontSize: theme.typography.size.body,
              fontFamily: theme.typography.family.semibold,
            }}>
            Add task
          </Text>
        </Pressable>
      </Card>
    );
  };

  const legend = (status: GoalStatus) => (
    <View key={status} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: theme.radius.pill,
          backgroundColor: urgencyColors(theme.colors, GOAL_STATUS_URGENCY[status]).base,
        }}
      />
      <Text style={caption}>
        {GOAL_STATUS_LABELS[status]} {counts[status]}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 120, gap: theme.spacing.lg }}>
        <ScreenHeader title="Goals" showBack={false} />

        {failed ? <ErrorBanner message="Can't reach the server" onRetry={refresh} /> : null}

        <Card>
          <Text style={caption}>This week</Text>
          <Text style={{ ...caption, marginTop: 2 }}>
            {format(days[0], 'MMM d')} - {format(days[6], 'MMM d')}
          </Text>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.title,
              fontFamily: theme.typography.family.bold,
              marginTop: theme.spacing.sm,
            }}>
            {counts.on_pace} of {items.active.length} goals on pace
          </Text>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: theme.spacing.lg }}>
            {items.active.length ? (
              items.active.map((item) => (
                <View
                  key={item.goal.id}
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: theme.radius.pill,
                    backgroundColor: urgencyColors(theme.colors, GOAL_STATUS_URGENCY[item.status]).base,
                  }}
                />
              ))
            ) : (
              <View style={{ flex: 1, height: 8, borderRadius: theme.radius.pill, backgroundColor: theme.colors.border }} />
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: theme.spacing.lg, marginTop: theme.spacing.md }}>
            {(['on_pace', 'behind', 'overdue'] as GoalStatus[]).map(legend)}
          </View>
        </Card>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.heading,
              fontFamily: theme.typography.family.bold,
            }}>
            Active {items.active.length}
          </Text>
          <Text style={caption}>Most urgent first</Text>
        </View>

        {items.active.length === 0 ? (
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.size.body,
              fontFamily: theme.typography.family.regular,
              textAlign: 'center',
              paddingVertical: theme.spacing.xl,
            }}>
            No active goals
          </Text>
        ) : (
          items.active.map(renderGoal)
        )}

        {items.done.length ? (
          <>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.heading,
                fontFamily: theme.typography.family.bold,
              }}>
              Done {items.done.length}
            </Text>
            {items.done.map(renderGoal)}
          </>
        ) : null}
      </ScrollView>

      <Fab label="New goal" onPress={() => router.push('/goals/new')} />
    </SafeAreaView>
  );
}
