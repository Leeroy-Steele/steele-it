/**
 * Outline numbers for a book's levels: [1, 1, 2, 1] -> ["1", "2", "2.1", "3"].
 * Each entry counts among its siblings, and a shallower entry restarts the counts beneath it.
 */
export function numberOutline(levels: number[]): string[] {
  const counters: number[] = [];
  return levels.map((level) => {
    counters.length = Math.min(counters.length, level);
    while (counters.length < level) {
      counters.push(0);
    }
    counters[level - 1] = (counters[level - 1] ?? 0) + 1;
    return counters.join('.');
  });
}
