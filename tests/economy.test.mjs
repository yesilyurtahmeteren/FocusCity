import assert from 'node:assert/strict';
import test from 'node:test';

import { BALANCE, LEVEL_ONE_OPERATING_COSTS } from '../src/domain/economy/balance.ts';
import {
  calculateHappiness,
  calculatePopulationGrowth,
  calculateTax,
  createCity,
  EMPTY_CITY_CONDITIONS,
  fundOperatingServices,
  processPeriod,
} from '../src/domain/economy/city.ts';
import {
  calculateResearchBonus,
  createEconomy,
  creditSession,
} from '../src/domain/economy/rewards.ts';
import {
  cancelSession,
  emptyFocusData,
  reconcile,
  startSession,
} from '../src/domain/focus/session.ts';
import { decodeApplicationSave } from '../src/services/application-save.ts';
import {
  APPLICATION_STORAGE_KEY,
  FOCUS_STORAGE_KEY,
  createFocusStore,
} from '../src/store/focus-store.ts';

const epoch = Date.parse('2026-10-29T10:00:00.000Z');
const event = (id, seconds, bonusBasisPoints = 0) => ({
  sessionId: id,
  status: 'completed',
  creditedSeconds: seconds,
  bonusBasisPoints,
  endedAtUtc: new Date(epoch).toISOString(),
});
const complete = (minutes, id, at = epoch) =>
  reconcile(startSession(emptyFocusData(), id, minutes, at), at + minutes * 60_000).history[0];

test('two 25 minute sessions and one 50 minute session have identical holdings', () => {
  const split = creditSession(creditSession(createEconomy(), event('a', 1500)), event('b', 1500));
  const single = creditSession(createEconomy(), event('c', 3000));
  assert.deepEqual(split.city, single.city);
  assert.equal(split.city.coins, 100);
  assert.equal(split.city.researchPoints, 5);
});

test('25 + 20 + 30 minutes gives exactly 150 coins, 7 RP, one period and retained seconds', () => {
  let state = createEconomy();
  for (const [index, minutes] of [25, 20, 30].entries())
    state = creditSession(state, event(String(index), minutes * 60));
  assert.equal(state.city.coins, 150);
  assert.equal(state.city.researchPoints, 7);
  assert.equal(state.city.rpMinuteRemainderSeconds, 300);
  assert.equal(state.city.lastProcessedCityPeriod, 1);
  assert.equal(state.city.cityPeriodRemainderSeconds, 900);
  assert.equal(state.city.unallocatedLaborSeconds, 4500);
  assert.equal(state.city.lastPeriodReport.taxIncome, 0);
});

test('fractional minute coin and RP progress survives arbitrary session splits', () => {
  const a = creditSession(createEconomy(), event('1', 17));
  assert.equal(a.city.coins, 0);
  assert.equal(a.city.coinRemainderNumerator, 34);
  const b = creditSession(a, event('2', 13));
  assert.equal(b.city.coins, 1);
  assert.equal(b.city.coinRemainderNumerator, 0);
  const c = creditSession(b, event('3', 570));
  assert.equal(c.city.coins, 20);
  assert.equal(c.city.researchPoints, 1);
  assert.equal(c.city.rpMinuteRemainderSeconds, 0);
});

test('bonus fractional units carry exactly and bonus never changes base RP', () => {
  let state = createEconomy();
  for (let i = 0; i < 20; i += 1) state = creditSession(state, event(String(i), 600, 500));
  assert.equal(state.city.researchPoints, 21);
  assert.equal(state.city.rpBonusRemainderUnits, 0);
  assert.equal(
    state.ledger.reduce((sum, entry) => sum + entry.baseResearchPoints, 0),
    20,
  );
  assert.equal(
    state.ledger.reduce((sum, entry) => sum + entry.bonusResearchPoints, 0),
    1,
  );
});

test('bonus is tied to each session snapshot, including fractional segments across different bonuses', () => {
  const a = creditSession(createEconomy(), event('a', 300, 3000));
  const b = creditSession(a, event('b', 300, 0));
  assert.equal(b.city.researchPoints, 1);
  assert.equal(b.city.rpBonusRemainderUnits, 900_000);
  assert.equal(b.ledger[0].bonusBasisPoints, 3000);
  assert.equal(b.ledger[1].bonusBasisPoints, 0);
});

