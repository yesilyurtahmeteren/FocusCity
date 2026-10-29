import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { formatDuration, type FinishedSession } from '@/domain/focus/session';
import { locale } from '@/localization/tr';
import type { RewardEntry } from '@/domain/economy/rewards';

import { focusCopy as copy } from './focus-copy';

export function SessionSummary({
  session,
  detailed = false,
  reward,
}: {
  session: FinishedSession;
  detailed?: boolean;
  reward?: RewardEntry;
}) {
  return (
    <Card>
      <ThemedText type="smallBold" accessibilityRole="header">
        {session.status === 'completed' ? copy.completed : copy.cancelled}
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        {new Date(session.endedAtUtc).toLocaleString(locale)}
      </ThemedText>
      <ThemedText>
        {copy.planned}: {session.plannedSeconds / 60} {copy.minutes}
      </ThemedText>
      <ThemedText>
        {copy.elapsed}: {formatDuration(session.elapsedMs / 1000)}
      </ThemedText>
      <ThemedText themeColor="primary">
        {copy.credited}: {formatDuration(session.creditedSeconds)}
      </ThemedText>
      {detailed ? (
        <ThemedText>
          {session.status === 'completed' ? copy.completedMessage : copy.cancelledMessage}
        </ThemedText>
      ) : null}
      {reward ? (
        <>
          <ThemedText>
            {copy.rewardCoins}: +{reward.coins}
          </ThemedText>
          <ThemedText>
            {copy.baseRp}: +{reward.baseResearchPoints} · {copy.bonusRp}: +
            {reward.bonusResearchPoints}
          </ThemedText>
          <ThemedText>
            {copy.labor}: +{formatDuration(reward.laborSeconds)}
          </ThemedText>
        </>
      ) : null}
    </Card>
  );
}
