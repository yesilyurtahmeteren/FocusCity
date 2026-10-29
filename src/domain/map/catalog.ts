/** Version 1 placement catalog. Changing prices/footprints requires a save migration. */
export const BUILDINGS = {
  city_hall: { name: 'Belediye', symbol: 'B', width: 3, height: 3, coins: 0, focusSeconds: 0 },
  house: { name: 'Konut', symbol: 'K', width: 2, height: 2, coins: 100, focusSeconds: 900 },
  park: { name: 'Park', symbol: 'P', width: 2, height: 2, coins: 120, focusSeconds: 900 },
  power_plant: {
    name: 'Enerji santrali',
    symbol: 'E',
    width: 3,
    height: 3,
    coins: 250,
    focusSeconds: 2400,
  },
} as const;

export type BuildingType = keyof typeof BUILDINGS;
export type PurchasableBuilding = Exclude<BuildingType, 'city_hall'>;
export const ROAD_COST = 0;
export const MOVE_COST = 0;
export const MAP_SIZE = 12;
