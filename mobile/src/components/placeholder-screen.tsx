import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/ThemeContext';

type Props = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
};

export function PlaceholderScreen({ title, subtitle, children }: Props) {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.container, { padding: theme.spacing.xl }]}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.title,
            fontWeight: theme.typography.weight.bold,
          }}>
          {title}
        </Text>

        {subtitle ? (
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.size.body,
              marginTop: theme.spacing.sm,
              textAlign: 'center',
            }}>
            {subtitle}
          </Text>
        ) : null}

        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
