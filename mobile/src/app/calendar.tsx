import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventCard } from '@/components/EventCard';
import { PillGroup } from '@/components/ui/PillGroup';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Fab } from '@/components/ui/Fab';
import { DEFAULT_EVENT_COLOR } from '@/constants/events';
import { addDays, dayKey, parseLocal, weekDays } from '@/lib/dates';
import { listEvents } from '@/services/events';
import type { CalendarEvent } from '@/types/event';
import { useTheme } from '../../theme/ThemeContext';

type ViewMode = 'day' | 'week' | 'month';

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

export default function CalendarScreen() {
  const { theme, scheme } = useTheme();
  const router = useRouter();
  const [mode, setMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useFocusEffect(
    useCallback(() => {
      listEvents().then(setEvents).catch(() => setEvents([]));
    }, []),
  );

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = dayKey(parseLocal(event.start_time));
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events]);

  const selectedKey = dayKey(selectedDate);
  const dayEvents = byDay.get(selectedKey) ?? [];
  const days = weekDays(selectedDate);

  const markedDates = useMemo(() => {
    const marks: Record<string, { dots?: { key: string; color: string }[]; selected?: boolean }> = {};
    for (const [key, list] of byDay) {
      marks[key] = {
        dots: list.slice(0, 3).map((event, index) => ({
          key: `${event.id}-${index}`,
          color: event.color ?? DEFAULT_EVENT_COLOR,
        })),
      };
    }
    marks[selectedKey] = { ...(marks[selectedKey] ?? {}), selected: true };
    return marks;
  }, [byDay, selectedKey]);

  const emptyText = (message: string) => (
    <Text
      style={{
        color: theme.colors.textSecondary,
        fontSize: theme.typography.size.body,
        fontFamily: theme.typography.family.regular,
        textAlign: 'center',
        paddingVertical: theme.spacing.xxl,
      }}>
      {message}
    </Text>
  );

  const stepper = (label: string, step: number) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg }}>
      <Pressable onPress={() => setSelectedDate((current) => addDays(current, -step))} hitSlop={10}>
        <Ionicons name="chevron-back" size={24} color={theme.colors.accent} />
      </Pressable>
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontSize: theme.typography.size.heading,
          fontFamily: theme.typography.family.semibold,
        }}>
        {label}
      </Text>
      <Pressable onPress={() => setSelectedDate((current) => addDays(current, step))} hitSlop={10}>
        <Ionicons name="chevron-forward" size={24} color={theme.colors.accent} />
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 120 }}>
        <ScreenHeader title="Calendar" showBack={false} />

        <View style={{ marginBottom: theme.spacing.xl }}>
          <PillGroup options={VIEW_OPTIONS} selected={[mode]} onSelect={setMode} />
        </View>

        {mode === 'day' ? (
          <View>
            {stepper(format(selectedDate, 'EEEE, MMM d'), 1)}
            {dayEvents.length === 0 ? (
              emptyText('Nothing planned')
            ) : (
              <View style={{ gap: theme.spacing.md }}>
                {dayEvents.map((event) => (
                  <EventCard key={event.id} event={event} onPress={() => router.push(`/events/${event.id}`)} />
                ))}
              </View>
            )}
          </View>
        ) : null}

        {mode === 'week' ? (
          <View>
            {stepper(`${format(days[0], 'MMM d')} - ${format(days[6], 'MMM d')}`, 7)}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.xl }}>
              {days.map((day) => {
                const key = dayKey(day);
                const active = key === selectedKey;
                const hasEvents = (byDay.get(key) ?? []).length > 0;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      setSelectedDate(day);
                      setMode('day');
                    }}
                    style={{
                      alignItems: 'center',
                      paddingVertical: theme.spacing.sm,
                      paddingHorizontal: theme.spacing.sm,
                      borderRadius: theme.radius.md,
                      backgroundColor: active ? theme.colors.accent : 'transparent',
                    }}>
                    <Text
                      style={{
                        color: active ? theme.colors.accentText : theme.colors.textSecondary,
                        fontSize: theme.typography.size.caption,
                        fontFamily: theme.typography.family.medium,
                      }}>
                      {format(day, 'EEEEE')}
                    </Text>
                    <Text
                      style={{
                        color: active ? theme.colors.accentText : theme.colors.textPrimary,
                        fontSize: theme.typography.size.body,
                        fontFamily: theme.typography.family.semibold,
                        marginTop: 2,
                      }}>
                      {format(day, 'd')}
                    </Text>
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        marginTop: 4,
                        borderRadius: theme.radius.pill,
                        backgroundColor: hasEvents ? (active ? theme.colors.accentText : theme.colors.calm) : 'transparent',
                      }}
                    />
                  </Pressable>
                );
              })}
            </View>

            {days.every((day) => (byDay.get(dayKey(day)) ?? []).length === 0)
              ? emptyText('Nothing planned this week')
              : days.map((day) => {
                  const list = byDay.get(dayKey(day)) ?? [];
                  if (list.length === 0) return null;
                  return (
                    <View key={dayKey(day)} style={{ marginBottom: theme.spacing.xl }}>
                      <Text
                        style={{
                          color: theme.colors.textSecondary,
                          fontSize: theme.typography.size.caption,
                          fontFamily: theme.typography.family.semibold,
                          marginBottom: theme.spacing.sm,
                        }}>
                        {format(day, 'EEEE, MMM d')}
                      </Text>
                      <View style={{ gap: theme.spacing.md }}>
                        {list.map((event) => (
                          <EventCard key={event.id} event={event} onPress={() => router.push(`/events/${event.id}`)} />
                        ))}
                      </View>
                    </View>
                  );
                })}
          </View>
        ) : null}

        {mode === 'month' ? (
          <View>
            <Calendar
              key={scheme}
              current={selectedKey}
              markingType="multi-dot"
              markedDates={markedDates}
              onDayPress={(day) => setSelectedDate(new Date(day.year, day.month - 1, day.day))}
              firstDay={1}
              theme={{
                calendarBackground: theme.colors.surface,
                dayTextColor: theme.colors.textPrimary,
                textDisabledColor: theme.colors.textSecondary,
                monthTextColor: theme.colors.textPrimary,
                textSectionTitleColor: theme.colors.textSecondary,
                todayTextColor: theme.colors.accent,
                selectedDayBackgroundColor: theme.colors.accent,
                selectedDayTextColor: theme.colors.accentText,
                arrowColor: theme.colors.accent,
                textDayFontFamily: theme.typography.family.regular,
                textMonthFontFamily: theme.typography.family.semibold,
                textDayHeaderFontFamily: theme.typography.family.medium,
              }}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
                marginBottom: theme.spacing.xl,
              }}
            />

            {dayEvents.length === 0 ? (
              emptyText('Nothing planned')
            ) : (
              <View style={{ gap: theme.spacing.md }}>
                {dayEvents.map((event) => (
                  <EventCard key={event.id} event={event} onPress={() => router.push(`/events/${event.id}`)} />
                ))}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      <Fab label="New event" onPress={() => router.push(`/events/new?date=${selectedKey}`)} />
    </SafeAreaView>
  );
}
