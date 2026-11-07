import { useParams } from 'react-router';

export function BookOutlinePage() {
  const { id } = useParams();
  return <h1>Book {id}</h1>;
}
