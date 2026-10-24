import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { PillGroup } from '@/components/ui/PillGroup';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SettingRow } from '@/components/ui/SettingRow';
import { apiHost, checkServer, type ServerStatus } from '@/lib/api';
import { cancelTestSequence, scheduleTestSequence, scheduledCount } from '@/services/notifications';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemePreference } from '../../theme/tokens';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export default function SettingsScreen() {
  const { theme, preference, setPreference } = useTheme();
  const router = useRouter();
  const [testIds, setTestIds] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState<ServerStatus>('local');

  const refreshCount = () => {
    scheduledCount().then(setCount).catch(() => setCount(0));
  };

  const refreshServer = useCallback(() => {
    checkServer().then(setStatus).catch(() => setStatus('offline'));
  }, []);

  useEffect(refreshCount, []);

  useFocusEffect(
    useCallback(() => {
      refreshServer();
    }, [refreshServer]),
  );

  const serverTitle =
    status === 'local' ? 'Phone only' : status === 'online' ? 'Connected' : "Can't reach the server";

  const serverCaption =
    status === 'local' ? 'No server set. Everything is saved on this phone.' : (apiHost ?? '');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.lg }}>
        <ScreenHeader title="Settings" showBack={false} />

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                {status === 'online' ? (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: theme.radius.pill,
                      backgroundColor: theme.colors.calm,
                    }}
                  />
                ) : null}
                <Text
                  style={{
                    color: status === 'offline' ? theme.colors.warningText : theme.colors.textPrimary,
                    fontSize: theme.typography.size.heading,
                    fontFamily: theme.typography.family.semibold,
                  }}>
                  {serverTitle}
                </Text>
              </View>
              {serverCaption ? (
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.size.caption,
                    fontFamily: theme.typography.family.regular,
                    marginTop: theme.spacing.xs,
                  }}>
                  {serverCaption}
                </Text>
              ) : null}
            </View>

            {status === 'offline' ? (
              <Pressable
                onPress={refreshServer}
                style={{
                  height: 44,
                  justifyContent: 'center',
                  paddingHorizontal: theme.spacing.xl,
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
                  Retry
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Card>

        <Card>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.heading,
              fontFamily: theme.typography.family.semibold,
              marginBottom: theme.spacing.md,
            }}>
            Appearance
          </Text>
          <PillGroup options={THEME_OPTIONS} selected={[preference]} onSelect={setPreference} />
        </Card>

        <Pressable onPress={() => router.push('/reminders')}>
          <Card>
            <SettingRow
              title="Reminders"
              description="Default nudge frequency"
              control={
                <Ionicons name="chevron-forward" size={22} color={theme.colors.textSecondary} />
              }
            />
          </Card>
        </Pressable>

        {__DEV__ ? (
          <Card>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.heading,
                fontFamily: theme.typography.family.semibold,
              }}>
              Developer: test reminders
            </Text>

            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
              <Pressable
                onPress={() => {
                  scheduleTestSequence()
                    .then(setTestIds)
                    .catch(() => undefined)
                    .finally(refreshCount);
                }}
                style={{
                  height: 44,
                  justifyContent: 'center',
                  paddingHorizontal: theme.spacing.lg,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.colors.accent,
                }}>
                <Text
                  style={{
                    color: theme.colors.accentText,
                    fontSize: theme.typography.size.body,
                    fontFamily: theme.typography.family.medium,
                  }}>
                  Schedule test
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  cancelTestSequence(testIds)
                    .then(() => setTestIds([]))
                    .catch(() => undefined)
                    .finally(refreshCount);
                }}
                style={{
                  height: 44,
                  justifyContent: 'center',
                  paddingHorizontal: theme.spacing.lg,
                  borderRadius: theme.radius.pill,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.size.body,
                    fontFamily: theme.typography.family.medium,
                  }}>
                  Cancel test
                </Text>
              </Pressable>
            </View>

            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.size.caption,
                fontFamily: theme.typography.family.regular,
                marginTop: theme.spacing.md,
              }}>
              Scheduled now: {count}
            </Text>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
