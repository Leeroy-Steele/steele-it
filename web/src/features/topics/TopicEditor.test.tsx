import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { queryKeys } from '../../api/queryKeys';
import type { Topic, TopicUsage } from '../../api/types';
import { TagInput } from '../../components/TagInput';
import { TopicEditor } from './TopicEditor';
import { useTopicForm } from './useTopicForm';

// jsdom has no modal dialogs: open and close the <dialog> without the modal behaviour.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  this.open = false;
};

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

const unused: TopicUsage = {
  id: 7,
  title: topic.title,
  totalReferences: 0,
  bookCount: 0,
  books: [],
};

/** The brief's example: 3 references across 2 books, twice in the Administrator Guide. */
const usedTwice: TopicUsage = {
  id: 7,
  title: topic.title,
  totalReferences: 3,
  bookCount: 2,
  books: [
    {
      bookId: 1,
      bookTitle: 'Getting Started Guide',
      references: [{ referenceId: 3, level: 2, position: 3, parentTopicTitle: 'Install' }],
    },
    {
      bookId: 3,
      bookTitle: 'Administrator Guide',
      references: [
        { referenceId: 9, level: 2, position: 2, parentTopicTitle: 'Install' },
        { referenceId: 11, level: 2, position: 4, parentTopicTitle: 'Publishing to PDF' },
      ],
    },
  ],
};

type Reply = [status: number, body: unknown];

/** What the fake server answers. Mutable, so a test can "save in another tab" mid-test. */
interface FakeServer {
  topic: Topic;
  usage: Reply;
  put: Reply;
}

function stubApi(overrides: Partial<FakeServer> = {}) {
  const server: FakeServer = { topic, usage: [200, unused], put: [200, topic], ...overrides };
  const fetchStub = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    let reply: Reply = [200, server.topic];
    if (init?.method === 'PUT') {
      reply = server.put;
    } else if (url.endsWith('/usage')) {
      reply = server.usage;
    }
    return Promise.resolve(
      new Response(JSON.stringify(reply[1]), {
        status: reply[0],
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
  vi.stubGlobal('fetch', fetchStub);
  return { fetchStub, server };
}

function putCall(fetchStub: ReturnType<typeof vi.fn>): [string, RequestInit] {
  const call = fetchStub.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PUT');
  return call as [string, RequestInit];
}

function newQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

// useBlocker needs a data router, so the editor always renders inside one.
function renderEditor(queryClient = newQueryClient()) {
  const router = createMemoryRouter(
    [
      { path: '/topics/7', element: <TopicEditor initial={topic} /> },
      { path: '/topics', element: <p>Topic library</p> },
    ],
    { initialEntries: ['/topics/7'] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { queryClient, router };
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
  const { fetchStub } = stubApi({ put: [200, saved] });
  const queryClient = newQueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  renderEditor(queryClient);

  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Installing the client' } });
  expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByText('4')).toBeInTheDocument();
  expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  const [url, init] = putCall(fetchStub);
  expect(url).toMatch(/\/topics\/7$/);
  expect(init.headers).toMatchObject({ 'If-Match': '"3"' });
  expect(queryClient.getQueryData(queryKeys.topics.detail(7))).toEqual(saved);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.topics.all, exact: true });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.topics.usage(7) });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.books.all });
});

