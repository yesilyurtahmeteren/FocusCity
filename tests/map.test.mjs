import assert from 'node:assert/strict';
import test from 'node:test';

import { BUILDINGS } from '../src/domain/map/catalog.ts';
import {
  applyMapCommand,
  buildingAt,
  connectedRoads,
  createCityMap,
  footprint,
  hasRoadConnection,
  previewMapCommand,
  tileKey,
} from '../src/domain/map/placement.ts';
import { commitMapCommand, createWorld, replayWorld } from '../src/domain/map/world.ts';
import { emptyFocusData, reconcile, startSession } from '../src/domain/focus/session.ts';
import { decodeApplicationSave } from '../src/services/application-save.ts';
import {
  APPLICATION_STORAGE_KEY,
  FOCUS_STORAGE_KEY,
  LEGACY_APPLICATION_STORAGE_KEY,
  createFocusStore,
} from '../src/store/focus-store.ts';

const epoch = Date.parse('2026-10-29T10:00:00.000Z');
const place = (type = 'house', x = 2, y = 2) => ({
  kind: 'place',
  buildingType: type,
  position: { x, y },
});
const road = (x, y) => ({ kind: 'add_road', position: { x, y } });
const removeRoad = (x, y) => ({ kind: 'remove_road', position: { x, y } });
function apply(map, command, id, coins = 1000) {
  const result = applyMapCommand(map, command, coins, id);
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.map;
}
function complete(id, at) {
  return reconcile(startSession(emptyFocusData(), id, 150, at), at + 9000_000).history[0];
}
function fundedSave() {
  return decodeApplicationSave(
    JSON.stringify({
      version: 1,
      active: null,
      history: [complete('b', epoch + 9010_000), complete('a', epoch)],
    }),
  ).save;
}

test('12×12 map has exactly 64 open tiles and one free fixed town hall', () => {
  const map = createCityMap();
  assert.equal(map.size, 12);
  assert.equal(new Set(map.unlockedTiles.map(tileKey)).size, 64);
  assert.equal(map.buildings.length, 1);
  assert.equal(map.buildings[0].type, 'city_hall');
  assert.equal(map.buildings[0].status, 'active');
  assert.equal(map.roads.length, 0);
});

test('catalog dimensions and all footprint cells are exact', () => {
  for (const type of Object.keys(BUILDINGS)) {
    const cells = footprint(type, { x: 2, y: 2 });
    assert.equal(cells.length, BUILDINGS[type].width * BUILDINGS[type].height);
    assert.equal(new Set(cells.map(tileKey)).size, cells.length);
  }
  assert.equal(footprint('house', { x: 2, y: 2 }).length, 4);
  assert.equal(footprint('power_plant', { x: 7, y: 7 }).length, 9);
});

test('valid purchase is a pending construction plan and charges catalog price once', () => {
  const map = createCityMap();
  const before = JSON.stringify(map);
  const result = applyMapCommand(map, place(), 100, 'buy-1');
  assert.equal(result.ok, true);
  assert.equal(result.cost, 100);
  assert.equal(result.map.buildings.length, 2);
  const house = buildingAt(result.map, { x: 3, y: 3 });
  assert.equal(house.id, 'building-buy-1');
  assert.equal(house.status, 'construction');
  assert.equal(house.investedFocusSeconds, 0);
  assert.equal(house.targetFocusSeconds, 900);
  assert.equal(JSON.stringify(map), before);
});

test('footprint validation covers boundaries, locked land, buildings and roads', () => {
  const map = createCityMap();
  assert.equal(previewMapCommand(map, place('house', 11, 2), 1000).error, 'outside');
  assert.equal(previewMapCommand(map, place('house', -1, 2), 1000).error, 'outside');
  assert.equal(previewMapCommand(map, place('house', 2.5, 2), 1000).error, 'outside');
  assert.equal(previewMapCommand(map, place('house', 9, 9), 1000).error, 'locked');
  assert.equal(previewMapCommand(map, place('house', 0, 0), 1000).error, 'locked');
  assert.equal(previewMapCommand(map, place('house', 4, 4), 1000).error, 'occupied');
  const withRoad = apply(map, road(3, 3), 'road');
  assert.equal(previewMapCommand(withRoad, place(), 1000).error, 'occupied');
});

