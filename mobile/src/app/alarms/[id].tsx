import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TierSelector } from '@/components/TierSelector';
import { Card } from '@/components/ui/Card';
import { PillGroup } from '@/components/ui/PillGroup';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SettingRow } from '@/components/ui/SettingRow';
import { DAY_LABELS, parseOffsets } from '@/constants/reminders';
import { apiErrorMessage } from '@/lib/api';
import { createAlarm, deleteAlarm, getAlarm, updateAlarm } from '@/services/alarms';
import { getReminderPrefs } from '@/services/reminderPrefs';
import { DAY_CODES, type DayCode, type FrequencyTier } from '@/types/alarm';
import { useTheme } from '../../../theme/ThemeContext';

function nextFullHour(): string {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return `${`${date.getHours()}`.padStart(2, '0')}:00`;
}

function toDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function toTime(date: Date): string {
  return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
}

export default function AlarmFormScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const alarmId = Number(id);

  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [time, setTime] = useState(nextFullHour());
  const [label, setLabel] = useState('');
  const [days, setDays] = useState<DayCode[]>([]);
  const [tier, setTier] = useState<FrequencyTier>('some');
  const [customText, setCustomText] = useState('');
  const [snooze, setSnooze] = useState(5);
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) {
      getReminderPrefs()
        .then((prefs) => {
          setTier(prefs.default_tier);
          setCustomText(prefs.default_custom_offsets.join(', '));
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
      return;
    }

    getAlarm(alarmId)
      .then((alarm) => {
        if (!alarm) {
          setMissing(true);
          return;
        }
        setTime(alarm.time);
        setLabel(alarm.label);
        setDays(alarm.repeat_days);
        setTier(alarm.frequency_tier);
        setCustomText(alarm.custom_offsets.join(', '));
        setSnooze(alarm.snooze_duration);
      })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, [alarmId, isNew]);

  const customOffsets = tier === 'custom' ? parseOffsets(customText) : [];
  const canSave = !saving && customOffsets !== null;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const payload = {
      time,
      label: label.trim() || 'Alarm',
      is_active: true,
      repeat_days: days,
      sound_file: null,
      snooze_duration: snooze,
      frequency_tier: tier,
      custom_offsets: customOffsets ?? [],
      event_id: null,
    };
    try {
      setSaveError(null);
      if (isNew) await createAlarm(payload);
      else await updateAlarm(alarmId, payload);
      router.back();
    } catch (error) {
      setSaveError(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    Alert.alert('Delete alarm', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteAlarm(alarmId)
            .then(() => router.back())
            .catch((error) => setSaveError(apiErrorMessage(error)));
        },
      },
    ]);
  };

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  if (missing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
        <View style={{ padding: theme.spacing.xl }}>
          <ScreenHeader title="Alarm" />
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.size.body,
              fontFamily: theme.typography.family.regular,
            }}>
            This alarm no longer exists
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const fieldLabel = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.caption,
    fontFamily: theme.typography.family.medium,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 140, gap: theme.spacing.lg }}>
          <ScreenHeader title={isNew ? 'New alarm' : 'Edit alarm'} />

          <Card>
            <Text style={fieldLabel}>Time</Text>
            <Pressable onPress={() => setShowPicker(true)}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.display,
                  fontFamily: theme.typography.family.bold,
                  marginTop: theme.spacing.xs,
                }}>
                {time}
              </Text>
            </Pressable>
            {showPicker ? (
              <DateTimePicker
                value={toDate(time)}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selected) => {
                  if (Platform.OS !== 'ios') setShowPicker(false);
                  if (event.type !== 'dismissed' && selected) setTime(toTime(selected));
                }}
              />
            ) : null}
          </Card>

          <Card>
            <Text style={fieldLabel}>Label</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="What is this for?"
              placeholderTextColor={theme.colors.textSecondary}
              style={{
                marginTop: theme.spacing.sm,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: theme.spacing.md,
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.body,
                fontFamily: theme.typography.family.regular,
              }}
            />
          </Card>

          <Card>
            <Text style={[fieldLabel, { marginBottom: theme.spacing.md }]}>Repeat</Text>
            <PillGroup
              options={DAY_CODES.map((value) => ({ value, label: DAY_LABELS[value] }))}
              selected={days}
              onSelect={(day) =>
                setDays((current) =>
                  current.includes(day) ? current.filter((value) => value !== day) : [...current, day],
                )
              }
            />
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.size.caption,
                fontFamily: theme.typography.family.regular,
                marginTop: theme.spacing.md,
              }}>
              Leave empty for a one-time alarm
            </Text>
          </Card>

          <TierSelector
            description="How often should we remind you before it goes off?"
            tier={tier}
            onTierChange={setTier}
            customText={customText}
            onCustomTextChange={setCustomText}
          />

          <Card>
            <SettingRow
              title="Snooze"
              description="Minutes before it nudges you again"
              control={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                  <Pressable onPress={() => setSnooze((value) => Math.max(1, value - 1))} hitSlop={8}>
                    <Ionicons name="remove-circle-outline" size={28} color={theme.colors.accent} />
                  </Pressable>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.size.heading,
                      fontFamily: theme.typography.family.semibold,
                      minWidth: 28,
                      textAlign: 'center',
                    }}>
                    {snooze}
                  </Text>
                  <Pressable onPress={() => setSnooze((value) => Math.min(30, value + 1))} hitSlop={8}>
                    <Ionicons name="add-circle-outline" size={28} color={theme.colors.accent} />
                  </Pressable>
                </View>
              }
            />
          </Card>

          <Card>
            <SettingRow
              title="Sound"
              description="Custom sounds are coming later"
              control={
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.size.body,
                    fontFamily: theme.typography.family.regular,
                  }}>
                  Default
                </Text>
              }
            />
          </Card>

          {!isNew ? (
            <Pressable onPress={onDelete} style={{ alignItems: 'center', paddingVertical: theme.spacing.md }}>
              <Text
                style={{
                  color: theme.colors.danger,
                  fontSize: theme.typography.size.body,
                  fontFamily: theme.typography.family.semibold,
                }}>
                Delete alarm
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>

        <View
          style={{
            position: 'absolute',
            left: theme.spacing.xl,
            right: theme.spacing.xl,
            bottom: theme.spacing.xl,
          }}>
          {saveError ? (
            <Text
              style={{
                color: theme.colors.danger,
                fontSize: theme.typography.size.caption,
                fontFamily: theme.typography.family.medium,
                marginBottom: theme.spacing.sm,
                textAlign: 'center',
              }}>
              {saveError}
            </Text>
          ) : null}
          <PrimaryButton label="Save alarm" onPress={onSave} disabled={!canSave} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
