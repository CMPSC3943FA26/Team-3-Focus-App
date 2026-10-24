import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useTheme } from '../../../theme/ThemeContext';

export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { theme } = useTheme();

  return (
    <Card style={{ marginBottom: theme.spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
        <Text
          style={{
            flex: 1,
            color: theme.colors.warningText,
            fontSize: theme.typography.size.body,
            fontFamily: theme.typography.family.medium,
          }}>
          {message}
        </Text>

        <Pressable
          onPress={onRetry}
          style={{
            height: 44,
            justifyContent: 'center',
            paddingHorizontal: theme.spacing.xl,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.body,
              fontFamily: theme.typography.family.semibold,
            }}>
            Retry
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}
