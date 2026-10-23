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
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { DEFAULT_EVENT_COLOR, EVENT_COLORS, MAX_TRAVEL_MINUTES } from '@/constants/events';
import { formatClock, parseLocal, toLocalIso } from '@/lib/dates';
import { createEvent, deleteEvent, getEvent, updateEvent } from '@/services/events';
import { useTheme } from '../../../theme/ThemeContext';

type PickerTarget = 'date' | 'start' | 'end' | null;

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
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
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
      })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, [eventId, isNew]);

  const startAt = combine(day, start);
  const endAt = combine(day, end);

  const onSave = async () => {
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = 'Give the event a title.';
    if (endAt <= startAt) nextErrors.time = 'The end time must be after the start time.';
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
    };
    try {
      if (isNew) await createEvent(payload);
      else await updateEvent(eventId, payload);
      router.back();
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
            .catch(() => undefined);
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
            value={picker === 'date' ? day : picker === 'start' ? startAt : endAt}
            mode={picker === 'date' ? 'date' : 'time'}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selected) => {
              const target = picker;
              if (Platform.OS !== 'ios') setPicker(null);
              if (event.type === 'dismissed' || !selected) return;
              if (target === 'date') setDay(selected);
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
          <PrimaryButton label="Save event" onPress={onSave} disabled={saving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
