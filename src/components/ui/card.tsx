import { StyleSheet, type ViewProps } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export function Card({ style, ...props }: ViewProps) {
  return <ThemedView {...props} type="backgroundElement" style={[styles.card, style]} />;
}

const styles = StyleSheet.create({
  card: { padding: Spacing.four, borderRadius: Spacing.three, gap: Spacing.three },
});
