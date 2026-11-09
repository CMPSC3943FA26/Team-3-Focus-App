import { useFocusEffect, useRouter } from 'expo-router';
import { addDays } from 'date-fns';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReplanSheet } from '@/components/ReplanSheet';
import { TodayCard } from '@/components/TodayCard';
import { TodayTasks } from '@/components/TodayTasks';
import { Card } from '@/components/ui/Card';
import { ClockText } from '@/components/ui/ClockText';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useReminderSync } from '@/hooks/useReminderSync';
import { useSnoozeResponse } from '@/hooks/useSnoozeResponse';
import { dayKey, describeWait, formatClock } from '@/lib/dates';
import { todaysTasks } from '@/lib/taskPlanning';
import { listAlarms, nextAlarm } from '@/services/alarms';
import { listCategories } from '@/services/categories';
import { listEvents, nextDeparture } from '@/services/events';
import { DEFAULT_DAILY_TARGET_MINUTES, getDailyTarget } from '@/services/pacePrefs';
import { listTasks } from '@/services/tasks';
import { listTimeEntries, moveTasks, type ReplanOffer } from '@/services/timeTracking';
import type { Alarm } from '@/types/alarm';
import type { Category } from '@/types/category';
import type { CalendarEvent } from '@/types/event';
import type { Task } from '@/types/task';
import type { TimeEntry } from '@/types/timeEntry';
import { useTheme } from '../../theme/ThemeContext';

function countdown(target: Date): string {
  const totalMinutes = Math.max(0, Math.round((target.getTime() - Date.now()) / 60_000));
  if (totalMinutes < 60) return `in ${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `in ${hours} hr` : `in ${hours} hr ${minutes} min`;
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tick, setTick] = useState(0);
  const [failed, setFailed] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [target, setTarget] = useState(DEFAULT_DAILY_TARGET_MINUTES);
  const [offer, setOffer] = useState<ReplanOffer | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useReminderSync();
  useSnoozeResponse();

  const refresh = useCallback(() => {
    Promise.all([listAlarms(), listEvents(), listTasks(), listCategories(), listTimeEntries(), getDailyTarget()])
      .then(([loadedAlarms, loadedEvents, loadedTasks, loadedCategories, loadedEntries, loadedTarget]) => {
        setAlarms(loadedAlarms);
        setEvents(loadedEvents);
        setTasks(loadedTasks);
        setCategories(loadedCategories);
        setEntries(loadedEntries);
        setTarget(loadedTarget);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(() => setTick((value) => value + 1), 30_000);
      return () => clearInterval(timer);
    }, [refresh]),
  );

  useEffect(() => {
    if (tick > 0) refresh();
  }, [tick, refresh]);

  const upcomingAlarm = nextAlarm(alarms);
  const departure = nextDeparture(events);
  const todays = todaysTasks(tasks);
  const openToday = todays.filter((task) => !task.is_completed);
  const running = entries.find((entry) => entry.ended_at === null) ?? null;

  const moveOffered = async () => {
    if (!offer) return;
    await moveTasks(offer.tasks, dayKey(addDays(new Date(), 1)));
    setOffer(null);
    refresh();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl, gap: theme.spacing.lg }}>
        <ScreenHeader title="Today" showBack={false} />

        {failed ? <ErrorBanner message="Can't reach the server" onRetry={refresh} /> : null}

        <TodayCard
          entries={entries}
          running={running}
          tasks={tasks}
          openTasks={openToday}
          target={target}
          onChanged={refresh}
          onReplan={setOffer}
        />

        <Card>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.size.caption,
              fontFamily: theme.typography.family.medium,
            }}>
            Next departure
          </Text>

          {departure ? (
            <View style={{ marginTop: theme.spacing.sm }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.display,
                  fontFamily: theme.typography.family.bold,
                }}>
                {describeWait(departure.leaveAt)}
              </Text>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.heading,
                  fontFamily: theme.typography.family.medium,
                  marginTop: theme.spacing.xs,
                }}>
                {departure.travels
                  ? `until you leave for ${departure.event.title}`
                  : `until ${departure.event.title} starts`}
              </Text>
              <Text
                style={{
                  color: departure.travels ? theme.colors.warningText : theme.colors.textSecondary,
                  fontSize: theme.typography.size.caption,
                  fontFamily: theme.typography.family.medium,
                  marginTop: theme.spacing.xs,
                }}>
                {departure.travels
                  ? `Leave by ${formatClock(departure.leaveAt)} · starts ${formatClock(departure.start)}`
                  : `Starts ${formatClock(departure.start)}`}
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: theme.spacing.sm }}>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.size.heading,
                  fontFamily: theme.typography.family.regular,
                }}>
                Nothing coming up
              </Text>
              <Pressable
                onPress={() => router.push('/events/new')}
                style={{
                  alignSelf: 'flex-start',
                  marginTop: theme.spacing.md,
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
                  Add event
                </Text>
              </Pressable>
            </View>
          )}
        </Card>

        <Card>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.size.caption,
              fontFamily: theme.typography.family.medium,
            }}>
            Next alarm
          </Text>

          {upcomingAlarm ? (
            <View style={{ marginTop: theme.spacing.sm }}>
              <ClockText
                time={upcomingAlarm.alarm.time}
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.display,
                  fontFamily: theme.typography.family.bold,
                }}
              />
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.heading,
                  fontFamily: theme.typography.family.medium,
                  marginTop: theme.spacing.xs,
                }}>
                {upcomingAlarm.alarm.label}
              </Text>
              <Text
                style={{
                  color: theme.colors.accent,
                  fontSize: theme.typography.size.body,
                  fontFamily: theme.typography.family.medium,
                  marginTop: theme.spacing.xs,
                }}>
                {countdown(upcomingAlarm.at)}
              </Text>
            </View>
          ) : (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.size.heading,
                fontFamily: theme.typography.family.regular,
                marginTop: theme.spacing.sm,
              }}>
              No alarms set
            </Text>
          )}
        </Card>

        <TodayTasks
          tasks={tasks}
          todays={todays}
          categories={categories}
          onChanged={refresh}
          onReplan={setOffer}
          scrollTo={(y) => scrollRef.current?.scrollTo({ y, animated: true })}
        />

        <View style={{ gap: theme.spacing.md }}>
          <PrimaryButton label="Set new alarm" onPress={() => router.push('/alarms/new')} />

          <Pressable
            onPress={() => router.push('/alarms')}
            style={{
              height: 56,
              alignItems: 'center',
              justifyContent: 'center',
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
              All alarms
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <ReplanSheet offer={offer} onMove={moveOffered} onClose={() => setOffer(null)} />
    </SafeAreaView>
  );
}
