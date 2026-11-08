import Ionicons from '@expo/vector-icons/Ionicons';
import { differenceInCalendarDays } from 'date-fns';
import { Pressable, Text, View } from 'react-native';

import { Checkbox } from '@/components/ui/Checkbox';
import { formatClock, parseLocal } from '@/lib/dates';
import { formatDuration } from '@/lib/pace';
import { describeDue, dueUrgency, urgencyColors } from '@/lib/urgency';
import type { Category } from '@/types/category';
import type { Task } from '@/types/task';
import { useTheme } from '../../theme/ThemeContext';

export function dueText(due: Date, now: Date = new Date()): string {
  if (due.getTime() >= now.getTime() && differenceInCalendarDays(due, now) === 0) return `Due ${formatClock(due)}`;
  return describeDue(due, now);
}

export function TaskRow({
  task,
  category,
  suggested = false,
  onToggle,
  onPress,
  onMore,
}: {
  task: Task;
  category?: Category | null;
  suggested?: boolean;
  onToggle: () => void;
  onPress: () => void;
  onMore?: () => void;
}) {
  const { theme } = useTheme();
  const due = task.due_date ? parseLocal(task.due_date) : null;
  const dueColors = due && !task.is_completed ? urgencyColors(theme.colors, dueUrgency(due)) : null;
  const meta = [task.estimated_minutes ? formatDuration(task.estimated_minutes) : null, due ? dueText(due) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: suggested ? theme.spacing.md : 0,
        borderRadius: theme.radius.md,
        borderWidth: suggested ? 2 : 0,
        borderColor: theme.colors.accent,
      }}>
      <Checkbox checked={task.is_completed} onPress={onToggle} />

      <Pressable onPress={onPress} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text
            numberOfLines={2}
            style={{
              flexShrink: 1,
              color: task.is_completed ? theme.colors.textSecondary : theme.colors.textPrimary,
              textDecorationLine: task.is_completed ? 'line-through' : 'none',
              fontSize: theme.typography.size.body,
              fontFamily: theme.typography.family.medium,
            }}>
            {task.title}
          </Text>
          {suggested ? (
            <View
              style={{
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: 2,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.accent,
              }}>
              <Text
                style={{
                  color: theme.colors.accentText,
                  fontSize: theme.typography.size.caption,
                  fontFamily: theme.typography.family.bold,
                }}>
                Suggested
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: 2 }}>
          {category ? (
            <View style={{ width: 8, height: 8, borderRadius: theme.radius.pill, backgroundColor: category.color }} />
          ) : null}
          {meta ? (
            <Text
              style={{
                color: dueColors?.text ?? theme.colors.textSecondary,
                fontSize: theme.typography.size.caption,
                fontFamily: theme.typography.family.medium,
              }}>
              {meta}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {task.is_locked ? <Ionicons name="lock-closed" size={16} color={theme.colors.textSecondary} /> : null}

      {onMore ? (
        <Pressable onPress={onMore} hitSlop={10}>
          <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}
