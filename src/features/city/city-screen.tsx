import { router } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { BALANCE } from '@/domain/economy/balance';
import { formatDuration } from '@/domain/focus/session';
import { useFocus } from '@/features/focus/focus-provider';
import { StorageStatus } from '@/features/focus/storage-status';

import { cityCopy as copy } from './city-copy';
import { MapEditor } from './map-editor';

export function CityScreen() {
  const [mapGesture, setMapGesture] = useState(false);
  const { economy, ready } = useFocus();
  const { city, ledger } = economy;
  const report = city.lastPeriodReport;
  return (
    <Screen scrollEnabled={!mapGesture}>
      <ThemedText type="subtitle" accessibilityRole="header">
        {copy.title}
      </ThemedText>
      <StorageStatus />
      {ready ? (
        <>
          <MapEditor onGestureChange={setMapGesture} />
          <Card>
            <ThemedText type="smallBold" accessibilityRole="header">
              {copy.wallet}
            </ThemedText>
            <ThemedText>
              {copy.coins}: {city.coins}
            </ThemedText>
            <ThemedText>
              {copy.researchPoints}: {city.researchPoints}
            </ThemedText>
            <ThemedText>
              {copy.labor}: {formatDuration(city.unallocatedLaborSeconds)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {copy.laborHint}
            </ThemedText>
          </Card>
          <Card>
            <ThemedText type="smallBold" accessibilityRole="header">
              {copy.progress}
            </ThemedText>
            <ThemedText>
              {copy.focusTime}: {formatDuration(city.totalCreditedFocusSeconds)}
            </ThemedText>
            <ThemedText>
              {copy.processedSessions}: {ledger.length}
            </ThemedText>
            <ThemedText>
              {copy.nextRp}:{' '}
              {formatDuration(BALANCE.secondsPerResearchPoint - city.rpMinuteRemainderSeconds)}
            </ThemedText>
            <ThemedText>
              {copy.nextPeriod}:{' '}
              {formatDuration(BALANCE.secondsPerCityPeriod - city.cityPeriodRemainderSeconds)}
            </ThemedText>
            <ThemedText>
              {copy.periods}: {city.lastProcessedCityPeriod}
            </ThemedText>
            {city.rpBonusRemainderUnits > 0 ? (
              <ThemedText>
                {copy.bonusProgress}: %
                {Math.floor((city.rpBonusRemainderUnits * 100) / BALANCE.researchBonusDenominator)}
              </ThemedText>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary">
              {copy.rates}
            </ThemedText>
          </Card>
          <Card>
            <ThemedText type="smallBold" accessibilityRole="header">
              {copy.periodReport}
            </ThemedText>
            <ThemedText>
              {copy.population}: {city.population}
            </ThemedText>
            {report ? (
              <>
                <ThemedText>
                  {copy.reportNumber}: {report.period}
                </ThemedText>
                <ThemedText>
                  {copy.taxIncome}: {report.taxIncome}
                </ThemedText>
                <ThemedText>
                  {copy.expenses}: {report.operatingExpenses}
                </ThemedText>
                <ThemedText>
                  {copy.happiness}: {report.happiness}/100
                </ThemedText>
                <ThemedText>
                  {copy.growth}: {report.populationGrowth}
                </ThemedText>
                <ThemedText>
                  {copy.unfunded}: {report.unfundedServiceIds.length}
                </ThemedText>
              </>
            ) : (
              <ThemedText themeColor="textSecondary">{copy.noPeriod}</ThemedText>
            )}
          </Card>
          <ThemedText type="small" themeColor="textSecondary">
            {copy.scope}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {copy.local}
          </ThemedText>
        </>
      ) : null}
      <Button label={copy.focusAction} onPress={() => router.navigate('/')} />
    </Screen>
  );
}
