import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { descendantsFromConflict, useBook, useRemoveReference } from '../../api/books';
import { ApiError } from '../../api/client';
import type { Entry } from '../../api/types';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { AddReferenceForm } from './AddReferenceForm';
import { numberOutline } from './outline';

/** An entry the server said cannot be removed alone, with what would go with it. */
interface PendingCascade {
  entry: Entry;
  descendants: Entry[];
}

export function BookOutlinePage() {
  const params = useParams();
  const id = Number(params.id);
  const book = useBook(id);
  const removeReference = useRemoveReference(id);
  const [pendingCascade, setPendingCascade] = useState<PendingCascade | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const isValidId = Number.isInteger(id) && id > 0;
  const isNotFound = book.error instanceof ApiError && book.error.status === 404;
  if (!isValidId || isNotFound) {
    return (
      <EmptyState message="Book not found">
        <Link to="/books" className="text-sm text-indigo-700 hover:underline">
          Back to books
        </Link>
      </EmptyState>
    );
  }
  if (book.isPending) {
    return <LoadingState label="Loading book…" />;
  }
  if (book.isError) {
    return <ErrorState message={book.error.message} onRetry={() => void book.refetch()} />;
  }

  const { contents } = book.data;
  const numbers = numberOutline(contents.map((entry) => entry.level));

  function handleRemove(entry: Entry) {
    setRemoveError(null);
    removeReference.mutate(
      { referenceId: entry.referenceId, cascade: false },
      {
        onError: (error) => {
          // The server decides what goes with an entry; the browser only shows its list.
          const descendants = descendantsFromConflict(error);
          if (descendants) {
            setPendingCascade({ entry, descendants });
          } else {
            setRemoveError(
              error instanceof ApiError ? error.title : 'Something went wrong. Try again.',
            );
          }
        },
      },
    );
  }

  function handleConfirmCascade(pending: PendingCascade) {
    removeReference.mutate(
      { referenceId: pending.entry.referenceId, cascade: true },
      {
        onSuccess: () => setPendingCascade(null),
        onError: (error) => {
          setPendingCascade(null);
          setRemoveError(
            error instanceof ApiError ? error.title : 'Something went wrong. Try again.',
          );
        },
      },
    );
  }

  function renderCascadeDialog(pending: PendingCascade) {
    const { entry, descendants } = pending;
    const count = descendants.length;
    return (
      <ConfirmDialog
        title="Remove entries?"
        message={
          <>
            Removing <em>{entry.topicTitle}</em> also removes the {count}{' '}
            {count === 1 ? 'entry' : 'entries'} indented beneath it:{' '}
            {descendants.map((descendant, index) => (
              <span key={descendant.referenceId}>
                {index > 0 && ', '}
                <em>{descendant.topicTitle}</em>
              </span>
            ))}
            .
          </>
        }
        confirmLabel={`Remove ${count + 1} entries`}
        onConfirm={() => handleConfirmCascade(pending)}
        onCancel={() => setPendingCascade(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-slate-900">{book.data.title}</h1>
        {book.data.description && <p className="text-sm text-slate-600">{book.data.description}</p>}
      </header>

      {removeError && (
        <p role="alert" className="text-sm text-red-700">
          {removeError}
        </p>
      )}

      {contents.length === 0 ? (
        <EmptyState message="This book has no entries yet." />
      ) : (
        <ol className="flex flex-col">
          {contents.map((entry, index) => (
            <li
              key={entry.referenceId}
              style={{ marginLeft: `${(entry.level - 1) * 1.5}rem` }}
              className="flex items-center gap-3 border-b border-slate-100 py-2 text-sm"
            >
              <span className="w-10 shrink-0 text-slate-500">{numbers[index]}</span>
              <Link to={`/topics/${entry.topicId}`} className="text-indigo-700 hover:underline">
                {entry.topicTitle}
              </Link>
              <Button
                variant="secondary"
                className="ml-auto"
                aria-label={`Remove ${entry.topicTitle}`}
                disabled={removeReference.isPending}
                onClick={() => handleRemove(entry)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ol>
      )}

      <AddReferenceForm book={book.data} />

      {pendingCascade && renderCascadeDialog(pendingCascade)}
    </div>
  );
}
