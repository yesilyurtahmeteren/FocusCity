import type { BuildingType } from '@/domain/map/catalog';

/** Original programmatic placeholders; replace this registry when licensed assets arrive. */
export const SpriteRegistry: Record<
  BuildingType,
  { roof: string; wall: string; glyph: string; heights: readonly [number, number, number] }
> = {
  city_hall: { roof: '#477DAB', wall: '#D5DFE4', glyph: 'B', heights: [30, 40, 50] },
  house: { roof: '#B96047', wall: '#F1D4A4', glyph: 'K', heights: [22, 32, 44] },
  park: { roof: '#3C8657', wall: '#A6C982', glyph: '♣', heights: [12, 17, 22] },
  power_plant: { roof: '#A17C35', wall: '#ACB7BF', glyph: 'E', heights: [36, 44, 54] },
};
