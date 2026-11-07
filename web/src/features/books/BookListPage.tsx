import { Link } from 'react-router';
import { useBooks } from '../../api/books';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { formatDateTime } from '../../lib/format';

export function BookListPage() {
  const books = useBooks();

  function renderContent() {
    if (books.isPending) {
      return <LoadingState label="Loading books…" />;
    }
    if (books.isError) {
      return <ErrorState message={books.error.message} onRetry={() => void books.refetch()} />;
    }
    if (books.data.length === 0) {
      return <EmptyState message="No books yet" />;
    }

    return (
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-600">
          <tr>
            <th className="py-2 pr-4 font-medium">Title</th>
            <th className="py-2 pr-4 font-medium">Description</th>
            <th className="py-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {books.data.map((book) => (
            <tr key={book.id} className="border-b border-slate-100">
              <td className="py-2 pr-4">
                <Link to={`/books/${book.id}`} className="text-indigo-700 hover:underline">
                  {book.title}
                </Link>
              </td>
              <td className="py-2 pr-4 text-slate-600">{book.description ?? '—'}</td>
              <td className="py-2 whitespace-nowrap text-slate-600">
                {formatDateTime(book.created)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Books</h1>
      {renderContent()}
    </div>
  );
}
