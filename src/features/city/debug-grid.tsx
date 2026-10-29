import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BUILDINGS, MAP_SIZE } from '@/domain/map/catalog';
import {
  connectedRoads,
  footprint,
  tileKey,
  type CityMap,
  type GridPosition,
  type MapPreview,
} from '@/domain/map/placement';
import { useTheme } from '@/hooks/use-theme';

import { mapCopy as copy } from './map-copy';

type Props = {
  map: CityMap;
  selection: GridPosition | null;
  preview: MapPreview | null;
  disabled: boolean;
  onSelect: (position: GridPosition) => void;
};
const AXES = Array.from({ length: MAP_SIZE }, (_, index) => index);

export function DebugGrid({ map, selection, preview, disabled, onSelect }: Props) {
  const theme = useTheme();
  const index = useMemo(() => {
    const connected = connectedRoads(map);
    const roads = new Set(map.roads.map(tileKey));
    const unlocked = new Set(map.unlockedTiles.map(tileKey));
    const buildings = new Map(
      map.buildings.flatMap((building) =>
        footprint(building.type, building.position).map(
          (cell) => [tileKey(cell), building] as const,
        ),
      ),
    );
    return { connected, roads, unlocked, buildings };
  }, [map]);
  const previewCells = new Set(preview?.cells.map(tileKey));
  return (
    <>
      <ThemedText type="small" themeColor="textSecondary">
        {copy.scrollHint}
      </ThemedText>
      <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator>
        <View>
          <View style={styles.row}>
            <ThemedText style={styles.rowLabel} />
            {AXES.map((x) => (
              <ThemedText key={x} style={styles.columnLabel}>
                {x}
              </ThemedText>
            ))}
          </View>
          {AXES.map((y) => (
            <View key={y} style={styles.row}>
              <ThemedText style={styles.rowLabel}>{y}</ThemedText>
              {AXES.map((x) => {
                const position = { x, y };
                const key = tileKey(position);
                const building = index.buildings.get(key);
                const road = index.roads.has(key);
                const unlocked = index.unlocked.has(key);
                const selected = selection?.x === x && selection.y === y;
                const highlighted = previewCells.has(key);
                const description = building
                  ? BUILDINGS[building.type].name
                  : road
                    ? copy.road
                    : unlocked
                      ? copy.empty
                      : copy.locked;
                const connection = road
                  ? index.connected.has(key)
                    ? copy.connected
                    : copy.noConnection
                  : '';
                let backgroundColor: string =
                  building?.type === 'city_hall'
                    ? theme.backgroundSelected
                    : theme.backgroundElement;
                if (!unlocked) backgroundColor = theme.background;
                if (highlighted && preview)
                  backgroundColor = !preview.valid
                    ? theme.previewInvalid
                    : preview.warning
                      ? theme.previewWarning
                      : theme.backgroundSelected;
                const color =
                  highlighted && preview
                    ? !preview.valid
                      ? theme.danger
                      : preview.warning
                        ? theme.warning
                        : theme.primary
                    : road
                      ? index.connected.has(key)
                        ? theme.primary
                        : theme.warning
                      : theme.text;
                return (
                  <Pressable
                    key={key}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={`Hücre ${x}, ${y}. ${description}. ${connection}`}
                    accessibilityState={{ selected, disabled }}
                    onPress={() => onSelect(position)}
                    style={[
                      styles.cell,
                      {
                        backgroundColor,
                        borderColor: selected ? theme.primary : theme.textSecondary,
                        borderWidth: selected ? 3 : 0.5,
                      },
                    ]}>
                    <ThemedText style={[styles.symbol, { color }]}>
                      {building
                        ? BUILDINGS[building.type].symbol
                        : road
                          ? 'Y'
                          : unlocked
                            ? '·'
                            : '×'}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <ThemedText type="small" themeColor="textSecondary">
        {copy.legend}
      </ThemedText>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  rowLabel: {
    width: 28,
    height: 48,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 12,
  },
  columnLabel: {
    width: 48,
    height: 48,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 12,
  },
  cell: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  symbol: { fontSize: 14, fontWeight: '700' },
});
