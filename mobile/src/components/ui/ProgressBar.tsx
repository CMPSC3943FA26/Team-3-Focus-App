import { View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';

export function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const { theme } = useTheme();
  const share = Math.min(1, Math.max(0, progress));

  return (
    <View style={{ height: 6, borderRadius: theme.radius.pill, backgroundColor: theme.colors.border, overflow: 'hidden' }}>
      <View
        style={{ width: `${share * 100}%`, height: 6, borderRadius: theme.radius.pill, backgroundColor: color }}
      />
    </View>
  );
}
