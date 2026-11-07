import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { useAddReference } from '../../api/books';
import { useTopics } from '../../api/topics';
import type { Book } from '../../api/types';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { numberOutline } from './outline';

const AT_END = 'end';
const UNKNOWN_ERROR = 'Something went wrong. Try again.';
const SELECT_CLASSES = 'rounded-md border border-slate-300 px-2 py-1.5 text-sm';

interface AddReferenceFormProps {
  book: Book;
}

/** The deepest level the rules allow at an insert point: one below the entry before it. */
function maxLevelAt(book: Book, insertAt: string): number {
  const before = insertAt === AT_END ? book.contents.length : Number(insertAt) - 1;
  const previous = book.contents[before - 1];
  return previous ? previous.level + 1 : 1;
}

export function AddReferenceForm({ book }: AddReferenceFormProps) {
  const topics = useTopics();
  const addReference = useAddReference(book.id);
  const [topicId, setTopicId] = useState('');
  const [requestedInsertAt, setRequestedInsertAt] = useState(AT_END);
  const [requestedLevel, setRequestedLevel] = useState(1);

  const numbers = numberOutline(book.contents.map((entry) => entry.level));
  // An insert point that no longer exists (the outline changed underneath the form) means the end.
  const insertPointExists =
    requestedInsertAt === AT_END ||
    (Number(requestedInsertAt) >= 1 && Number(requestedInsertAt) <= book.contents.length + 1);
  const insertAt = insertPointExists ? requestedInsertAt : AT_END;
  const maxLevel = maxLevelAt(book, insertAt);
  const level = Math.min(requestedLevel, maxLevel);

  const sortedTopics = [...(topics.data ?? [])].sort((a, b) => a.title.localeCompare(b.title));

  const error = addReference.error;
  const fieldErrors = error instanceof ApiError && error.status === 400 ? error.fieldErrors : {};
  const generalErrors: string[] = [];
  if (error) {
    if (!(error instanceof ApiError)) {
      generalErrors.push(UNKNOWN_ERROR);
    } else if (error.status !== 400) {
      generalErrors.push(error.title);
    } else {
      for (const [key, messages] of Object.entries(fieldErrors)) {
        if (key !== 'topicId' && key !== 'level' && key !== 'position') {
          generalErrors.push(...messages);
        }
      }
      // A 400 that names no field we show still needs saying.
      if (Object.keys(fieldErrors).length === 0) {
        generalErrors.push(error.title);
      }
    }
  }

  function handlePositionChange(next: string) {
    setRequestedInsertAt(next);
    setRequestedLevel(Math.min(level, maxLevelAt(book, next)));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    addReference.mutate(
      {
        topicId: topicId === '' ? null : Number(topicId),
        level,
        position: insertAt === AT_END ? null : Number(insertAt),
      },
      {
        onSuccess: () => {
          setTopicId('');
          setRequestedInsertAt(AT_END);
          setRequestedLevel(1);
        },
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Add a reference"
      className="flex flex-col gap-4 rounded-lg border border-slate-200 p-4"
    >
      <h2 className="text-lg font-semibold text-slate-900">Add a topic to this book</h2>
      {topics.isError && (
        <p role="alert" className="text-sm text-red-700">
          Could not load topics: {topics.error.message}{' '}
          <button
            type="button"
            onClick={() => void topics.refetch()}
            className="text-indigo-700 underline"
          >
            Retry
          </button>
        </p>
      )}
      <div className="flex flex-wrap items-start gap-4">
        <Field label="Topic" errors={fieldErrors.topicId}>
          {(control) => (
            <select
              {...control}
              value={topicId}
              onChange={(event) => setTopicId(event.target.value)}
              disabled={topics.isPending}
              className={SELECT_CLASSES}
            >
              <option value="">{topics.isPending ? 'Loading topics…' : 'Choose a topic'}</option>
              {sortedTopics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.title}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Insert at" errors={fieldErrors.position}>
          {(control) => (
            <select
              {...control}
              value={insertAt}
              onChange={(event) => handlePositionChange(event.target.value)}
              className={SELECT_CLASSES}
            >
              {book.contents.length > 0 && <option value="1">At the start</option>}
              {book.contents.map((entry, index) => (
                <option key={entry.referenceId} value={entry.position + 1}>
                  After {numbers[index]} {entry.topicTitle}
                </option>
              ))}
              <option value={AT_END}>At the end</option>
            </select>
          )}
        </Field>
        <Field label="Level" errors={fieldErrors.level}>
          {(control) => (
            <select
              {...control}
              value={level}
              onChange={(event) => setRequestedLevel(Number(event.target.value))}
              className={SELECT_CLASSES}
            >
              {Array.from({ length: maxLevel }, (_, index) => index + 1).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      {generalErrors.length > 0 && (
        <div role="alert" className="flex flex-col gap-0.5 text-sm text-red-700">
          {generalErrors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
      <div>
        <Button type="submit" pending={addReference.isPending} pendingLabel="Adding…">
          Add to book
        </Button>
      </div>
    </form>
  );
}
