import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDays } from 'date-fns';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';

import { TaskRow } from '@/components/TaskRow';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { dayKey } from '@/lib/dates';
import { suggestNextTask } from '@/lib/taskPlanning';
import { toggleTask } from '@/services/tasks';
import { moveTasks, replanToday, startTimer, type ReplanOffer } from '@/services/timeTracking';
import type { Category } from '@/types/category';
import type { Task } from '@/types/task';
import { useTheme } from '../../theme/ThemeContext';

export function TodayTasks({
  tasks,
  todays,
  categories,
  onChanged,
  onReplan,
  scrollTo,
}: {
  tasks: Task[];
  todays: Task[];
  categories: Category[];
  onChanged: () => void;
  onReplan: (offer: ReplanOffer) => void;
  scrollTo: (y: number) => void;
}) {
  const { theme } = useTheme();
  const router = useRouter();
  const [suggestedId, setSuggestedId] = useState<number | null>(null);
  const [nothing, setNothing] = useState(false);
  const [menuTask, setMenuTask] = useState<Task | null>(null);
  const [pickDayFor, setPickDayFor] = useState<Task | null>(null);
  const [headerMenu, setHeaderMenu] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sectionY, setSectionY] = useState(0);
  const [listY, setListY] = useState(0);
  const [rowY, setRowY] = useState<Record<number, number>>({});

  const open = todays.filter((task) => !task.is_completed);
  const suggested = suggestedId !== null ? (tasks.find((task) => task.id === suggestedId) ?? null) : null;
  const rows = suggested && !todays.some((task) => task.id === suggested.id) ? [suggested, ...todays] : todays;
  const tomorrow = dayKey(addDays(new Date(), 1));

  const suggest = () => {
    const pick = suggestNextTask(tasks);
    setMessage(null);
    setNothing(pick === null);
    setSuggestedId(pick?.id ?? null);
    if (pick) {
      const y = sectionY + listY + (rowY[pick.id] ?? 0);
      setTimeout(() => scrollTo(Math.max(0, y - 12)), 50);
    }
  };

  const toggle = (id: number) => {
    toggleTask(id)
      .then(onChanged)
      .catch(() => undefined);
  };

  const moveOne = async (task: Task, day: string) => {
    setMenuTask(null);
    setPickDayFor(null);
    await moveTasks([task], day, true);
    setMessage(null);
    onChanged();
  };

  const askMove = (task: Task, day: string) => {
    if (!task.is_locked) {
      moveOne(task, day);
      return;
    }
    setMenuTask(null);
    setPickDayFor(null);
    Alert.alert('Locked task', 'This task is locked. Move it anyway?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Move', onPress: () => moveOne(task, day) },
    ]);
  };

  const moveUnfinished = async () => {
    const { moved, locked } = await moveTasks(open, tomorrow);
    setMessage(`Moved ${moved}. Kept ${locked} locked.`);
    onChanged();
  };

  const replan = async () => {
    setHeaderMenu(false);
    const movable = await replanToday();
    if (movable.length === 0) {
      setMessage('Today fits. Nothing to move.');
      return;
    }
    onReplan({ task: null, overMinutes: 0, tasks: movable });
  };

  const textButton = (label: string, onPress: () => void) => (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text
        style={{
          color: theme.colors.accent,
          fontSize: theme.typography.size.body,
          fontFamily: theme.typography.family.semibold,
        }}>
        {label}
      </Text>
    </Pressable>
  );

  const sheetRow = (label: string, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={{ paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontSize: theme.typography.size.body,
          fontFamily: theme.typography.family.medium,
        }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View onLayout={(event) => setSectionY(event.nativeEvent.layout.y)} style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.heading,
            fontFamily: theme.typography.family.bold,
          }}>
          Today {open.length}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
          {textButton('Suggest next', suggest)}
          <Pressable onPress={() => setHeaderMenu(true)} hitSlop={10}>
            <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {nothing ? (
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.typography.size.body,
            fontFamily: theme.typography.family.regular,
          }}>
          Nothing waiting. Nice.
        </Text>
      ) : null}

      <View onLayout={(event) => setListY(event.nativeEvent.layout.y)}>
        {rows.map((task) => (
          <View
            key={task.id}
            onLayout={(event) => {
              const y = event.nativeEvent.layout.y;
              setRowY((current) => (current[task.id] === y ? current : { ...current, [task.id]: y }));
            }}>
            <TaskRow
              task={task}
              category={categories.find((item) => item.id === task.category_id)}
              suggested={task.id === suggestedId}
              onToggle={() => toggle(task.id)}
              onPress={() => router.push(`/tasks/${task.id}`)}
              onMore={() => setMenuTask(task)}
            />
          </View>
        ))}
      </View>

      {message ? (
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.typography.size.caption,
            fontFamily: theme.typography.family.medium,
          }}>
          {message}
        </Text>
      ) : null}

      {open.length ? (
        <View style={{ alignSelf: 'flex-start', paddingVertical: theme.spacing.xs }}>
          {textButton('Move unfinished to tomorrow', moveUnfinished)}
        </View>
      ) : null}

      <Pressable
        onPress={() => router.push(`/tasks/new?date=${dayKey(new Date())}`)}
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

      <BottomSheet visible={menuTask !== null} title={menuTask?.title ?? ''} onClose={() => setMenuTask(null)}>
        {menuTask
          ? [
              sheetRow('Start timer', () => {
                const target = menuTask;
                setMenuTask(null);
                startTimer(target.id)
                  .then(onChanged)
                  .catch(() => undefined);
              }),
              sheetRow('Move to tomorrow', () => askMove(menuTask, tomorrow)),
              sheetRow('Pick a day', () => {
                setPickDayFor(menuTask);
                setMenuTask(null);
              }),
              sheetRow('Edit', () => {
                const target = menuTask;
                setMenuTask(null);
                router.push(`/tasks/${target.id}`);
              }),
            ]
          : null}
      </BottomSheet>

      <BottomSheet visible={headerMenu} title="Today" onClose={() => setHeaderMenu(false)}>
        {sheetRow('Replan today', replan)}
      </BottomSheet>

      {pickDayFor ? (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selected) => {
            const target = pickDayFor;
            if (Platform.OS !== 'ios') setPickDayFor(null);
            if (event.type === 'dismissed' || !selected || !target) return;
            askMove(target, dayKey(selected));
          }}
        />
      ) : null}
    </View>
  );
}
