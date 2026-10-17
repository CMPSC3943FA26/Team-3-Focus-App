import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useReminderSync } from '@/hooks/useReminderSync';
import { listAlarms, nextAlarm } from '@/services/alarms';
import type { Alarm } from '@/types/alarm';
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

  useReminderSync();

  useFocusEffect(
    useCallback(() => {
      listAlarms().then(setAlarms).catch(() => setAlarms([]));
    }, []),
  );

  const upcoming = nextAlarm(alarms);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl }}>
        <ScreenHeader title="Today" showBack={false} />

        <Card>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.size.caption,
              fontFamily: theme.typography.family.medium,
            }}>
            Next alarm
          </Text>

          {upcoming ? (
            <View style={{ marginTop: theme.spacing.sm }}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.display,
                  fontFamily: theme.typography.family.bold,
                }}>
                {upcoming.alarm.time}
              </Text>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.heading,
                  fontFamily: theme.typography.family.medium,
                  marginTop: theme.spacing.xs,
                }}>
                {upcoming.alarm.label}
              </Text>
              <Text
                style={{
                  color: theme.colors.accent,
                  fontSize: theme.typography.size.body,
                  fontFamily: theme.typography.family.medium,
                  marginTop: theme.spacing.xs,
                }}>
                {countdown(upcoming.at)}
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

        <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
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
