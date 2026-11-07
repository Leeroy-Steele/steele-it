import { createBrowserRouter, redirect } from 'react-router';
import { BookListPage } from '../features/books/BookListPage';
import { BookOutlinePage } from '../features/books/BookOutlinePage';
import { TopicEditorPage } from '../features/topics/TopicEditorPage';
import { TopicLibraryPage } from '../features/topics/TopicLibraryPage';
import { Layout } from './Layout';
import { NotFoundPage } from './NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, loader: () => redirect('/topics') },
      { path: 'topics', element: <TopicLibraryPage /> },
      { path: 'topics/:id', element: <TopicEditorPage /> },
      { path: 'books', element: <BookListPage /> },
      { path: 'books/:id', element: <BookOutlinePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
