export type ActiveSession = {
  id: string;
  status: 'running' | 'paused';
  startedAtUtc: string;
  plannedSeconds: number;
  elapsedMs: number;
  checkpointUtcMs: number;
  rewardBonusBasisPoints?: number;
};

export type FinishedSession = {
  id: string;
  status: 'completed' | 'cancelled';
  startedAtUtc: string;
  endedAtUtc: string;
  plannedSeconds: number;
  elapsedMs: number;
  creditedSeconds: number;
  rewardBonusBasisPoints?: number;
};

export type FocusData = {
  version: 1;
  active: ActiveSession | null;
  history: FinishedSession[];
};

export const emptyFocusData = (): FocusData => ({ version: 1, active: null, history: [] });
export const MIN_MINUTES = 1;
export const MAX_MINUTES = 180;

export function parseMinutes(value: string): number | null {
  if (!/^\d{1,3}$/.test(value.trim())) return null;
  const minutes = Number(value);
  return minutes >= MIN_MINUTES && minutes <= MAX_MINUTES ? minutes : null;
}

export function elapsedMs(session: ActiveSession, now: number): number {
  const delta = session.status === 'running' ? Math.max(0, now - session.checkpointUtcMs) : 0;
  return Math.min(session.plannedSeconds * 1000, session.elapsedMs + delta);
}

export function remainingSeconds(session: ActiveSession, now: number): number {
  return Math.ceil((session.plannedSeconds * 1000 - elapsedMs(session, now)) / 1000);
}

function archive(
  data: FocusData,
  session: ActiveSession,
  status: FinishedSession['status'],
  now: number,
): FocusData {
  const duration = elapsedMs(session, now);
  const finished: FinishedSession = {
    id: session.id,
    status,
    startedAtUtc: session.startedAtUtc,
    endedAtUtc: new Date(Math.max(now, Date.parse(session.startedAtUtc))).toISOString(),
    plannedSeconds: session.plannedSeconds,
    elapsedMs: duration,
    creditedSeconds: status === 'completed' ? session.plannedSeconds : 0,
    rewardBonusBasisPoints: session.rewardBonusBasisPoints ?? 0,
  };
  return { ...data, active: null, history: [finished, ...data.history] };
}

/** Reconcile before every action. Finishing twice is a no-op once active is null. */
export function reconcile(data: FocusData, now: number): FocusData {
  const session = data.active;
  if (!session || session.status === 'paused') return data;
  // Clock rollback after a restart: retain earned time, pause and require an explicit resume.
  if (now < session.checkpointUtcMs) {
    return { ...data, active: { ...session, status: 'paused' } };
  }
  const duration = elapsedMs(session, now);
  if (duration >= session.plannedSeconds * 1000) {
    const endedAt = session.checkpointUtcMs + session.plannedSeconds * 1000 - session.elapsedMs;
    return archive(data, session, 'completed', endedAt);
  }
  return { ...data, active: { ...session, elapsedMs: duration, checkpointUtcMs: now } };
}

export function startSession(
  data: FocusData,
  id: string,
  minutes: number,
  now: number,
  rewardBonusBasisPoints = 0,
): FocusData {
  if (data.active) return data;
  if (!id || data.history.some((session) => session.id === id)) return data;
  if (!Number.isInteger(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES) return data;
  if (
    !Number.isInteger(rewardBonusBasisPoints) ||
    rewardBonusBasisPoints < 0 ||
    rewardBonusBasisPoints > 3000
  )
    return data;
  return {
    ...data,
    active: {
      id,
      status: 'running',
      startedAtUtc: new Date(now).toISOString(),
      plannedSeconds: minutes * 60,
      elapsedMs: 0,
      checkpointUtcMs: now,
      rewardBonusBasisPoints,
    },
  };
}

export function pauseSession(data: FocusData, now: number): FocusData {
  const next = reconcile(data, now);
  if (!next.active || next.active.status === 'paused') return next;
  return { ...next, active: { ...next.active, status: 'paused' } };
}

export function resumeSession(data: FocusData, now: number): FocusData {
  if (!data.active || data.active.status !== 'paused') return data;
  return { ...data, active: { ...data.active, status: 'running', checkpointUtcMs: now } };
}

export function cancelSession(data: FocusData, now: number): FocusData {
  const next = reconcile(data, now);
  if (!next.active) return next;
  return archive(next, next.active, 'cancelled', now);
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)
    .toString()
    .padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const utc = (value: unknown): value is string =>
  typeof value === 'string' &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;

function baseSession(value: unknown): value is Record<string, unknown> & {
  id: string;
  startedAtUtc: string;
  plannedSeconds: number;
  elapsedMs: number;
} {
  return (
    record(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    utc(value.startedAtUtc) &&
    integer(value.plannedSeconds) &&
    value.plannedSeconds >= MIN_MINUTES * 60 &&
    value.plannedSeconds <= MAX_MINUTES * 60 &&
    value.plannedSeconds % 60 === 0 &&
    integer(value.elapsedMs) &&
    value.elapsedMs <= value.plannedSeconds * 1000 &&
    (value.rewardBonusBasisPoints === undefined ||
      (integer(value.rewardBonusBasisPoints) && value.rewardBonusBasisPoints <= 3000))
  );
}

function validActive(value: unknown): value is ActiveSession {
  return (
    baseSession(value) &&
    (value.status === 'running' || value.status === 'paused') &&
    integer(value.checkpointUtcMs) &&
    value.checkpointUtcMs <= 8.64e15 &&
    value.elapsedMs < value.plannedSeconds * 1000
  );
}

function validFinished(value: unknown): value is FinishedSession {
  return (
    baseSession(value) &&
    utc(value.endedAtUtc) &&
    Date.parse(value.endedAtUtc) >= Date.parse(value.startedAtUtc) &&
    ((value.status === 'completed' &&
      value.elapsedMs === value.plannedSeconds * 1000 &&
      value.creditedSeconds === value.plannedSeconds) ||
      (value.status === 'cancelled' && value.creditedSeconds === 0))
  );
}

/** Reject unsupported/corrupt saves without replacing the original bytes. */
export function decodeFocusData(raw: string | null): FocusData {
  if (raw === null) return emptyFocusData();
  const value: unknown = JSON.parse(raw);
  if (
    !record(value) ||
    value.version !== 1 ||
    !Array.isArray(value.history) ||
    !value.history.every(validFinished) ||
    !(value.active === null || validActive(value.active))
  ) {
    throw new Error('Invalid or unsupported focus save');
  }
  const ids = value.history.map((session) => session.id);
  if (value.active) ids.push(value.active.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate focus session IDs');
  return { version: 1, active: value.active, history: value.history };
}
