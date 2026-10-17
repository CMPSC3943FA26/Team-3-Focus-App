import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          padding: 20,
        },
        style,
      ]}>
      {children}
    </View>
  );
}