test('research sources are boolean first-active contributions and capped at 30 percent', () => {
  assert.equal(
    calculateResearchBonus({
      school: true,
      library: false,
      university: false,
      educationPolicy: false,
    }),
    500,
  );
  assert.equal(
    calculateResearchBonus({
      school: true,
      library: true,
      university: true,
      educationPolicy: true,
    }),
    3000,
  );
});

test('same event is a no-op, a conflicting same ID fails, cancellation pays nothing', () => {
  const input = event('once', 1500);
  const state = creditSession(createEconomy(), input);
  assert.equal(creditSession(state, input), state);
  assert.throws(() => creditSession(state, { ...input, creditedSeconds: 3000 }));
  assert.equal(creditSession(state, { ...event('cancel', 0), status: 'cancelled' }), state);
  assert.throws(() => creditSession(state, { ...event('cancel', 10), status: 'cancelled' }));
});

test('periods require earned focus time and are idempotent and sequential', () => {
  const due = { ...createCity(), totalCreditedFocusSeconds: 7200 };
  const first = processPeriod(due, 1);
  assert.equal(processPeriod(first, 1), first);
  assert.throws(() => processPeriod(due, 2));
  assert.throws(() => processPeriod(createCity(), 1));
  assert.equal(processPeriod(first, 2).lastProcessedCityPeriod, 2);
});

test('tax uses explicit integer floor after the policy multiplier', () => {
  assert.equal(calculateTax(50, 1, 'low'), 30);
  assert.equal(calculateTax(50, 1, 'balanced'), 40);
  assert.equal(calculateTax(50, 1, 'high'), 54);
  assert.equal(calculateTax(11, 0, 'low'), 1);
});

test('service funding follows priority then ID and never spends more than available', () => {
  const services = [
    { id: 'park', cost: LEVEL_ONE_OPERATING_COSTS.park, priority: 2 },
    { id: 'school', cost: LEVEL_ONE_OPERATING_COSTS.school, priority: 1 },
    { id: 'power', cost: LEVEL_ONE_OPERATING_COSTS.power_plant, priority: 0 },
  ];
  const result = fundOperatingServices(15, services);
  assert.equal(result.operatingExpenses, 15);
  assert.deepEqual(result.unfundedServiceIds, ['school']);
  assert.deepEqual(fundOperatingServices(15, [...services].reverse()), result);
  assert.equal(fundOperatingServices(0, services).operatingExpenses, 0);
  assert.throws(() => fundOperatingServices(-1, services));
});

test('happiness clamps to 0–100 and population never falls or exceeds housing', () => {
  assert.equal(
    calculateHappiness({ ...EMPTY_CITY_CONDITIONS, parkAccessBonus: 100 }, 'balanced'),
    100,
  );
  assert.equal(
    calculateHappiness({ ...EMPTY_CITY_CONDITIONS, infrastructurePenalty: 100 }, 'high'),
    0,
  );
  assert.equal(calculatePopulationGrowth(9, 10, 100, 10_000, 'low'), 1);
  assert.equal(calculatePopulationGrowth(20, 10, 100, 10_000, 'balanced'), 0);
  assert.equal(calculatePopulationGrowth(0, 10, 100, 0, 'balanced'), 0);
});

test('period reports explain unfunded services and keep wallet and population nonnegative', () => {
  const conditions = {
    ...EMPTY_CITY_CONDITIONS,
    housingCapacity: 10,
    infrastructureBasisPoints: 10_000,
    parkAccessBonus: 8,
    services: [{ id: 'park', cost: 3, priority: 0 }],
  };
  const first = processPeriod({ ...createCity(), totalCreditedFocusSeconds: 3600 }, 1, conditions);
  assert.equal(first.coins, 0);
  assert.equal(first.population, 0);
  assert.deepEqual(first.lastPeriodReport.unfundedServiceIds, ['park']);
  assert.equal(first.lastPeriodReport.happiness, 50);
  const funded = processPeriod(
    { ...createCity(), coins: 3, totalCreditedFocusSeconds: 3600 },
    1,
    conditions,
  );
  assert.equal(funded.population, 2);
  assert.equal(funded.lastPeriodReport.happiness, 58);
  assert.equal(funded.coins, 0);
});

