import { ThemedText } from '@/components/themed-text';
import { ErrorState } from '@/components/ui/error-state';

import { focusCopy as copy } from './focus-copy';
import { useFocus } from './focus-provider';

export function StorageStatus() {
  const { ready, busy, error, actions } = useFocus();
  if (error) {
    return (
      <ErrorState
        description={error === 'load' ? copy.loadError : copy.saveError}
        onRetry={
          busy
            ? undefined
            : () => {
                void actions.retry();
              }
        }
      />
    );
  }
  if (!ready || busy)
    return (
      <ThemedText accessibilityLiveRegion="polite">{ready ? copy.saving : copy.loading}</ThemedText>
    );
  return null;
}
