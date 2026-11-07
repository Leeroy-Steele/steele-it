import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { queryKeys } from '../../api/queryKeys';
import type { Topic } from '../../api/types';
import { TagInput } from '../../components/TagInput';
import { TopicEditor } from './TopicEditor';
import { useTopicForm } from './useTopicForm';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const topic: Topic = {
  id: 7,
  title: 'Installing the Desktop Client',
  body: 'Run the installer.',
  tags: ['setup', 'desktop'],
  created: '2026-01-01T09:00:00Z',
  updated: '2026-01-02T09:00:00Z',
  version: 3,
};

function stubFetch(status: number, body: unknown) {
  const fetchStub = vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
  vi.stubGlobal('fetch', fetchStub);
  return fetchStub;
}

function renderEditor(queryClient = new QueryClient()) {
  render(
    <QueryClientProvider client={queryClient}>
      <TopicEditor initial={topic} />
    </QueryClientProvider>,
  );
  return queryClient;
}

// The key rule of the editor: a background refetch (another tab saved) must never overwrite the
// author's edits or move the base version, or Save would silently overwrite the other change.
it('ignores a newer topic passed in after mount; only reset changes the form', () => {
  const { result, rerender } = renderHook(({ initial }) => useTopicForm(initial), {
    initialProps: { initial: topic },
  });
  act(() => result.current.setField('title', 'My edit'));

  rerender({ initial: { ...topic, title: 'Saved elsewhere', version: 4 } });

  expect(result.current.values.title).toBe('My edit');
  expect(result.current.base.version).toBe(3);
  expect(result.current.isDirty).toBe(true);

  act(() => result.current.reset({ ...topic, title: 'Saved elsewhere', version: 4 }));
  expect(result.current.values.title).toBe('Saved elsewhere');
  expect(result.current.base.version).toBe(4);
  expect(result.current.isDirty).toBe(false);
});

// Saving must be based on the version the author loaded (optimistic concurrency), and every
// screen that shows the title must catch up afterwards.
it('saves with If-Match from the base version, then resets to the saved topic', async () => {
  const saved: Topic = { ...topic, title: 'Installing the client', version: 4 };
  const fetchStub = stubFetch(200, saved);
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  renderEditor(queryClient);

  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Installing the client' } });
  expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByText('4')).toBeInTheDocument();
  expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  const [url, init] = fetchStub.mock.calls[0] as [string, RequestInit];
  expect(url).toMatch(/\/topics\/7$/);
  expect(init.method).toBe('PUT');
  expect(init.headers).toMatchObject({ 'If-Match': '"3"' });
  expect(queryClient.getQueryData(queryKeys.topics.detail(7))).toEqual(saved);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.topics.all, exact: true });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.topics.usage(7) });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.books.all });
});

// A rejected save must never cost the author their work, and each message must sit next to the
// thing it is about so they can fix it.
it('maps a 400 onto the fields and the rejected chip, keeping every edit', async () => {
  stubFetch(400, {
    title: 'One or more validation errors occurred.',
    status: 400,
    errors: {
      title: ['Title is required.'],
      body: ['Body is too long.'],
      'tags[1]': ['"Desktop" is already a tag on this topic (tags ignore case).'],
      'If-Match': ['Something else went wrong.'],
    },
  });
  renderEditor();

  fireEvent.change(screen.getByLabelText('Title'), { target: { value: '   ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByText('Title is required.')).toBeInTheDocument();
  expect(screen.getByText('Body is too long.')).toBeInTheDocument();
  expect(
    screen.getByText('"Desktop" is already a tag on this topic (tags ignore case).'),
  ).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Something else went wrong.');
  expect(screen.getByText('desktop')).toHaveClass('border-red-400');
  expect(screen.getByText('setup')).not.toHaveClass('border-red-400');
  expect(screen.getByLabelText('Title')).toHaveValue('   ');
  expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
});

it('shows any other error as a banner and keeps the edits', async () => {
  stubFetch(500, { title: 'Server exploded.', status: 500 });
  renderEditor();

  fireEvent.change(screen.getByLabelText('Body'), { target: { value: 'New body' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Server exploded.');
  expect(screen.getByLabelText('Body')).toHaveValue('New body');
});

it('discards back to the base', () => {
  renderEditor();
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Changed' } });

  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));

  expect(screen.getByLabelText('Title')).toHaveValue(topic.title);
  expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
});

// The server owns tag rules, so the input must pass duplicates through for the server to reject.
it('adds trimmed tags on Enter or comma, without deduping, and Backspace removes the last', () => {
  const onChange = vi.fn();
  const onDraftChange = vi.fn();
  const { rerender } = render(
    <TagInput
      label="Tags"
      tags={['a']}
      onChange={onChange}
      draft="  a "
      onDraftChange={onDraftChange}
    />,
  );
  const input = screen.getByLabelText('Tags');

  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onChange).toHaveBeenLastCalledWith(['a', 'a']);
  expect(onDraftChange).toHaveBeenLastCalledWith('');

  rerender(
    <TagInput
      label="Tags"
      tags={['a']}
      onChange={onChange}
      draft="b"
      onDraftChange={onDraftChange}
    />,
  );
  fireEvent.keyDown(input, { key: ',' });
  expect(onChange).toHaveBeenLastCalledWith(['a', 'b']);

  rerender(
    <TagInput
      label="Tags"
      tags={['a', 'b']}
      onChange={onChange}
      draft=""
      onDraftChange={onDraftChange}
    />,
  );
  fireEvent.keyDown(input, { key: 'Backspace' });
  expect(onChange).toHaveBeenLastCalledWith(['a']);
});

// A tag typed but not added with Enter is still the author's work: it enables Save and is saved.
it('saves a tag that was typed but not yet added', async () => {
  const saved: Topic = { ...topic, tags: ['setup', 'desktop', 'pdf'], version: 4 };
  const fetchStub = stubFetch(200, saved);
  renderEditor();

  fireEvent.change(screen.getByLabelText('Tags'), { target: { value: ' pdf ' } });
  expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByText('pdf')).toBeInTheDocument();
  const [, init] = fetchStub.mock.calls[0] as [string, RequestInit];
  expect(JSON.parse(init.body as string)).toMatchObject({ tags: ['setup', 'desktop', 'pdf'] });
  expect(screen.getByLabelText('Tags')).toHaveValue('');
  expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
});