test('rejected placement never mutates map or returns a payable transaction', () => {
  const map = createCityMap();
  const before = JSON.stringify(map);
  for (const [command, coins, expected] of [
    [place(), 99, 'funds'],
    [place('house', 4, 4), 1000, 'occupied'],
    [place('park', 9, 9), 1000, 'locked'],
  ]) {
    assert.deepEqual(applyMapCommand(map, command, coins, 'reject'), {
      ok: false,
      error: expected,
    });
  }
  assert.equal(JSON.stringify(map), before);
});

test('preview and cancelling a preview cannot spend money or place anything', () => {
  const save = fundedSave();
  const before = JSON.stringify(save);
  const preview = previewMapCommand(save.world.map, place(), save.economy.city.coins);
  assert.equal(preview.valid, true);
  assert.equal(preview.cost, 100);
  assert.equal(JSON.stringify(save), before);
});

test('disconnected placement is a visible warning but valid, not a paid rejection', () => {
  const preview = previewMapCommand(createCityMap(), place(), 1000);
  assert.equal(preview.valid, true);
  assert.equal(preview.warning, true);
});

test('roads cannot occupy buildings, locked land, or duplicate a road', () => {
  const map = createCityMap();
  assert.equal(previewMapCommand(map, road(4, 4), 0).error, 'occupied');
  assert.equal(previewMapCommand(map, road(0, 0), 0).error, 'locked');
  const next = apply(map, road(3, 4), 'r1', 0);
  assert.equal(previewMapCommand(next, road(3, 4), 0).error, 'road_exists');
  assert.equal(previewMapCommand(next, removeRoad(2, 2), 0).error, 'no_road');
});

test('BFS seeds all orthogonal hall edges and rejects diagonal-only contact', () => {
  let map = createCityMap();
  for (const [id, x, y] of [
    ['left', 3, 4],
    ['right', 7, 4],
    ['top', 4, 3],
    ['bottom', 4, 7],
    ['diagonal', 2, 3],
  ])
    map = apply(map, road(x, y), id);
  const connected = connectedRoads(map);
  assert.equal(connected.has('3,4'), true);
  assert.equal(connected.has('7,4'), true);
  assert.equal(connected.has('4,3'), true);
  assert.equal(connected.has('4,7'), true);
  assert.equal(connected.has('2,3'), false);
  const corner = apply(createCityMap(), road(3, 3), 'corner');
  assert.equal(connectedRoads(corner).size, 0);
});

test('house connection uses the whole footprint boundary and updates after road deletion', () => {
  let map = apply(createCityMap(), place(), 'house');
  const house = map.buildings.find((building) => building.type === 'house');
  map = apply(map, road(3, 4), 'r1');
  map = apply(map, road(2, 4), 'r2');
  assert.equal(hasRoadConnection(map, house), true);
  map = apply(map, removeRoad(3, 4), 'remove');
  assert.equal(map.roads.length, 1);
  assert.equal(hasRoadConnection(map, house), false);
  assert.equal(connectedRoads(map).size, 0);
});

test('BFS handles road cycles and keeps alternative paths after a removal', () => {
  let map = createCityMap();
  for (const [index, [x, y]] of [
    [3, 4],
    [2, 4],
    [2, 5],
    [3, 5],
  ].entries())
    map = apply(map, road(x, y), `cycle-${index}`);
  assert.equal(connectedRoads(map).size, 4);
  map = apply(map, removeRoad(3, 4), 'remove-cycle');
  assert.equal(connectedRoads(map).size, 3);
});

test('a multi-cell building touching only a road corner is not connected', () => {
  let map = apply(createCityMap(), place('house', 7, 7), 'house');
  for (const [index, position] of [
    [7, 5],
    [8, 5],
    [9, 5],
    [9, 6],
  ].entries()) {
    map = apply(map, road(position[0], position[1]), `road-${index}`);
  }
  const house = map.buildings.find((building) => building.type === 'house');
  assert.equal(connectedRoads(map).has('9,6'), true);
  assert.equal(hasRoadConnection(map, house), false);
  map = apply(map, road(9, 7), 'edge');
  assert.equal(hasRoadConnection(map, house), true);
});

