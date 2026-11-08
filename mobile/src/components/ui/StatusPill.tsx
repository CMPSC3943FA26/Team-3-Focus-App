import { Text, View } from 'react-native';

import { urgencyColors, type Urgency } from '@/lib/urgency';
import { useTheme } from '../../../theme/ThemeContext';

export function StatusPill({ label, urgency }: { label: string; urgency: Urgency }) {
  const { theme, scheme } = useTheme();
  const { base, text } = urgencyColors(theme.colors, urgency);
  const tint = scheme === 'dark' ? '2E' : '1F';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 4,
        borderRadius: theme.radius.pill,
        backgroundColor: `${base}${tint}`,
      }}>
      <View style={{ width: 6, height: 6, borderRadius: theme.radius.pill, backgroundColor: base }} />
      <Text
        style={{
          color: text,
          fontSize: theme.typography.size.caption,
          fontFamily: theme.typography.family.bold,
        }}>
        {label}
      </Text>
    </View>
  );
}
