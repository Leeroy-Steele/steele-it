import { expect, it } from 'vitest';
import { removeErrorMessage } from './books';
import { ApiError } from './client';

// A 404 on remove means someone else got there first; the author needs to know the outline
// they are looking at was refreshed, not see a bare "Not Found".
it('explains a 404 as an entry that was already removed', () => {
  const error = new ApiError({ status: 404, title: 'Not Found' });

  expect(removeErrorMessage(error)).toBe(
    'That entry was already removed. The outline now shows the latest version.',
  );
});

it("shows the server's title for any other API error", () => {
  const error = new ApiError({
    status: 500,
    title: 'An error occurred while processing your request.',
  });

  expect(removeErrorMessage(error)).toBe('An error occurred while processing your request.');
});

it('falls back to a generic message for anything else', () => {
  expect(removeErrorMessage(new Error('boom'))).toBe('Something went wrong. Try again.');
});
