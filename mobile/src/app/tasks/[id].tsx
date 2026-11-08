import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDays, format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { PillGroup } from '@/components/ui/PillGroup';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SettingRow } from '@/components/ui/SettingRow';
import { offsetsFor, shortOffsets, TIER_LABELS } from '@/constants/reminders';
import { apiErrorMessage } from '@/lib/api';
import { dayKey, formatClock, parseLocal, toLocalIso } from '@/lib/dates';
import { formatDuration } from '@/lib/pace';
import { loggedMinutesByTask } from '@/lib/taskPlanning';
import { listCategories } from '@/services/categories';
import { listGoals } from '@/services/goals';
import { getReminderPrefs, type ReminderPrefs, DEFAULT_REMINDER_PREFS } from '@/services/reminderPrefs';
import { createTask, deleteTask, getTask, updateTask } from '@/services/tasks';
import { listTimeEntries } from '@/services/timeTracking';
import type { Category } from '@/types/category';
import type { Goal } from '@/types/goal';
import { PRIORITIES, type TaskPriority } from '@/types/task';
import { useTheme } from '../../../theme/ThemeContext';

type Plan = 'today' | 'tomorrow' | 'day' | 'none';
type PickerTarget = 'plan' | 'due-date' | 'due-time' | null;

const PLAN_OPTIONS: { value: Plan; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'day', label: 'Pick a day' },
  { value: 'none', label: 'None' },
];

const PRIORITY_LABELS: Record<TaskPriority, string> = { low: 'Low', medium: 'Medium', high: 'High' };

function planFor(key: string | null, now: Date): { plan: Plan; day: Date } {
  if (!key) return { plan: 'none', day: now };
  const day = parseLocal(`${key}T00:00:00`);
  if (key === dayKey(now)) return { plan: 'today', day };
  if (key === dayKey(addDays(now, 1))) return { plan: 'tomorrow', day };
  return { plan: 'day', day };
}

