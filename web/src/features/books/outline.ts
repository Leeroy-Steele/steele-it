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

/** The levels a new entry may take, inclusive. */
export interface LevelRange {
  min: number;
  max: number;
}

/**
 * The levels the outline rules allow for a new entry that will sit at `position` (1-based).
 * At most one deeper than the entry before it (rule 2), and deep enough that the entry after
 * it is still at most one deeper than the new one. Level 1 only at the start (rule 1).
 */
export function allowedLevelsAt(levels: number[], position: number): LevelRange {
  const previous = levels[position - 2];
  const next = levels[position - 1];
  return {
    min: next === undefined ? 1 : Math.max(1, next - 1),
    max: previous === undefined ? 1 : previous + 1,
  };
}
