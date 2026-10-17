import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';

export type PillOption<T extends string> = { value: T; label: string };

export function PillGroup<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: PillOption<T>[];
  selected: T[];
  onSelect: (value: T) => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={{
              height: 48,
              justifyContent: 'center',
              paddingHorizontal: theme.spacing.xl,
              borderRadius: theme.radius.pill,
              borderWidth: 1,
              borderColor: active ? theme.colors.accent : theme.colors.border,
              backgroundColor: active ? theme.colors.accent : 'transparent',
            }}>
            <Text
              style={{
                color: active ? theme.colors.accentText : theme.colors.textPrimary,
                fontSize: theme.typography.size.body,
                fontFamily: theme.typography.family.medium,
              }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