test('moving can overlap its own old footprint but preserves ID/status and is free', () => {
  const map = apply(createCityMap(), place(), 'house');
  const moving = map.buildings[1];
  const result = applyMapCommand(
    map,
    { kind: 'move', buildingId: moving.id, position: { x: 2, y: 3 } },
    0,
    'move',
  );
  assert.equal(result.ok, true);
  assert.equal(result.cost, 0);
  assert.equal(result.map.buildings[1].id, moving.id);
  assert.equal(result.map.buildings[1].status, 'construction');
  assert.equal(result.map.buildings[1].targetFocusSeconds, 900);
  assert.equal(buildingAt(result.map, { x: 2, y: 2 }), undefined);
});

test('invalid move preserves old footprint and town hall is fixed', () => {
  const map = apply(createCityMap(), place(), 'house');
  const before = JSON.stringify(map);
  assert.equal(
    applyMapCommand(
      map,
      { kind: 'move', buildingId: map.buildings[1].id, position: { x: 4, y: 4 } },
      1000,
      'bad',
    ).ok,
    false,
  );
  assert.equal(
    applyMapCommand(
      map,
      { kind: 'move', buildingId: 'city-hall', position: { x: 2, y: 2 } },
      1000,
      'hall',
    ).error,
    'fixed',
  );
  assert.equal(JSON.stringify(map), before);
});

test('moving a connected house away updates the warning without charging again', () => {
  let map = apply(createCityMap(), place(), 'house');
  map = apply(map, road(3, 4), 'road');
  const house = map.buildings[1];
  assert.equal(hasRoadConnection(map, house), true);
  const command = { kind: 'move', buildingId: house.id, position: { x: 7, y: 2 } };
  assert.equal(previewMapCommand(map, command, 0).warning, true);
  const moved = applyMapCommand(map, command, 0, 'move');
  assert.equal(moved.cost, 0);
  assert.equal(hasRoadConnection(moved.map, moved.map.buildings[1]), false);
});

test('all required building types can be purchased from earned funds', () => {
  const save = fundedSave();
  let world = save.world;
  let economy = save.economy;
  for (const [id, command] of [
    ['house', place()],
    ['park', place('park', 2, 7)],
    ['power', place('power_plant', 7, 7)],
  ]) {
    const result = commitMapCommand(world, economy, command, id);
    assert.equal(result.ok, true);
    ({ world, economy } = result);
  }
  assert.equal(economy.city.coins, 130);
  assert.equal(world.map.buildings.length, 4);
  assert.deepEqual(
    new Set(world.map.buildings.map((building) => building.type)),
    new Set(['city_hall', 'house', 'park', 'power_plant']),
  );
  assert.equal(economy.city.unallocatedLaborSeconds, save.economy.city.unallocatedLaborSeconds);
});

test('world transaction rejects duplicate IDs and invalid placement without spending', () => {
  const save = fundedSave();
  const good = commitMapCommand(save.world, save.economy, place(), 'one');
  assert.equal(good.ok, true);
  assert.equal(
    commitMapCommand(good.world, good.economy, place('park', 2, 7), 'one').error,
    'duplicate',
  );
  assert.equal(
    commitMapCommand(save.world, save.economy, place('house', 4, 4), 'bad').error,
    'occupied',
  );
  assert.equal(save.economy.city.coins, 600);
});

test('replay produces exactly the same map and net wallet', () => {
  const save = fundedSave();
  const a = commitMapCommand(save.world, save.economy, place(), 'house');
  const b = commitMapCommand(a.world, a.economy, road(3, 4), 'road');
  const c = commitMapCommand(
    b.world,
    b.economy,
    { kind: 'move', buildingId: b.world.map.buildings[1].id, position: { x: 7, y: 2 } },
    'move',
  );
  const replayed = replayWorld(save.economy, c.world.actions);
  assert.deepEqual(replayed.world, c.world);
  assert.deepEqual(replayed.economy, c.economy);
  const stored = { version: 3, focus: save.focus, ...replayed };
  assert.deepEqual(decodeApplicationSave(JSON.stringify(stored)).save, stored);
});

