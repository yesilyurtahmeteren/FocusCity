import { decodeFocusData, emptyFocusData, type FocusData } from '../domain/focus/session.ts';
import { createEconomy, creditSession, type EconomyState } from '../domain/economy/rewards.ts';
import { createWorld, replayWorld, type WorldState } from '../domain/map/world.ts';

export type ApplicationSave = {
  version: 3;
  focus: FocusData;
  economy: EconomyState;
  world: WorldState;
};
export const emptyApplicationSave = (): ApplicationSave => ({
  version: 3,
  focus: emptyFocusData(),
  economy: createEconomy(),
  world: createWorld(),
});

/** Reverse the durable newest-first history, rather than sorting a mutable device wall clock. */
export function settleFocus(focus: FocusData, economy: EconomyState): EconomyState {
  const rewarded = new Set(economy.ledger.map((entry) => entry.sessionId));
  const completed = [...focus.history]
    .reverse()
    .filter((session) => session.status === 'completed' && !rewarded.has(session.id));
  let next = economy;
  for (const session of completed) {
    next = creditSession(next, {
      sessionId: session.id,
      status: session.status,
      creditedSeconds: session.creditedSeconds,
      endedAtUtc: session.endedAtUtc,
      bonusBasisPoints: session.rewardBonusBasisPoints ?? 0,
    });
  }
  return next;
}

function equalJson(first: unknown, second: unknown): boolean {
  if (first === second) return true;
  if (typeof first !== 'object' || first === null || typeof second !== 'object' || second === null)
    return false;
  if (Array.isArray(first) !== Array.isArray(second)) return false;
  const left = Object.keys(first).sort();
  const right = Object.keys(second).sort();
  return (
    left.length === right.length &&
    left.every(
      (key, index) =>
        key === right[index] &&
        equalJson(
          (first as Record<string, unknown>)[key],
          (second as Record<string, unknown>)[key],
        ),
    )
  );
}

/** Versioned replay validates focus rewards, map operations and the resulting spend together. */
export function decodeApplicationSave(raw: string | null): {
  save: ApplicationSave;
  migrated: boolean;
} {
  if (raw === null) return { save: emptyApplicationSave(), migrated: false };
  const value: unknown = JSON.parse(raw);
  if (typeof value !== 'object' || value === null || !('version' in value))
    throw new Error('Invalid application save');
  if (value.version === 1) {
    const focus = decodeFocusData(raw);
    return {
      save: {
        version: 3,
        focus,
        economy: settleFocus(focus, createEconomy()),
        world: createWorld(),
      },
      migrated: true,
    };
  }
  if ((value.version !== 2 && value.version !== 3) || !('focus' in value) || !('economy' in value))
    throw new Error('Unsupported application save');
  const focus = decodeFocusData(JSON.stringify(value.focus));
  const economy = settleFocus(focus, createEconomy());
  if (value.version === 2) {
    if (!equalJson(economy, value.economy)) throw new Error('Inconsistent economy ledger');
    return { save: { version: 3, focus, economy, world: createWorld() }, migrated: true };
  }
  if (
    !('world' in value) ||
    typeof value.world !== 'object' ||
    value.world === null ||
    !('actions' in value.world)
  )
    throw new Error('Missing map state');
  const replayed = replayWorld(economy, value.world.actions);
  if (!equalJson(replayed.economy, value.economy) || !equalJson(replayed.world, value.world))
    throw new Error('Inconsistent map or city balance');
  return { save: { version: 3, focus, ...replayed }, migrated: false };
}
