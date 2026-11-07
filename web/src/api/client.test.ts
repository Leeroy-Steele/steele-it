import { afterEach, expect, it, vi } from 'vitest';
import { ApiError, apiFetch } from './client';

afterEach(() => {
  vi.unstubAllGlobals();
});

// Screens map fieldErrors straight onto inputs, so the keys must survive parsing untouched:
// `title` for the title field and `tags[1]` so the editor can highlight exactly that tag chip.
it('turns a 400 problem-details response into an ApiError with field errors', async () => {
  const problem = {
    title: 'One or more validation errors occurred.',
    status: 400,
    errors: {
      title: ['Title is required.'],
      'tags[1]': ['"A" is already a tag on this topic (tags ignore case).'],
    },
    traceId: '00-abc',
  };
  const fetchStub = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(problem), {
      status: 400,
      headers: { 'Content-Type': 'application/problem+json' },
    }),
  );
  vi.stubGlobal('fetch', fetchStub);

  const error = await apiFetch('/topics', { method: 'POST', body: {} }).catch((e: unknown) => e);

  expect(error).toBeInstanceOf(ApiError);
  const apiError = error as ApiError;
  expect(apiError.status).toBe(400);
  expect(apiError.title).toBe('One or more validation errors occurred.');
  expect(apiError.fieldErrors.title).toEqual(['Title is required.']);
  expect(apiError.fieldErrors['tags[1]']).toEqual([
    '"A" is already a tag on this topic (tags ignore case).',
  ]);
  expect(apiError.extensions).toEqual({ traceId: '00-abc' });
});
