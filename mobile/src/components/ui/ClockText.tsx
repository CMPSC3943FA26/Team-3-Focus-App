import { Text, type StyleProp, type TextStyle } from 'react-native';

import { formatTime } from '@/lib/dates';
import { useTheme } from '../../../theme/ThemeContext';

// Big clock with a smaller AM/PM so "10:00 PM" still fits at display size.
export function ClockText({ time, style }: { time: string; style?: StyleProp<TextStyle> }) {
  const { theme } = useTheme();
  const [clock, period] = formatTime(time).split(' ');

  return (
    <Text style={style}>
      {clock}
      <Text style={{ fontSize: theme.typography.size.heading }}> {period}</Text>
    </Text>
  );
}
