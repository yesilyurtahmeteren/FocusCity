import {
  BUILDINGS,
  MAP_SIZE,
  MOVE_COST,
  ROAD_COST,
  type BuildingType,
  type PurchasableBuilding,
} from './catalog.ts';

export type GridPosition = { x: number; y: number };
export type BuildingInstance = {
  id: string;
  type: BuildingType;
  level: 1;
  position: GridPosition;
  status: 'active' | 'construction';
  investedFocusSeconds: number;
  targetFocusSeconds: number;
};
export type CityMap = {
  size: 12;
  catalogVersion: 1;
  unlockedTiles: GridPosition[];
  buildings: BuildingInstance[];
  roads: GridPosition[];
};

export type MapCommand =
  | { kind: 'place'; buildingType: PurchasableBuilding; position: GridPosition }
  | { kind: 'move'; buildingId: string; position: GridPosition }
  | { kind: 'add_road' | 'remove_road'; position: GridPosition };

export type MapError =
  | 'outside'
  | 'locked'
  | 'occupied'
  | 'funds'
  | 'fixed'
  | 'missing'
  | 'road_exists'
  | 'no_road'
  | 'invalid'
  | 'duplicate';
export type MapPreview = {
  valid: boolean;
  error: MapError | null;
  cost: number;
  cells: GridPosition[];
  warning: boolean;
};
export type MapResult = { ok: true; map: CityMap; cost: number } | { ok: false; error: MapError };

export const tileKey = ({ x, y }: GridPosition) => `${x},${y}`;
export const sameTile = (a: GridPosition, b: GridPosition) => a.x === b.x && a.y === b.y;
export const inBounds = (p: GridPosition) =>
  Number.isInteger(p.x) &&
  Number.isInteger(p.y) &&
  p.x >= 0 &&
  p.y >= 0 &&
  p.x < MAP_SIZE &&
  p.y < MAP_SIZE;
export const neighbours = ({ x, y }: GridPosition): GridPosition[] => [
  { x: x - 1, y },
  { x: x + 1, y },
  { x, y: y - 1 },
  { x, y: y + 1 },
];

export function footprint(type: BuildingType, position: GridPosition): GridPosition[] {
  const definition = BUILDINGS[type];
  return Array.from({ length: definition.width * definition.height }, (_, index) => ({
    x: position.x + (index % definition.width),
    y: position.y + Math.floor(index / definition.width),
  }));
}

export function createCityMap(): CityMap {
  return {
    size: 12,
    catalogVersion: 1,
    unlockedTiles: Array.from({ length: 64 }, (_, index) => ({
      x: 2 + (index % 8),
      y: 2 + Math.floor(index / 8),
    })),
    buildings: [
      {
        id: 'city-hall',
        type: 'city_hall',
        level: 1,
        position: { x: 4, y: 4 },
        status: 'active',
        investedFocusSeconds: 0,
        targetFocusSeconds: 0,
      },
    ],
    roads: [],
  };
}

export function buildingAt(map: CityMap, position: GridPosition): BuildingInstance | undefined {
  return map.buildings.find((building) =>
    footprint(building.type, building.position).some((tile) => sameTile(tile, position)),
  );
}

/** Only orthogonal roads touching the mayor footprint seed the BFS. */
export function connectedRoads(map: CityMap): Set<string> {
  const hall = map.buildings.find((building) => building.type === 'city_hall');
  if (!hall) return new Set();
  const roadKeys = new Set(map.roads.map(tileKey));
  const connected = new Set<string>();
  const queue: GridPosition[] = [];
  for (const tile of footprint(hall.type, hall.position)) {
    for (const adjacent of neighbours(tile)) {
      const key = tileKey(adjacent);
      if (roadKeys.has(key) && !connected.has(key)) {
        connected.add(key);
        queue.push(adjacent);
      }
    }
  }
  for (let index = 0; index < queue.length; index += 1) {
    for (const adjacent of neighbours(queue[index])) {
      const key = tileKey(adjacent);
      if (roadKeys.has(key) && !connected.has(key)) {
        connected.add(key);
        queue.push(adjacent);
      }
    }
  }
  return connected;
}

export function hasRoadConnection(
  map: CityMap,
  building: Pick<BuildingInstance, 'type' | 'position'>,
  roads = connectedRoads(map),
): boolean {
  if (building.type === 'city_hall') return true;
  return footprint(building.type, building.position).some((tile) =>
    neighbours(tile).some((adjacent) => roads.has(tileKey(adjacent))),
  );
}

