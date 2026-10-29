import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cancelSession,
  decodeFocusData,
  emptyFocusData,
  formatDuration,
  parseMinutes,
  pauseSession,
  reconcile,
  remainingSeconds,
  resumeSession,
  startSession,
} from '../src/domain/focus/session.ts';
import { createFocusClock } from '../src/services/focus-clock.ts';
import { createFocusStore } from '../src/store/focus-store.ts';
import { decodeApplicationSave } from '../src/services/application-save.ts';

const epoch = Date.parse('2026-10-27T12:00:00.000Z');
const begin = () => startSession(emptyFocusData(), 'session-1', 25, epoch);

test('25 minutes completes once with exact UTC deadline and credited seconds', () => {
  const started = begin();
  assert.equal(remainingSeconds(started.active, epoch + 1499_001), 1);
  const ended = reconcile(started, epoch + 1800_000);
  assert.equal(ended.active, null);
  assert.equal(ended.history[0].creditedSeconds, 1500);
  assert.equal(ended.history[0].endedAtUtc, new Date(epoch + 1500_000).toISOString());
  assert.deepEqual(reconcile(ended, epoch + 1900_000), ended);
  assert.deepEqual(cancelSession(ended, epoch + 1900_000), ended);
});

test('pause/resume excludes paused time and preserves subsecond progress', () => {
  const paused = pauseSession(begin(), epoch + 10_250);
  assert.equal(remainingSeconds(paused.active, epoch + 500_000), 1490);
  const resumed = resumeSession(paused, epoch + 600_000);
  const checkpoint = reconcile(resumed, epoch + 600_750);
  assert.equal(checkpoint.active.elapsedMs, 11_000);
  assert.equal(reconcile(checkpoint, epoch + 2089_750).history[0].creditedSeconds, 1500);
});

test('running restore after process termination accounts for offline time', () => {
  const saved = reconcile(begin(), epoch + 120_000);
  const restored = decodeFocusData(JSON.stringify(saved));
  assert.equal(remainingSeconds(restored.active, epoch + 300_000), 1200);
  assert.equal(reconcile(restored, epoch + 1500_000).history[0].status, 'completed');
});

test('paused restore remains paused even days later', () => {
  const saved = pauseSession(begin(), epoch + 10_000);
  const restored = decodeFocusData(JSON.stringify(saved));
  assert.deepEqual(reconcile(restored, epoch + 3 * 86400_000), restored);
  assert.equal(remainingSeconds(restored.active, epoch + 3 * 86400_000), 1490);
});

test('early cancellation credits zero and second active session cannot start', () => {
  assert.deepEqual(startSession(begin(), 'other', 15, epoch), begin());
  const cancelled = cancelSession(begin(), epoch + 100_000);
  assert.equal(cancelled.history[0].status, 'cancelled');
  assert.equal(cancelled.history[0].creditedSeconds, 0);
  assert.equal(cancelled.history[0].elapsedMs, 100_000);
  assert.deepEqual(startSession(cancelled, 'session-1', 15, epoch), cancelled);
});

test('cancel/pause at or after deadline complete instead of losing earned time', () => {
  assert.equal(cancelSession(begin(), epoch + 1500_000).history[0].status, 'completed');
  assert.equal(pauseSession(begin(), epoch + 1500_001).history[0].status, 'completed');
});

test('clock rollback pauses without negative or extra credit; resume remains loadable', () => {
  const checkpoint = reconcile(begin(), epoch + 60_000);
  const rolled = reconcile(checkpoint, epoch - 100_000);
  assert.equal(rolled.active.status, 'paused');
  assert.equal(rolled.active.elapsedMs, 60_000);
  const resumed = resumeSession(rolled, epoch - 100_000);
  assert.deepEqual(decodeFocusData(JSON.stringify(resumed)), resumed);
  const cancelled = cancelSession(resumed, epoch - 90_000);
  assert.deepEqual(decodeFocusData(JSON.stringify(cancelled)), cancelled);
});

test('duration input accepts bounded whole minutes only', () => {
  for (const value of ['', '0', '-1', '1.5', 'Infinity', '181', '999'])
    assert.equal(parseMinutes(value), null);
  assert.equal(parseMinutes(' 25 '), 25);
  assert.equal(parseMinutes('180'), 180);
  assert.equal(formatDuration(1500), '25:00');
  assert.equal(formatDuration(0), '00:00');
});

test('corrupt, unsupported, inconsistent and duplicate saves are rejected', () => {
  assert.deepEqual(decodeFocusData(null), emptyFocusData());
  for (const value of [
    'bad-json',
    '{}',
    JSON.stringify({ ...begin(), version: 2 }),
    JSON.stringify({ ...begin(), active: { ...begin().active, elapsedMs: -1 } }),
  ]) {
    assert.throws(() => decodeFocusData(value));
  }
  const ended = reconcile(begin(), epoch + 1500_000);
  assert.throws(() =>
    decodeFocusData(JSON.stringify({ ...ended, history: [...ended.history, ...ended.history] })),
  );
  assert.throws(() =>
    decodeFocusData(
      JSON.stringify({ ...ended, history: [{ ...ended.history[0], creditedSeconds: 1 }] }),
    ),
  );
});

