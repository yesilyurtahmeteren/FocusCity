import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fitCamera,
  fromScreen,
  hitTest,
  isVisible,
  MAX_ZOOM,
  MIN_ZOOM,
  panCamera,
  pinchCamera,
  project,
  toScreen,
  unproject,
  zoomAt,
} from '../src/domain/map/projection.ts';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
test('pinch follows its centroid without moving the anchored world point; rejects zero distance', () => {
  const camera = { x: 120, y: 40, zoom: 0.8 };
  const previous = { x: 150, y: 170 },
    next = { x: 160, y: 185 };
  const result = pinchCamera(camera, previous, next, 100, 160);
  const before = fromScreen(previous, camera),
    after = fromScreen(next, result);
  close(before.x, after.x);
  close(before.y, after.y);
  close(result.zoom, 1.28);
  for (const distance of [0, NaN, Infinity, -1])
    assert.deepEqual(pinchCamera(camera, previous, next, 100, distance), camera);
  assert.deepEqual(pinchCamera(camera, previous, next, 0, 100), camera);
});
test('projection inverse matches fractional and negative coordinates', () => {
  for (const p of [
    { x: 0, y: 0 },
    { x: 11.9, y: 11.9 },
    { x: -3.2, y: 8.7 },
  ]) {
    const result = unproject(project(p));
    close(result.x, p.x);
    close(result.y, p.y);
  }
});
test('all 144 cell interiors select correctly across pan and zoom', () => {
  for (const zoom of [0.5, 0.8, 1, 1.7, 2])
    for (const offset of [-600, 0, 530]) {
      const camera = { x: offset, y: -offset, zoom };
      for (let x = 0; x < 12; x++)
        for (let y = 0; y < 12; y++)
          for (const fraction of [0.01, 0.5, 0.99]) {
            assert.deepEqual(
              hitTest(toScreen(project({ x: x + fraction, y: y + fraction }), camera), camera, 12),
              { x, y },
            );
          }
    }
});
test('outside diamonds and invalid gesture values never produce commands', () => {
  const camera = { x: 100, y: 200, zoom: 1 };
  for (const cell of [
    { x: -0.01, y: 3 },
    { x: 12, y: 3 },
    { x: 3, y: 12 },
    { x: 3, y: -1 },
  ])
    assert.equal(hitTest(toScreen(project(cell), camera), camera, 12), null);
  assert.equal(hitTest({ x: NaN, y: 0 }, camera, 12), null);
  assert.equal(hitTest({ x: 1, y: 1 }, { ...camera, zoom: 0 }, 12), null);
});
test('zoom preserves the world coordinate beneath its anchor and clamps scale', () => {
  const camera = { x: -100, y: 72, zoom: 0.8 };
  const anchor = { x: 192, y: 180 };
  const before = fromScreen(anchor, camera);
  for (const z of [0.1, 1.6, 5]) {
    const next = zoomAt(camera, z, anchor);
    const after = fromScreen(anchor, next);
    close(before.x, after.x);
    close(before.y, after.y);
    assert.ok(next.zoom >= MIN_ZOOM && next.zoom <= MAX_ZOOM);
  }
  assert.deepEqual(zoomAt(camera, NaN, anchor), camera);
});
test('pan and culling are bounded and leave original camera unchanged', () => {
  const camera = { x: 20, y: 30, zoom: 1 };
  assert.deepEqual(panCamera(camera, { x: 40, y: -10 }), { x: 60, y: 20, zoom: 1 });
  assert.equal(camera.x, 20);
  assert.equal(panCamera(camera, { x: Infinity, y: 1 }).x, 20);
  assert.equal(panCamera(camera, { x: 99999, y: 0 }).x, 2000);
  assert.equal(isVisible({ x: -101, y: 10 }, 320, 360), false);
  assert.equal(isVisible({ x: 40, y: 10 }, 320, 360), true);
});
test('fit camera centers the map on narrow and wide layouts', () => {
  for (const width of [280, 400, 760]) {
    const camera = fitCamera(width, 360, 12);
    const center = toScreen(project({ x: 6, y: 6 }), camera);
    close(center.x, width / 2);
    close(center.y, 180);
  }
});
