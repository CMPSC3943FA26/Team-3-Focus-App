import { Pressable, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { formatDuration } from '@/lib/pace';
import type { ReplanOffer } from '@/services/timeTracking';
import { useTheme } from '../../theme/ThemeContext';

export function ReplanSheet({
  offer,
  onMove,
  onClose,
}: {
  offer: ReplanOffer | null;
  onMove: () => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const lead = offer?.task
    ? `${offer.task.title} ran ${formatDuration(offer.overMinutes)} over its estimate. To finish by 10 PM, move these to tomorrow:`
    : 'To finish by 10 PM, move these to tomorrow:';

  return (
    <BottomSheet visible={offer !== null} title="Today won't fit" onClose={onClose}>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.typography.size.body,
          fontFamily: theme.typography.family.regular,
        }}>
        {lead}
      </Text>

      {offer?.tasks.map((task) => (
        <View
          key={task.id}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
          }}>
          <Text
            style={{
              flex: 1,
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.body,
              fontFamily: theme.typography.family.medium,
            }}>
            {task.title}
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.size.caption,
              fontFamily: theme.typography.family.regular,
            }}>
            {task.estimated_minutes ? `${formatDuration(task.estimated_minutes)} · ` : ''}
            {task.priority}
          </Text>
        </View>
      ))}

      <PrimaryButton label={`Move ${offer?.tasks.length ?? 0} to tomorrow`} onPress={onMove} />

      <Pressable onPress={onClose} style={{ alignItems: 'center', paddingVertical: theme.spacing.sm }}>
        <Text
          style={{
            color: theme.colors.accent,
            fontSize: theme.typography.size.body,
            fontFamily: theme.typography.family.semibold,
          }}>
          Keep my plan
        </Text>
      </Pressable>
    </BottomSheet>
  );
}