test('replay rejects spending money earned only by a future session', () => {
  const save = fundedSave();
  assert.throws(() =>
    replayWorld(save.economy, [{ id: 'early', afterRewardCount: 0, command: place() }]),
  );
  assert.throws(() =>
    replayWorld(save.economy, [{ id: 'future', afterRewardCount: 3, command: road(3, 4) }]),
  );
  assert.throws(() =>
    replayWorld(save.economy, [
      { id: 'a', afterRewardCount: 2, command: road(3, 4) },
      { id: 'b', afterRewardCount: 1, command: road(2, 4) },
    ]),
  );
});

function fixture(legacy = null, current = null) {
  const values = new Map([
    [LEGACY_APPLICATION_STORAGE_KEY, legacy],
    [APPLICATION_STORAGE_KEY, current],
  ]);
  let fail = false;
  let now = epoch;
  let id = 0;
  let writes = 0;
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      if (fail) throw new Error('disk full');
      values.set(key, value);
      writes += 1;
    },
  };
  const store = createFocusStore(
    storage,
    () => now,
    () => `id-${++id}`,
  );
  return {
    values,
    storage,
    store,
    setFail: (value) => {
      fail = value;
    },
    setTime: (value) => {
      now = value;
    },
    writes: () => writes,
  };
}
const v2Save = () => {
  const save = fundedSave();
  return JSON.stringify({ version: 2, focus: save.focus, economy: save.economy });
};

test('v2 migration keeps all resources and gives exactly one free starter town hall', async () => {
  const raw = v2Save();
  const f = fixture(raw);
  await f.store.load();
  assert.equal(f.store.getSnapshot().economy.city.coins, 600);
  assert.deepEqual(f.store.getSnapshot().world, createWorld());
  assert.equal(f.values.get(LEGACY_APPLICATION_STORAGE_KEY), raw);
  assert.equal(JSON.parse(f.values.get(APPLICATION_STORAGE_KEY)).version, 3);
  await f.store.load();
  assert.equal(f.store.getSnapshot().world.map.buildings.length, 1);
});

test('v1 migration still works directly and keeps the legacy bytes', async () => {
  const save = fundedSave();
  const raw = JSON.stringify(save.focus);
  const f = fixture();
  f.values.set(FOCUS_STORAGE_KEY, raw);
  await f.store.load();
  assert.equal(f.store.getSnapshot().economy.city.coins, 600);
  assert.equal(f.values.get(FOCUS_STORAGE_KEY), raw);
  assert.equal(f.store.getSnapshot().world.map.buildings.length, 1);
});

test('failed migration keeps v2 safe and retry commits only one initialized map', async () => {
  const raw = v2Save();
  const f = fixture(raw);
  f.setFail(true);
  await f.store.load();
  assert.equal(f.store.getSnapshot().ready, false);
  assert.equal(f.values.get(LEGACY_APPLICATION_STORAGE_KEY), raw);
  assert.equal(f.values.get(APPLICATION_STORAGE_KEY), null);
  f.setFail(false);
  await f.store.retry();
  assert.equal(f.store.getSnapshot().world.map.buildings.length, 1);
  assert.equal(f.store.getSnapshot().economy.city.coins, 600);
});

test('invalid legacy v2 cannot silently fall back to valid v1 history', async () => {
  const legacy = JSON.parse(v2Save());
  legacy.economy.city.coins = 999;
  const raw = JSON.stringify(legacy);
  const f = fixture(raw);
  f.values.set(FOCUS_STORAGE_KEY, JSON.stringify(legacy.focus));
  await f.store.load();
  assert.equal(f.store.getSnapshot().error, 'load');
  assert.equal(f.values.get(LEGACY_APPLICATION_STORAGE_KEY), raw);
  assert.equal(f.values.get(APPLICATION_STORAGE_KEY), null);
});

test('failed purchase write and retry keep map and money atomic', async () => {
  const f = fixture(v2Save());
  await f.store.load();
  const before = f.values.get(APPLICATION_STORAGE_KEY);
  f.setFail(true);
  assert.equal(await f.store.applyMap(place()), false);
  assert.equal(f.store.getSnapshot().economy.city.coins, 600);
  assert.equal(f.store.getSnapshot().world.map.buildings.length, 1);
  assert.equal(f.values.get(APPLICATION_STORAGE_KEY), before);
  f.setFail(false);
  await f.store.retry();
  assert.equal(f.store.getSnapshot().economy.city.coins, 500);
  assert.equal(f.store.getSnapshot().world.map.buildings.length, 2);
  assert.equal(f.store.getSnapshot().world.actions.length, 1);
});

