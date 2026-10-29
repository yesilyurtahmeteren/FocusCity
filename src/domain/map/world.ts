import type { EconomyState } from '../economy/rewards.ts';
import {
  applyMapCommand,
  createCityMap,
  type CityMap,
  type MapCommand,
  type MapError,
} from './placement.ts';

export type MapEvent = { id: string; afterRewardCount: number; command: MapCommand };
export type WorldState = { map: CityMap; actions: MapEvent[] };
export const createWorld = (): WorldState => ({ map: createCityMap(), actions: [] });

export type WorldResult =
  { ok: true; world: WorldState; economy: EconomyState } | { ok: false; error: MapError };

export function commitMapCommand(
  world: WorldState,
  economy: EconomyState,
  command: MapCommand,
  id: string,
): WorldResult {
  if (world.actions.some((event) => event.id === id)) return { ok: false, error: 'duplicate' };
  const result = applyMapCommand(world.map, command, economy.city.coins, id);
  if (!result.ok) return result;
  return {
    ok: true,
    world: {
      map: result.map,
      actions: [
        ...world.actions,
        {
          id,
          afterRewardCount: economy.ledger.length,
          command: { ...command, position: { ...command.position } },
        },
      ],
    },
    economy: { ...economy, city: { ...economy.city, coins: economy.city.coins - result.cost } },
  };
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function parseCommand(value: unknown): MapCommand {
  if (
    !record(value) ||
    !record(value.position) ||
    !Number.isInteger(value.position.x) ||
    !Number.isInteger(value.position.y)
  )
    throw new Error('Invalid map command');
  const position = { x: value.position.x as number, y: value.position.y as number };
  if (
    value.kind === 'place' &&
    (value.buildingType === 'house' ||
      value.buildingType === 'park' ||
      value.buildingType === 'power_plant')
  )
    return { kind: 'place', buildingType: value.buildingType, position };
  if (value.kind === 'move' && typeof value.buildingId === 'string')
    return { kind: 'move', buildingId: value.buildingId, position };
  if (value.kind === 'add_road' || value.kind === 'remove_road')
    return { kind: value.kind, position };
  throw new Error('Unsupported map command');
}

/** Replay against earned-coin prefixes, so a purchase cannot spend a later session's money. */
export function replayWorld(
  baseEconomy: EconomyState,
  rawActions: unknown,
): { world: WorldState; economy: EconomyState } {
  if (!Array.isArray(rawActions)) throw new Error('Invalid map event log');
  const coinPrefixes = [0];
  for (const entry of baseEconomy.ledger) {
    const coins = coinPrefixes[coinPrefixes.length - 1] + entry.coins;
    if (!Number.isSafeInteger(coins)) throw new Error('Unsafe earned-coin prefix');
    coinPrefixes.push(coins);
  }
  let world = createWorld();
  let spent = 0;
  let lastCount = 0;
  const ids = new Set<string>();
  for (const raw of rawActions) {
    if (
      !record(raw) ||
      typeof raw.id !== 'string' ||
      !raw.id ||
      ids.has(raw.id) ||
      !Number.isSafeInteger(raw.afterRewardCount) ||
      typeof raw.afterRewardCount !== 'number' ||
      raw.afterRewardCount < lastCount ||
      raw.afterRewardCount > baseEconomy.ledger.length
    )
      throw new Error('Invalid map event ordering');
    const command = parseCommand(raw.command);
    const result = applyMapCommand(
      world.map,
      command,
      coinPrefixes[raw.afterRewardCount] - spent,
      raw.id,
    );
    if (!result.ok) throw new Error(`Invalid saved placement: ${result.error}`);
    spent += result.cost;
    ids.add(raw.id);
    lastCount = raw.afterRewardCount;
    world = {
      map: result.map,
      actions: [...world.actions, { id: raw.id, afterRewardCount: raw.afterRewardCount, command }],
    };
  }
  if (spent > baseEconomy.city.coins) throw new Error('Overspent city balance');
  return {
    world,
    economy: {
      ...baseEconomy,
      city: { ...baseEconomy.city, coins: baseEconomy.city.coins - spent },
    },
  };
}
