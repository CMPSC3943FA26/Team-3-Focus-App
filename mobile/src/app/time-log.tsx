import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isToday } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Fab } from '@/components/ui/Fab';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { apiErrorMessage } from '@/lib/api';
import { addDays, formatClock, parseLocal, startOfDay, toLocalIso } from '@/lib/dates';
import { formatDuration, minutesLoggedOn } from '@/lib/pace';
import { listTasks } from '@/services/tasks';
import {
  createTimeEntry,
  deleteTimeEntry,
  listTimeEntriesOn,
  updateTimeEntry,
} from '@/services/timeTracking';
import type { Task } from '@/types/task';
import type { TimeEntry } from '@/types/timeEntry';
import { useTheme } from '../../theme/ThemeContext';

type Editing = { entry: TimeEntry | null };
type PickerTarget = 'start' | 'end' | null;

function clockOf(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export default function TimeLogScreen() {
  const { theme } = useTheme();
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const [editing, setEditing] = useState<Editing | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState<Date | null>(null);
  const [note, setNote] = useState('');
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dayIso = format(day, 'yyyy-MM-dd');

  const refresh = useCallback(() => {
    Promise.all([listTimeEntriesOn(dayIso), listTasks()])
      .then(([loadedEntries, loadedTasks]) => {
        setEntries(loadedEntries);
        setTasks(loadedTasks);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [dayIso]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const running = entries.find((entry) => entry.ended_at === null) ?? null;

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const titleOf = (id: number | null) => tasks.find((task) => task.id === id)?.title ?? 'No task';
  const total = minutesLoggedOn(entries, day, now);
  const ordered = [...entries].sort((a, b) => {
    if (a.ended_at === null) return -1;
    if (b.ended_at === null) return 1;
    return a.started_at.localeCompare(b.started_at) || a.id - b.id;
  });

  const openEditor = (entry: TimeEntry | null) => {
    const base = new Date(day);
    base.setHours(9, 0, 0, 0);
    setEditing({ entry });
    setTaskId(entry?.task_id ?? null);
    setStart(entry ? parseLocal(entry.started_at) : base);
    setEnd(entry ? (entry.ended_at ? parseLocal(entry.ended_at) : null) : new Date(base.getTime() + 30 * 60_000));
    setNote(entry?.note ?? '');
    setError(null);
    setPicker(null);
  };

  const closeEditor = () => {
    setEditing(null);
    setPicker(null);
  };

  const onSave = async () => {
    if (!editing) return;
    if (end && end.getTime() <= start.getTime()) {
      setError('The end time must be after the start time.');
      return;
    }
    setSaving(true);
    const payload = {
      task_id: taskId,
      started_at: toLocalIso(start),
      ended_at: end ? toLocalIso(end) : null,
      note: note.trim() || null,
    };
    try {
      setError(null);
      if (editing.entry) await updateTimeEntry(editing.entry.id, payload);
      else await createTimeEntry(payload);
      closeEditor();
      refresh();
    } catch (caught) {
      setError(apiErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!editing?.entry) return;
    try {
      await deleteTimeEntry(editing.entry.id);
      closeEditor();
      refresh();
    } catch (caught) {
      setError(apiErrorMessage(caught));
    }
  };

  const setClock = (target: 'start' | 'end', picked: Date) => {
    const apply = (base: Date) => {
      const next = new Date(base);
      next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
      return next;
    };
    if (target === 'start') setStart((value) => apply(value));
    else setEnd((value) => apply(value ?? start));
  };

  const caption = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.caption,
    fontFamily: theme.typography.family.medium,
  };

  const timeButton = (label: string, value: Date | null, target: 'start' | 'end') => (
    <Pressable
      onPress={() => setPicker(target)}
      disabled={value === null}
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
        opacity: value === null ? 0.5 : 1,
      }}>
      <Text style={caption}>{label}</Text>
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontSize: theme.typography.size.heading,
          fontFamily: theme.typography.family.semibold,
          marginTop: theme.spacing.xs,
        }}>
        {value ? formatClock(value) : 'Running'}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 120, gap: theme.spacing.md }}>
        <ScreenHeader title={isToday(day) ? "Today's log" : format(day, 'EEE, MMM d')} />

        {failed ? <ErrorBanner message="Can't reach the server" onRetry={refresh} /> : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => setDay((value) => addDays(value, -1))} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.accent} />
          </Pressable>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.heading,
              fontFamily: theme.typography.family.bold,
            }}>
            {formatDuration(total)}
          </Text>
          <Pressable onPress={() => setDay((value) => addDays(value, 1))} hitSlop={10}>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.accent} />
          </Pressable>
        </View>

        {ordered.length === 0 ? (
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.size.body,
              fontFamily: theme.typography.family.regular,
              textAlign: 'center',
              paddingVertical: theme.spacing.xxl,
            }}>
            Nothing logged
          </Text>
        ) : (
          ordered.map((entry) => {
            const startAt = parseLocal(entry.started_at);
            const endAt = entry.ended_at ? parseLocal(entry.ended_at) : null;
            const seconds = Math.max(0, Math.floor(((endAt ?? now).getTime() - startAt.getTime()) / 1000));
            return (
              <Pressable key={entry.id} onPress={() => openEditor(entry)}>
                <Card style={{ padding: theme.spacing.lg, borderRadius: theme.radius.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontSize: theme.typography.size.body,
                        fontFamily: theme.typography.family.semibold,
                      }}>
                      {formatClock(startAt)} to {endAt ? formatClock(endAt) : 'now'}
                    </Text>
                    <Text
                      style={{
                        color: endAt ? theme.colors.textPrimary : theme.colors.calmText,
                        fontSize: theme.typography.size.body,
                        fontFamily: theme.typography.family.medium,
                      }}>
                      {endAt ? formatDuration(Math.floor(seconds / 60)) : clockOf(seconds)}
                    </Text>
                  </View>
                  <Text style={{ ...caption, marginTop: theme.spacing.xs }}>
                    {titleOf(entry.task_id)}
                    {entry.note ? ` · ${entry.note}` : ''}
                  </Text>
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Fab label="Add entry" onPress={() => openEditor(null)} />

      <BottomSheet visible={editing !== null} title={editing?.entry ? 'Edit entry' : 'Add entry'} onClose={closeEditor}>
        <Text style={caption}>Task</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {[{ id: null as number | null, title: 'No task' }, ...tasks.map((task) => ({ id: task.id, title: task.title }))].map(
            (option) => {
              const active = taskId === option.id;
              return (
                <Pressable
                  key={option.id ?? 'none'}
                  onPress={() => setTaskId(option.id)}
                  style={{
                    paddingHorizontal: theme.spacing.lg,
                    paddingVertical: theme.spacing.sm,
                    borderRadius: theme.radius.pill,
                    borderWidth: 1,
                    borderColor: active ? theme.colors.accent : theme.colors.border,
                    backgroundColor: active ? theme.colors.accent : 'transparent',
                  }}>
                  <Text
                    style={{
                      color: active ? theme.colors.accentText : theme.colors.textPrimary,
                      fontSize: theme.typography.size.caption,
                      fontFamily: theme.typography.family.medium,
                    }}>
                    {option.title}
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {timeButton('Starts', start, 'start')}
          {timeButton('Ends', end, 'end')}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.body,
              fontFamily: theme.typography.family.medium,
            }}>
            Still running
          </Text>
          <Switch
            value={end === null}
            onValueChange={(value) => setEnd(value ? null : new Date(start.getTime() + 30 * 60_000))}
            trackColor={{ true: theme.colors.accent }}
          />
        </View>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Note"
          placeholderTextColor={theme.colors.textSecondary}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.body,
            fontFamily: theme.typography.family.regular,
          }}
        />

        {picker ? (
          <DateTimePicker
            value={picker === 'start' ? start : (end ?? start)}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selected) => {
              const target = picker;
              if (Platform.OS !== 'ios') setPicker(null);
              if (event.type === 'dismissed' || !selected) return;
              setClock(target, selected);
            }}
          />
        ) : null}

        {error ? (
          <Text
            style={{
              color: theme.colors.danger,
              fontSize: theme.typography.size.caption,
              fontFamily: theme.typography.family.medium,
            }}>
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={onSave}
          disabled={saving}
          style={{
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.accent,
            opacity: saving ? 0.5 : 1,
          }}>
          <Text
            style={{
              color: theme.colors.accentText,
              fontSize: theme.typography.size.body,
              fontFamily: theme.typography.family.semibold,
            }}>
            Save
          </Text>
        </Pressable>

        {editing?.entry ? (
          <Pressable onPress={onDelete} style={{ alignItems: 'center', paddingVertical: theme.spacing.sm }}>
            <Text
              style={{
                color: theme.colors.danger,
                fontSize: theme.typography.size.body,
                fontFamily: theme.typography.family.semibold,
              }}>
              Delete
            </Text>
          </Pressable>
        ) : null}
      </BottomSheet>
    </SafeAreaView>
  );
}
