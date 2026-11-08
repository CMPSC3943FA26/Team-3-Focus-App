import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { formatDuration } from '@/lib/pace';
import { DEFAULT_DAILY_TARGET_MINUTES, getDailyTarget, saveDailyTarget } from '@/services/pacePrefs';
import { useTheme } from '../../theme/ThemeContext';

const STEP = 30;
const MIN = 30;
const MAX = 720;

export default function DailyTargetScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [minutes, setMinutes] = useState(DEFAULT_DAILY_TARGET_MINUTES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDailyTarget()
      .then(setMinutes)
      .finally(() => setLoading(false));
  }, []);

  const onSave = async () => {
    await saveDailyTarget(minutes);
    router.back();
  };

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 140 }}>
        <ScreenHeader title="Daily target" />

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable onPress={() => setMinutes((value) => Math.max(MIN, value - STEP))} hitSlop={10}>
              <Ionicons name="remove-circle-outline" size={36} color={theme.colors.accent} />
            </Pressable>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.title,
                fontFamily: theme.typography.family.bold,
              }}>
              {formatDuration(minutes)}
            </Text>
            <Pressable onPress={() => setMinutes((value) => Math.min(MAX, value + STEP))} hitSlop={10}>
              <Ionicons name="add-circle-outline" size={36} color={theme.colors.accent} />
            </Pressable>
          </View>
        </Card>

        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.typography.size.caption,
            fontFamily: theme.typography.family.regular,
            marginTop: theme.spacing.lg,
          }}>
          Pace compares what you logged with how much of the day has passed, from 8 AM to 10 PM.
        </Text>
      </ScrollView>

      <View style={{ position: 'absolute', left: theme.spacing.xl, right: theme.spacing.xl, bottom: theme.spacing.xl }}>
        <PrimaryButton label="Save target" onPress={onSave} />
      </View>
    </SafeAreaView>
  );
}
