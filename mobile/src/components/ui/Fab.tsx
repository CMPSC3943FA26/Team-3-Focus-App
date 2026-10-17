import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';

export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={{
        position: 'absolute',
        right: theme.spacing.xl,
        bottom: theme.spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        height: 52,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.accent,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}>
      <Ionicons name="add" size={22} color={theme.colors.accentText} />
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
