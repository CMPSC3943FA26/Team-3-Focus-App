import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { PillGroup } from '@/components/ui/PillGroup';
import { TIER_LABELS, TIER_ORDER, describeOffsets, offsetsFor, parseOffsets } from '@/constants/reminders';
import type { FrequencyTier } from '@/types/alarm';
import { useTheme } from '../../theme/ThemeContext';

export function TierSelector({
  description,
  tier,
  onTierChange,
  customText,
  onCustomTextChange,
}: {
  description: string;
  tier: FrequencyTier;
  onTierChange: (tier: FrequencyTier) => void;
  customText: string;
  onCustomTextChange: (text: string) => void;
}) {
  const { theme } = useTheme();
  const parsed = tier === 'custom' ? parseOffsets(customText) : null;
  const invalid = tier === 'custom' && parsed === null;
  const preview = tier === 'custom' ? parsed ?? [] : offsetsFor({ frequency_tier: tier, custom_offsets: [] });

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Ionicons name="hourglass-outline" size={20} color={theme.colors.accent} />
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.heading,
            fontFamily: theme.typography.family.semibold,
          }}>
          Nudge Frequency
        </Text>
      </View>

      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.typography.size.caption,
          fontFamily: theme.typography.family.regular,
          marginTop: theme.spacing.xs,
          marginBottom: theme.spacing.lg,
        }}>
        {description}
      </Text>

      <PillGroup
        options={TIER_ORDER.map((value) => ({ value, label: TIER_LABELS[value] }))}
        selected={[tier]}
        onSelect={onTierChange}
      />

      {tier === 'custom' ? (
        <View style={{ marginTop: theme.spacing.lg }}>
          <TextInput
            value={customText}
            onChangeText={onCustomTextChange}
            placeholder="45, 20, 5, 0"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numbers-and-punctuation"
            style={{
              borderWidth: 1,
              borderColor: invalid ? theme.colors.danger : theme.colors.border,
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.body,
              fontFamily: theme.typography.family.regular,
            }}
          />
          <Text
            style={{
              color: invalid ? theme.colors.danger : theme.colors.textSecondary,
              fontSize: theme.typography.size.caption,
              fontFamily: theme.typography.family.regular,
              marginTop: theme.spacing.sm,
            }}>
            {invalid ? 'Use whole minutes from 0 to 1440, separated by commas.' : 'Minutes before, separated by commas'}
          </Text>
        </View>
      ) : null}

      {!invalid ? (
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.typography.size.caption,
            fontFamily: theme.typography.family.regular,
            marginTop: theme.spacing.lg,
          }}>
          {describeOffsets(preview)}
        </Text>
      ) : null}
    </Card>
  );
}
