import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Animated,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { BUILDINGS } from '@/domain/map/catalog';
import {
  connectedRoads,
  tileKey,
  type CityMap,
  type GridPosition,
  type MapPreview,
} from '@/domain/map/placement';
import {
  fitCamera,
  hitTest,
  isVisible,
  panCamera,
  pinchCamera,
  project,
  toScreen,
  zoomAt,
  type Camera,
} from '@/domain/map/projection';
import { useTheme } from '@/hooks/use-theme';

import { SpriteRegistry } from './sprite-registry';

const HEIGHT = 360;
type Props = {
  map: CityMap;
  selection: GridPosition | null;
  preview: MapPreview | null;
  disabled: boolean;
  inspecting: boolean;
  onSelect: (point: GridPosition) => void;
  onGestureChange: (active: boolean) => void;
};

const Diamond = memo(function Diamond({
  x,
  y,
  width,
  color,
  border,
}: {
  x: number;
  y: number;
  width: number;
  color: string;
  border: string;
}) {
  const side = width / Math.SQRT2;
  return (
    <View
      style={{
        position: 'absolute',
        left: x - side / 2,
        top: y - side / 2,
        width: side,
        height: side,
        transform: [{ scaleY: 0.5 }],
      }}>
      <View
        style={{
          flex: 1,
          backgroundColor: color,
          borderColor: border,
          borderWidth: 1,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
});

export function IsometricMap({
  map,
  selection,
  preview,
  disabled,
  inspecting,
  onSelect,
  onGestureChange,
}: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(320);
  const [camera, setCamera] = useState<Camera>(() => fitCamera(320, HEIGHT, map.size));
  const cameraRef = useRef(camera);
  const [animate, setAnimate] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [pulse] = useState(() => new Animated.Value(1));
  const gesture = useRef({
    start: { x: 0, y: 0 },
    origin: { x: 0, y: 0 },
    last: { x: 0, y: 0 },
    distance: 0,
    count: 0,
    moved: false,
  });
  const publishCamera = useCallback((next: Camera) => {
    cameraRef.current = next;
    setCamera(next);
  }, []);
  useEffect(() => () => onGestureChange(false), [onGestureChange]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setForeground(state === 'active'),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (active) setAnimate(!reduced);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) =>
      setAnimate(!reduced),
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  const hasConstruction = map.buildings.some((building) => building.status === 'construction');
  useEffect(() => {
    if (!animate || !hasConstruction || !foreground) {
      pulse.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 950,
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 950,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, [animate, hasConstruction, foreground, pulse]);
  const geometry = useMemo(() => {
    const unlocked = new Set(map.unlockedTiles.map(tileKey));
    const roads = new Set(map.roads.map(tileKey));
    const connected = connectedRoads(map);
    const cells = Array.from({ length: map.size * map.size }, (_, i) => {
      const cell = { x: i % map.size, y: Math.floor(i / map.size) };
      return { cell, key: tileKey(cell), world: project({ x: cell.x + 0.5, y: cell.y + 0.5 }) };
    });
    const buildings = [...map.buildings].sort((a, b) => {
      const ad = a.position.x + a.position.y + BUILDINGS[a.type].width + BUILDINGS[a.type].height;
      const bd = b.position.x + b.position.y + BUILDINGS[b.type].width + BUILDINGS[b.type].height;
      return ad - bd || a.id.localeCompare(b.id);
    });
    return { unlocked, roads, connected, cells, buildings };
  }, [map]);
  const sprites = geometry.buildings.map((building) => {
    const definition = BUILDINGS[building.type];
    const center = toScreen(
      project({
        x: building.position.x + definition.width / 2,
        y: building.position.y + definition.height / 2,
      }),
      camera,
    );
    const sprite = SpriteRegistry[building.type];
    return {
      building,
      center,
      sprite,
      w: (definition.width + definition.height) * 12 * camera.zoom,
      h: sprite.heights[building.level - 1] * camera.zoom,
    };
  });
  const responder = {
    onStartShouldSetResponder: () => !disabled,
    onMoveShouldSetResponder: () => !disabled,
    onResponderTerminationRequest: () => false,
    onResponderStart: (event: GestureResponderEvent) => {
      if (event.nativeEvent.touches.length > 1) gesture.current.moved = true;
    },
    onResponderGrant: (event: GestureResponderEvent) => {
      onGestureChange(true);
      const e = event.nativeEvent;
      gesture.current = {
        start: { x: e.locationX, y: e.locationY },
        origin: { x: e.pageX - e.locationX, y: e.pageY - e.locationY },
        last: { x: e.locationX, y: e.locationY },
        count: 1,
        distance: 0,
        moved: false,
      };
    },
    onResponderMove: (event: GestureResponderEvent) => {
      const touches = event.nativeEvent.touches;
      if (!touches.length) return;
      const g = gesture.current;
      const a = touches[0];
      const b = touches[1];
      const point = {
        x: (b ? (a.pageX + b.pageX) / 2 : a.pageX) - g.origin.x,
        y: (b ? (a.pageY + b.pageY) / 2 : a.pageY) - g.origin.y,
      };
      const distance = b ? Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY) : 0;
      if (touches.length > 1 || Math.hypot(point.x - g.start.x, point.y - g.start.y) > 8)
        g.moved = true;
      if (g.count === touches.length && g.moved) {
        let next = cameraRef.current;
        next =
          b && g.distance > 0
            ? pinchCamera(next, g.last, point, g.distance, distance)
            : panCamera(next, { x: point.x - g.last.x, y: point.y - g.last.y });
        publishCamera(next);
      }
      if (g.moved || g.count !== touches.length) g.last = point;
      g.distance = distance;
      g.count = touches.length;
    },
    onResponderRelease: (event: GestureResponderEvent) => {
      onGestureChange(false);
      if (gesture.current.moved || disabled) return;
      const e = event.nativeEvent;
      const point = {
        x: e.pageX - gesture.current.origin.x,
        y: e.pageY - gesture.current.origin.y,
      };
      // Raised building art receives taps before the ground beneath it.
      const building = [...sprites]
        .reverse()
        .find(
          ({ center, w, h }) =>
            point.x >= center.x - w / 2 &&
            point.x <= center.x + w / 2 &&
            point.y >= center.y - h - 12 * camera.zoom &&
            point.y <= center.y,
        );
      const cell =
        inspecting && building
          ? building.building.position
          : hitTest(point, cameraRef.current, map.size);
      if (cell) onSelect(cell);
    },
    onResponderTerminate: () => {
      onGestureChange(false);
      gesture.current.moved = true;
    },
  };
  const previewKeys = new Set(preview?.cells.map(tileKey));
  const overlayColor = preview
    ? !preview.valid
      ? theme.danger
      : preview.warning
        ? theme.warning
        : theme.primary
    : theme.primary;
  const center = { x: width / 2, y: HEIGHT / 2 };
  return (
    <>
      <ThemedText type="small" themeColor="textSecondary">
        Tek parmakla kaydır, iki parmakla yakınlaştır. Dokunarak seç; satın alma yalnızca onayla
        gerçekleşir.
      </ThemedText>
      <View style={styles.controls}>
        <Button
          label="Uzaklaştır"
          onPress={() =>
            publishCamera(zoomAt(cameraRef.current, cameraRef.current.zoom / 1.25, center))
          }
        />
        <Button
          label="Yakınlaştır"
          onPress={() =>
            publishCamera(zoomAt(cameraRef.current, cameraRef.current.zoom * 1.25, center))
          }
        />
        <Button
          label="Haritayı ortala"
          onPress={() => publishCamera(fitCamera(width, HEIGHT, map.size))}
        />
      </View>
      <View
        {...responder}
        onLayout={(event) => {
          const nextWidth = event.nativeEvent.layout.width;
          if (nextWidth > 0 && nextWidth !== width) {
            setWidth(nextWidth);
            publishCamera(fitCamera(nextWidth, HEIGHT, map.size));
          }
        }}
        accessibilityLabel="İzometrik şehir haritası. Erişilebilir hücre seçimi için 2D grid görünümünü kullan."
        style={[
          styles.viewport,
          { backgroundColor: theme.background, borderColor: theme.textSecondary },
        ]}>
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={StyleSheet.absoluteFill}>
          {geometry.cells.map(({ key, world }) => {
            const p = toScreen(world, camera);
            if (!isVisible(p, width, HEIGHT)) return null;
            const road = geometry.roads.has(key);
            const color = road
              ? geometry.connected.has(key)
                ? theme.primary
                : theme.warning
              : geometry.unlocked.has(key)
                ? theme.backgroundSelected
                : theme.backgroundElement;
            return (
              <Diamond
                key={key}
                x={p.x}
                y={p.y}
                width={64 * camera.zoom}
                color={color}
                border={theme.textSecondary}
              />
            );
          })}
          {sprites.map(({ building, center: p, sprite, w, h }) =>
            isVisible(p, width, HEIGHT) ? (
              <View
                key={building.id}
                style={{
                  position: 'absolute',
                  left: p.x - w / 2,
                  top: p.y - h - 12 * camera.zoom,
                  width: w,
                  height: h + 12 * camera.zoom,
                }}>
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    width: w,
                    height: h,
                    backgroundColor: sprite.wall,
                    borderColor: sprite.roof,
                    borderWidth: 2,
                    borderRadius: 3,
                  }}
                />
                <Diamond
                  x={w / 2}
                  y={12 * camera.zoom}
                  width={w}
                  color={sprite.roof}
                  border={theme.textSecondary}
                />
                <ThemedText
                  style={{
                    textAlign: 'center',
                    color: '#16271E',
                    fontSize: Math.max(10, 13 * camera.zoom),
                    marginTop: 12 * camera.zoom,
                  }}>
                  {sprite.glyph} {building.level}
                </ThemedText>
                {building.status === 'construction' ? (
                  <Animated.Text
                    style={{
                      opacity: pulse,
                      color: '#16271E',
                      textAlign: 'center',
                      fontWeight: '700',
                      fontSize: 11,
                    }}>
                    ▧ Plan
                  </Animated.Text>
                ) : null}
              </View>
            ) : null,
          )}
          {geometry.cells.map(({ cell, key, world }) => {
            if (!previewKeys.has(key) && !(selection?.x === cell.x && selection.y === cell.y))
              return null;
            const p = toScreen(world, camera);
            return (
              <Diamond
                key={`preview-${key}`}
                x={p.x}
                y={p.y}
                width={60 * camera.zoom}
                color={
                  previewKeys.has(key)
                    ? !preview?.valid
                      ? theme.previewInvalid
                      : preview.warning
                        ? theme.previewWarning
                        : theme.backgroundSelected
                    : 'transparent'
                }
                border={overlayColor}
              />
            );
          })}
        </View>
      </View>
      <ThemedText type="small" accessibilityLiveRegion="polite">
        Yakınlık %{Math.round(camera.zoom * 100)} ·{' '}
        {selection ? `Seçim (${selection.x}, ${selection.y})` : 'Hücre seçilmedi'} ·{' '}
        {preview
          ? !preview.valid
            ? 'Kırmızı: geçersiz'
            : preview.warning
              ? 'Sarı: uyarılı'
              : 'Yeşil: geçerli'
          : 'B: Belediye · K: Konut · ♣: Park · E: Santral'}
      </ThemedText>
    </>
  );
}

const styles = StyleSheet.create({
  viewport: {
    height: HEIGHT,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 16,
    touchAction: 'none',
  },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
