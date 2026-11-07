import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch } from './client';
import { queryKeys } from './queryKeys';
import type { Topic, TopicBookReferenceCount, TopicUsage } from './types';

/** The request body for creating or updating a topic. */
export interface TopicInput {
  title: string;
  body: string;
  tags: string[];
}

export function fetchTopics(): Promise<Topic[]> {
  return apiFetch<Topic[]>('/topics');
}

export function createTopic(input: TopicInput): Promise<Topic> {
  return apiFetch<Topic>('/topics', { method: 'POST', body: input });
}

export function fetchTopic(id: number): Promise<Topic> {
  return apiFetch<Topic>(`/topics/${id}`);
}

/** `version` is the one the edit was based on; a stale one gets a 412. */
export function updateTopic(id: number, input: TopicInput, version: number): Promise<Topic> {
  return apiFetch<Topic>(`/topics/${id}`, { method: 'PUT', body: input, ifMatch: `"${version}"` });
}

/** Succeeds only for a topic no book uses; otherwise 404 or a 409 listing the books. */
export function deleteTopic(id: number): Promise<void> {
  return apiFetch<void>(`/topics/${id}`, { method: 'DELETE' });
}

/**
 * The books a 409 from DELETE says still use the topic, exactly as the server listed them.
 * Null when the error is not that 409, or the list is missing or empty.
 */
export function booksFromConflict(error: unknown): TopicBookReferenceCount[] | null {
  if (!(error instanceof ApiError) || error.status !== 409) {
    return null;
  }
  const listed = error.extensions.books;
  if (!Array.isArray(listed) || listed.length === 0) {
    return null;
  }
  return listed as TopicBookReferenceCount[];
}

export function useTopics() {
  return useQuery({ queryKey: queryKeys.topics.all, queryFn: fetchTopics });
}

/** Ids that cannot exist (not a positive integer) are never fetched. */
export function useTopic(id: number) {
  return useQuery({
    queryKey: queryKeys.topics.detail(id),
    queryFn: () => fetchTopic(id),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function fetchTopicUsage(id: number): Promise<TopicUsage> {
  return apiFetch<TopicUsage>(`/topics/${id}/usage`);
}

export function useTopicUsage(id: number) {
  return useQuery({
    queryKey: queryKeys.topics.usage(id),
    queryFn: () => fetchTopicUsage(id),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export interface UpdateTopicVariables {
  input: TopicInput;
  version: number;
}

export function useUpdateTopic(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, version }: UpdateTopicVariables) => updateTopic(id, input, version),
    onSuccess: (topic) => {
      queryClient.setQueryData(queryKeys.topics.detail(id), topic);
      // Not awaited: the save is done, so the editor should not sit on "Saving…" while other
      // screens refetch. Prefix match on books: every outline refetches and shows the new title.
      void queryClient.invalidateQueries({ queryKey: queryKeys.topics.all, exact: true });
      void queryClient.invalidateQueries({ queryKey: queryKeys.topics.usage(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.books.all });
    },
  });
}

export function useDeleteTopic(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteTopic(id),
    onSuccess: () => {
      // The topic is gone: drop its cache entries rather than refetching them into a 404.
      queryClient.removeQueries({ queryKey: queryKeys.topics.detail(id) });
      queryClient.removeQueries({ queryKey: queryKeys.topics.usage(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.topics.all, exact: true });
    },
    // A 409 means the usage report was out of date, so fetch the server's current one.
    onError: (error) => {
      if (booksFromConflict(error) !== null) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.topics.usage(id) });
      }
    },
  });
}

export function useCreateTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTopic,
    onSuccess: async (topic) => {
      queryClient.setQueryData(queryKeys.topics.detail(topic.id), topic);
      await queryClient.invalidateQueries({ queryKey: queryKeys.topics.all, exact: true });
    },
  });
}
