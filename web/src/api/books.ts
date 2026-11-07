import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch } from './client';
import { queryKeys } from './queryKeys';
import type { Book, BookSummary, Entry } from './types';

/** The request body for adding a reference. A null `position` appends; a null `topicId` is the server's to reject. */
export interface AddReferenceInput {
  topicId: number | null;
  level: number;
  position: number | null;
}

export function fetchBooks(): Promise<BookSummary[]> {
  return apiFetch<BookSummary[]>('/books');
}

export function fetchBook(id: number): Promise<Book> {
  return apiFetch<Book>(`/books/${id}`);
}

export function addReference(bookId: number, input: AddReferenceInput): Promise<Book> {
  return apiFetch<Book>(`/books/${bookId}/references`, { method: 'POST', body: input });
}

/** Without `cascade`, an entry with entries beneath it gets a 409 and nothing is removed. */
export function removeReference(
  bookId: number,
  referenceId: number,
  cascade: boolean,
): Promise<void> {
  const query = cascade ? '?cascade=true' : '';
  return apiFetch<void>(`/books/${bookId}/references/${referenceId}${query}`, {
    method: 'DELETE',
  });
}

/**
 * The entries a 409 from DELETE says would be removed too, exactly as the server listed them.
 * Null when the error is not that 409, or the list is missing or empty.
 */
export function descendantsFromConflict(error: unknown): Entry[] | null {
  if (!(error instanceof ApiError) || error.status !== 409) {
    return null;
  }
  const listed = error.extensions.descendants;
  if (!Array.isArray(listed) || listed.length === 0) {
    return null;
  }
  return listed as Entry[];
}

/** What to tell the author when removing an entry fails for any reason other than the 409. */
export function removeErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return 'That entry was already removed. The outline now shows the latest version.';
  }
  if (error instanceof ApiError) {
    return error.title;
  }
  return 'Something went wrong. Try again.';
}

export function useBooks() {
  return useQuery({ queryKey: queryKeys.books.all, queryFn: fetchBooks });
}

/** Ids that cannot exist (not a positive integer) are never fetched. */
export function useBook(id: number) {
  return useQuery({
    queryKey: queryKeys.books.detail(id),
    queryFn: () => fetchBook(id),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useAddReference(bookId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddReferenceInput) => addReference(bookId, input),
    onSuccess: (book) => {
      queryClient.setQueryData(queryKeys.books.detail(bookId), book);
      // An insert shifts the positions of every later entry, so every usage report is stale.
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'topics' && query.queryKey[2] === 'usage',
      });
    },
    // The outline may have changed underneath the form (a position that no longer exists, an
    // entry someone else removed), so show the server's current outline next to the error.
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.books.detail(bookId) });
    },
  });
}

export interface RemoveReferenceVariables {
  referenceId: number;
  cascade: boolean;
}

export function useRemoveReference(bookId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ referenceId, cascade }: RemoveReferenceVariables) =>
      removeReference(bookId, referenceId, cascade),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.books.detail(bookId) });
      // A cascade can remove references to several topics, so every usage report is stale.
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'topics' && query.queryKey[2] === 'usage',
      });
    },
    // Any failure except the expected "has entries beneath it" 409 can mean the outline is out
    // of date (for example the entry was already removed), so fetch the server's current one.
    onError: (error) => {
      if (descendantsFromConflict(error) === null) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.books.detail(bookId) });
      }
    },
  });
}
