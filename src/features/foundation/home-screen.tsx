import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { tr } from '@/localization/tr';

export function HomeScreen() {
  return (
    <Screen>
      <ThemedText type="smallBold" themeColor="primary">
        {tr.appName}
      </ThemedText>
      <ThemedText type="title" accessibilityRole="header">
        {tr.home.title}
      </ThemedText>
      <ThemedText themeColor="textSecondary">{tr.home.description}</ThemedText>
      <EmptyState title={tr.home.emptyTitle} description={tr.home.emptyDescription} />
      <Button label={tr.home.action} onPress={() => router.navigate('/explore')} />
    </Screen>
  );
}
