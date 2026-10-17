import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        height: 56,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.accent,
        opacity: disabled ? 0.5 : 1,
      }}>
      <Ionicons name="arrow-forward" size={20} color={theme.colors.accentText} />
      <Text
        style={{
          color: theme.colors.accentText,
          fontSize: theme.typography.size.body,
          fontFamily: theme.typography.family.semibold,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}