// A rejected save must never cost the author their work, and each message must sit next to the
// thing it is about so they can fix it.
it('maps a 400 onto the fields and the rejected chip, keeping every edit', async () => {
  stubApi({
    put: [
      400,
      {
        title: 'One or more validation errors occurred.',
        status: 400,
        errors: {
          title: ['Title is required.'],
          body: ['Body is too long.'],
          'tags[1]': ['"Desktop" is already a tag on this topic (tags ignore case).'],
          'If-Match': ['Something else went wrong.'],
        },
      },
    ],
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
  stubApi({ put: [500, { title: 'Server exploded.', status: 500 }] });
  renderEditor();

  fireEvent.change(screen.getByLabelText('Body'), { target: { value: 'New body' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Server exploded.');
  expect(screen.getByLabelText('Body')).toHaveValue('New body');
});

it('discards back to the base', () => {
  stubApi();
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
  const { fetchStub } = stubApi({ put: [200, saved] });
  renderEditor();

  fireEvent.change(screen.getByLabelText('Tags'), { target: { value: ' pdf ' } });
  expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByText('pdf')).toBeInTheDocument();
  const [, init] = putCall(fetchStub);
  expect(JSON.parse(init.body as string)).toMatchObject({ tags: ['setup', 'desktop', 'pdf'] });
  expect(screen.getByLabelText('Tags')).toHaveValue('');
  expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
});

// A conflict must never cost the author their work, and must never let them overwrite the other
// save by trying again: the only way forward is an explicit reload that discards their edits.
it('on 412 keeps the edits, blocks Save, and Reload latest loads the current version', async () => {
  const { server } = stubApi({
    put: [412, { title: 'This topic has changed since you loaded it.', currentVersion: 5 }],
  });
  renderEditor();

  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Mine' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(
    await screen.findByText(
      'Someone else saved this topic (now version 5) after you opened it. Your changes are still here, but they cannot be saved over the newer version.',
    ),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('Title')).toHaveValue('Mine');
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

  server.topic = { ...topic, title: 'Theirs', version: 5 };
  fireEvent.click(screen.getByRole('button', { name: 'Reload latest (discards your changes)' }));

  expect(await screen.findByDisplayValue('Theirs')).toBeInTheDocument();
  expect(screen.getByText('5')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
});

// A missing If-Match is our bug, not the author's situation: no conflict banner, just an error.
it('shows a 428 as a general error, not a conflict', async () => {
  stubApi({ put: [428, { title: 'The If-Match header is required.', status: 428 }] });
  renderEditor();

  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Mine' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('The If-Match header is required.');
  expect(screen.queryByText(/Reload latest/)).not.toBeInTheDocument();
});

// Nothing to lose, so an untouched form simply catches up with a save made elsewhere.
it('quietly loads a newer cached version when the form is not dirty', async () => {
  stubApi({ topic: { ...topic, title: 'Saved elsewhere', version: 4 } });
  renderEditor();

  expect(await screen.findByDisplayValue('Saved elsewhere')).toBeInTheDocument();
  expect(screen.getByText('4')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

// With edits in progress, warn before Save rather than after, but never take the edits away.
it('warns about a newer cached version when the form is dirty, keeping the edits', async () => {
  stubApi({ topic: { ...topic, title: 'Saved elsewhere', version: 4 } });
  renderEditor();
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Mine' } });

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'A newer version was saved elsewhere (now version 4).',
  );
  expect(screen.getByLabelText('Title')).toHaveValue('Mine');
  expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
});

// Reuse is the point of the product: an author must know a save changes several books at once.
it('warns by the Save button when the topic is used in more than one book', async () => {
  stubApi({ usage: [200, usedTwice] });
  renderEditor();

  expect(await screen.findByRole('status')).toHaveTextContent(
    'Saving changes this topic in all 2 books: Getting Started Guide, Administrator Guide.',
  );
  expect(screen.getByText(/appears twice in Administrator Guide \(positions 2, 4\)/)).toBeVisible();
  expect(screen.getByRole('link', { name: 'Administrator Guide' })).toHaveAttribute(
    'href',
    '/books/3',
  );
  expect(screen.getByRole('button', { name: 'Save (updates 2 books)' })).toBeInTheDocument();
});

it('names the one book a topic is used in, and says when it is unused', async () => {
  stubApi({ usage: [200, { ...usedTwice, bookCount: 1, books: [usedTwice.books[0]] }] });
  renderEditor();
  expect(await screen.findByRole('link', { name: 'Getting Started Guide' })).toHaveAttribute(
    'href',
    '/books/1',
  );
  expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  cleanup();

  stubApi();
  renderEditor();
  expect(await screen.findByText('Not used in any book yet.')).toBeInTheDocument();
});

// The usage report is advice; when it fails the author can still edit and save.
it('keeps editing and saving available when usage fails to load', async () => {
  stubApi({ usage: [500, { title: 'Server exploded.', status: 500 }] });
  renderEditor();

  expect(await screen.findByText(/Could not check where this topic is used/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Mine' } });
  expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
});

// Unsaved work is only lost on purpose: in-app navigation asks first.
it('asks before leaving with unsaved changes, and Stay keeps the editor', async () => {
  stubApi();
  const { router } = renderEditor();
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Mine' } });

  await act(() => router.navigate('/topics'));
  expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Title')).toHaveValue('Mine');

  await act(() => router.navigate('/topics'));
  fireEvent.click(screen.getByRole('button', { name: 'Discard and leave' }));
  expect(await screen.findByText('Topic library')).toBeInTheDocument();
});

it('leaves without asking when nothing is unsaved', async () => {
  stubApi();
  const { router } = renderEditor();

  await act(() => router.navigate('/topics'));

  expect(screen.getByText('Topic library')).toBeInTheDocument();
});

// Closing or reloading the tab bypasses the router, so the browser's own prompt covers it.
it('asks the browser to confirm unload only while dirty', () => {
  stubApi();
  renderEditor();
  const clean = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(clean);
  expect(clean.defaultPrevented).toBe(false);

  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Mine' } });
  const dirty = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(dirty);
  expect(dirty.defaultPrevented).toBe(true);
});
