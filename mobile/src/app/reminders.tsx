import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TierSelector } from '@/components/TierSelector';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { parseOffsets } from '@/constants/reminders';
import { getReminderPrefs, saveReminderPrefs } from '@/services/reminderPrefs';
import { syncReminders } from '@/services/reminders';
import type { FrequencyTier } from '@/types/alarm';
import { useTheme } from '../../theme/ThemeContext';

export default function RemindersScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [tier, setTier] = useState<FrequencyTier>('some');
  const [customText, setCustomText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getReminderPrefs()
      .then((prefs) => {
        setTier(prefs.default_tier);
        setCustomText(prefs.default_custom_offsets.join(', '));
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const customOffsets = tier === 'custom' ? parseOffsets(customText) : [];
  const canSave = !saving && customOffsets !== null;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await saveReminderPrefs({
        default_tier: tier,
        default_custom_offsets: customOffsets ?? [],
      });
      await syncReminders();
      router.back();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 140 }}>
          <ScreenHeader title="Reminders" />

          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.heading,
              fontFamily: theme.typography.family.semibold,
              marginBottom: theme.spacing.md,
            }}>
            Nudge Frequency
          </Text>

          <TierSelector
            description="How often should we remind you as a deadline approaches?"
            tier={tier}
            onTierChange={setTier}
            customText={customText}
            onCustomTextChange={setCustomText}
          />

          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.size.caption,
              fontFamily: theme.typography.family.regular,
              marginTop: theme.spacing.lg,
            }}>
            Used as the default for new alarms. You can still change it on each alarm.
          </Text>
        </ScrollView>

        <View
          style={{
            position: 'absolute',
            left: theme.spacing.xl,
            right: theme.spacing.xl,
            bottom: theme.spacing.xl,
          }}>
          <PrimaryButton label="Save Preferences" onPress={onSave} disabled={!canSave} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
