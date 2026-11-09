import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { PillGroup } from '@/components/ui/PillGroup';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SettingRow } from '@/components/ui/SettingRow';
import { DEFAULT_EVENT_COLOR, EVENT_COLORS, MAX_TRAVEL_MINUTES } from '@/constants/events';
import {
  DAY_LABELS,
  describeOffsets,
  offsetsFor,
  parseOffsets,
  TIER_LABELS,
  TIER_ORDER,
} from '@/constants/reminders';
import { apiErrorMessage } from '@/lib/api';
import { dayKey, formatClock, parseLocal, toLocalIso } from '@/lib/dates';
import { createEvent, deleteEvent, getEvent, updateEvent } from '@/services/events';
import { DEFAULT_REMINDER_PREFS, getReminderPrefs, type ReminderPrefs } from '@/services/reminderPrefs';
import { DAY_CODES, type DayCode, type FrequencyTier } from '@/types/alarm';
import { useTheme } from '../../../theme/ThemeContext';

type PickerTarget = 'date' | 'start' | 'end' | 'until' | null;
type TierChoice = 'default' | FrequencyTier;

const WEEKDAY_CODES: DayCode[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function combine(day: Date, clock: Date): Date {
  const result = new Date(day);
  result.setHours(clock.getHours(), clock.getMinutes(), 0, 0);
  return result;
}

function nextFullHour(): Date {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
}

export default function EventFormScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const isNew = id === 'new';
  const eventId = Number(id);

  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<PickerTarget>(null);

  const [title, setTitle] = useState('');
  const [day, setDay] = useState(() => (date ? parseLocal(`${date}T00:00:00`) : new Date()));
  const [start, setStart] = useState(nextFullHour);
  const [end, setEnd] = useState(() => new Date(nextFullHour().getTime() + 60 * 60_000));
  const [travel, setTravel] = useState(0);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState(DEFAULT_EVENT_COLOR);
  const [repeatDays, setRepeatDays] = useState<DayCode[]>([]);
  const [until, setUntil] = useState<Date | null>(null);
  const [remind, setRemind] = useState(true);
  const [tierChoice, setTierChoice] = useState<TierChoice>('default');
  const [customText, setCustomText] = useState('');
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_REMINDER_PREFS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getReminderPrefs()
      .then(setPrefs)
      .catch(() => undefined);
    if (isNew) {
      setLoading(false);
      return;
    }

    getEvent(eventId)
      .then((event) => {
        if (!event) {
          setMissing(true);
          return;
        }
        const startAt = parseLocal(event.start_time);
        const endAt = parseLocal(event.end_time);
        setTitle(event.title);
        setDay(startAt);
        setStart(startAt);
        setEnd(endAt);
        setTravel(event.travel_minutes ?? 0);
        setLocation(event.location ?? '');
        setNotes(event.description ?? '');
        setColor(event.color ?? DEFAULT_EVENT_COLOR);
        setRepeatDays(event.repeat_days);
        setUntil(event.repeat_until ? parseLocal(`${event.repeat_until}T00:00:00`) : null);
        setRemind(event.reminders_enabled);
        setTierChoice(event.reminder_tier ?? 'default');
        setCustomText(event.custom_offsets.join(', '));
      })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, [eventId, isNew]);

  const startAt = combine(day, start);
  const endAt = combine(day, end);
  const customOffsets = tierChoice === 'custom' ? parseOffsets(customText) : [];
  const previewOffsets =
    tierChoice === 'default'
      ? offsetsFor({ frequency_tier: prefs.default_tier, custom_offsets: prefs.default_custom_offsets })
      : tierChoice === 'custom'
        ? (customOffsets ?? [])
        : offsetsFor({ frequency_tier: tierChoice, custom_offsets: [] });

  const toggleDay = (code: DayCode) => {
    setRepeatDays((current) => {
      if (current.includes(code)) return current.filter((item) => item !== code);
      const next = current.length === 0 && code !== WEEKDAY_CODES[day.getDay()] ? [WEEKDAY_CODES[day.getDay()], code] : [...current, code];
      return Array.from(new Set(next));
    });
  };

  const onSave = async () => {
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = 'Give the event a title.';
    if (endAt <= startAt) nextErrors.time = 'The end time must be after the start time.';
    if (repeatDays.length && until && dayKey(until) < dayKey(day)) {
      nextErrors.until = 'The series cannot end before it starts.';
    }
    if (remind && tierChoice === 'custom' && customOffsets === null) {
      nextErrors.reminders = 'Use whole minutes from 0 to 1440, separated by commas.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    const payload = {
      title: title.trim(),
      description: notes.trim() || null,
      start_time: toLocalIso(startAt),
      end_time: toLocalIso(endAt),
      category_id: null,
      location: location.trim() || null,
      travel_minutes: travel > 0 ? travel : null,
      color,
      repeat_days: DAY_CODES.filter((code) => repeatDays.includes(code)),
      repeat_until: repeatDays.length && until ? dayKey(until) : null,
      reminders_enabled: remind,
      reminder_tier: tierChoice === 'default' ? null : tierChoice,
      custom_offsets: tierChoice === 'custom' ? (customOffsets ?? []) : [],
    };
    try {
      setSaveError(null);
      if (isNew) await createEvent(payload);
      else await updateEvent(eventId, payload);
      router.back();
    } catch (error) {
      setSaveError(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    Alert.alert('Delete event', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteEvent(eventId)
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
          <ScreenHeader title="Event" />
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.size.body,
              fontFamily: theme.typography.family.regular,
            }}>
            This event no longer exists
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

  const inputStyle = {
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.size.body,
    fontFamily: theme.typography.family.regular,
  };

  const errorStyle = {
    color: theme.colors.danger,
    fontSize: theme.typography.size.caption,
    fontFamily: theme.typography.family.regular,
    marginTop: theme.spacing.sm,
  };

  const timePill = (label: string, value: Date, target: PickerTarget) => (
    <Pressable
      onPress={() => setPicker(target)}
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
      }}>
      <Text style={fieldLabel}>{label}</Text>
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontSize: theme.typography.size.heading,
          fontFamily: theme.typography.family.semibold,
          marginTop: theme.spacing.xs,
        }}>
        {formatClock(value)}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 140, gap: theme.spacing.lg }}>
          <ScreenHeader title={isNew ? 'New event' : 'Edit event'} />

          <Card>
            <Text style={fieldLabel}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What is it?"
              placeholderTextColor={theme.colors.textSecondary}
              style={inputStyle}
            />
            {errors.title ? <Text style={errorStyle}>{errors.title}</Text> : null}
          </Card>

          <Card>
            <Text style={fieldLabel}>Date</Text>
            <Pressable onPress={() => setPicker('date')}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.size.heading,
                  fontFamily: theme.typography.family.semibold,
                  marginTop: theme.spacing.xs,
                }}>
                {format(day, 'EEEE, MMM d yyyy')}
              </Text>
            </Pressable>
          </Card>

          <Card>
            <Text style={[fieldLabel, { marginBottom: theme.spacing.md }]}>Time</Text>
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              {timePill('Starts', startAt, 'start')}
              {timePill('Ends', endAt, 'end')}
            </View>
            {errors.time ? <Text style={errorStyle}>{errors.time}</Text> : null}
          </Card>

          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={fieldLabel}>Travel time</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Pressable onPress={() => setTravel((value) => Math.max(0, value - 5))} hitSlop={8}>
                  <Ionicons name="remove-circle-outline" size={28} color={theme.colors.accent} />
                </Pressable>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.size.heading,
                    fontFamily: theme.typography.family.semibold,
                    minWidth: 54,
                    textAlign: 'center',
                  }}>
                  {travel} min
                </Text>
                <Pressable
                  onPress={() => setTravel((value) => Math.min(MAX_TRAVEL_MINUTES, value + 5))}
                  hitSlop={8}>
                  <Ionicons name="add-circle-outline" size={28} color={theme.colors.accent} />
                </Pressable>
              </View>
            </View>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.size.caption,
                fontFamily: theme.typography.family.regular,
                marginTop: theme.spacing.md,
              }}>
              We remind you when it&apos;s time to leave. 0 means no travel.
            </Text>
          </Card>

          <Card>
            <Text style={fieldLabel}>Location</Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Where is it?"
              placeholderTextColor={theme.colors.textSecondary}
              style={inputStyle}
            />
          </Card>

          <Card>
            <Text style={fieldLabel}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything to remember"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              style={{ ...inputStyle, minHeight: 90, textAlignVertical: 'top' }}
            />
          </Card>

          <Card>
            <Text style={[fieldLabel, { marginBottom: theme.spacing.md }]}>Colour</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
              {EVENT_COLORS.map((swatch) => (
                <Pressable
                  key={swatch}
                  onPress={() => setColor(swatch)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.radius.pill,
                    backgroundColor: swatch,
                    borderWidth: color === swatch ? 3 : 0,
                    borderColor: theme.colors.textPrimary,
                  }}
                />
              ))}
            </View>
          </Card>

          <Card>
            <Text style={[fieldLabel, { marginBottom: theme.spacing.md }]}>Repeat</Text>
            <PillGroup
              options={DAY_CODES.map((code) => ({ value: code, label: DAY_LABELS[code] }))}
              selected={repeatDays}
              onSelect={toggleDay}
            />
            {repeatDays.length ? (
              <View style={{ marginTop: theme.spacing.lg }}>
                <Text style={fieldLabel}>Ends</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xl, marginTop: theme.spacing.sm }}>
                  <Pressable onPress={() => setUntil(null)}>
                    <Text
                      style={{
                        color: until ? theme.colors.textSecondary : theme.colors.accent,
                        fontSize: theme.typography.size.body,
                        fontFamily: theme.typography.family.semibold,
                      }}>
                      Never
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => setPicker('until')}>
                    <Text
                      style={{
                        color: until ? theme.colors.accent : theme.colors.textSecondary,
                        fontSize: theme.typography.size.body,
                        fontFamily: theme.typography.family.semibold,
                      }}>
                      {until ? format(until, 'EEE, MMM d yyyy') : 'On a date'}
                    </Text>
                  </Pressable>
                </View>
                {errors.until ? <Text style={errorStyle}>{errors.until}</Text> : null}
              </View>
            ) : null}
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.size.caption,
                fontFamily: theme.typography.family.regular,
                marginTop: theme.spacing.md,
              }}>
              Repeats every week. Editing changes every week.
            </Text>
          </Card>

          <Card>
            <SettingRow
              title="Remind me"
              description="Nudges before this starts, or before you need to leave"
              control={<Switch value={remind} onValueChange={setRemind} trackColor={{ true: theme.colors.accent }} />}
            />
            {remind ? (
              <View style={{ marginTop: theme.spacing.lg }}>
                <PillGroup
                  options={[
                    { value: 'default' as TierChoice, label: 'Default' },
                    ...TIER_ORDER.map((value) => ({ value: value as TierChoice, label: TIER_LABELS[value] })),
                  ]}
                  selected={[tierChoice]}
                  onSelect={setTierChoice}
                />
                {tierChoice === 'custom' ? (
                  <TextInput
                    value={customText}
                    onChangeText={setCustomText}
                    placeholder="45, 20, 5, 0"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numbers-and-punctuation"
                    style={{
                      ...inputStyle,
                      marginTop: theme.spacing.lg,
                      borderColor: customOffsets === null ? theme.colors.danger : theme.colors.border,
                    }}
                  />
                ) : null}
                {errors.reminders ? <Text style={errorStyle}>{errors.reminders}</Text> : null}
                {customOffsets !== null ? (
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.size.caption,
                      fontFamily: theme.typography.family.regular,
                      marginTop: theme.spacing.lg,
                    }}>
                    {describeOffsets(previewOffsets)}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Card>

          {!isNew ? (
            <Pressable onPress={onDelete} style={{ alignItems: 'center', paddingVertical: theme.spacing.md }}>
              <Text
                style={{
                  color: theme.colors.danger,
                  fontSize: theme.typography.size.body,
                  fontFamily: theme.typography.family.semibold,
                }}>
                Delete event
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>

        {picker ? (
          <DateTimePicker
            value={picker === 'date' ? day : picker === 'until' ? (until ?? day) : picker === 'start' ? startAt : endAt}
            mode={picker === 'date' || picker === 'until' ? 'date' : 'time'}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selected) => {
              const target = picker;
              if (Platform.OS !== 'ios') setPicker(null);
              if (event.type === 'dismissed' || !selected) return;
              if (target === 'date') setDay(selected);
              if (target === 'until') setUntil(selected);
              if (target === 'start') setStart(selected);
              if (target === 'end') setEnd(selected);
            }}
          />
        ) : null}

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
          <PrimaryButton label="Save event" onPress={onSave} disabled={saving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
