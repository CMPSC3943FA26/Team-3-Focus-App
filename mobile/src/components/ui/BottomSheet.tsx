import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';

export function BottomSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          onPress={onClose}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <Pressable
            onPress={() => undefined}
            style={{
              maxHeight: '85%',
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radius.lg,
              borderTopRightRadius: theme.radius.lg,
              padding: theme.spacing.xl,
              paddingBottom: theme.spacing.xxl,
            }}>
            <View
              style={{
                alignSelf: 'center',
                width: 40,
                height: 4,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.border,
                marginBottom: theme.spacing.lg,
              }}
            />
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.heading,
                fontFamily: theme.typography.family.bold,
                marginBottom: theme.spacing.lg,
              }}>
              {title}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: theme.spacing.md }}>
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
