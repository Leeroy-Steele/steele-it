# Design specification

The detailed design behind the [README](../README.md): the data model, rules, API contract and front-end behaviour. Read the README first for the overview, how to run the project, and the main decisions and trade-offs.

This file is the source of truth for how the app behaves. When the behaviour changes, this file changes in the same commit.

## Contents

- [Brief and rubric](#brief-and-rubric)
- [Data model](#data-model)
- [Outline rules](#outline-rules)
- [Removing an entry with children](#removing-an-entry-with-children)
- [Moving an entry](#moving-an-entry)
- [API contract](#api-contract)
- [Errors](#errors)
- [Concurrency](#concurrency)
- [Reuse report](#reuse-report)
- [Deleting a topic](#deleting-a-topic)
- [Front-end architecture](#front-end-architecture)
- [Topic library](#topic-library)
- [Editor and cache behaviour](#editor-and-cache-behaviour)
- [Book outline](#book-outline)
- [Testing](#testing)
- [Code style](#code-style)

## Brief and rubric

A summary of the brief, kept here so every requirement can be checked against the code.

**Part A, API (10 endpoints).** Topics (list, get, create, update with conflict detection), Books (list without contents, get with ordered contents, create), references (add at an optional position, remove), and a per-topic reuse report. Seeded with 5 topics and 3 books. Topic 3 appears twice in the Administrator Guide, so its usage report shows 3 references across 2 books.

**Validation.** A title is required, max 200 characters. Each tag is non-empty, max 50 characters, and unique within its topic ignoring case. Errors identify the field at fault.

**Part B, front end (3 screens, real API, desktop only).** A topic library (list, filter by title or tag, create). A topic editor (field errors, unsaved-changes indicator, reuse warning, edit conflicts that keep the author's edits). A book outline (indented outline, add and remove references, open any entry in the editor). After any edit, every screen reflects the server's state.

**Testing.** 3 to 5 focused API tests on the behaviour that matters most.

**Stretch goals.** Warn before leaving unsaved changes · move a reference · delete a topic with a clear rule · front-end tests · single-command start.

**Rubric.** Domain modelling (reuse is first class) · API design (RESTful, correct status codes, one error shape) · front-end architecture (extensible, server state in sync) · code quality (clarity over cleverness) · testing (few, well chosen) · communication (trade-offs noted, README lets another developer pick it up).

**Time box.** 6 hours. Unfinished work is listed with a line on the approach.

## Data model

The class diagram is in the README under [How it is designed](../README.md#how-it-is-designed).

A book **owns** its references and **refers to** topics. Deleting a reference never deletes a topic.

**Stored vs derived**

| Field | Stored or derived | Notes |
| --- | --- | --- |
| `Topic.id`, `Book.id` | Stored | Integers from server-side counters. Seeds are topics 1–5 and books 1–3, so the next topic is 6. |
| `Reference.referenceId` | Stored | One counter across all books, so a reference id is unique everywhere. Seeds are 1–11, next is 12. |
| `Topic.version` | Stored | Starts at 1 and increments on every successful update. Adding or removing a reference does not change it: the topic's content did not change. |
| `created`, `updated` | Stored | `DateTimeOffset` in UTC from an injected `TimeProvider`. The UI shows them in local time (`en-NZ`). |
| `position` | Derived | The reference's index + 1, computed when reading. |
| `topicTitle` | Derived | Looked up from the topic when reading. |
| `parentTopicTitle` (usage report) | Derived | The nearest earlier entry with a lower level. |

**Validation**

| Field | Rule | Error key |
| --- | --- | --- |
| Topic `title` | Trimmed, required, max 200 characters | `title` |
| Topic `body` | Plain text, may be empty | `body` |
| Topic `tags` | Each trimmed, non-empty, max 50 characters, unique ignoring case. A duplicate is rejected, not removed | `tags[i]` |
| Book `title` | Trimmed, required, max 200 characters | `title` |
| Book `description` | Optional, trimmed, max 2,000 characters, blank becomes `null` | `description` |

**Wire names** follow the brief exactly: `id`, `title`, `body`, `tags`, `created`, `updated`, `version`, `referenceId`, `topicId`, `topicTitle`, `level`, `position`, `totalReferences`, `bookCount`. My additions: `contents` (a book's entries), `bookId`, `bookTitle` and `parentTopicTitle` in the usage report, and `errors`, `currentVersion`, `descendants` and `books` in error responses.

**Example: `GET /topics/3`**

```json
{
  "id": 3,
  "title": "Connecting to a Library",
  "body": "Point the desktop client at your library server and sign in.",
  "tags": ["setup", "library", "configuration"],
  "created": "2026-11-06T00:00:00+00:00",
  "updated": "2026-11-06T00:00:00+00:00",
  "version": 1
}
```

**Example: `GET /books/3`**

```json
{
  "id": 3,
  "title": "Administrator Guide",
  "description": null,
  "created": "2026-11-06T00:00:00+00:00",
  "contents": [
    { "referenceId": 8,  "topicId": 2, "topicTitle": "Installing the Desktop Client", "level": 1, "position": 1 },
    { "referenceId": 9,  "topicId": 3, "topicTitle": "Connecting to a Library",       "level": 2, "position": 2 },
    { "referenceId": 10, "topicId": 5, "topicTitle": "Publishing to PDF",             "level": 1, "position": 3 },
    { "referenceId": 11, "topicId": 3, "topicTitle": "Connecting to a Library",       "level": 2, "position": 4 }
  ]
}
```

**Seed data.** Exactly as in the brief: 5 topics, each with a one or two sentence placeholder body, and 3 books with no description.

| Topic | Title | Tags |
| --- | --- | --- |
| 1 | Introduction to Author-it | overview, getting-started |
| 2 | Installing the Desktop Client | installation, windows, desktop |
| 3 | Connecting to a Library | setup, library, configuration |
| 4 | Creating Your First Topic | authoring, topics, beginner |
| 5 | Publishing to PDF | publishing, output, pdf |

| Book | Contents (topic id at level) | Reference ids |
| --- | --- | --- |
| 1 Getting Started Guide | 1 at L1, 2 at L1, 3 at L2, 4 at L1 | 1–4 |
| 2 Publishing Handbook | 1 at L1, 5 at L1, 4 at L2 | 5–7 |
| 3 Administrator Guide | 2 at L1, 3 at L2, 5 at L1, 3 at L2 | 8–11 |

## Outline rules

A book's contents is a flat sequence. Each entry belongs under the nearest earlier entry with a lower level. Two rules keep it valid:

1. The first entry is level 1.
2. Every entry's level is at least 1 and at most one deeper than the entry before it.

**How they are enforced.** Every change to a book (add, remove, move) builds the **whole candidate list** and runs one function on it, `OutlineRules.Validate`. The change is saved only if that passes. Checking the whole list means no special cases: for example, inserting a level-1 entry in front of a level-3 entry is caught because the level-3 entry now breaks rule 2.

**Positions.** These are 1-based. On insert, `position` must be between 1 and count + 1. If it is omitted, the entry is appended. A position out of range is rejected with 400, not clamped, because clamping hides client bugs.

**Outline numbers.** The UI shows "1", "2", "2.1" next to each entry, worked out from the levels by a small pure function.

## Removing an entry with children

**Rule: an entry and the entries indented beneath it are treated as one unit. Removing it removes them too, after the author confirms.** "Beneath it" means the unbroken run of entries straight after it with a deeper level.

- `DELETE /books/{id}/references/{referenceId}` on an entry with descendants returns **409** and lists them. Nothing is removed.
- `DELETE /books/{id}/references/{referenceId}?cascade=true` removes the entry and its descendants and returns **204**.
- An entry with no descendants is removed with 204 either way.
- The UI first calls DELETE without the flag. On 409 it shows a confirmation built from the server's list ("Removing *Installing the Desktop Client* also removes the 1 entry indented beneath it: *Connecting to a Library*"). On confirm it calls again with `cascade=true`. The browser has no copy of the descendant logic, and a stale outline cannot cause a surprise.
- Removing a whole subtree always leaves rules 1 and 2 valid, so no other entry's level changes. Topics are never deleted.

**Example.** In the Administrator Guide, removing position 1 (reference 8) removes positions 1 and 2. The book becomes *Publishing to PDF* (L1), *Connecting to a Library* (L2).

**Alternatives considered.** *Outdenting the children by one level* is non-destructive, but it quietly restructures the book in a way the author did not ask for. *Always rejecting with 409* forces the author to remove each child first. Confirm-then-cascade matches how outline editors usually behave, and the server guard means no client can delete a subtree by accident.

## Moving an entry

*(Stretch goal.)* `PATCH /books/{id}/references/{referenceId}` with `{ "position"?, "level"? }`. Consistent with removing, **an entry moves together with its descendants**, and a level change shifts the whole block by the same amount. `position` is where the moved entry ends up in the final list. The result goes through `OutlineRules.Validate` like any other change.

## API contract

| Method and path | Success | Errors |
| --- | --- | --- |
| `GET /topics` | 200, all topics | — |
| `GET /topics/{id}` | 200, `ETag: "{version}"` | 404 |
| `POST /topics` | 201, `Location`, `ETag`, same shape as GET | 400 |
| `PUT /topics/{id}` with `If-Match: "{version}"` | 200, new `ETag` | 400, 404, 412 (stale), 428 (no `If-Match`) |
| `DELETE /topics/{id}` *(stretch)* | 204 | 404, 409 (still used by books) |
| `GET /topics/{id}/usage` | 200 | 404 |
| `GET /books` | 200, basic properties only | — |
| `GET /books/{id}` | 200, with `contents` | 404 |
| `POST /books` | 201, `Location` | 400 |
| `POST /books/{id}/references` | 201, `Location: /books/{id}`, updated book | 400 (`topicId`, `level`, `position`), 404 (book) |
| `DELETE /books/{id}/references/{referenceId}[?cascade=true]` | 204 | 404, 409 (has descendants) |
| `PATCH /books/{id}/references/{referenceId}` *(stretch)* | 200, updated book | 400, 404 |

**Request bodies**

| Request | Body |
| --- | --- |
| Create or update a topic | `{ "title": string, "body": string, "tags": string[] }` |
| Create a book | `{ "title": string, "description": string \| null }` |
| Add a reference | `{ "topicId": int, "level": int, "position": int \| null }` |
| Move a reference | `{ "position": int \| null, "level": int \| null }`, at least one |

Route ids use `{id:int}`, so `/topics/abc` returns 404. A `referenceId` that exists but belongs to a different book returns 404.

The status codes chosen where more than one was defensible, and why, are in the README under [Status codes](../README.md#status-codes).

## Errors

Every error uses one shape: **Problem Details** (RFC 9457), content type `application/problem+json`. That includes unmatched routes and unhandled exceptions (`AddProblemDetails`, `UseExceptionHandler`, `UseStatusCodePages`). Validation errors add an `errors` object keyed by field name. Other errors add named extensions.

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "title": ["Title is required."],
    "tags[1]": ["\"A\" is already a tag on this topic (tags ignore case)."]
  },
  "traceId": "00-…"
}
```

```json
{
  "title": "This topic has changed since you loaded it.",
  "status": 412,
  "currentVersion": 4
}
```

**Error keys** are camelCase and match the form fields: `title`, `body`, `tags[i]`, `description`, `topicId`, `level`, `position`. A tag error names the exact tag, so the UI can highlight that chip. A test checks the keys.

> Implementation note: request DTO properties are nullable on purpose. With nullable reference types on, `[ApiController]` treats non-nullable properties as implicitly `[Required]` and reports them with PascalCase keys, which would bypass the domain validators.

## Concurrency

**Topics use optimistic concurrency through HTTP preconditions.**

1. `GET /topics/{id}` returns the topic, its `version` in the body, and `ETag: "{version}"`.
2. `PUT /topics/{id}` must send `If-Match: "{version}"`. The client builds it from the version it loaded.
3. If the version matches, the update is applied, `version` increments and the new `ETag` is returned. If not, the response is **412** with `currentVersion`, and **nothing is changed**. A missing `If-Match` gets **428**.

**Atomicity.** `LibraryService` owns all state and a single lock. Every operation, reads included, runs entirely inside it: validate, check version, write. Two concurrent PUTs on version 3 can never both succeed. One lock for the whole library is plenty for an in-memory demo, and it is the simplest correct option.

**Books have no version (known trade-off).** Each book change is atomic, so changes are never lost or interleaved. The real risk is **stale positions**: an author inserts at position 3 based on an outline someone else has since changed, and the entry lands next to a different neighbour. Fixes for later: insert relative to a `referenceId` ("after reference 9") instead of a position, or give books a contents version with the same `If-Match` mechanism.

## Reuse report

`GET /topics/{id}/usage` shows every place a topic is used. Books are ordered by id and references by position. `parentTopicTitle` gives each reference its context. An unused topic returns 200 with zero counts. A missing topic returns 404.

**Example: `GET /topics/3/usage`** (the brief's expected result is 3 references across 2 books)

```json
{
  "id": 3,
  "title": "Connecting to a Library",
  "totalReferences": 3,
  "bookCount": 2,
  "books": [
    {
      "bookId": 1,
      "bookTitle": "Getting Started Guide",
      "references": [
        { "referenceId": 3, "level": 2, "position": 3, "parentTopicTitle": "Installing the Desktop Client" }
      ]
    },
    {
      "bookId": 3,
      "bookTitle": "Administrator Guide",
      "references": [
        { "referenceId": 9,  "level": 2, "position": 2, "parentTopicTitle": "Installing the Desktop Client" },
        { "referenceId": 11, "level": 2, "position": 4, "parentTopicTitle": "Publishing to PDF" }
      ]
    }
  ]
}
```

## Deleting a topic

**Rule: a topic that any book still references cannot be deleted.** `DELETE /topics/{id}` returns **409**, listing the books that use it (`books: [{ bookId, bookTitle, referenceCount }]`). An unused topic is deleted with 204. *(Stretch goal. Whether it was built is in the README's [Status](../README.md#status).)*

**Why.** In a reuse model, deleting shared content is the most damaging mistake an author can make. It should be a deliberate two-step action: remove the references, then delete the topic. The editor explains this and links to each book.

**Alternatives.** *Cascade* (delete the topic and every reference to it) silently changes books the author may not own. *Soft delete* (mark it deleted, keep the references, show "deleted topic" in outlines) is what I'd do in production for undo and audit, but it adds state to every read for little gain here.

## Front-end architecture

```
web/src
  app/          router (createBrowserRouter), queryClient, Layout
  api/          client.ts (fetch + ApiError), types.ts, queryKeys.ts, topics.ts, books.ts
  components/   Button, Field, TagChip, TagInput, ConfirmDialog, LoadingState, ErrorState, EmptyState
  features/
    topics/     TopicLibraryPage, NewTopicDialog, TopicEditorPage, useTopicForm, ReuseWarning, ConflictBanner
    books/      BookListPage, BookOutlinePage, AddReferenceForm, outline.ts
  lib/          format.ts (dates in en-NZ)
```

- **Server state lives only in TanStack Query.** Local state is limited to the editor form and UI state (filters, open dialogs).
- **`apiFetch`** sends JSON and sets `If-Match` when asked. Any non-2xx response becomes a typed `ApiError { status, title, detail, fieldErrors, extensions }`, so screens never parse responses themselves.
- **Retries.** Queries are not retried on 4xx responses (TanStack Query retries by default). 5xx and network errors are retried twice.
- **Routes:** `/topics`, `/topics/:id`, `/books`, `/books/:id`. Every screen has a URL, so any entry can be opened in a new tab.

**Query keys**

| Key | Data |
| --- | --- |
| `['topics']` | Topic list |
| `['topics', id]` | One topic |
| `['topics', id, 'usage']` | A topic's usage report |
| `['books']` | Book list |
| `['books', id]` | One book with contents |

**Keeping screens in sync after edits**

| After | Write to cache | Invalidate |
| --- | --- | --- |
| Create topic | `['topics', id]` from the response | `['topics']` (exact) |
| Save topic | `['topics', id]` from the response | `['topics']` (exact), `['topics', id, 'usage']`, `['books']` (prefix: every book, so outlines show the new title) |
| Add or move a reference | `['books', id]` from the response | That topic's usage |
| Remove a reference | — | `['books', id]`, every usage query (a cascade can affect several topics) |
| Delete topic | Remove `['topics', id]` and its usage | `['topics']` (exact) |

## Topic library

`/topics` lists every topic with its title, tags and last-updated time (newest first). One filter box matches the title or any tag, ignoring case. Clicking a tag chip filters by that tag. The screen has distinct loading, error (with Retry), empty-library and no-matches states. **New topic** asks for a title, creates the topic, and opens it in the editor. API errors show under the field.

## Editor and cache behaviour

The editor at `/topics/:id` is the heart of the front end. Its key rule: **the form is not the cache.**

- **Load once.** The page loads the topic, then renders `<TopicEditor key={topic.id} initial={topic} />`. `useTopicForm` copies it into form state and keeps a **base snapshot**, whose `version` is what Save sends. Refetches update the cache but never touch the form or the base. Only an explicit reset does.
- **Dirty state.** The form is dirty when its title, body or tags differ from the base. An "Unsaved changes" badge shows, Save is enabled, and "Discard changes" resets to the base. Ctrl/Cmd+S saves.
- **Field errors.** A 400 response maps each key to its field. `tags[i]` highlights that chip. Edits are always kept.
- **Conflict on save (412).** The author's edits stay in the form. A banner explains that someone else saved version N, and offers **Reload latest** (discards the edits and loads the current version). No merge or diff view, as the brief allows.
- **Early warning.** Refetch on window focus stays on. When the cached version moves past the base version: if the form is not dirty, it quietly loads the new version; if it is dirty, it shows "A newer version was saved elsewhere" before the author presses Save. In the two-tab demo, switching tabs is enough to see it.
- **Reuse warning.** From the usage report: "Not used in any book yet", "Used in Getting Started Guide", or, for more than one book, a prominent warning by the Save button ("Saving changes this topic in all 2 books: …") with the button reading **Save (updates 2 books)**. Repeats within a book are called out ("appears twice in Administrator Guide").
- **Leaving with unsaved changes.** React Router's `useBlocker` asks before in-app navigation, and `beforeunload` covers closing or reloading the tab.

## Book outline

`/books` lists the books. `/books/:id` shows the contents as a numbered, indented outline. Each entry links to the topic editor.

- **Add a reference:** pick a topic, an "Insert at" point ("At the start", "After 2 Installing the Desktop Client", …, "At the end"), and a level. The level list only offers values the rules allow at that point. The server still validates, and its field errors show next to the inputs.
- **Remove a reference:** see [Removing an entry with children](#removing-an-entry-with-children).
- **Move** *(stretch)*: Indent and Outdent buttons, plus "Move…" with the same Insert-at and Level inputs.

## Testing

**API integration tests (5)** run the real HTTP pipeline with `WebApplicationFactory`. Each test gets its own factory, so in-memory state never leaks between tests.

1. An update based on a stale version is rejected with 412 and changes nothing.
2. Validation errors are keyed by camelCase field name, including `tags[i]`.
3. Adding a reference to a topic that does not exist is rejected, and the book is unchanged.
4. Removing an entry with children returns 409 until `cascade=true`, then removes the subtree and closes the gap.
5. The usage report counts repeats within one book (topic 3: 3 references, 2 books).

**Domain unit tests** cover `OutlineRules`, `TopicRules` and `BookRules` with `[Theory]` cases, because that is where the logic lives. They are fast, have no HTTP, and are where a new rule gets its test.

**Front-end tests** (Vitest + Testing Library): the API client's error parsing, outline numbering, and *(stretch)* the editor's conflict flow, field errors and reuse warning. The app always calls the real API; only these tests stub `fetch`.

## Code style

Style is enforced by tooling, so human- and AI-written code look the same.

- **C#:** the root `.editorconfig` defines the style: file-scoped namespaces, braces always, `var` when the type is obvious, `_camelCase` private fields, `I`-prefixed interfaces, PascalCase constants, no unused usings. Underscores are allowed in test method names. `api/Directory.Build.props` turns on nullable reference types, warnings as errors, `AnalysisLevel latest-recommended` and `EnforceCodeStyleInBuild`, so a style break fails `dotnet build`.
- **TypeScript:** `strict`. ESLint runs with `--max-warnings 0`; `no-explicit-any` and `react-hooks/exhaustive-deps` are errors. Prettier formats everything, with `eslint-config-prettier` so the two never conflict and `prettier-plugin-tailwindcss` to sort class names.
- **Commands (repo root):** `npm run format` fixes formatting. `npm run lint` checks everything (`dotnet format --verify-no-changes`, ESLint, Prettier, `tsc`).
- **Switching a rule off** happens in `.editorconfig` or `eslint.config.js` with a comment saying why. Never inline (`#pragma`, `eslint-disable`).
- **Naming:** explicit mapping methods between domain records and DTOs; no AutoMapper, no reflection, no generic repositories.
- **Commits:** Conventional Commits (`feat(api): …`, `test(api): …`, `docs: …`), one per component, linear history on `main`.
