import { Pressable, Text, View } from 'react-native';

import { DEFAULT_EVENT_COLOR } from '@/constants/events';
import { formatClock, parseLocal } from '@/lib/dates';
import { leaveTime } from '@/services/reminders';
import type { CalendarEvent } from '@/types/event';
import { useTheme } from '../../theme/ThemeContext';

export function EventCard({ event, onPress }: { event: CalendarEvent; onPress: () => void }) {
  const { theme } = useTheme();
  const start = parseLocal(event.start_time);
  const end = parseLocal(event.end_time);
  const travels = (event.travel_minutes ?? 0) > 0;

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
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.heading,
            fontFamily: theme.typography.family.semibold,
          }}>
          {formatClock(start)} - {formatClock(end)}
        </Text>

        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.body,
            fontFamily: theme.typography.family.medium,
            marginTop: theme.spacing.xs,
          }}>
          {event.title}
        </Text>

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

        {travels ? (
          <Text
            style={{
              color: theme.colors.warningText,
              fontSize: theme.typography.size.caption,
              fontFamily: theme.typography.family.medium,
              marginTop: theme.spacing.xs,
            }}>
            Leave by {formatClock(leaveTime(event))}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
