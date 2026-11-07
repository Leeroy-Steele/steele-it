import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import { queryKeys } from './queryKeys';
import type { Topic } from './types';

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

export function useTopics() {
  return useQuery({ queryKey: queryKeys.topics.all, queryFn: fetchTopics });
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
