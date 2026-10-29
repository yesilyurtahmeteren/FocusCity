import { Component, type ReactNode } from 'react';

import { ThemedText } from '@/components/themed-text';

/** A renderer failure must not discard the pending command or alter persisted state. */
export class MapFallback extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <>
        <ThemedText accessibilityRole="alert">
          İzometrik görünüm açılamadı. Aynı şehir 2D grid ile kullanılabilir.
        </ThemedText>
        {this.props.fallback}
      </>
    ) : (
      this.props.children
    );
  }
}
