import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { PillGroup } from '@/components/ui/PillGroup';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SettingRow } from '@/components/ui/SettingRow';
import { DAY_LABELS } from '@/constants/reminders';
import { formatTime } from '@/lib/dates';
import { getQuietHours, saveQuietHours } from '@/services/quietHours';
import { syncReminders } from '@/services/reminders';
import { DAY_CODES, type DayCode } from '@/types/alarm';
import { useTheme } from '../../theme/ThemeContext';

// Same helpers as alarms/[id].tsx, they aren't exported there yet.
function toDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function toTime(date: Date): string {
  return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
}

export default function QuietHoursScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [start, setStart] = useState('22:00');
  const [end, setEnd] = useState('07:00');
  const [days, setDays] = useState<DayCode[]>([]);
  const [picker, setPicker] = useState<'start' | 'end' | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getQuietHours()
      .then((quiet) => {
        setEnabled(quiet.enabled);
        setStart(quiet.start);
        setEnd(quiet.end);
        setDays(quiet.days);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveQuietHours({ enabled, start, end, days });
      await syncReminders();
      router.back();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  const caption = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.caption,
    fontFamily: theme.typography.family.regular,
  };

  const timeText = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.size.heading,
    fontFamily: theme.typography.family.medium,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 140, gap: theme.spacing.lg }}>
        <ScreenHeader title="Quiet hours" />

        <Card>
          <SettingRow
            title="Quiet hours"
            description="Silence nudges during set times"
            control={
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
              />
            }
          />
        </Card>

        <Text style={caption}>
          This only silences Time Sight reminders. It does not change your phone&apos;s Do Not Disturb.
        </Text>

        <View
          style={{ gap: theme.spacing.lg, opacity: enabled ? 1 : 0.4 }}
          pointerEvents={enabled ? 'auto' : 'none'}>
          <Card style={{ gap: theme.spacing.lg }}>
            <SettingRow
              title="Starts"
              control={
                <Pressable onPress={() => setPicker('start')} hitSlop={8}>
                  <Text style={timeText}>{formatTime(start)}</Text>
                </Pressable>
              }
            />
            <SettingRow
              title="Ends"
              control={
                <Pressable onPress={() => setPicker('end')} hitSlop={8}>
                  <Text style={timeText}>{formatTime(end)}</Text>
                </Pressable>
              }
            />
            {picker ? (
              <DateTimePicker
                value={toDate(picker === 'start' ? start : end)}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selected) => {
                  if (Platform.OS !== 'ios') setPicker(null);
                  if (event.type !== 'dismissed' && selected) {
                    if (picker === 'start') setStart(toTime(selected));
                    else setEnd(toTime(selected));
                  }
                }}
              />
            ) : null}
          </Card>

          <Card>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.size.caption,
                fontFamily: theme.typography.family.medium,
                marginBottom: theme.spacing.md,
              }}>
              Repeat
            </Text>
            <PillGroup
              options={DAY_CODES.map((value) => ({ value, label: DAY_LABELS[value] }))}
              selected={days}
              onSelect={(day) =>
                setDays((current) =>
                  current.includes(day) ? current.filter((value) => value !== day) : [...current, day],
                )
              }
            />
            <Text style={[caption, { marginTop: theme.spacing.md }]}>Leave empty for every day</Text>
          </Card>
        </View>

        <Card style={{ gap: theme.spacing.sm }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.heading,
              fontFamily: theme.typography.family.semibold,
            }}>
            What still gets through
          </Text>
          <Text style={caption}>Your alarm always goes off at the time you set.</Text>
          <Text style={caption}>Only the early nudges that land inside quiet hours are skipped.</Text>
        </Card>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: theme.spacing.xl,
          right: theme.spacing.xl,
          bottom: theme.spacing.xl,
        }}>
        <PrimaryButton label="Save" onPress={onSave} disabled={saving} />
      </View>
    </SafeAreaView>
  );
}
