import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { tr } from '@/localization/tr';

export function FoundationScreen() {
  return (
    <Screen>
      <ThemedText type="smallBold" themeColor="primary">
        {tr.foundation.description}
      </ThemedText>
      <ThemedText type="subtitle" accessibilityRole="header">
        {tr.foundation.title}
      </ThemedText>
      <EmptyState title={tr.foundation.themeTitle} description={tr.foundation.themeDescription} />
      <EmptyState title={tr.foundation.scopeTitle} description={tr.foundation.scopeDescription} />
    </Screen>
  );
}
