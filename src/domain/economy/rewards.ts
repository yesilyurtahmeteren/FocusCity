import { add, BALANCE, multiply, natural } from './balance.ts';
import {
  createCity,
  EMPTY_CITY_CONDITIONS,
  processPeriod,
  type CityConditions,
  type CityState,
} from './city.ts';

export type RewardInput = {
  sessionId: string;
  status: 'completed' | 'cancelled';
  creditedSeconds: number;
  endedAtUtc: string;
  bonusBasisPoints: number;
};

export type RewardEntry = {
  sessionId: string;
  creditedSeconds: number;
  endedAtUtc: string;
  bonusBasisPoints: number;
  coins: number;
  baseResearchPoints: number;
  bonusResearchPoints: number;
  laborSeconds: number;
  cityPeriods: number;
};

export type EconomyState = { city: CityState; ledger: RewardEntry[] };
export const createEconomy = (): EconomyState => ({ city: createCity(), ledger: [] });

export function calculateResearchBonus(sources: {
  school: boolean;
  library: boolean;
  university: boolean;
  educationPolicy: boolean;
}): number {
  return Math.min(
    BALANCE.maxResearchBonusBasisPoints,
    (sources.school ? 500 : 0) +
      (sources.library ? 1000 : 0) +
      (sources.university ? 1500 : 0) +
      (sources.educationPolicy ? 500 : 0),
  );
}

/** Immutable ledger + wallet transaction. Repeating the same event never pays twice. */
export function creditSession(
  economy: EconomyState,
  input: RewardInput,
  conditions: CityConditions = EMPTY_CITY_CONDITIONS,
): EconomyState {
  natural(input.creditedSeconds, 'credited seconds');
  natural(input.bonusBasisPoints, 'research bonus');
  if (
    !input.sessionId ||
    (input.status !== 'completed' && input.status !== 'cancelled') ||
    input.bonusBasisPoints > BALANCE.maxResearchBonusBasisPoints ||
    input.creditedSeconds > BALANCE.maxSessionSeconds ||
    !Number.isFinite(Date.parse(input.endedAtUtc))
  )
    throw new Error('Invalid reward input');
  if (input.status === 'cancelled') {
    if (input.creditedSeconds !== 0) throw new Error('Cancelled session cannot be credited');
    return economy;
  }
  if (input.creditedSeconds === 0) throw new Error('Completed session needs positive credit');
  const previous = economy.ledger.find((entry) => entry.sessionId === input.sessionId);
  if (previous) {
    if (
      previous.creditedSeconds !== input.creditedSeconds ||
      previous.bonusBasisPoints !== input.bonusBasisPoints ||
      previous.endedAtUtc !== input.endedAtUtc
    ) {
      throw new Error('Conflicting reward event');
    }
    return economy;
  }
  const before = economy.city;
  for (const [key, value] of Object.entries(before))
    if (typeof value === 'number') natural(value, key);
  const coinUnits = add(
    before.coinRemainderNumerator,
    multiply(input.creditedSeconds, BALANCE.coinsPerMinute),
  );
  const coins = Math.floor(coinUnits / BALANCE.secondsPerMinute);
  const rpSeconds = add(before.rpMinuteRemainderSeconds, input.creditedSeconds);
  const baseResearchPoints = Math.floor(rpSeconds / BALANCE.secondsPerResearchPoint);
  const bonusUnits = add(
    before.rpBonusRemainderUnits,
    multiply(input.creditedSeconds, input.bonusBasisPoints),
  );
  const bonusResearchPoints = Math.floor(bonusUnits / BALANCE.researchBonusDenominator);
  const total = add(before.totalCreditedFocusSeconds, input.creditedSeconds);
  let city: CityState = {
    ...before,
    coins: add(before.coins, coins),
    researchPoints: add(add(before.researchPoints, baseResearchPoints), bonusResearchPoints),
    totalCreditedFocusSeconds: total,
    coinRemainderNumerator: coinUnits % BALANCE.secondsPerMinute,
    rpMinuteRemainderSeconds: rpSeconds % BALANCE.secondsPerResearchPoint,
    rpBonusRemainderUnits: bonusUnits % BALANCE.researchBonusDenominator,
    cityPeriodRemainderSeconds: total % BALANCE.secondsPerCityPeriod,
    unallocatedLaborSeconds: add(before.unallocatedLaborSeconds, input.creditedSeconds),
  };
  const earnedPeriods = Math.floor(total / BALANCE.secondsPerCityPeriod);
  while (city.lastProcessedCityPeriod < earnedPeriods)
    city = processPeriod(city, city.lastProcessedCityPeriod + 1, conditions);
  const entry: RewardEntry = {
    sessionId: input.sessionId,
    creditedSeconds: input.creditedSeconds,
    endedAtUtc: input.endedAtUtc,
    bonusBasisPoints: input.bonusBasisPoints,
    coins,
    baseResearchPoints,
    bonusResearchPoints,
    laborSeconds: input.creditedSeconds,
    cityPeriods: city.lastProcessedCityPeriod - before.lastProcessedCityPeriod,
  };
  return { city, ledger: [...economy.ledger, entry] };
}
