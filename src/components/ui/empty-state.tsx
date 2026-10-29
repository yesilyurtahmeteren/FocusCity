import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';

export type EmptyStateProps = { title: string; description: string };

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card>
      <ThemedText type="smallBold" accessibilityRole="header">
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary">{description}</ThemedText>
    </Card>
  );
}
