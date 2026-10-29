import { add, BALANCE, multiply, natural, TAX_POLICIES, type TaxPolicy } from './balance.ts';

export type OperatingService = {
  id: string;
  cost: number;
  /** Lower numbers receive funding first; ties use the service ID. */
  priority: number;
};

/** Derived infrastructure input; map/energy/service coverage will supply this in later phases. */
export type CityConditions = {
  housingCapacity: number;
  activeCommerceCount: number;
  infrastructureBasisPoints: number;
  parkAccessBonus: number;
  educationAccessBonus: number;
  publicServiceBonus: number;
  infrastructurePenalty: number;
  services: readonly OperatingService[];
};

export const EMPTY_CITY_CONDITIONS: CityConditions = {
  housingCapacity: 0,
  activeCommerceCount: 0,
  infrastructureBasisPoints: 0,
  parkAccessBonus: 0,
  educationAccessBonus: 0,
  publicServiceBonus: 0,
  infrastructurePenalty: 0,
  services: [],
};

export type PeriodReport = {
  period: number;
  taxPolicy: TaxPolicy;
  taxIncome: number;
  requestedExpenses: number;
  operatingExpenses: number;
  unfundedServiceIds: string[];
  happiness: number;
  populationGrowth: number;
};

export type CityState = {
  id: string;
  coins: number;
  researchPoints: number;
  totalCreditedFocusSeconds: number;
  coinRemainderNumerator: number;
  rpMinuteRemainderSeconds: number;
  /** Integer units of 1/6,000,000 RP; not floating-point fractions. */
  rpBonusRemainderUnits: number;
  cityPeriodRemainderSeconds: number;
  unallocatedLaborSeconds: number;
  population: number;
  taxPolicy: TaxPolicy;
  pendingTaxPolicy: TaxPolicy | null;
  lastProcessedCityPeriod: number;
  lastPeriodReport: PeriodReport | null;
};

export const createCity = (): CityState => ({
  id: 'local-city',
  coins: 0,
  researchPoints: 0,
  totalCreditedFocusSeconds: 0,
  coinRemainderNumerator: 0,
  rpMinuteRemainderSeconds: 0,
  rpBonusRemainderUnits: 0,
  cityPeriodRemainderSeconds: 0,
  unallocatedLaborSeconds: 0,
  population: 0,
  taxPolicy: 'balanced',
  pendingTaxPolicy: null,
  lastProcessedCityPeriod: 0,
  lastPeriodReport: null,
});

export function calculateTax(population: number, commerceCount: number, policy: TaxPolicy): number {
  natural(population, 'population');
  natural(commerceCount, 'commerce count');
  const base = add(Math.floor(population / 5), multiply(commerceCount, BALANCE.commerceTax));
  return Math.floor(multiply(base, TAX_POLICIES[policy].incomeBasisPoints) / BALANCE.basisPoints);
}

export function fundOperatingServices(budget: number, services: readonly OperatingService[]) {
  natural(budget, 'budget');
  const ids = new Set<string>();
  let requestedExpenses = 0;
  for (const service of services) {
    if (!service.id || ids.has(service.id)) throw new Error('Duplicate or empty service ID');
    ids.add(service.id);
    natural(service.cost, 'service cost');
    natural(service.priority, 'service priority');
    requestedExpenses = add(requestedExpenses, service.cost);
  }
  const ordered = [...services].sort(
    (a, b) => a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  let operatingExpenses = 0;
  const unfundedServiceIds: string[] = [];
  for (const service of ordered) {
    if (service.cost <= budget - operatingExpenses)
      operatingExpenses = add(operatingExpenses, service.cost);
    else unfundedServiceIds.push(service.id);
  }
  return { requestedExpenses, operatingExpenses, unfundedServiceIds };
}

function validateConditions(conditions: CityConditions) {
  for (const [key, value] of Object.entries(conditions))
    if (key !== 'services') natural(value as number, key);
  if (conditions.infrastructureBasisPoints > BALANCE.basisPoints)
    throw new Error('Invalid infrastructure factor');
}

export function calculateHappiness(
  conditions: CityConditions,
  policy: TaxPolicy,
  fundingBasisPoints: number = BALANCE.basisPoints,
): number {
  validateConditions(conditions);
  natural(fundingBasisPoints, 'funding factor');
  if (fundingBasisPoints > BALANCE.basisPoints) throw new Error('Invalid funding factor');
  const serviceBonus = add(
    add(conditions.parkAccessBonus, conditions.educationAccessBonus),
    conditions.publicServiceBonus,
  );
  const fundedBonus = Math.floor(multiply(serviceBonus, fundingBasisPoints) / BALANCE.basisPoints);
  return Math.max(
    0,
    Math.min(
      100,
      BALANCE.baseHappiness +
        fundedBonus +
        TAX_POLICIES[policy].happiness -
        conditions.infrastructurePenalty,
    ),
  );
}

export function calculatePopulationGrowth(
  population: number,
  capacity: number,
  happiness: number,
  infrastructureBasisPoints: number,
  policy: TaxPolicy,
): number {
  [population, capacity, happiness, infrastructureBasisPoints].forEach((value) =>
    natural(value, 'population input'),
  );
  if (happiness > 100 || infrastructureBasisPoints > BALANCE.basisPoints)
    throw new Error('Invalid population factor');
  const numerator = multiply(
    multiply(multiply(BALANCE.baseMigration, happiness), infrastructureBasisPoints),
    TAX_POLICIES[policy].migrationBasisPoints,
  );
  const growth = Math.floor(numerator / (100 * BALANCE.basisPoints * BALANCE.basisPoints));
  return Math.min(Math.max(0, capacity - population), growth);
}

/** No wall clock input: only an earned, sequential focus-time period may run. */
export function processPeriod(
  city: CityState,
  period: number,
  conditions = EMPTY_CITY_CONDITIONS,
): CityState {
  natural(period, 'period');
  natural(city.coins, 'city balance');
  if (period <= city.lastProcessedCityPeriod) return city;
  if (
    period !== city.lastProcessedCityPeriod + 1 ||
    period > Math.floor(city.totalCreditedFocusSeconds / BALANCE.secondsPerCityPeriod)
  ) {
    throw new Error('Unearned or out-of-order city period');
  }
  validateConditions(conditions);
  const taxPolicy = city.pendingTaxPolicy ?? city.taxPolicy;
  const activePopulation = Math.min(city.population, conditions.housingCapacity);
  const taxIncome = calculateTax(activePopulation, conditions.activeCommerceCount, taxPolicy);
  const budget = add(city.coins, taxIncome);
  const funding = fundOperatingServices(budget, conditions.services);
  const fundedFactor =
    funding.requestedExpenses === 0
      ? BALANCE.basisPoints
      : Math.floor(
          multiply(funding.operatingExpenses, BALANCE.basisPoints) / funding.requestedExpenses,
        );
  const happiness = calculateHappiness(conditions, taxPolicy, fundedFactor);
  const infrastructureFactor = Math.floor(
    multiply(conditions.infrastructureBasisPoints, fundedFactor) / BALANCE.basisPoints,
  );
  const populationGrowth = calculatePopulationGrowth(
    city.population,
    conditions.housingCapacity,
    happiness,
    infrastructureFactor,
    taxPolicy,
  );
  return {
    ...city,
    coins: budget - funding.operatingExpenses,
    population: add(city.population, populationGrowth),
    taxPolicy,
    pendingTaxPolicy: null,
    lastProcessedCityPeriod: period,
    lastPeriodReport: { period, taxPolicy, taxIncome, ...funding, happiness, populationGrowth },
  };
}
