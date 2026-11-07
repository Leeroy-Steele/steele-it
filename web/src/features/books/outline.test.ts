import { expect, it } from 'vitest';
import { allowedLevelsAt, numberOutline } from './outline';

// The numbers are what authors read to find an entry and to pick "Insert at", so a wrong
// number sends them to the wrong place. The seed books cover flat and nested shapes.
it.each([
  ['Getting Started Guide', [1, 1, 2, 1], ['1', '2', '2.1', '3']],
  ['Publishing Handbook', [1, 1, 2], ['1', '2', '2.1']],
  ['Administrator Guide', [1, 2, 1, 2], ['1', '1.1', '2', '2.1']],
  ['a deep run that climbs back out', [1, 2, 3, 2, 1], ['1', '1.1', '1.1.1', '1.2', '2']],
])('numbers %s', (_name, levels, expected) => {
  expect(numberOutline(levels)).toEqual(expected);
});

it('numbers an empty book as nothing', () => {
  expect(numberOutline([])).toEqual([]);
});

// The level list in "Add a topic" offers exactly this range, so a wrong range either offers a
// level the server will reject or hides one it would accept.
it.each([
  ['the start of a book', [1, 1, 2, 1], 1, { min: 1, max: 1 }],
  ['an empty book', [], 1, { min: 1, max: 1 }],
  ['the end of the Getting Started Guide', [1, 1, 2, 1], 5, { min: 1, max: 2 }],
  ['between a section and the next chapter', [1, 1, 2, 1], 4, { min: 1, max: 3 }],
  ['just before a level-3 entry', [1, 2, 3], 3, { min: 2, max: 3 }],
])('allows the right levels at %s', (_name, levels, position, expected) => {
  expect(allowedLevelsAt(levels, position)).toEqual(expected);
});
