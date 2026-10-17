import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Fab } from '@/components/ui/Fab';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TIER_LABELS, formatDays } from '@/constants/reminders';
import { listAlarms, toggleAlarm } from '@/services/alarms';
import {
  askNotificationPermission,
  notificationsAllowed,
  openNotificationSettings,
} from '@/services/notifications';
import type { Alarm } from '@/types/alarm';
import { useTheme } from '../../../theme/ThemeContext';

export default function AlarmListScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [allowed, setAllowed] = useState(true);

  const refresh = useCallback(() => {
    listAlarms().then(setAlarms).catch(() => setAlarms([]));
    notificationsAllowed().then(setAllowed).catch(() => setAllowed(true));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onAllow = async () => {
    const granted = await askNotificationPermission();
    if (!granted) await openNotificationSettings();
    refresh();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 120 }}>
        <ScreenHeader title="Alarms" />

        {!allowed ? (
          <Card style={{ marginBottom: theme.spacing.lg }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.body,
                fontFamily: theme.typography.family.medium,
              }}>
              Notifications are off, so reminders will not fire
            </Text>
            <Pressable
              onPress={onAllow}
              style={{
                alignSelf: 'flex-start',
                marginTop: theme.spacing.md,
                height: 44,
                justifyContent: 'center',
                paddingHorizontal: theme.spacing.xl,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.accent,
              }}>
              <Text
                style={{
                  color: theme.colors.accentText,
                  fontSize: theme.typography.size.body,
                  fontFamily: theme.typography.family.semibold,
                }}>
                Allow
              </Text>
            </Pressable>
          </Card>
        ) : null}

        {alarms.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xxl }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.heading,
                fontFamily: theme.typography.family.semibold,
              }}>
              No alarms yet
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.size.body,
                fontFamily: theme.typography.family.regular,
                marginTop: theme.spacing.sm,
              }}>
              Tap New alarm to set your first one
            </Text>
          </View>
        ) : (
          <View style={{ gap: theme.spacing.md }}>
            {alarms.map((alarm) => (
              <Pressable key={alarm.id} onPress={() => router.push(`/alarms/${alarm.id}`)}>
                <Card>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
                    <View style={{ flex: 1, opacity: alarm.is_active ? 1 : 0.5 }}>
                      <Text
                        style={{
                          color: theme.colors.textPrimary,
                          fontSize: theme.typography.size.display,
                          fontFamily: theme.typography.family.bold,
                        }}>
                        {alarm.time}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.textPrimary,
                          fontSize: theme.typography.size.heading,
                          fontFamily: theme.typography.family.medium,
                          marginTop: theme.spacing.xs,
                        }}>
                        {alarm.label}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.textSecondary,
                          fontSize: theme.typography.size.caption,
                          fontFamily: theme.typography.family.regular,
                          marginTop: theme.spacing.xs,
                        }}>
                        {TIER_LABELS[alarm.frequency_tier]} · {formatDays(alarm.repeat_days)}
                      </Text>
                    </View>

                    <Switch
                      value={alarm.is_active}
                      onValueChange={() => toggleAlarm(alarm.id).then(refresh).catch(() => undefined)}
                      trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
                    />
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Fab label="New alarm" onPress={() => router.push('/alarms/new')} />
    </SafeAreaView>
  );
}