test('foreground clock follows monotonic time instead of wall clock changes', () => {
  let wall = epoch;
  let mono = 100;
  const clock = createFocusClock(
    () => wall,
    () => mono,
  );
  wall += 86400_000;
  mono += 2000;
  assert.equal(clock.now(), epoch + 2000);
  clock.rebase();
  mono += 3000;
  assert.equal(clock.now(), wall + 3000);
});

function fixture(initial = null) {
  let raw = initial;
  let time = epoch;
  let fail = false;
  const writes = [];
  const storage = {
    getItem: async () => raw,
    setItem: async (_key, value) => {
      if (fail) throw new Error('disk unavailable');
      raw = value;
      writes.push(value);
    },
  };
  let counter = 0;
  const store = createFocusStore(
    storage,
    () => time,
    () => `test-${++counter}`,
  );
  return {
    store,
    storage,
    writes,
    setTime: (value) => {
      time = value;
    },
    setFail: (value) => {
      fail = value;
    },
    getRaw: () => raw,
  };
}

test('store blocks starts before load and concurrent double taps', async () => {
  const f = fixture();
  await f.store.start(25);
  assert.equal(f.writes.length, 0);
  await f.store.load();
  await Promise.all([f.store.start(25), f.store.start(15)]);
  assert.equal(f.store.getSnapshot().data.active.plannedSeconds, 1500);
  assert.equal(f.writes.length, 1);
});

test('store commits completion once, then restores without duplicate history', async () => {
  const f = fixture();
  await f.store.load();
  await f.store.start(25);
  f.setTime(epoch + 1500_000);
  await Promise.all([f.store.tick(), f.store.cancel()]);
  assert.equal(f.store.getSnapshot().data.history.length, 1);
  const restored = createFocusStore(
    f.storage,
    () => epoch + 1800_000,
    () => 'new-id',
  );
  await restored.load();
  await restored.tick();
  assert.equal(restored.getSnapshot().data.history.length, 1);
});

test('failed write retains durable data and retries the exact pending transition', async () => {
  const f = fixture();
  await f.store.load();
  await f.store.start(25);
  const previous = f.getRaw();
  f.setTime(epoch + 50_000);
  f.setFail(true);
  await f.store.pause();
  assert.equal(f.getRaw(), previous);
  assert.equal(f.store.getSnapshot().error, 'save');
  await f.store.cancel();
  assert.equal(f.store.getSnapshot().data.active.status, 'running');
  f.setFail(false);
  f.setTime(epoch + 100_000);
  await f.store.retry();
  assert.equal(f.store.getSnapshot().data.active.status, 'paused');
  assert.equal(f.store.getSnapshot().data.active.elapsedMs, 50_000);
  assert.equal(f.store.getSnapshot().error, null);
});

test('invalid save is preserved and blocks all mutations', async () => {
  const f = fixture('{invalid');
  await f.store.load();
  await f.store.start(25);
  await f.store.tick();
  assert.equal(f.store.getSnapshot().ready, false);
  assert.equal(f.store.getSnapshot().error, 'load');
  assert.equal(f.getRaw(), '{invalid');
  assert.equal(f.writes.length, 0);
});

test('cold restore of a finished deadline persists completion before showing it', async () => {
  const f = fixture(JSON.stringify(begin()));
  f.setTime(epoch + 1500_000);
  await f.store.load();
  assert.equal(f.store.getSnapshot().ready, true);
  assert.equal(decodeApplicationSave(f.getRaw()).save.focus.history[0].creditedSeconds, 1500);
});

test('streamed web hydration keeps a stable loading snapshot after storage loads', async () => {
  const f = fixture();
  const initial = f.store.getServerSnapshot();
  await f.store.load();
  await f.store.start(25);
  assert.equal(f.store.getSnapshot().ready, true);
  assert.equal(f.store.getServerSnapshot(), initial);
  assert.equal(initial.ready, false);
  assert.equal(initial.data.active, null);
});

test('failed completion save does not publish credit and retry commits it only once', async () => {
  const f = fixture();
  await f.store.load();
  await f.store.start(25);
  f.setFail(true);
  f.setTime(epoch + 1500_000);
  await f.store.tick();
  assert.equal(f.store.getSnapshot().data.history.length, 0);
  assert.equal(f.store.getSnapshot().error, 'save');
  f.setFail(false);
  await f.store.retry();
  await f.store.tick();
  assert.equal(f.store.getSnapshot().data.history.length, 1);
  assert.equal(decodeApplicationSave(f.getRaw()).save.focus.history[0].creditedSeconds, 1500);
});

test('read failure blocks changes and a successful retry restores existing data', async () => {
  let failRead = true;
  let writes = 0;
  const raw = JSON.stringify(pauseSession(begin(), epoch + 20_000));
  const store = createFocusStore(
    {
      getItem: async () => {
        if (failRead) throw new Error('read unavailable');
        return raw;
      },
      setItem: async () => {
        writes += 1;
      },
    },
    () => epoch + 600_000,
    () => 'new-id',
  );
  await store.load();
  await store.start(25);
  assert.equal(store.getSnapshot().error, 'load');
  assert.equal(writes, 0);
  failRead = false;
  await store.retry();
  assert.equal(store.getSnapshot().data.active.elapsedMs, 20_000);
  assert.equal(store.getSnapshot().data.active.status, 'paused');
});
