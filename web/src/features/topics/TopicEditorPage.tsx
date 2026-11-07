import { useParams } from 'react-router';

export function TopicEditorPage() {
  const { id } = useParams();
  return <h1>Topic {id}</h1>;
}
