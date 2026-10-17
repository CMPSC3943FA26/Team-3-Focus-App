import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';

export function ScreenHeader({ title, showBack = true }: { title: string; showBack?: boolean }) {
  const { theme } = useTheme();
  const router = useRouter();
  const canGoBack = showBack && router.canGoBack();

  return (
    <View style={{ gap: theme.spacing.md, marginBottom: theme.spacing.xl }}>
      {canGoBack ? (
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
        </Pressable>
      ) : null}

      <View>
        <Text
          style={{
            color: theme.colors.accent,
            fontSize: theme.typography.size.eyebrow,
            fontFamily: theme.typography.family.semibold,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}>
          Time Sight
        </Text>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.title,
            fontFamily: theme.typography.family.bold,
            marginTop: theme.spacing.xs,
          }}>
          {title}
        </Text>
      </View>
    </View>
  );
}
