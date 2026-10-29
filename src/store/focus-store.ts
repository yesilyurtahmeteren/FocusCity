import {
  cancelSession,
  emptyFocusData,
  pauseSession,
  reconcile,
  resumeSession,
  startSession,
  type FocusData,
} from '../domain/focus/session.ts';
import { createEconomy, type EconomyState } from '../domain/economy/rewards.ts';
import { commitMapCommand, createWorld, type WorldState } from '../domain/map/world.ts';
import type { MapCommand, MapError } from '../domain/map/placement.ts';
import {
  decodeApplicationSave,
  settleFocus,
  type ApplicationSave,
} from '../services/application-save.ts';

export const FOCUS_STORAGE_KEY = '@focus-city/focus/v1';
export const LEGACY_APPLICATION_STORAGE_KEY = '@focus-city/save/v2';
export const APPLICATION_STORAGE_KEY = '@focus-city/save/v3';
export type FocusStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};
type Snapshot = {
  data: FocusData;
  economy: EconomyState;
  world: WorldState;
  mapError: MapError | null;
  ready: boolean;
  busy: boolean;
  error: 'load' | 'save' | null;
  now: number;
};

/** One writer per app runtime. Publish durable transitions only after a successful save. */
export function createFocusStore(storage: FocusStorage, now: () => number, createId: () => string) {
  let snapshot: Snapshot = {
    data: emptyFocusData(),
    economy: createEconomy(),
    world: createWorld(),
    mapError: null,
    ready: false,
    busy: false,
    error: null,
    now: now(),
  };
  // Streaming web hydration must always see the initial loading snapshot, even if
  // storage finishes loading before a lazy route has hydrated.
  const serverSnapshot = snapshot;
  const listeners = new Set<() => void>();
  let pending: ApplicationSave | null = null;
  let lastSavedAt = now();
  const publish = (patch: Partial<Snapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  };

  async function save(candidate: ApplicationSave) {
    publish({ busy: true });
    try {
      await storage.setItem(APPLICATION_STORAGE_KEY, JSON.stringify(candidate));
      pending = null;
      lastSavedAt = now();
      publish({
        data: candidate.focus,
        economy: candidate.economy,
        world: candidate.world,
        mapError: null,
        ready: true,
        busy: false,
        error: null,
        now: now(),
      });
    } catch {
      pending = candidate;
      publish({ busy: false, error: 'save', now: now() });
    }
  }

  async function load() {
    if (snapshot.busy) return;
    publish({ busy: true, error: null });
    try {
      const current = await storage.getItem(APPLICATION_STORAGE_KEY);
      const raw =
        current ??
        (await storage.getItem(LEGACY_APPLICATION_STORAGE_KEY)) ??
        (await storage.getItem(FOCUS_STORAGE_KEY));
      const decoded = decodeApplicationSave(raw);
      const data = decoded.save.focus;
      // Loading and reconciliation form one transaction, so no empty state can overwrite a save.
      const next = reconcile(data, now());
      if (next !== data || decoded.migrated) {
        await save({
          ...decoded.save,
          focus: next,
          economy: settleFocus(next, decoded.save.economy),
        });
      } else
        publish({
          data,
          economy: decoded.save.economy,
          world: decoded.save.world,
          mapError: null,
          ready: true,
          busy: false,
          now: now(),
        });
    } catch {
      publish({ ready: false, busy: false, error: 'load' });
    }
  }

  async function act(transform: (data: FocusData, time: number) => FocusData) {
    if (!snapshot.ready || snapshot.busy || snapshot.error) return;
    const data = transform(snapshot.data, now());
    if (data !== snapshot.data)
      await save({
        version: 3,
        focus: data,
        economy: settleFocus(data, snapshot.economy),
        world: snapshot.world,
      });
  }

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    load,
    retry: async () => {
      if (snapshot.busy) return;
      if (pending) await save(pending);
      else await load();
    },
    start: (minutes: number) => act((data, time) => startSession(data, createId(), minutes, time)),
    pause: () => act(pauseSession),
    resume: () => act(resumeSession),
    cancel: () => act(cancelSession),
    checkpoint: () => act(reconcile),
    clearMapError: () => {
      if (snapshot.mapError) publish({ mapError: null });
    },
    applyMap: async (command: MapCommand): Promise<boolean> => {
      if (!snapshot.ready || snapshot.busy || snapshot.error) return false;
      const result = commitMapCommand(
        snapshot.world,
        snapshot.economy,
        command,
        `map-${createId()}`,
      );
      if (!result.ok) {
        publish({ mapError: result.error });
        return false;
      }
      await save({
        version: 3,
        focus: snapshot.data,
        economy: result.economy,
        world: result.world,
      });
      return !snapshot.error;
    },
    tick: async () => {
      if (
        !snapshot.ready ||
        snapshot.busy ||
        snapshot.error ||
        snapshot.data.active?.status !== 'running'
      )
        return;
      const time = now();
      const next = reconcile(snapshot.data, time);
      if (
        next !== snapshot.data &&
        (!next.active || next.active.status === 'paused' || time - lastSavedAt >= 15_000)
      ) {
        await save({
          version: 3,
          focus: next,
          economy: settleFocus(next, snapshot.economy),
          world: snapshot.world,
        });
      } else publish({ now: time });
    },
  };
}
