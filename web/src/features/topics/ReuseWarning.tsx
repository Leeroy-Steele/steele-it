import { Link } from 'react-router';
import type { TopicUsage, TopicUsageBook } from '../../api/types';

interface ReuseWarningProps {
  /** The usage query's status. Loading or failing only shows a small note: editing never waits. */
  status: 'pending' | 'error' | 'success';
  usage: TopicUsage | undefined;
  onRetry: () => void;
}

function timesWord(count: number): string {
  return count === 2 ? 'twice' : `${count} times`;
}

function BookLink({ book }: { book: TopicUsageBook }) {
  return (
    <Link to={`/books/${book.bookId}`} className="font-medium underline hover:no-underline">
      {book.bookTitle}
    </Link>
  );
}

function Repeats({ books }: { books: TopicUsageBook[] }) {
  const repeated = books.filter((book) => book.references.length > 1);
  return repeated.map((book) => (
    <p key={book.bookId}>
      It appears {timesWord(book.references.length)} in {book.bookTitle} (positions{' '}
      {book.references.map((reference) => reference.position).join(', ')}).
    </p>
  ));
}

export function ReuseWarning({ status, usage, onRetry }: ReuseWarningProps) {
  if (status === 'pending') {
    return <p className="text-sm text-slate-500">Checking where this topic is used...</p>;
  }
  if (status === 'error' || usage === undefined) {
    return (
      <p className="text-sm text-slate-500">
        Could not check where this topic is used.{' '}
        <button type="button" onClick={onRetry} className="text-indigo-700 hover:underline">
          Retry
        </button>
      </p>
    );
  }

  if (usage.books.length === 0) {
    return <p className="text-sm text-slate-500">Not used in any book yet.</p>;
  }

  if (usage.books.length === 1) {
    return (
      <div className="text-sm text-slate-600">
        <p>
          Used in <BookLink book={usage.books[0]} />
        </p>
        <Repeats books={usage.books} />
      </div>
    );
  }

  return (
    <div
      role="status"
      className="rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900"
    >
      <p className="font-medium">
        Saving changes this topic in all {usage.books.length} books:{' '}
        {usage.books.map((book, i) => (
          <span key={book.bookId}>
            {i > 0 && ', '}
            <BookLink book={book} />
          </span>
        ))}
        .
      </p>
      <Repeats books={usage.books} />
    </div>
  );
}
