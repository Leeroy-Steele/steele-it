import { useState } from 'react';
import { Link } from 'react-router';
import { useTopics } from '../../api/topics';
import type { Topic } from '../../api/types';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { TagChip } from '../../components/TagChip';
import { formatDateTime } from '../../lib/format';
import { NewTopicDialog } from './NewTopicDialog';

function matchesFilter(topic: Topic, filter: string): boolean {
  const needle = filter.trim().toLowerCase();
  if (needle === '') {
    return true;
  }
  return (
    topic.title.toLowerCase().includes(needle) ||
    topic.tags.some((tag) => tag.toLowerCase().includes(needle))
  );
}

function newestFirst(a: Topic, b: Topic): number {
  return new Date(b.updated).getTime() - new Date(a.updated).getTime();
}

export function TopicLibraryPage() {
  const topics = useTopics();
  const [filter, setFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  function renderContent() {
    if (topics.isPending) {
      return <LoadingState label="Loading topics…" />;
    }
    if (topics.isError) {
      return <ErrorState message={topics.error.message} onRetry={() => void topics.refetch()} />;
    }
    if (topics.data.length === 0) {
      return (
        <EmptyState message="No topics yet">
          <Button onClick={() => setDialogOpen(true)}>New topic</Button>
        </EmptyState>
      );
    }

    const visible = topics.data.filter((topic) => matchesFilter(topic, filter)).sort(newestFirst);
    if (visible.length === 0) {
      return (
        <EmptyState message="No topics match your filter.">
          <Button variant="secondary" onClick={() => setFilter('')}>
            Clear filter
          </Button>
        </EmptyState>
      );
    }

    return (
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-600">
          <tr>
            <th className="py-2 pr-4 font-medium">Title</th>
            <th className="py-2 pr-4 font-medium">Tags</th>
            <th className="py-2 font-medium">Last updated</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((topic) => (
            <tr key={topic.id} className="border-b border-slate-100">
              <td className="py-2 pr-4">
                <Link to={`/topics/${topic.id}`} className="text-indigo-700 hover:underline">
                  {topic.title}
                </Link>
              </td>
              <td className="py-2 pr-4">
                <div className="flex flex-wrap gap-1">
                  {topic.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setFilter(tag)}
                      aria-label={`Filter by tag ${tag}`}
                      className="rounded-full focus-visible:outline-2"
                    >
                      <TagChip label={tag} />
                    </button>
                  ))}
                </div>
              </td>
              <td className="py-2 whitespace-nowrap text-slate-600">
                {formatDateTime(topic.updated)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Topics</h1>
        <Button onClick={() => setDialogOpen(true)}>New topic</Button>
      </div>
      <input
        type="search"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter by title or tag"
        aria-label="Filter topics"
        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      />
      {renderContent()}
      {dialogOpen && <NewTopicDialog onClose={() => setDialogOpen(false)} />}
    </div>
  );
}
