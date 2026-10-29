import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { tr } from '@/localization/tr';

type ErrorStateProps = { title?: string; description?: string; onRetry?: () => void };

export function ErrorState({
  title = tr.error.title,
  description = tr.error.description,
  onRetry,
}: ErrorStateProps) {
  return (
    <Card accessibilityRole="alert">
      <ThemedText themeColor="danger" type="smallBold">
        {title}
      </ThemedText>
      <ThemedText>{description}</ThemedText>
      {onRetry ? <Button label={tr.error.retry} onPress={onRetry} /> : null}
    </Card>
  );
}
