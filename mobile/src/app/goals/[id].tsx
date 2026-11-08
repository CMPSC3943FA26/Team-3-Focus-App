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
import { PillGroup } from '@/components/ui/PillGroup';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { apiErrorMessage } from '@/lib/api';
import { dayKey, parseLocal } from '@/lib/dates';
import { createGoal, deleteGoal, getGoal, updateGoal } from '@/services/goals';
import { URGENCY_LEVELS, type GoalUrgency } from '@/types/goal';
import { useTheme } from '../../../theme/ThemeContext';

const URGENCY_LABELS: Record<GoalUrgency, string> = { low: 'Low', medium: 'Medium', high: 'High' };

export default function GoalFormScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const goalId = Number(id);

  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);

  const [title, setTitle] = useState('');
  const [target, setTarget] = useState<Date | null>(null);
  const [urgency, setUrgency] = useState<GoalUrgency>('medium');
  const [description, setDescription] = useState('');
  const [completed, setCompleted] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }
    getGoal(goalId)
      .then((goal) => {
        if (!goal) {
          setMissing(true);
          return;
        }
        setTitle(goal.title);
        setTarget(goal.target_date ? parseLocal(`${goal.target_date}T00:00:00`) : null);
        setUrgency(goal.urgency);
        setDescription(goal.description ?? '');
        setCompleted(goal.is_completed);
      })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, [goalId, isNew]);

  const onSave = async () => {
    if (!title.trim()) {
      setTitleError('Give the goal a title.');
      return;
    }
    setTitleError(null);
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      target_date: target ? dayKey(target) : null,
      urgency,
      is_completed: completed,
    };
    try {
      setSaveError(null);
      if (isNew) await createGoal(payload);
      else await updateGoal(goalId, payload);
      router.back();
    } catch (error) {
      setSaveError(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    Alert.alert('Delete goal', 'Its tasks are kept, just not linked to a goal.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteGoal(goalId)
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
          <ScreenHeader title="Goal" />
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.size.body,
              fontFamily: theme.typography.family.regular,
            }}>
            This goal no longer exists
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

  const linkText = {
    color: theme.colors.accent,
    fontSize: theme.typography.size.body,
    fontFamily: theme.typography.family.semibold,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 140, gap: theme.spacing.lg }}>
          <ScreenHeader title={isNew ? 'New goal' : 'Edit goal'} />

          <Card>
            <Text style={fieldLabel}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What do you want to finish?"
              placeholderTextColor={theme.colors.textSecondary}
              style={inputStyle}
            />
            {titleError ? (
              <Text
                style={{
                  color: theme.colors.danger,
                  fontSize: theme.typography.size.caption,
                  fontFamily: theme.typography.family.regular,
                  marginTop: theme.spacing.sm,
                }}>
                {titleError}
              </Text>
            ) : null}
          </Card>

          <Card>
            <Text style={fieldLabel}>Target date</Text>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.heading,
                fontFamily: theme.typography.family.semibold,
                marginTop: theme.spacing.xs,
              }}>
              {target ? format(target, 'EEEE, MMM d yyyy') : 'No target date'}
            </Text>
            <View style={{ flexDirection: 'row', gap: theme.spacing.xl, marginTop: theme.spacing.md }}>
              <Pressable onPress={() => setPicking(true)}>
                <Text style={linkText}>{target ? 'Change' : 'Set date'}</Text>
              </Pressable>
              {target ? (
                <Pressable onPress={() => setTarget(null)}>
                  <Text style={{ ...linkText, color: theme.colors.textSecondary }}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
          </Card>

          <Card>
            <Text style={[fieldLabel, { marginBottom: theme.spacing.md }]}>Urgency</Text>
            <PillGroup
              options={URGENCY_LEVELS.map((value) => ({ value, label: URGENCY_LABELS[value] }))}
              selected={[urgency]}
              onSelect={setUrgency}
            />
          </Card>

          <Card>
            <Text style={fieldLabel}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Anything to remember"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              style={{ ...inputStyle, minHeight: 90, textAlignVertical: 'top' }}
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
                Delete goal
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>

        {picking ? (
          <DateTimePicker
            value={target ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selected) => {
              if (Platform.OS !== 'ios') setPicking(false);
              if (event.type === 'dismissed' || !selected) return;
              setTarget(selected);
            }}
          />
        ) : null}

        <View style={{ position: 'absolute', left: theme.spacing.xl, right: theme.spacing.xl, bottom: theme.spacing.xl }}>
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
          <PrimaryButton label="Save goal" onPress={onSave} disabled={saving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
