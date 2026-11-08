import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TierSelector } from '@/components/TierSelector';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Fab } from '@/components/ui/Fab';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { DEFAULT_EVENT_COLOR, EVENT_COLORS } from '@/constants/events';
import { describeOffsets, offsetsFor, parseOffsets, shortOffsets, TIER_LABELS } from '@/constants/reminders';
import { apiErrorMessage } from '@/lib/api';
import {
  addUsualCategories,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '@/services/categories';
import type { FrequencyTier } from '@/types/alarm';
import type { Category } from '@/types/category';
import { useTheme } from '../../theme/ThemeContext';

type Editing = { category: Category | null };

function presetLabel(category: Category): string {
  if (!category.reminder_tier) return 'Uses my default';
  const offsets = offsetsFor({ frequency_tier: category.reminder_tier, custom_offsets: category.custom_offsets });
  return `${TIER_LABELS[category.reminder_tier]} · ${shortOffsets(offsets)}`;
}

export default function TaskTypesScreen() {
  const { theme } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_EVENT_COLOR);
  const [useDefault, setUseDefault] = useState(true);
  const [tier, setTier] = useState<FrequencyTier>('some');
  const [customText, setCustomText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(() => {
    listCategories()
      .then((loaded) => {
        setCategories(loaded);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const openEditor = (category: Category | null) => {
    setEditing({ category });
    setName(category?.name ?? '');
    setColor(category?.color ?? DEFAULT_EVENT_COLOR);
    setUseDefault(!category?.reminder_tier);
    setTier(category?.reminder_tier ?? 'some');
    setCustomText(category?.custom_offsets.join(', ') ?? '');
    setError(null);
  };

  const customOffsets = tier === 'custom' ? parseOffsets(customText) : [];
  const canSave = !saving && name.trim().length > 0 && (useDefault || customOffsets !== null);

  const onSave = async () => {
    if (!editing || !canSave) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      color,
      reminder_tier: useDefault ? null : tier,
      custom_offsets: useDefault || tier !== 'custom' ? [] : (customOffsets ?? []),
    };
    try {
      setError(null);
      if (editing.category) await updateCategory(editing.category.id, payload);
      else await createCategory(payload);
      setEditing(null);
      refresh();
    } catch (caught) {
      setError(apiErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    const target = editing?.category;
    if (!target) return;
    Alert.alert('Delete task type', 'Tasks of this type are kept, just without a type.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteCategory(target.id)
            .then(() => {
              setEditing(null);
              refresh();
            })
            .catch((caught) => setError(apiErrorMessage(caught)));
        },
      },
    ]);
  };

  const caption = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.caption,
    fontFamily: theme.typography.family.medium,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 120, gap: theme.spacing.md }}>
        <ScreenHeader title="Task types" />

        {failed ? <ErrorBanner message="Can't reach the server" onRetry={refresh} /> : null}

        {categories.length === 0 && !failed ? (
          <Card>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.size.body,
                fontFamily: theme.typography.family.regular,
              }}>
              No task types yet. Each one can have its own reminder preset.
            </Text>
            <Pressable
              onPress={() => {
                addUsualCategories()
                  .then(refresh)
                  .catch(() => setFailed(true));
              }}
              style={{ marginTop: theme.spacing.md }}>
              <Text
                style={{
                  color: theme.colors.accent,
                  fontSize: theme.typography.size.body,
                  fontFamily: theme.typography.family.semibold,
                }}>
                Add the usual ones
              </Text>
            </Pressable>
          </Card>
        ) : null}

        {categories.map((category) => (
          <Pressable key={category.id} onPress={() => openEditor(category)}>
            <Card style={{ padding: theme.spacing.lg, borderRadius: theme.radius.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <View style={{ width: 14, height: 14, borderRadius: theme.radius.pill, backgroundColor: category.color }} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.size.body,
                      fontFamily: theme.typography.family.semibold,
                    }}>
                    {category.name}
                  </Text>
                  <Text style={{ ...caption, marginTop: 2 }}>{presetLabel(category)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={theme.colors.textSecondary} />
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>

      <Fab label="New type" onPress={() => openEditor(null)} />

      <BottomSheet
        visible={editing !== null}
        title={editing?.category ? 'Edit task type' : 'New task type'}
        onClose={() => setEditing(null)}>
        <Text style={caption}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Homework"
          placeholderTextColor={theme.colors.textSecondary}
          style={{
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

        <Text style={caption}>Colour</Text>
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

        <Text style={caption}>Reminder preset</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.body,
              fontFamily: theme.typography.family.medium,
            }}>
            Use my default
          </Text>
          <Switch value={useDefault} onValueChange={setUseDefault} trackColor={{ true: theme.colors.accent }} />
        </View>

        {!useDefault ? (
          <TierSelector
            description="Used for task due reminders of this type."
            tier={tier}
            onTierChange={setTier}
            customText={customText}
            onCustomTextChange={setCustomText}
          />
        ) : null}

        {error ? (
          <Text
            style={{
              color: theme.colors.danger,
              fontSize: theme.typography.size.caption,
              fontFamily: theme.typography.family.medium,
            }}>
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={onSave}
          disabled={!canSave}
          style={{
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.accent,
            opacity: canSave ? 1 : 0.5,
          }}>
          <Text
            style={{
              color: theme.colors.accentText,
              fontSize: theme.typography.size.body,
              fontFamily: theme.typography.family.semibold,
            }}>
            Save
          </Text>
        </Pressable>

        {editing?.category ? (
          <Pressable onPress={onDelete} style={{ alignItems: 'center', paddingVertical: theme.spacing.sm }}>
            <Text
              style={{
                color: theme.colors.danger,
                fontSize: theme.typography.size.body,
                fontFamily: theme.typography.family.semibold,
              }}>
              Delete
            </Text>
          </Pressable>
        ) : null}
      </BottomSheet>
    </SafeAreaView>
  );
}