test('pending tax policy becomes active only in the next earned period', () => {
  const city = {
    ...createCity(),
    population: 10,
    totalCreditedFocusSeconds: 3600,
    pendingTaxPolicy: 'high',
  };
  assert.equal(city.taxPolicy, 'balanced');
  const next = processPeriod(city, 1, { ...EMPTY_CITY_CONDITIONS, housingCapacity: 10 });
  assert.equal(next.taxPolicy, 'high');
  assert.equal(next.pendingTaxPolicy, null);
  assert.equal(next.lastPeriodReport.taxIncome, 2);
});

test('invalid fractions, negative credit, bonus overflow and unsafe wallet arithmetic fail', () => {
  for (const seconds of [-1, 1.5, Infinity, BALANCE.maxSessionSeconds + 1])
    assert.throws(() => creditSession(createEconomy(), event('bad', seconds)));
  assert.throws(() => creditSession(createEconomy(), event('bad', 60, 3001)));
  const maxed = { ...createEconomy(), city: { ...createCity(), coins: Number.MAX_SAFE_INTEGER } };
  assert.throws(() => creditSession(maxed, event('overflow', 60)));
});

test('fixed seed partitions give the same resources as one uninterrupted credit', () => {
  let seed = 731;
  let remaining = 7200;
  let state = createEconomy();
  let count = 0;
  while (remaining > 0) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const seconds = Math.min(remaining, (seed % 271) + 1);
    state = creditSession(state, event(`segment-${count++}`, seconds, 1500));
    remaining -= seconds;
  }
  assert.deepEqual(state.city, creditSession(createEconomy(), event('whole', 7200, 1500)).city);
});

function storageFixture(legacy = null, current = null) {
  const values = new Map([
    [FOCUS_STORAGE_KEY, legacy],
    [APPLICATION_STORAGE_KEY, current],
  ]);
  let time = epoch;
  let fail = false;
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      if (fail) throw new Error('disk full');
      values.set(key, value);
    },
  };
  let id = 0;
  const store = createFocusStore(
    storage,
    () => time,
    () => `new-${++id}`,
  );
  return {
    values,
    store,
    storage,
    setTime: (next) => {
      time = next;
    },
    setFail: (next) => {
      fail = next;
    },
  };
}

test('v1 migration pays existing completed sessions once and preserves the legacy bytes', async () => {
  const old = { version: 1, active: null, history: [complete(25, 'old')] };
  const raw = JSON.stringify(old);
  const f = storageFixture(raw);
  await f.store.load();
  assert.equal(f.store.getSnapshot().economy.city.coins, 50);
  assert.equal(f.store.getSnapshot().economy.ledger.length, 1);
  assert.equal(f.values.get(FOCUS_STORAGE_KEY), raw);
  const saved = f.values.get(APPLICATION_STORAGE_KEY);
  assert.equal(JSON.parse(saved).version, 3);
  assert.equal(decodeApplicationSave(saved).save.focus.history[0].id, 'old');
  const again = createFocusStore(
    f.storage,
    () => epoch + 3 * 86400_000,
    () => 'unused',
  );
  await again.load();
  assert.deepEqual(again.getSnapshot().economy, f.store.getSnapshot().economy);
});

test('v1 migration preserves a paused active session and skips cancelled history', async () => {
  const cancelled = cancelSession(startSession(emptyFocusData(), 'cancel', 25, epoch), epoch + 1000)
    .history[0];
  const active = {
    ...startSession(emptyFocusData(), 'paused', 15, epoch).active,
    status: 'paused',
    elapsedMs: 3000,
  };
  const f = storageFixture(JSON.stringify({ version: 1, active, history: [cancelled] }));
  await f.store.load();
  assert.equal(f.store.getSnapshot().data.active.elapsedMs, 3000);
  assert.equal(f.store.getSnapshot().economy.ledger.length, 0);
});

test('completion and economy commit together; failed write and retry never duplicate rewards', async () => {
  const f = storageFixture();
  await f.store.load();
  await f.store.start(25);
  const before = f.values.get(APPLICATION_STORAGE_KEY);
  f.setTime(epoch + 1500_000);
  f.setFail(true);
  await f.store.tick();
  assert.equal(f.store.getSnapshot().economy.city.coins, 0);
  assert.equal(f.store.getSnapshot().data.history.length, 0);
  assert.equal(f.values.get(APPLICATION_STORAGE_KEY), before);
  f.setFail(false);
  await f.store.retry();
  await f.store.tick();
  const snapshot = f.store.getSnapshot();
  assert.equal(snapshot.economy.city.coins, 50);
  assert.equal(snapshot.economy.ledger.length, 1);
  assert.equal(snapshot.data.history.length, 1);
  const persisted = decodeApplicationSave(f.values.get(APPLICATION_STORAGE_KEY)).save;
  assert.equal(persisted.economy.city.coins, 50);
});

