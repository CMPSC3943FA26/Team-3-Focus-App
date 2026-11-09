import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { StatusPill } from '@/components/ui/StatusPill';
import { formatDays } from '@/constants/reminders';
import { DEFAULT_EVENT_COLOR } from '@/constants/events';
import { formatClock } from '@/lib/dates';
import type { Occurrence } from '@/lib/occurrences';
import { describeUntil, minutesUrgency, type Urgency } from '@/lib/urgency';
import { occurrenceLeaveTime } from '@/services/reminders';
import { useTheme } from '../../theme/ThemeContext';

function timeLeft(occurrence: Occurrence, now: Date): { label: string; urgency: Urgency } {
  const { start, end, event } = occurrence;
  if (now.getTime() >= end.getTime()) return { label: 'Ended', urgency: 'neutral' };
  if (now.getTime() >= start.getTime()) return { label: 'Happening now', urgency: 'urgent' };
  const travels = (event.travel_minutes ?? 0) > 0;
  const target = travels ? occurrenceLeaveTime(occurrence) : start;
  const minutes = Math.floor((target.getTime() - now.getTime()) / 60_000);
  return { label: describeUntil(start, now), urgency: minutesUrgency(minutes) };
}

export function EventCard({ occurrence, onPress }: { occurrence: Occurrence; onPress: () => void }) {
  const { theme } = useTheme();
  const { event, start, end } = occurrence;
  const travels = (event.travel_minutes ?? 0) > 0;
  const repeats = event.repeat_days.length > 0;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const left = timeLeft(occurrence, now);

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
      }}>
      <View style={{ width: 4, backgroundColor: event.color ?? DEFAULT_EVENT_COLOR }} />

      <View style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.md }}>
          <Text
            style={{
              flexShrink: 1,
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.heading,
              fontFamily: theme.typography.family.semibold,
            }}>
            {formatClock(start)} - {formatClock(end)}
          </Text>
          <StatusPill label={left.label} urgency={left.urgency} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
          <Text
            style={{
              flexShrink: 1,
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.body,
              fontFamily: theme.typography.family.medium,
            }}>
            {event.title}
          </Text>
          {!event.reminders_enabled ? (
            <Ionicons name="notifications-off-outline" size={16} color={theme.colors.textSecondary} />
          ) : null}
        </View>

        {event.location ? (
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.size.caption,
              fontFamily: theme.typography.family.regular,
              marginTop: theme.spacing.xs,
            }}>
            {event.location}
          </Text>
        ) : null}

        {repeats ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xs }}>
            <Ionicons name="repeat" size={14} color={theme.colors.textSecondary} />
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.size.caption,
                fontFamily: theme.typography.family.regular,
              }}>
              Every {formatDays(event.repeat_days).replace(/^Every day$/, 'day')}
            </Text>
          </View>
        ) : null}

        {travels ? (
          <Text
            style={{
              color: theme.colors.warningText,
              fontSize: theme.typography.size.caption,
              fontFamily: theme.typography.family.medium,
              marginTop: theme.spacing.xs,
            }}>
            Leave by {formatClock(occurrenceLeaveTime(occurrence))}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
