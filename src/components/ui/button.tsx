import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'children'> & { label: string };

export function Button({ label, disabled, style, ...props }: ButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      {...props}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ ...props.accessibilityState, disabled: !!disabled }}
      style={(state) => [
        styles.button,
        { backgroundColor: theme.primary, opacity: disabled ? 0.45 : state.pressed ? 0.75 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}>
      <ThemedText themeColor="onPrimary">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
