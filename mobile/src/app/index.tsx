import { Text } from 'react-native';

import { PlaceholderScreen } from '@/components/placeholder-screen';
import { useTheme } from '../../theme/ThemeContext';

export default function HomeScreen() {
  const { theme } = useTheme();

  return (
    <PlaceholderScreen title="Home" subtitle="Focus view with the countdown goes here">
      <Text
        style={{
          color: theme.colors.calm,
          fontSize: theme.typography.size.display,
          fontWeight: theme.typography.weight.bold,
          marginTop: theme.spacing.xl,
        }}>
        00:00
      </Text>
    </PlaceholderScreen>
  );
}