test('invalid store purchase does not write, spend, or move any existing building', async () => {
  const f = fixture(v2Save());
  await f.store.load();
  const before = f.values.get(APPLICATION_STORAGE_KEY);
  const count = f.writes();
  assert.equal(await f.store.applyMap(place('house', 4, 4)), false);
  assert.equal(f.store.getSnapshot().mapError, 'occupied');
  assert.equal(f.values.get(APPLICATION_STORAGE_KEY), before);
  assert.equal(f.writes(), count);
  assert.equal(f.store.getSnapshot().economy.city.coins, 600);
});

test('double confirm while write is in flight purchases only once', async () => {
  let raw = v2Save();
  let release;
  let block = false;
  const storage = {
    getItem: async () => raw,
    setItem: async (_key, value) => {
      if (block)
        await new Promise((resolve) => {
          release = resolve;
        });
      raw = value;
    },
  };
  let id = 0;
  const store = createFocusStore(
    storage,
    () => epoch,
    () => `tap-${++id}`,
  );
  await store.load();
  block = true;
  const first = store.applyMap(place());
  const second = await store.applyMap(place('park', 2, 7));
  assert.equal(second, false);
  release();
  assert.equal(await first, true);
  assert.equal(store.getSnapshot().world.actions.length, 1);
  assert.equal(store.getSnapshot().economy.city.coins, 500);
});

test('cold reload restores buildings, moved positions, roads and exact remaining money', async () => {
  const f = fixture(v2Save());
  await f.store.load();
  await f.store.applyMap(place());
  await f.store.applyMap(road(3, 4));
  const id = f.store.getSnapshot().world.map.buildings[1].id;
  await f.store.applyMap({ kind: 'move', buildingId: id, position: { x: 7, y: 2 } });
  const before = f.store.getSnapshot();
  const restored = createFocusStore(
    f.storage,
    () => epoch + 3 * 86400_000,
    () => 'unused',
  );
  await restored.load();
  assert.deepEqual(restored.getSnapshot().world, before.world);
  assert.deepEqual(restored.getSnapshot().economy, before.economy);
  assert.equal(
    hasRoadConnection(
      restored.getSnapshot().world.map,
      restored.getSnapshot().world.map.buildings[1],
    ),
    false,
  );
});

test('a later completed session adds reward without refunding previous purchases on reload', async () => {
  const f = fixture(v2Save());
  await f.store.load();
  await f.store.applyMap(place());
  await f.store.start(15);
  f.setTime(epoch + 900_000);
  await f.store.tick();
  assert.equal(f.store.getSnapshot().economy.city.coins, 530);
  const decoded = decodeApplicationSave(f.values.get(APPLICATION_STORAGE_KEY)).save;
  assert.equal(decoded.economy.city.coins, 530);
  assert.equal(decoded.world.map.buildings.length, 2);
});

test('tampered map, event ordering, duplicate events or net balance are rejected without fallback', async () => {
  const save = fundedSave();
  const result = commitMapCommand(save.world, save.economy, place(), 'house');
  const valid = { version: 3, focus: save.focus, economy: result.economy, world: result.world };
  const cases = [
    { ...valid, economy: { ...valid.economy, city: { ...valid.economy.city, coins: 600 } } },
    { ...valid, world: { ...valid.world, map: { ...valid.world.map, roads: [{ x: 0, y: 0 }] } } },
    { ...valid, world: { ...valid.world, map: { ...valid.world.map, catalogVersion: 2 } } },
    {
      ...valid,
      world: { ...valid.world, actions: [...valid.world.actions, ...valid.world.actions] },
    },
    {
      ...valid,
      world: { ...valid.world, actions: [{ ...valid.world.actions[0], afterRewardCount: 0 }] },
    },
    { ...valid, version: 99 },
  ];
  for (const corrupted of cases) {
    const raw = JSON.stringify(corrupted);
    const f = fixture(v2Save(), raw);
    await f.store.load();
    assert.equal(f.store.getSnapshot().error, 'load');
    assert.equal(f.values.get(APPLICATION_STORAGE_KEY), raw);
  }
});
