import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';

export function Checkbox({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={{
        width: 22,
        height: 22,
        borderRadius: theme.radius.pill,
        borderWidth: checked ? 0 : 2,
        borderColor: theme.colors.border,
        backgroundColor: checked ? theme.colors.calm : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {checked ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
    </Pressable>
  );
}
