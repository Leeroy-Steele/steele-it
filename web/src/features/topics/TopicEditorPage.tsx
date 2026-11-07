import { Link, useParams } from 'react-router';
import { ApiError } from '../../api/client';
import { useTopic } from '../../api/topics';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { TopicEditor } from './TopicEditor';

export function TopicEditorPage() {
  const params = useParams();
  const id = Number(params.id);
  const topic = useTopic(id);

  const isValidId = Number.isInteger(id) && id > 0;
  const isNotFound = topic.error instanceof ApiError && topic.error.status === 404;
  if (!isValidId || isNotFound) {
    return (
      <EmptyState message="Topic not found">
        <Link to="/topics" className="text-sm text-indigo-700 hover:underline">
          Back to topics
        </Link>
      </EmptyState>
    );
  }
  if (topic.isPending) {
    return <LoadingState label="Loading topic…" />;
  }
  if (topic.isError) {
    return <ErrorState message={topic.error.message} onRetry={() => void topic.refetch()} />;
  }
  // The editor reads `initial` once; later refetches update the cache, never the form.
  return <TopicEditor key={topic.data.id} initial={topic.data} />;
}
