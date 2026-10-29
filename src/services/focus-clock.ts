/** Wall time across launches; monotonic elapsed time within one foreground segment. */
export function createFocusClock(wall = () => Date.now(), monotonic = () => performance.now()) {
  let wallAnchor = wall();
  let monotonicAnchor = monotonic();
  return {
    now: () => Math.floor(wallAnchor + Math.max(0, monotonic() - monotonicAnchor)),
    rebase: () => {
      wallAnchor = wall();
      monotonicAnchor = monotonic();
    },
  };
}
