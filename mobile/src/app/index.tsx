import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useReminderSync } from '@/hooks/useReminderSync';
import { describeWait, formatClock, parseLocal } from '@/lib/dates';
import { listAlarms, nextAlarm } from '@/services/alarms';
import { listEvents, nextDeparture } from '@/services/events';
import type { Alarm } from '@/types/alarm';
import type { CalendarEvent } from '@/types/event';
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

  useReminderSync();

  useFocusEffect(
    useCallback(() => {
      listAlarms().then(setAlarms).catch(() => setAlarms([]));
      listEvents().then(setEvents).catch(() => setEvents([]));
      const timer = setInterval(() => setTick((value) => value + 1), 30_000);
      return () => clearInterval(timer);
    }, []),
  );

  useEffect(() => {
    if (tick > 0) {
      listEvents().then(setEvents).catch(() => undefined);
    }
  }, [tick]);

  const upcomingAlarm = nextAlarm(alarms);
  const departure = nextDeparture(events);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl, gap: theme.spacing.lg }}>
        <ScreenHeader title="Today" showBack={false} />

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
                  ? `Leave by ${formatClock(departure.leaveAt)} · starts ${formatClock(parseLocal(departure.event.start_time))}`
                  : `Starts ${formatClock(parseLocal(departure.event.start_time))}`}
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
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.display,
                  fontFamily: theme.typography.family.bold,
                }}>
                {upcomingAlarm.alarm.time}
              </Text>
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
    </SafeAreaView>
  );
}
