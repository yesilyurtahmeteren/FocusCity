/** Rendering coordinates are transient; never persist camera values in the world save. */
export type Point = { x: number; y: number };
export type Camera = Point & { zoom: number };
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;
export const project = ({ x, y }: Point): Point => ({
  x: ((x - y) * TILE_WIDTH) / 2,
  y: ((x + y) * TILE_HEIGHT) / 2,
});
export const unproject = ({ x, y }: Point): Point => ({
  x: x / TILE_WIDTH + y / TILE_HEIGHT,
  y: y / TILE_HEIGHT - x / TILE_WIDTH,
});
export const toScreen = (point: Point, camera: Camera): Point => ({
  x: point.x * camera.zoom + camera.x,
  y: point.y * camera.zoom + camera.y,
});
export const fromScreen = (point: Point, camera: Camera): Point => ({
  x: (point.x - camera.x) / camera.zoom,
  y: (point.y - camera.y) / camera.zoom,
});
export function hitTest(point: Point, camera: Camera, size: number): Point | null {
  if (
    ![point.x, point.y, camera.x, camera.y, camera.zoom].every(Number.isFinite) ||
    camera.zoom <= 0
  )
    return null;
  const grid = unproject(fromScreen(point, camera));
  const cell = { x: Math.floor(grid.x), y: Math.floor(grid.y) };
  return cell.x >= 0 && cell.y >= 0 && cell.x < size && cell.y < size ? cell : null;
}
export function zoomAt(camera: Camera, zoom: number, anchor: Point): Camera {
  if (!Number.isFinite(zoom) || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y))
    return camera;
  const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  const world = fromScreen(anchor, camera);
  return { zoom: next, x: anchor.x - world.x * next, y: anchor.y - world.y * next };
}
export function fitCamera(width: number, height: number, size: number): Camera {
  const zoom = Math.max(MIN_ZOOM, Math.min(1, (width - 24) / (size * TILE_WIDTH)));
  return { x: width / 2, y: (height - size * TILE_HEIGHT * zoom) / 2, zoom };
}
export function panCamera(camera: Camera, delta: Point): Camera {
  // Bounded transient input keeps malformed gesture coordinates out of rendering.
  return {
    ...camera,
    x: Number.isFinite(delta.x) ? Math.max(-2000, Math.min(2000, camera.x + delta.x)) : camera.x,
    y: Number.isFinite(delta.y) ? Math.max(-2000, Math.min(2000, camera.y + delta.y)) : camera.y,
  };
}
export function pinchCamera(
  camera: Camera,
  previous: Point,
  next: Point,
  previousDistance: number,
  distance: number,
): Camera {
  if (
    ![previousDistance, distance, previous.x, previous.y, next.x, next.y].every(Number.isFinite) ||
    previousDistance <= 0 ||
    distance <= 0
  )
    return camera;
  return panCamera(zoomAt(camera, (camera.zoom * distance) / previousDistance, previous), {
    x: next.x - previous.x,
    y: next.y - previous.y,
  });
}
export function isVisible(point: Point, width: number, height: number, margin = 100) {
  return (
    point.x >= -margin &&
    point.x <= width + margin &&
    point.y >= -margin &&
    point.y <= height + margin
  );
}
