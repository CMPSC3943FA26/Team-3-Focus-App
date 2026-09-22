import { Pressable, Text } from 'react-native';

import { PlaceholderScreen } from '@/components/placeholder-screen';
import { useTheme } from '../../theme/ThemeContext';

export default function SettingsScreen() {
  const { theme, scheme, isOverridden, toggleScheme, followDevice } = useTheme();

  return (
    <PlaceholderScreen title="Settings" subtitle="App preferences go here">
      <Pressable
        onPress={toggleScheme}
        style={{
          marginTop: theme.spacing.xl,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.xl,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.accent,
        }}>
        <Text
          style={{
            color: theme.colors.surface,
            fontSize: theme.typography.size.body,
            fontWeight: theme.typography.weight.medium,
          }}>
          Switch to {scheme === 'dark' ? 'light' : 'dark'}
        </Text>
      </Pressable>

      {isOverridden ? (
        <Pressable onPress={followDevice} style={{ marginTop: theme.spacing.md }}>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.size.caption,
            }}>
            Follow device setting
          </Text>
        </Pressable>
      ) : null}
    </PlaceholderScreen>
  );
}
