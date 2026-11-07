// These mirror the API contract in docs/spec.md exactly. Dates are ISO 8601 strings.

export interface Topic {
  id: number;
  title: string;
  body: string;
  tags: string[];
  created: string;
  updated: string;
  version: number;
}

/** One use of a topic. `parentTopicTitle` is null at level 1. */
export interface TopicUsageReference {
  referenceId: number;
  level: number;
  position: number;
  parentTopicTitle: string | null;
}

export interface TopicUsageBook {
  bookId: number;
  bookTitle: string;
  references: TopicUsageReference[];
}

/** `GET /topics/{id}/usage` */
export interface TopicUsage {
  id: number;
  title: string;
  totalReferences: number;
  bookCount: number;
  books: TopicUsageBook[];
}

/** One book in the 409 from `DELETE /topics/{id}`, with how many times it uses the topic. */
export interface TopicBookReferenceCount {
  bookId: number;
  bookTitle: string;
  referenceCount: number;
}

/** A book without its contents, as listed by `GET /books`. */
export interface BookSummary {
  id: number;
  title: string;
  description: string | null;
  created: string;
}

/** One entry in a book's contents. */
export interface Entry {
  referenceId: number;
  topicId: number;
  topicTitle: string;
  level: number;
  position: number;
}

/** A book with its contents, as returned by `GET /books/{id}`. */
export interface Book extends BookSummary {
  contents: Entry[];
}
