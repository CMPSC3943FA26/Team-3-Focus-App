import { Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';

export function SettingRow({
  title,
  description,
  control,
}: {
  title: string;
  description?: string;
  control?: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.heading,
            fontFamily: theme.typography.family.semibold,
          }}>
          {title}
        </Text>
        {description ? (
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.size.caption,
              fontFamily: theme.typography.family.regular,
              marginTop: theme.spacing.xs,
            }}>
            {description}
          </Text>
        ) : null}
      </View>
      {control}
    </View>
  );
}
