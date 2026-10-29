/** Initial balance assumptions, expressed as integer units. */
export const BALANCE = {
  coinsPerMinute: 2,
  secondsPerMinute: 60,
  secondsPerResearchPoint: 600,
  secondsPerCityPeriod: 3600,
  basisPoints: 10_000,
  maxResearchBonusBasisPoints: 3000,
  researchBonusDenominator: 6_000_000,
  maxSessionSeconds: 10_800,
  taxPerFiveResidents: 1,
  commerceTax: 30,
  baseHappiness: 50,
  baseMigration: 5,
} as const;

export const TAX_POLICIES = {
  low: { incomeBasisPoints: 7500, happiness: 6, migrationBasisPoints: 12_000 },
  balanced: { incomeBasisPoints: 10_000, happiness: 0, migrationBasisPoints: 10_000 },
  high: { incomeBasisPoints: 13_500, happiness: -10, migrationBasisPoints: 7500 },
} as const;

export type TaxPolicy = keyof typeof TAX_POLICIES;

export const LEVEL_ONE_OPERATING_COSTS = {
  city_hall: 0,
  house: 0,
  park: 3,
  power_plant: 12,
  school: 8,
  library: 6,
  commerce: 5,
} as const;

export const HOUSE_CAPACITY = { 1: 10, 2: 20, 3: 35 } as const;

export function natural(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid ${name}`);
  return value;
}

export function add(first: number, second: number): number {
  return natural(first + second, 'integer sum');
}

export function multiply(first: number, second: number): number {
  return natural(first * second, 'integer product');
}
