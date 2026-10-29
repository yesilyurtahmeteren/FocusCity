import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { formatDuration, parseMinutes, remainingSeconds } from '@/domain/focus/session';
import { useTheme } from '@/hooks/use-theme';
import { tr } from '@/localization/tr';

import { focusCopy as copy } from './focus-copy';
import { useFocus } from './focus-provider';
import { SessionSummary } from './session-summary';
import { StorageStatus } from './storage-status';

export function FocusScreen() {
  const { data, economy, now, ready, busy, error, actions } = useFocus();
  const theme = useTheme();
  const [duration, setDuration] = useState('25');
  const [confirming, setConfirming] = useState(false);
  const minutes = parseMinutes(duration);
  const disabled = !ready || busy || !!error;
  const session = data.active;
  const last = data.history[0];

  return (
    <Screen
      key={session ? `active-${session.id}` : `setup-${last?.id ?? 'new'}`}
      keyboardShouldPersistTaps="handled">
      <ThemedText type="smallBold" themeColor="primary">
        {tr.appName}
      </ThemedText>
      <ThemedText type="subtitle" accessibilityRole="header">
        {session ? (session.status === 'running' ? copy.running : copy.paused) : copy.title}
      </ThemedText>
      <StorageStatus />
      {session ? (
        <>
          <Card>
            <ThemedText
              type="title"
              style={styles.timer}
              accessibilityLabel={`${remainingSeconds(session, now)} saniye kaldı`}>
              {formatDuration(remainingSeconds(session, now))}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {session.status === 'running' ? copy.runningHint : copy.pausedHint}
            </ThemedText>
          </Card>
          <Button
            label={session.status === 'running' ? copy.pause : copy.resume}
            disabled={disabled}
            onPress={() => {
              void (session.status === 'running' ? actions.pause() : actions.resume());
            }}
          />
          {confirming ? (
            <Card accessibilityRole="alert">
              <ThemedText type="smallBold">{copy.confirmTitle}</ThemedText>
              <ThemedText>{copy.confirmDescription}</ThemedText>
              <Button label={copy.keep} disabled={busy} onPress={() => setConfirming(false)} />
              <Button
                label={copy.confirmCancel}
                disabled={disabled}
                onPress={() => {
                  setConfirming(false);
                  void actions.cancel();
                }}
              />
            </Card>
          ) : (
            <Button label={copy.cancel} disabled={disabled} onPress={() => setConfirming(true)} />
          )}
          <ThemedText type="small" themeColor="textSecondary">
            {copy.clockHint}
          </ThemedText>
        </>
      ) : ready ? (
        <>
          {last ? (
            <>
              <ThemedText type="smallBold">{copy.summary}</ThemedText>
              <SessionSummary
                session={last}
                reward={economy.ledger.find((entry) => entry.sessionId === last.id)}
                detailed
              />
            </>
          ) : null}
          <ThemedText themeColor="textSecondary">{copy.subtitle}</ThemedText>
          <View style={styles.presets}>
            {[15, 25, 50].map((preset) => (
              <Pressable
                key={preset}
                accessibilityRole="radio"
                accessibilityState={{ checked: minutes === preset, disabled }}
                disabled={disabled}
                onPress={() => setDuration(String(preset))}
                style={[
                  styles.preset,
                  {
                    backgroundColor:
                      minutes === preset ? theme.backgroundSelected : theme.backgroundElement,
                  },
                ]}>
                <ThemedText>
                  {preset} {copy.minutes}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <ThemedText nativeID="focus-duration-label">{copy.customLabel}</ThemedText>
          <TextInput
            value={duration}
            onChangeText={setDuration}
            editable={!disabled}
            keyboardType="number-pad"
            accessibilityLabel={copy.customLabel}
            accessibilityLabelledBy="focus-duration-label"
            placeholder={copy.customPlaceholder}
            placeholderTextColor={theme.textSecondary}
            maxLength={3}
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: theme.textSecondary,
                backgroundColor: theme.backgroundElement,
              },
            ]}
          />
          {minutes === null ? (
            <ThemedText themeColor="danger" accessibilityRole="alert">
              {copy.invalidDuration}
            </ThemedText>
          ) : null}
          <Button
            label={copy.start}
            disabled={disabled || minutes === null}
            onPress={() => {
              if (minutes !== null) {
                setConfirming(false);
                void actions.start(minutes);
              }
            }}
          />
        </>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary">
        {copy.policy}
      </ThemedText>
      <Button label={copy.history} onPress={() => router.navigate('/explore')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  timer: { textAlign: 'center', fontVariant: ['tabular-nums'], paddingVertical: 24 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { minHeight: 48, justifyContent: 'center', padding: 16, borderRadius: 16 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 18 },
});
