import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BUILDINGS, type PurchasableBuilding } from '@/domain/map/catalog';
import {
  buildingAt,
  hasRoadConnection,
  previewMapCommand,
  type GridPosition,
  type MapCommand,
} from '@/domain/map/placement';
import { useFocus } from '@/features/focus/focus-provider';
import { useTheme } from '@/hooks/use-theme';

import { DebugGrid } from './debug-grid';
import { IsometricMap } from './isometric-map';
import { MapFallback } from './map-fallback';
import { mapCopy as copy, mapErrors } from './map-copy';

type Mode = 'inspect' | 'add_road' | 'remove_road' | 'move' | PurchasableBuilding;
const TOOLS: { mode: Mode; label: string }[] = [
  { mode: 'inspect', label: copy.inspect },
  ...(['house', 'park', 'power_plant'] as const).map((type) => ({
    mode: type,
    label: `${BUILDINGS[type].name} · ${BUILDINGS[type].coins} para · ${BUILDINGS[type].width}×${BUILDINGS[type].height}`,
  })),
  { mode: 'add_road', label: copy.addRoad },
  { mode: 'remove_road', label: copy.removeRoad },
];

export function MapEditor({ onGestureChange }: { onGestureChange: (active: boolean) => void }) {
  const { world, economy, ready, busy, error, mapError, actions } = useFocus();
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('inspect');
  const [selection, setSelection] = useState<GridPosition | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [isometric, setIsometric] = useState(true);
  const disabled = !ready || busy || !!error;
  const map = world.map;
  const command = useMemo<MapCommand | null>(() => {
    if (!selection || mode === 'inspect') return null;
    if (mode === 'move')
      return movingId ? { kind: 'move', buildingId: movingId, position: selection } : null;
    if (mode === 'add_road' || mode === 'remove_road') return { kind: mode, position: selection };
    return { kind: 'place', buildingType: mode, position: selection };
  }, [mode, selection, movingId]);
  const preview = command ? previewMapCommand(map, command, economy.city.coins) : null;
  const selectedBuilding = selection ? buildingAt(map, selection) : undefined;
  const changeMode = (next: Mode) => {
    setMode(next);
    setSelection(null);
    setMovingId(null);
    actions.clearMapError();
  };
  const confirm = async () => {
    if (command && preview?.valid && (await actions.applyMap(command))) changeMode('inspect');
  };

  return (
    <>
      <Card>
        <ThemedText type="smallBold" accessibilityRole="header">
          {copy.title}
        </ThemedText>
        <ThemedText>
          {copy.balance}: {economy.city.coins}
        </ThemedText>
        <View style={styles.tools}>
          {TOOLS.map((tool) => (
            <Pressable
              key={tool.mode}
              accessibilityRole="button"
              disabled={disabled}
              accessibilityState={{ selected: mode === tool.mode, disabled }}
              onPress={() => changeMode(tool.mode)}
              style={[
                styles.tool,
                {
                  backgroundColor: mode === tool.mode ? theme.backgroundSelected : theme.background,
                  borderColor: theme.textSecondary,
                },
              ]}>
              <ThemedText type="small">{tool.label}</ThemedText>
            </Pressable>
          ))}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {mode === 'move' ? copy.moving : copy.chooseCell}
        </ThemedText>
      </Card>
      <Button
        label={isometric ? '2D grid · Erişilebilir alternatif' : 'İzometrik şehre dön'}
        onPress={() => setIsometric((value) => !value)}
      />
      {isometric ? (
        <MapFallback
          fallback={
            <DebugGrid
              map={map}
              selection={selection}
              preview={preview}
              disabled={disabled}
              onSelect={setSelection}
            />
          }>
          <IsometricMap
            map={map}
            selection={selection}
            preview={preview}
            disabled={disabled}
            inspecting={mode === 'inspect'}
            onGestureChange={onGestureChange}
            onSelect={setSelection}
          />
        </MapFallback>
      ) : (
        <DebugGrid
          map={map}
          selection={selection}
          preview={preview}
          disabled={disabled}
          onSelect={setSelection}
        />
      )}
      <Card>
        <ThemedText type="smallBold" accessibilityRole="header">
          {mode === 'inspect' ? copy.selected : copy.preview}
        </ThemedText>
        <ThemedText>{selection ? `(${selection.x}, ${selection.y})` : copy.noSelection}</ThemedText>
        {preview ? (
          <>
            <ThemedText
              themeColor={!preview.valid ? 'danger' : preview.warning ? 'warning' : 'primary'}
              accessibilityLiveRegion="polite">
              {preview.valid ? copy.valid : copy.invalid}
            </ThemedText>
            {preview.error ? (
              <ThemedText themeColor="danger">{mapErrors[preview.error]}</ThemedText>
            ) : null}
            {preview.warning ? (
              <ThemedText themeColor="warning">
                {command?.kind === 'remove_road' ? copy.removeWarning : copy.disconnected}
              </ThemedText>
            ) : null}
            <ThemedText>
              {copy.price}: {preview.cost}
            </ThemedText>
            <Button
              label={copy.confirm}
              disabled={disabled || !preview.valid}
              onPress={() => {
                void confirm();
              }}
            />
          </>
        ) : null}
        {mapError ? (
          <ThemedText themeColor="danger" accessibilityRole="alert">
            {mapErrors[mapError]}
          </ThemedText>
        ) : null}
        {mode === 'inspect' && selectedBuilding ? (
          <>
            <ThemedText type="smallBold">
              {BUILDINGS[selectedBuilding.type].name} · Seviye {selectedBuilding.level}
            </ThemedText>
            <ThemedText>
              {selectedBuilding.status === 'active' ? copy.active : copy.planned}
            </ThemedText>
            <ThemedText
              themeColor={hasRoadConnection(map, selectedBuilding) ? 'primary' : 'warning'}>
              {hasRoadConnection(map, selectedBuilding) ? copy.connected : copy.noConnection}
            </ThemedText>
            {selectedBuilding.type === 'city_hall' ? (
              <ThemedText>{copy.fixed}</ThemedText>
            ) : (
              <>
                <ThemedText>
                  {copy.focusNeeded}: {selectedBuilding.targetFocusSeconds / 60} dakika
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {copy.progressHint}
                </ThemedText>
                <Button
                  label={copy.move}
                  disabled={disabled}
                  onPress={() => {
                    setMovingId(selectedBuilding.id);
                    setMode('move');
                    setSelection(null);
                    actions.clearMapError();
                  }}
                />
              </>
            )}
          </>
        ) : null}
        {mode !== 'inspect' || selection ? (
          <Button label={copy.cancel} disabled={disabled} onPress={() => changeMode('inspect')} />
        ) : null}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  tools: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tool: { minHeight: 48, padding: 12, borderRadius: 12, borderWidth: 1, justifyContent: 'center' },
});
