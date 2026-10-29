import { router } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { formatDuration } from '@/domain/focus/session';

import { focusCopy as copy } from './focus-copy';
import { useFocus } from './focus-provider';
import { SessionSummary } from './session-summary';
import { StorageStatus } from './storage-status';

export function HistoryScreen() {
  const { data, economy, ready } = useFocus();
  const [visible, setVisible] = useState(20);
  const completed = data.history.filter((session) => session.status === 'completed');
  const totalSeconds = completed.reduce((total, session) => total + session.creditedSeconds, 0);
  const rewardsById = new Map(economy.ledger.map((entry) => [entry.sessionId, entry]));
  return (
    <Screen>
      <ThemedText type="subtitle" accessibilityRole="header">
        {copy.historyTitle}
      </ThemedText>
      <StorageStatus />
      {ready ? (
        <>
          <Card>
            <ThemedText>
              {copy.completedCount}: {completed.length}
            </ThemedText>
            <ThemedText>
              {copy.total}: {formatDuration(totalSeconds)}
            </ThemedText>
          </Card>
          {data.history.length === 0 ? (
            <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
          ) : null}
          {data.history.slice(0, visible).map((session) => (
            <SessionSummary
              key={session.id}
              session={session}
              reward={rewardsById.get(session.id)}
            />
          ))}
          {visible < data.history.length ? (
            <Button label={copy.more} onPress={() => setVisible((count) => count + 20)} />
          ) : null}
        </>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary">
        {copy.localOnly}
      </ThemedText>
      <Button label={copy.back} onPress={() => router.navigate('/')} />
    </Screen>
  );
}
