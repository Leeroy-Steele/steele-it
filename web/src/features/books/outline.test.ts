import { expect, it } from 'vitest';
import { numberOutline } from './outline';

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