export function previewMapCommand(map: CityMap, command: MapCommand, coins: number): MapPreview {
  const fail = (error: MapError, cells: GridPosition[] = [], cost = 0): MapPreview => ({
    valid: false,
    error,
    cost,
    cells,
    warning: false,
  });
  if (!Number.isSafeInteger(coins) || coins < 0) return fail('invalid');
  const { position } = command;
  if (!inBounds(position)) return fail('outside', [position]);
  let cells = [position];
  let cost = ROAD_COST as number;
  let moving: BuildingInstance | undefined;
  let type: BuildingType | undefined;
  if (command.kind === 'place') {
    if (
      !Object.hasOwn(BUILDINGS, command.buildingType) ||
      (command.buildingType as string) === 'city_hall'
    )
      return fail('fixed');
    type = command.buildingType;
    cells = footprint(type, position);
    cost = BUILDINGS[type].coins;
  } else if (command.kind === 'move') {
    moving = map.buildings.find((building) => building.id === command.buildingId);
    if (!moving) return fail('missing');
    if (moving.type === 'city_hall') return fail('fixed');
    type = moving.type;
    cells = footprint(type, position);
    cost = MOVE_COST;
  } else if (command.kind !== 'add_road' && command.kind !== 'remove_road') return fail('invalid');
  if (cells.some((cell) => !inBounds(cell))) return fail('outside', cells, cost);
  const unlocked = new Set(map.unlockedTiles.map(tileKey));
  if (cells.some((cell) => !unlocked.has(tileKey(cell)))) return fail('locked', cells, cost);
  const existingRoad = map.roads.some((road) => sameTile(road, position));
  if (command.kind === 'remove_road') {
    return existingRoad
      ? { valid: true, error: null, cells, cost: 0, warning: true }
      : fail('no_road', cells);
  }
  if (command.kind === 'add_road' && existingRoad) return fail('road_exists', cells);
  const occupied = new Set(
    map.buildings
      .filter((building) => building.id !== moving?.id)
      .flatMap((building) => footprint(building.type, building.position))
      .map(tileKey),
  );
  if (
    cells.some(
      (cell) => occupied.has(tileKey(cell)) || map.roads.some((road) => sameTile(road, cell)),
    )
  )
    return fail('occupied', cells, cost);
  if (coins < cost) return fail('funds', cells, cost);
  const roadMap = command.kind === 'add_road' ? { ...map, roads: [...map.roads, position] } : map;
  const roads = connectedRoads(roadMap);
  const warning = type
    ? !hasRoadConnection(map, { type, position }, roads)
    : !roads.has(tileKey(position));
  return { valid: true, error: null, cells, cost, warning };
}

/** Pure atomic geometry transition; callers must persist the returned map and wallet together. */
export function applyMapCommand(
  map: CityMap,
  command: MapCommand,
  coins: number,
  eventId: string,
): MapResult {
  const preview = previewMapCommand(map, command, coins);
  if (!preview.valid) return { ok: false, error: preview.error ?? 'invalid' };
  if (!eventId || map.buildings.some((building) => building.id === `building-${eventId}`))
    return { ok: false, error: 'duplicate' };
  if (command.kind === 'place') {
    const definition = BUILDINGS[command.buildingType];
    const building: BuildingInstance = {
      id: `building-${eventId}`,
      type: command.buildingType,
      level: 1,
      position: { ...command.position },
      status: 'construction',
      investedFocusSeconds: 0,
      targetFocusSeconds: definition.focusSeconds,
    };
    return {
      ok: true,
      cost: preview.cost,
      map: { ...map, buildings: [...map.buildings, building] },
    };
  }
  if (command.kind === 'move')
    return {
      ok: true,
      cost: preview.cost,
      map: {
        ...map,
        buildings: map.buildings.map((building) =>
          building.id === command.buildingId
            ? { ...building, position: { ...command.position } }
            : building,
        ),
      },
    };
  const roads =
    command.kind === 'add_road'
      ? [...map.roads, { ...command.position }]
      : map.roads.filter((road) => !sameTile(road, command.position));
  return { ok: true, cost: preview.cost, map: { ...map, roads } };
}