test('failed migration write leaves original safe and retries migration atomically', async () => {
  const raw = JSON.stringify({ version: 1, active: null, history: [complete(25, 'old')] });
  const f = storageFixture(raw);
  f.setFail(true);
  await f.store.load();
  assert.equal(f.store.getSnapshot().ready, false);
  assert.equal(f.store.getSnapshot().error, 'save');
  assert.equal(f.values.get(FOCUS_STORAGE_KEY), raw);
  assert.equal(f.values.get(APPLICATION_STORAGE_KEY), null);
  f.setFail(false);
  await f.store.retry();
  assert.equal(f.store.getSnapshot().economy.city.coins, 50);
});

test('corrupted current balances/ledger never fall back to an older v1 backup', async () => {
  const v1 = JSON.stringify({ version: 1, active: null, history: [complete(25, 'old')] });
  const valid = decodeApplicationSave(v1).save;
  for (const corrupt of [
    { ...valid, economy: { ...valid.economy, city: { ...valid.economy.city, coins: -1 } } },
    {
      ...valid,
      economy: { ...valid.economy, ledger: [...valid.economy.ledger, ...valid.economy.ledger] },
    },
    { ...valid, economy: { ...valid.economy, ledger: [] } },
    { ...valid, version: 99 },
  ]) {
    const raw = JSON.stringify(corrupt);
    const f = storageFixture(v1, raw);
    await f.store.load();
    assert.equal(f.store.getSnapshot().error, 'load');
    assert.equal(f.values.get(APPLICATION_STORAGE_KEY), raw);
  }
});

test('clock rollback cannot reorder recorded settlements on subsequent loads', async () => {
  const f = storageFixture();
  await f.store.load();
  await f.store.start(25);
  f.setTime(epoch + 1500_000);
  await f.store.tick();
  f.setTime(epoch - 86400_000);
  await f.store.start(15);
  f.setTime(epoch - 86400_000 + 900_000);
  await f.store.tick();
  const saved = decodeApplicationSave(f.values.get(APPLICATION_STORAGE_KEY)).save;
  assert.equal(saved.economy.city.coins, 80);
  assert.equal(saved.economy.ledger[0].sessionId, 'new-1');
  assert.equal(saved.economy.ledger[1].sessionId, 'new-2');
});

test('three days away with no active session does not process another period or create debt', async () => {
  const f = storageFixture(
    JSON.stringify({ version: 1, active: null, history: [complete(75, 'old')] }),
  );
  await f.store.load();
  const before = f.store.getSnapshot().economy;
  f.setTime(epoch + 3 * 86400_000);
  await f.store.load();
  await f.store.tick();
  assert.deepEqual(f.store.getSnapshot().economy, before);
  assert.equal(before.city.coins, 150);
  assert.equal(before.city.population, 0);
});

test('migration completes an expired active v1 session and commits exactly one payout', async () => {
  const legacy = startSession(emptyFocusData(), 'active-old', 25, epoch);
  delete legacy.active.rewardBonusBasisPoints;
  const f = storageFixture(JSON.stringify(legacy));
  f.setTime(epoch + 1500_000);
  await f.store.load();
  assert.equal(f.store.getSnapshot().data.active, null);
  assert.equal(f.store.getSnapshot().economy.city.coins, 50);
  const restored = createFocusStore(
    f.storage,
    () => epoch + 1800_000,
    () => 'unused',
  );
  await restored.load();
  assert.equal(restored.getSnapshot().economy.ledger.length, 1);
  assert.equal(restored.getSnapshot().economy.city.coins, 50);
});

test('live store cancellation persists zero payout across a cold restart', async () => {
  const f = storageFixture();
  await f.store.load();
  await f.store.start(25);
  f.setTime(epoch + 60_000);
  await f.store.cancel();
  const restored = createFocusStore(
    f.storage,
    () => epoch + 3 * 86400_000,
    () => 'unused',
  );
  await restored.load();
  assert.equal(restored.getSnapshot().data.history[0].status, 'cancelled');
  assert.equal(restored.getSnapshot().economy.ledger.length, 0);
  assert.deepEqual(restored.getSnapshot().economy.city, createCity());
});