export default function TaskFormScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id, date, goal } = useLocalSearchParams<{ id: string; date?: string; goal?: string }>();
  const isNew = id === 'new';
  const taskId = Number(id);

  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<PickerTarget>(null);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_REMINDER_PREFS);
  const [logged, setLogged] = useState(0);

  const [title, setTitle] = useState('');
  const [goalId, setGoalId] = useState<number | null>(goal ? Number(goal) : null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [plan, setPlan] = useState<Plan>(() => planFor(date ?? null, new Date()).plan);
  const [planDay, setPlanDay] = useState<Date>(() => planFor(date ?? null, new Date()).day);
  const [due, setDue] = useState<Date | null>(null);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [locked, setLocked] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [loadedGoals, loadedCategories, loadedPrefs] = await Promise.all([
        listGoals().catch(() => []),
        listCategories().catch(() => []),
        getReminderPrefs(),
      ]);
      setGoals(loadedGoals);
      setCategories(loadedCategories);
      setPrefs(loadedPrefs);
      if (isNew) return;
      const task = await getTask(taskId);
      if (!task) {
        setMissing(true);
        return;
      }
      const planned = planFor(task.scheduled_date, new Date());
      setTitle(task.title);
      setGoalId(task.goal_id);
      setCategoryId(task.category_id);
      setPlan(planned.plan);
      setPlanDay(planned.day);
      setDue(task.due_date ? parseLocal(task.due_date) : null);
      setEstimate(task.estimated_minutes);
      setPriority(task.priority);
      setLocked(task.is_locked);
      setCompleted(task.is_completed);
      const totals = loggedMinutesByTask(await listTimeEntries().catch(() => []));
      setLogged(totals[task.id] ?? 0);
    };
    load()
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, [taskId, isNew]);

  const scheduledKey = (): string | null => {
    const now = new Date();
    if (plan === 'today') return dayKey(now);
    if (plan === 'tomorrow') return dayKey(addDays(now, 1));
    if (plan === 'day') return dayKey(planDay);
    return null;
  };

  const onSave = async () => {
    if (!title.trim()) {
      setTitleError('Give the task a title.');
      return;
    }
    setTitleError(null);
    setSaving(true);
    const payload = {
      title: title.trim(),
      goal_id: goalId,
      category_id: categoryId,
      due_date: due ? toLocalIso(due) : null,
      is_completed: completed,
      is_locked: locked,
      scheduled_date: scheduledKey(),
      estimated_minutes: estimate,
      priority,
    };
    try {
      setSaveError(null);
      if (isNew) await createTask(payload);
      else await updateTask(taskId, payload);
      router.back();
    } catch (error) {
      setSaveError(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    Alert.alert('Delete task', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteTask(taskId)
            .then(() => router.back())
            .catch((error) => setSaveError(apiErrorMessage(error)));
        },
      },
    ]);
  };

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  if (missing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
        <View style={{ padding: theme.spacing.xl }}>
          <ScreenHeader title="Task" />
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.size.body,
              fontFamily: theme.typography.family.regular,
            }}>
            This task no longer exists
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const fieldLabel = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.caption,
    fontFamily: theme.typography.family.medium,
  };

  const inputStyle = {
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.size.body,
    fontFamily: theme.typography.family.regular,
  };

  const linkText = {
    color: theme.colors.accent,
    fontSize: theme.typography.size.body,
    fontFamily: theme.typography.family.semibold,
  };

  const bigValue = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.size.heading,
    fontFamily: theme.typography.family.semibold,
  };

  const category = categories.find((item) => item.id === categoryId) ?? null;
  const tier = category?.reminder_tier ?? prefs.default_tier;
  const offsets = category?.reminder_tier
    ? offsetsFor({ frequency_tier: category.reminder_tier, custom_offsets: category.custom_offsets })
    : offsetsFor({ frequency_tier: prefs.default_tier, custom_offsets: prefs.default_custom_offsets });

  const pill = (label: string, active: boolean, onPress: () => void, dot?: string) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        height: 48,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: active ? theme.colors.accent : theme.colors.border,
        backgroundColor: active ? theme.colors.accent : 'transparent',
      }}>
      {dot ? <View style={{ width: 10, height: 10, borderRadius: theme.radius.pill, backgroundColor: dot }} /> : null}
      <Text
        style={{
          color: active ? theme.colors.accentText : theme.colors.textPrimary,
          fontSize: theme.typography.size.body,
          fontFamily: theme.typography.family.medium,
        }}>
        {label}
      </Text>
    </Pressable>
  );

  const pickerValue = picker === 'plan' ? planDay : (due ?? new Date());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 140, gap: theme.spacing.lg }}>
          <ScreenHeader title={isNew ? 'New task' : 'Edit task'} />

          <Card>
            <Text style={fieldLabel}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What needs doing?"
              placeholderTextColor={theme.colors.textSecondary}
              style={inputStyle}
            />
            {titleError ? (
              <Text
                style={{
                  color: theme.colors.danger,
                  fontSize: theme.typography.size.caption,
                  fontFamily: theme.typography.family.regular,
                  marginTop: theme.spacing.sm,
                }}>
                {titleError}
              </Text>
            ) : null}
          </Card>

          <Card>
            <Text style={[fieldLabel, { marginBottom: theme.spacing.md }]}>Goal</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              {pill('None', goalId === null, () => setGoalId(null))}
              {goals.map((item) => pill(item.title, goalId === item.id, () => setGoalId(item.id)))}
            </View>
          </Card>

          <Card>
            <Text style={[fieldLabel, { marginBottom: theme.spacing.md }]}>Type</Text>
            {categories.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                {pill('None', categoryId === null, () => setCategoryId(null))}
                {categories.map((item) => pill(item.name, categoryId === item.id, () => setCategoryId(item.id), item.color))}
              </View>
            ) : (
              <Pressable onPress={() => router.push('/task-types')}>
                <Text style={linkText}>No task types yet. Add some</Text>
              </Pressable>
            )}
          </Card>

          <Card>
            <Text style={[fieldLabel, { marginBottom: theme.spacing.md }]}>Plan for</Text>
            <PillGroup
              options={PLAN_OPTIONS}
              selected={[plan]}
              onSelect={(value) => {
                setPlan(value);
                if (value === 'day') setPicker('plan');
              }}
            />
            {plan === 'day' ? (
              <Pressable onPress={() => setPicker('plan')} style={{ marginTop: theme.spacing.md }}>
                <Text style={bigValue}>{format(planDay, 'EEEE, MMM d')}</Text>
              </Pressable>
            ) : null}
          </Card>

          <Card>
            <Text style={fieldLabel}>Due</Text>
            <Text style={{ ...bigValue, marginTop: theme.spacing.xs }}>
              {due ? `${format(due, 'EEE, MMM d')} at ${formatClock(due)}` : 'No due time'}
            </Text>
            <View style={{ flexDirection: 'row', gap: theme.spacing.xl, marginTop: theme.spacing.md }}>
              <Pressable onPress={() => setPicker('due-date')}>
                <Text style={linkText}>{due ? 'Change date' : 'Set due date'}</Text>
              </Pressable>
              {due ? (
                <Pressable onPress={() => setPicker('due-time')}>
                  <Text style={linkText}>Change time</Text>
                </Pressable>
              ) : null}
              {due ? (
                <Pressable onPress={() => setDue(null)}>
                  <Text style={{ ...linkText, color: theme.colors.textSecondary }}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
          </Card>

          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={fieldLabel}>Estimate</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Pressable
                  onPress={() => setEstimate((value) => (value === null || value <= 5 ? null : value - 5))}
                  hitSlop={8}>
                  <Ionicons name="remove-circle-outline" size={28} color={theme.colors.accent} />
                </Pressable>
                <Text style={{ ...bigValue, minWidth: 80, textAlign: 'center' }}>
                  {estimate === null ? 'None' : formatDuration(estimate)}
                </Text>
                <Pressable onPress={() => setEstimate((value) => Math.min(1440, (value ?? 0) + 5))} hitSlop={8}>
                  <Ionicons name="add-circle-outline" size={28} color={theme.colors.accent} />
                </Pressable>
              </View>
            </View>
          </Card>

          <Card>
            <Text style={[fieldLabel, { marginBottom: theme.spacing.md }]}>Priority</Text>
            <PillGroup
              options={PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value] }))}
              selected={[priority]}
              onSelect={setPriority}
            />
          </Card>

          <Card>
            <SettingRow
              title="Lock"
              description="Locked tasks never move when your day is replanned"
              control={<Switch value={locked} onValueChange={setLocked} trackColor={{ true: theme.colors.accent }} />}
            />
          </Card>

          <Card>
            <Text style={fieldLabel}>Reminders</Text>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.body,
                fontFamily: theme.typography.family.regular,
                marginTop: theme.spacing.xs,
              }}>
              {due ? `${TIER_LABELS[tier]} · ${shortOffsets(offsets)}` : 'Set a due time to get reminders'}
            </Text>
          </Card>

          {!isNew ? (
            <Card>
              <Text style={fieldLabel}>Time logged</Text>
              <Text style={{ ...bigValue, marginTop: theme.spacing.xs }}>{formatDuration(logged)}</Text>
              <Pressable onPress={() => router.push('/time-log')} style={{ marginTop: theme.spacing.md }}>
                <Text style={linkText}>See the log</Text>
              </Pressable>
            </Card>
          ) : null}

          {!isNew ? (
            <Pressable onPress={onDelete} style={{ alignItems: 'center', paddingVertical: theme.spacing.md }}>
              <Text
                style={{
                  color: theme.colors.danger,
                  fontSize: theme.typography.size.body,
                  fontFamily: theme.typography.family.semibold,
                }}>
                Delete task
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>

        {picker ? (
          <DateTimePicker
            value={pickerValue}
            mode={picker === 'due-time' ? 'time' : 'date'}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selected) => {
              const target = picker;
              if (Platform.OS !== 'ios') setPicker(null);
              if (event.type === 'dismissed' || !selected) return;
              if (target === 'plan') setPlanDay(selected);
              if (target === 'due-date') {
                const next = new Date(selected);
                const base = due ?? new Date();
                next.setHours(due ? base.getHours() : 17, due ? base.getMinutes() : 0, 0, 0);
                setDue(next);
              }
              if (target === 'due-time') setDue(selected);
            }}
          />
        ) : null}

        <View style={{ position: 'absolute', left: theme.spacing.xl, right: theme.spacing.xl, bottom: theme.spacing.xl }}>
          {saveError ? (
            <Text
              style={{
                color: theme.colors.danger,
                fontSize: theme.typography.size.caption,
                fontFamily: theme.typography.family.medium,
                marginBottom: theme.spacing.sm,
                textAlign: 'center',
              }}>
              {saveError}
            </Text>
          ) : null}
          <PrimaryButton label="Save task" onPress={onSave} disabled={saving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
