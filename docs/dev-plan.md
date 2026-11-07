# Steele-IT: Dev Plan

Nov 5, 2026 · @Lee

## How to use this plan

The build is 18 components, C0 to C17; C12 to C14, C16 and C17 are stretch. Each ends in a single commit that builds, runs and passes its tests.

This plan covers delivery only. The design lives in your Test folder and is not repeated here: `README.md` (human overview), `docs/spec.md` (the detailed design every prompt points at), `CLAUDE.md` (agent ground rules) and `.editorconfig` (code style).

**The loop for every component**

1. Paste the starter prompt into Claude Code, using the model named in the component. From C7 on, each prompt names a branch; the agent creates it from main or switches to it.
2. The agent implements, runs the tests, and stages with `git add`. It never commits.
3. You review the staged diff (`git diff --staged`), run the "Done when" check yourself, and ask for fixes if needed.
4. You note the time in your own log, stage, and commit with the message given. If the component changed a decision, update the README too; behaviour changes already land in docs/spec.md. From C7 on you commit on the component's branch; when a branch's last component is committed, merge it with git switch main, then git merge --no-ff \<branch>.

Step 3 is not optional. The follow-up interview is a live walkthrough and a live change, so you need to be able to explain every line.

**The 6-hour rule**

The brief says stop at 6 hours, and agent time counts. Core (C0 to C11 plus C15) is budgeted at about 5 hours. Stretch components (C12 to C14, then C16 and C17) are ordered by value per minute.

- Cut line: at 5h 15m, stop whatever stretch item you are on. Park its uncommitted work (`git stash push --include-untracked -m "unfinished C14"`), then `git switch main` and go to C15. The unfinished branch is never merged, so main only ever holds finished work.
- Unfinished plan items go in the README's "With more time" section with one line each on the approach. The brief scores the notes, not the gap.
- Keep a simple time log (start and end per component) outside the repo. The README's Status section gives the total, and it keeps you honest in the interview.

## Component overview

Core is about 4h 50m. Stretch C12 to C14 adds about 1h 05m, so it only fits if core runs to plan. C16 and C17 add another 1h 30m and are not expected to fit; they are there so the plan is complete. The cut line sits before C12.

| # | Component | Owner | Model | Est. | Commit message |
| --- | --- | --- | --- | --- | --- |
| C0 | README, docs/spec.md, CLAUDE.md, .editorconfig | Person | — | 15m | `docs: add README, design spec and agent rules` |
| C1 | API scaffold: ProblemDetails, CORS, OpenAPI, CSharpier, test project | Agent | Sonnet 5.5 | 10m | `chore(api): scaffold ASP.NET Core API with problem details, CORS, OpenAPI and CSharpier` |
| C2 | Domain: records, OutlineRules, TopicRules, BookRules | Person writes test cases, agent implements | Opus 5.5 | 35m | `feat(domain): add outline, topic and book rules with unit tests` |
| C3 | LibraryService, seed data, Topics endpoints (Stage 1) | Agent | Opus 5.5 | 25m | `feat(api): topics endpoints with If-Match optimistic concurrency` |
| C4 | Books endpoints (Stage 2) | Agent | Sonnet 5.5 | 10m | `feat(api): books endpoints with derived positions and titles` |
| C5 | References: add and remove with cascade guard (Stage 3) | Agent | Sonnet 5.5 | 25m | `feat(api): add and remove book references with cascade confirmation` |
| C6 | Usage report (Stage 4) + API test suite complete | Agent | Sonnet 5.5 | 15m | `feat(api): topic usage report` |
| C7 | Web scaffold: router, query client, API client, UI primitives, `npm run dev` | Agent | Sonnet 5.5 | 15m | `chore(web): scaffold React app with API client, query client and single-command start` |
| C8 | Topic library (Stage 5) | Agent | Sonnet 5.5 | 20m | `feat(web): topic library with filtering and create` |
| C9 | Topic editor: edit, save, field errors, dirty state (Stage 6a) | Agent | Opus 5.5 | 30m | `feat(web): topic editor with field-level validation errors` |
| C10 | Editor: conflicts, reuse warning, leave guard (Stage 6b) | Agent | Opus 5.5 | 30m | `feat(web): edit conflict handling, reuse warning and unsaved-changes guard` |
| C11 | Book outline: list, outline, add, remove (Stage 7) | Agent | Sonnet 5.5 | 35m | `feat(web): book outline with add and remove reference` |
|  | **Cut line: at 5h 15m skip to C15** |  |  |  |  |
| C12 | Delete topic with 409 rule (stretch) | Agent | Sonnet 5.5 | 15m | `feat: delete topic, blocked while books reference it` |
| C13 | Front-end tests (stretch) | Agent | Sonnet 5.5 | 20m | `test(web): editor conflict and outline numbering tests` |
| C14 | Move a reference (stretch) | Agent | Opus 5.5 | 30m | `feat: move a reference and its descendants` |
| C16 | Run with Aspire: AppHost + dashboard (stretch, before C15) | Agent | Sonnet 5.5 | 30m | `feat: run the app under an Aspire AppHost` |
| C17 | Docker Compose via Aspire (stretch, needs C16, before C15) | Agent | Opus 5.5 | 60m | `feat: run the app in Docker Compose from the AppHost` |
| C15 | Finish: README, independent review, demo run-through | Person + review agent | Opus 5.5 (review) | 25m | `docs: complete README status and unfinished work` |

Each component depends on the one before it. The only safe reordering is among the stretch items C12, C13, C14 and C16 (C17 needs C16). C15 always comes last, after whichever stretch items you finish.

**Branches (from C7 on)**

C0 to C6 were committed straight to main. From C7, each feature gets a short-lived branch that you merge into main with `--no-ff`, so the history shows each feature as one merge. Components that make up one feature share a branch. Stretch items each get their own, so an unfinished one is simply never merged.

| Branch | Components | Merge into main after |
| --- | --- | --- |
| `chore/web-scaffold` | C7 | C7 |
| `feat/topic-library` | C8 | C8 |
| `feat/topic-editor` | C9, C10 (one feature: the editor) | C10 |
| `feat/book-outline` | C11 | C11 |
| `feat/delete-topic` | C12 (stretch) | C12 |
| `test/web-components` | C13 (stretch) | C13 |
| `feat/move-reference` | C14 (stretch) | C14 |
| `feat/aspire` | C16, C17 (stretch) | C16, and again after C17 if you get to it |
| `docs/final-readme` | C15 | C15, last |

## Phase 1: API (C0 to C6)

The API is finished, with all 5 integration tests, before any front-end work starts. The front end then builds against a stable contract.

### C0: README, spec, CLAUDE.md and repo skeleton

**Owner:** Person. **Est:** 15m.

- `git init`, then add `.gitignore` (dotnet + node: `bin/`, `obj/`, `node_modules/`, `dist/`, `.vs/`, `*.user`), `.editorconfig`, `README.md`, docs/spec.md and `CLAUDE.md` (all already written).
- Optional: email Osmar to say you have chosen confirm-then-cascade for removed parents, and ask if that matches how Author-it behaves. It costs nothing and shows engagement.

**Done when:** the README renders cleanly on GitHub, including the Mermaid diagram.

### C1: API scaffold

**Owner:** Agent. **Model:** Sonnet 5.5. **Est:** 10m.

**Done when:** `dotnet build` and `dotnet test` succeed, `dotnet run` serves `/scalar` on port 5080, and /swagger loads, an unknown route returns problem details, and dotnet csharpier check . and dotnet format style api/SteeleIT.slnx --verify-no-changes pass with no warnings in the build.

```text
Read CLAUDE.md, README.md section "Running the project", and docs/spec.md sections "Errors" and "Code style".

Task: scaffold the .NET 10 API in /api. No domain code yet.

1. Create /api/SteeleIT.slnx with:
   - src/SteeleIT.Api (ASP.NET Core Web API using controllers, not minimal APIs). Delete the weather sample.
   - tests/SteeleIT.Api.Tests (xUnit) referencing the API project and Microsoft.AspNetCore.Mvc.Testing.
2. Program.cs:
   - AddControllers(); JSON stays camelCase (the default).
   - AddProblemDetails(), UseExceptionHandler(), UseStatusCodePages() so every error, including unmatched routes and 500s, is application/problem+json.
   - CORS named policy "web-dev": origin http://localhost:5173, any method, any header, WithExposedHeaders("ETag").
   - Built-in OpenAPI: AddOpenApi() and MapOpenApi() (document at /openapi/v1.json). Development only: Scalar.AspNetCore at /scalar, and Swashbuckle.AspNetCore.SwaggerUI (the UI package only, not full Swashbuckle) at /swagger via UseSwaggerUI(o => o.SwaggerEndpoint("/openapi/v1.json", "v1")).
   - /// comments flow into the OpenAPI document (GenerateDocumentationFile is set in Directory.Build.props, step 3).
   - Register TimeProvider.System as a singleton.
   - End the file with `public partial class Program;` for WebApplicationFactory.
3. api/Directory.Build.props, which applies to every project: Nullable enable, ImplicitUsings enable, TreatWarningsAsErrors true, AnalysisLevel latest-recommended, EnforceCodeStyleInBuild true, GenerateDocumentationFile true, NoWarn $(NoWarn);CS1591. Remove these properties from the individual .csproj files. CSharpier is already configured as a local tool (.config/dotnet-tools.json, .csharpierrc.json): run dotnet tool restore once, then dotnet csharpier format . before staging. Style rules come from the root .editorconfig (already present; do not loosen it) and now fail the build. If an analyzer rule conflicts with the docs/spec.md conventions, turn it off in .editorconfig with a one-line comment saying why. No #pragma or per-file suppressions.
4. launchSettings.json: one http profile on http://localhost:5080. No https redirect.
5. Create api/requests.http (next to the API it calls) with `@baseUrl = http://localhost:5080` and a placeholder comment for each endpoint group.
6. No tests yet: the test project builds and dotnet test runs with zero tests (the suite is capped at five focused tests, added from C3 on). Check by hand that GET /does-not-exist returns 404 application/problem+json.

Do not add any other packages. Run dotnet build and dotnet test, then stage with git add. Do not commit.
```

### C2: Domain rules

**Owner:** Person writes the test cases, agent implements. **Model:** Opus 5.5. **Est:** 35m.

This is the code they will probe in the interview. Write or edit the test-case list in the prompt yourself before sending it. That list is the spec, and "I wrote the cases, the agent wrote the code" is a strong story to tell.

**Done when:** every case below is a passing test, and you can explain `Validate` and `DescendantsOf` without looking.

```text
Read CLAUDE.md, then docs/spec.md sections "Data model" and "Outline rules".

Task: pure domain code in src/SteeleIT.Api/Domain with unit tests in tests/.../Domain. No HTTP, no state, no I/O.

Types (C# records, immutable):
- Topic(int Id, string Title, string Body, IReadOnlyList<string> Tags, DateTimeOffset Created, DateTimeOffset Updated, int Version)
- Reference(int ReferenceId, int TopicId, int Level)   // position is NOT stored; it is index + 1
- Book(int Id, string Title, string? Description, DateTimeOffset Created, IReadOnlyList<Reference> Contents)

Errors are `Dictionary<string, string[]>` keyed by camelCase field name, so they map straight to ValidationProblem.

OutlineRules (static, pure):
- Validate(IReadOnlyList<Reference>) -> errors. Rule 1: first entry is level 1. Rule 2: each level >= 1 and <= previous level + 1. Key "level". Messages are plain English, e.g. "Level can be at most 3 here: one deeper than the entry before it."
- Insert(contents, Reference newRef, int? position) -> new list or errors. position null = append. Valid range is 1..count+1, else error key "position". Build the candidate list, then run Validate on the WHOLE list (this also catches the entry after the insert point becoming invalid).
- DescendantsOf(contents, referenceId) -> the contiguous run of entries straight after it with a deeper level.
- RemoveWithDescendants(contents, referenceId) -> new list without the entry and its descendants. Run Validate as a safety net.
- ParentOf(contents, index) -> the nearest earlier entry with a lower level, or null.

ValidationLimits (static class of public consts): TitleMaxLength = 200, TagMaxLength = 50, DescriptionMaxLength = 2000. The rules and the tests use these constants and never repeat the numbers.

TopicRules.Validate(title?, body?, tags?) -> (normalised title, body, tags) or errors:
- title trimmed, required, <= TitleMaxLength chars. Key "title".
- body null becomes "".
- tags null becomes []. Each tag trimmed, non-empty, <= TagMaxLength chars, unique ignoring case (OrdinalIgnoreCase). Key "tags[i]" for the offending index. Duplicates are rejected, never silently removed.

BookRules.Validate(title?, description?): title trimmed, required, <= TitleMaxLength chars. Description trimmed, <= DescriptionMaxLength chars, blank becomes null.

Test cases ([Theory] where it reads well). Levels are written as lists:
- Validate: [] valid; [2] invalid; [1,2,3] valid; [1,3] invalid; [1,2,1,2] valid; [1,0] invalid.
- Insert: append with null position; insert at 1 shifts others down; position 0 and count+2 rejected; level 2 at position 1 rejected; [1,2,3] + level 1 at position 3 rejected (the following level-3 entry breaks rule 2); Getting Started [1,1,2,1] + level 1 at position 3 valid.
- DescendantsOf, using the Administrator Guide (topics 2,3,5,3 at levels 1,2,1,2): position 1 has one descendant (position 2); position 2 has none; position 3 has one (position 4).
- RemoveWithDescendants on the Administrator Guide, position 1: result is topics [5,3] at levels [1,2], and it is valid.
- ParentOf: Administrator Guide position 4 has parent topic 5; position 1 has no parent.
- TopicRules: blank title; TitleMaxLength chars ok, TitleMaxLength + 1 rejected (InlineData built from the constants); " pdf " becomes "pdf"; ["PDF","pdf"] gives an error on tags[1]; "" gives an error on tags[0]; a tag of TagMaxLength + 1 chars rejected; null tags becomes [].

Run dotnet test, then stage with git add. Do not commit.
```

### C3: LibraryService, seed and Topics endpoints (Stage 1)

**Owner:** Agent. **Model:** Opus 5.5. **Est:** 25m.

Opus because atomicity and the If-Match handling are easy to get subtly wrong.

**Done when:** integration tests 1 and 2 pass. In `api/requests.http`, a PUT with a stale If-Match returns 412 and a PUT without one returns 428.

```text
Read CLAUDE.md, then docs/spec.md sections "Data model", "API contract", "Concurrency" and "Errors".

Task A: src/.../Library
- LibraryService, registered as a singleton. It owns all state. For now that is Dictionary<int, Topic> and nextTopicId; book state arrives in C4 and C5, because fields nothing reads yet would fail the build (CS0414, IDE0044).
- One System.Threading.Lock. EVERY public method, reads included, runs entirely inside it: validate, check version, mutate, stamp. Return immutable records only.
- Inject TimeProvider for created/updated (UTC).
- Result type: a small closed set of records: Ok<T>(value), NotFound, Invalid(errors), Stale(currentVersion), HasDependents(details). No exceptions for expected outcomes.
- Seed.cs: the five topics from docs/spec.md with a one or two sentence placeholder body each, version 1. Next topic id is 6. (Books come in C4.)
- Topic operations: List, Get, Create, Update(id, expectedVersion, title, body, tags). Update increments version and sets updated. A stale expectedVersion returns Stale and changes nothing.

Task B: src/.../Contracts and Controllers
- Request DTOs with ALL properties nullable (string? Title etc.). Important: non-nullable reference properties make [ApiController] add implicit [Required] errors keyed in PascalCase, which bypasses our validator and breaks the camelCase error keys.
- TopicResponse(id, title, body, tags, created, updated, version). Explicit mapping methods, no AutoMapper.
- TopicsController [ApiController] [Route("topics")], routes use {id:int}: GET list, GET {id}, POST, PUT {id}. Controllers only map requests to service calls and Results to responses.
- Http/ResultMapping: ONE place mapping Result to IActionResult. Invalid -> ValidationProblem (400). NotFound -> 404 ProblemDetails. Stale -> 412 ProblemDetails with extension currentVersion.
- Http/ETags: ETag value is the quoted version, "3". Set it on GET, POST and PUT responses. PUT binds the header as an action parameter, [FromHeader(Name = "If-Match")] string? ifMatch, so it appears in /swagger: missing -> 428 ProblemDetails; unparseable -> 400 with errors["If-Match"]; mismatch -> 412.
- POST returns 201 with Location via CreatedAtAction, body identical in shape to GET /topics/{id}.
- Add the topic requests to api/requests.http, including a stale PUT.

Task C: two integration tests in tests/.../Api. Each test creates its own WebApplicationFactory so in-memory state never leaks between tests.
1. StaleUpdate_IsRejected_AndChangesNothing: PUT topic 1 with If-Match "1" -> 200, version 2. PUT again with If-Match "1" -> 412, currentVersion 2. GET shows the first update's values and version 2.
2. ValidationErrors_AreKeyedByCamelCaseFieldName: POST { title: "", tags: ["a", "A", ""] } -> 400 application/problem+json, errors keys exactly { "title", "tags[1]", "tags[2]" }.

Run dotnet test, then stage with git add. Do not commit.
```

### C4: Books endpoints (Stage 2)

**Owner:** Agent. **Model:** Sonnet 5.5. **Est:** 10m.

**Done when:** `GET /books/3` in `api/requests.http` matches the brief's Administrator Guide table exactly: positions 1 to 4, titles and levels.

```text
Read CLAUDE.md, then docs/spec.md sections "Data model" and "API contract". Follow the patterns already in LibraryService, ResultMapping and TopicsController.

Task:
- Seed the three books from docs/spec.md. Reference ids 1-4 Getting Started Guide, 5-7 Publishing Handbook, 8-11 Administrator Guide. Next referenceId is 12, next book id is 4.
- LibraryService: add Dictionary<int, Book> and nextBookId (nextReferenceId comes in C5, where it is first used). ListBooks, GetBook, CreateBook (BookRules.Validate). A new book has empty contents.
- Contracts: BookSummaryResponse(id, title, description, created) for the list. BookResponse adds contents: [{ referenceId, topicId, topicTitle, level, position }]. position = index + 1 and topicTitle is looked up from the current topic, both computed at read time inside the lock, never stored.
- BooksController [Route("books")], {id:int}: GET list, GET {id}, POST (201 + Location).
- Add the book requests to api/requests.http.

No new integration tests (the suite is capped at five). Run dotnet test, then stage with git add. Do not commit.
```

### C5: Add and remove references (Stage 3)

**Owner:** Agent. **Model:** Sonnet 5.5. **Est:** 25m.

**Done when:** integration tests 3 and 4 pass, and you have tried a 409 then a cascade in `api/requests.http`.

```text
Read CLAUDE.md, then docs/spec.md sections "Outline rules", "Removing an entry with children" and "API contract". All outline logic already exists in Domain/OutlineRules; do not reimplement it.

Task:
- LibraryService: add nextReferenceId, one counter for all books, starting at 12 after the seed.
- AddReferenceRequest(int? topicId, int? level, int? position).
- POST /books/{id}/references:
  - book missing -> 404
  - topicId missing -> 400 errors.topicId "Topic id is required."
  - topic missing -> 400 errors.topicId "Topic 99 does not exist." (a body field is wrong, not the URL)
  - level missing -> 400 errors.level
  - OutlineRules.Insert errors -> 400 with its keys (level, position)
  - success -> 201, Location /books/{id}, body = the updated BookResponse (other entries' positions changed)
- DELETE /books/{id}/references/{referenceId:int}, optional query bool cascade:
  - book missing, or referenceId not in THIS book -> 404
  - entry has descendants and cascade is not true -> 409 ProblemDetails, title "This entry has entries indented beneath it", extension descendants: [{ referenceId, topicId, topicTitle, level, position }]
  - otherwise RemoveWithDescendants -> 204
  - never deletes a topic
- Add the HasDependents mapping to ResultMapping (409). Add the requests to api/requests.http, including the 409 and the cascade.

Integration tests (own factory each):
3. AddingReference_ToUnknownTopic_IsRejected: POST { topicId: 999, level: 1 } to book 1 -> 400 with errors.topicId; GET /books/1 still has 4 entries.
4. RemovingParent_RequiresCascade_AndRemovesChildren: DELETE book 3 reference 8 -> 409 listing reference 9. DELETE ...?cascade=true -> 204. GET /books/3 contents = [Publishing to PDF level 1 position 1, Connecting to a Library level 2 position 2].

Run dotnet test, then stage with git add. Do not commit.
```

### C6: Usage report (Stage 4)

**Owner:** Agent. **Model:** Sonnet 5.5. **Est:** 15m.

**Done when:** all 5 integration tests pass. `GET /topics/3/usage` shows 3 references across 2 books, with parents.

```text
Read CLAUDE.md, then docs/spec.md sections "Reuse report" and "API contract".

Task:
- LibraryService.GetUsage(topicId), inside the lock.
- TopicUsageResponse: { id, title, totalReferences, bookCount, books: [{ bookId, bookTitle, references: [{ referenceId, level, position, parentTopicTitle }] }] }. Books ordered by id, references by position. parentTopicTitle comes from OutlineRules.ParentOf and is null at level 1.
- A topic that exists but is unused -> 200 with zero counts and an empty books list. Missing topic -> 404.
- GET /topics/{id:int}/usage on TopicsController. Add it to api/requests.http.

Integration test 5 (own factory):
5. UsageReport_CountsRepeatsWithinABook: GET /topics/3/usage -> totalReferences 3, bookCount 2; Getting Started Guide has 1 reference at position 3; Administrator Guide has 2 references at positions 2 and 4, with parents "Installing the Desktop Client" and "Publishing to PDF".

Run dotnet test (all tests must pass), then stage with git add. Do not commit.
```

## Phase 2: Front end (C7 to C11)

Every screen calls the real API. Server state lives only in TanStack Query. Local state is used only for the editor form and for UI state such as filters and open dialogs.

### C7: Web scaffold and single-command start

**Owner:** Agent. **Model:** Sonnet 5.5. **Est:** 15m.

**Done when:** `npm install && npm run dev` at the root starts both apps, the nav switches between placeholder pages, and `npm test` passes.

```text
Read CLAUDE.md, README.md section "Running the project", and docs/spec.md sections "Front-end architecture", "Errors" and "Code style".
Branch: chore/web-scaffold (create it from main; see CLAUDE.md).

Task: scaffold /web and the root scripts. Placeholder pages only.

1. /web: create it from the repo root with `npm create vite@latest web -- --template react-ts`, then `npm --prefix web install`. The template installs react, react-dom, TypeScript, @vitejs/plugin-react and a base ESLint config. Keep TypeScript strict. Then add: @tanstack/react-query, react-router (current release, data router via createBrowserRouter), tailwindcss with @tailwindcss/vite. Dev: vitest, jsdom, @testing-library/react, @testing-library/jest-dom. Scripts: dev, build, lint (eslint . --max-warnings 0), typecheck (tsc -b), test (vitest run), format (prettier --write .), format:check (prettier --check .).
   Prettier is NOT in the template: add prettier, eslint-config-prettier (last in eslint.config.js so ESLint never fights Prettier) and prettier-plugin-tailwindcss. .prettierrc.json: { "singleQuote": true, "trailingComma": "all", "printWidth": 100, "plugins": ["prettier-plugin-tailwindcss"] }. .prettierignore: dist, coverage. In eslint.config.js set @typescript-eslint/no-explicit-any and react-hooks/exhaustive-deps to "error". Vite server port 5173 with strictPort.
2. Root package.json (name "steele-it", private: true): devDependency concurrently. Scripts:
   - "postinstall": "dotnet tool restore && npm --prefix web install"
   - "dev": concurrently -n api,web -c blue,green "dotnet run --project api/src/SteeleIT.Api" "npm --prefix web run dev"
   - "test": "dotnet test api/SteeleIT.slnx && npm --prefix web test"
   - "format": "dotnet csharpier format . && dotnet format style api/SteeleIT.slnx && dotnet format analyzers api/SteeleIT.slnx && npm --prefix web run format"
   - "lint": "dotnet csharpier check . && dotnet format style api/SteeleIT.slnx --verify-no-changes && dotnet format analyzers api/SteeleIT.slnx --verify-no-changes && npm --prefix web run lint && npm --prefix web run format:check && npm --prefix web run typecheck"
3. src/api/client.ts: apiFetch<T>(path, { method, body, ifMatch }). Base URL from import.meta.env.VITE_API_BASE_URL, default http://localhost:5080. Sends JSON; sets If-Match when ifMatch is given; 204 returns undefined. Non-2xx parses problem details and throws ApiError { status, title, detail, fieldErrors: Record<string, string[]>, extensions: Record<string, unknown> }. A network failure throws ApiError with status 0 and a friendly title.
4. src/api/types.ts: Topic, TopicUsage, BookSummary, Book, Entry, matching the docs/spec.md contract exactly.
5. src/api/queryKeys.ts: topics.all ['topics'], topics.detail(id) ['topics', id], topics.usage(id) ['topics', id, 'usage'], books.all ['books'], books.detail(id) ['books', id].
6. src/app/queryClient.ts: retry only when the error is not an ApiError with 400 <= status < 500, max 2 retries. Keep refetchOnWindowFocus at its default (true).
7. src/app/router.tsx with createBrowserRouter: a Layout with a header showing the app name "Steele-IT", a top nav (Topics, Books) and an Outlet. Set the index.html <title> to "Steele-IT" and the web package name to "steele-it-web". Routes: / redirects to /topics; /topics; /topics/:id; /books; /books/:id; a not-found route.
8. src/components: Button (primary | secondary | danger, a disabled style, a pending label), Field (label, children, error messages under it, aria-describedby), TagChip (label, optional onRemove, error state), LoadingState, ErrorState (message + Retry), EmptyState, ConfirmDialog (native <dialog>, title, message, confirmLabel, onConfirm, onCancel). Tailwind classes stay inside these components.
9. src/lib/format.ts: formatDateTime(iso) using Intl.DateTimeFormat('en-NZ', { dateStyle: 'medium', timeStyle: 'short' }).
10. src/lib/limits.ts: TITLE_MAX_LENGTH = 200, TAG_MAX_LENGTH = 50, DESCRIPTION_MAX_LENGTH = 2000, with a comment that they mirror api/src/SteeleIT.Api/Domain/ValidationLimits.cs and are input hints only (the server is the authority).
11. One test, src/api/client.test.ts: a 400 problem-details response becomes an ApiError with fieldErrors.title and fieldErrors['tags[1]'] (stub fetch with vi.fn).

Run npm run format, then npm run lint and npm test at the root, and confirm npm run dev starts both apps, then stage with git add. Do not commit.
```

### C8: Topic library (Stage 5)

**Owner:** Agent. **Model:** Sonnet 5.5. **Est:** 20m.

**Done when:** you can filter by "pdf", see a "no matches" state, and create a topic that lands you on `/topics/6`.

```text
Read CLAUDE.md, then docs/spec.md sections "Front-end architecture" and "Topic library".
Branch: feat/topic-library (create it from main; see CLAUDE.md).
Use the existing components, apiFetch and queryKeys.

Task:
- src/api/topics.ts: fetchers plus hooks useTopics() and useCreateTopic().
- src/features/topics/TopicLibraryPage.tsx at /topics:
  - A table: title (link to /topics/:id), tags as TagChips, last updated (formatDateTime), sorted by updated, newest first.
  - One filter input that matches the title (case-insensitive substring) OR any tag (case-insensitive). Clicking a tag chip puts that tag in the filter.
  - States: loading; error with Retry; empty library ("No topics yet" + create button); filter has no matches (different message + Clear filter).
- NewTopicDialog: a title field only. POST { title, body: "", tags: [] }. Show API field errors under the field. On success: setQueryData(topics.detail(id)), invalidate topics.all, navigate to /topics/:id.
- No client-side duplication of validation rules beyond maxLength={TITLE_MAX_LENGTH} from src/lib/limits.ts on the input.

Run lint, typecheck and test, then stage with git add. Do not commit.
```

### C9: Topic editor, core (Stage 6a)

**Owner:** Agent. **Model:** Opus 5.5. **Est:** 30m.

Opus because the form vs cache split is the main front-end design point. If it is wrong, C10 cannot work.

**Done when:** edits show "Unsaved changes", an empty title shows the API's error under the field, a duplicate tag highlights that chip, and a successful save clears the dirty state and updates the library list.

```text
Read CLAUDE.md, then docs/spec.md sections "Editor and cache behaviour" and "Errors".
Branch: feat/topic-editor (create it from main; see CLAUDE.md). C10 continues on the same branch.

Task: the topic editor at /topics/:id. Conflicts and the reuse warning come in the next component; leave clear seams for them.

Architecture (important):
- TopicEditorPage loads useTopic(id). It handles loading, 404 ("Topic not found" + link back) and errors, then renders <TopicEditor key={topic.id} initial={topic} />.
- TopicEditor owns form state through a hook, useTopicForm(initial): { values: { title, body, tags }, base: Topic, isDirty, setField, reset(topic) }. `base` is the snapshot the form was loaded from; its version is what Save sends. Later cache refetches must NEVER write into values or base. Only reset() does.
- isDirty compares values to base (title, body, tags in order).

UI:
- Title input (maxLength TITLE_MAX_LENGTH), body textarea (plain text), TagInput (new-tag input maxLength TAG_MAX_LENGTH) (Enter or comma adds a trimmed tag, Backspace on empty input removes the last, chip x removes). The client does not dedupe or validate tags: the server is the source of truth.
- An "Unsaved changes" badge when dirty. Save (disabled when not dirty or saving, shows "Saving..."). "Discard changes" resets to base. Ctrl/Cmd+S saves.
- Show created/updated (formatDateTime) and the version number.

Save:
- useUpdateTopic: PUT with ifMatch = `"${base.version}"`.
- Success: reset(updated); setQueryData(topics.detail(id), updated); invalidate topics.all (exact), topics.usage(id) and books.all (prefix match, so every book outline refetches and shows the new title).
- 400: map fieldErrors to fields. title -> under the title input, body -> under the body, tags[i] -> chip i in its error state plus the message under the tag input. Any other key -> a general error banner. Keep every edit.
- Any other error (including 412 for now): a general error banner, edits kept.

Run lint, typecheck and test, then stage with git add. Do not commit.
```

### C10: Editor conflicts, reuse warning and leave guard (Stage 6b)

**Owner:** Agent. **Model:** Opus 5.5. **Est:** 30m.

**Done when:** the two-tab demo in C15 works end to end, and leaving a dirty editor asks first.

```text
Read CLAUDE.md, then docs/spec.md sections "Editor and cache behaviour" and "Reuse report".
Branch: feat/topic-editor (it exists from C9: switch to it, do not create a new one).
Build on TopicEditor and useTopicForm without changing their responsibilities.

Task 1, conflicts (ConflictBanner component):
- On 412 from Save: keep every edit. Show "Someone else saved this topic (now version N) after you opened it. Your changes are still here, but they cannot be saved over the newer version." N comes from the problem extension currentVersion. Actions: "Reload latest (discards your changes)" refetches the topic and calls reset(latest). Save stays disabled until reload.
- On 428: a general error (it is a client bug, not a user situation).
- Early detection: TopicEditor also reads useTopic(id) (refetch on window focus stays on). When the cached version is greater than base.version:
  - not dirty: reset(latest) silently;
  - dirty: show ConflictBanner in its "newer version available" form before any Save (same Reload action; Save still allowed, and it will get a 412).

Task 2, reuse warning (ReuseWarning component, data from useTopicUsage(id)):
- 0 books: quiet text "Not used in any book yet."
- 1 book: "Used in Getting Started Guide" (book title links to /books/:id).
- More than 1 book: a prominent warning near the Save button: "Saving changes this topic in all 2 books: Getting Started Guide, Administrator Guide." The Save label becomes "Save (updates 2 books)".
- When a book has more than one reference, say so: "appears twice in Administrator Guide (positions 2, 4)".
- Usage loading or failing never blocks editing (small inline state).

Task 3, leave guard:
- React Router useBlocker when isDirty and not saving -> ConfirmDialog "Discard unsaved changes?" (Stay / Discard and leave).
- window beforeunload when isDirty (browser's own prompt on close or reload).

Run lint, typecheck and test, then stage with git add. Do not commit.
```

### C11: Book outline (Stage 7)

**Owner:** Agent. **Model:** Sonnet 5.5. **Est:** 35m.

**Done when:** renaming topic 3 shows the new title in two outlines without a refresh, you can add an entry mid-book at level 2, and removing "Installing the Desktop Client" in the Administrator Guide asks first.

```text
Read CLAUDE.md, then docs/spec.md sections "Outline rules", "Removing an entry with children" and "Front-end architecture".
Branch: feat/book-outline (create it from main; see CLAUDE.md).

Task:
- src/api/books.ts: useBooks, useBook(id), useAddReference(bookId), useRemoveReference(bookId).
- BookListPage at /books: title (link), description, created. Loading, error and empty states.
- src/features/books/outline.ts: numberOutline(levels: number[]) -> string[], e.g. [1,1,2,1] -> ["1","2","2.1","3"]. Add outline.test.ts with the three seed books plus [1,2,3,2,1].
- BookOutlinePage at /books/:id:
  - Header: title, description. Entries in order, indented by (level - 1) * 1.5rem, each showing its number, the topic title linking to /topics/:topicId, and a Remove button. Empty book: "This book has no entries yet."
  - AddReferenceForm: topic <select> (all topics by title), "Insert at" <select> ("At the start", "After 1 Introduction to Author-it", ..., default "At the end"), and a level <select> limited to 1..(level of the entry before the insert point + 1), only 1 at the start. When the position changes and the level is out of range, clamp it. Show API field errors (topicId, level, position) next to their inputs.
  - Add success: setQueryData(books.detail(id), response) and invalidate topics.usage(topicId).
- Remove flow (no descendant logic in the browser):
  1. DELETE without cascade.
  2. On ApiError 409: open ConfirmDialog using the server's descendants list: "Removing Installing the Desktop Client also removes the 1 entry indented beneath it: Connecting to a Library." Confirm label "Remove 2 entries".
  3. Confirm -> DELETE ?cascade=true.
  - Success: invalidate books.detail(id) and every usage query (predicate: key[0] === 'topics' && key[2] === 'usage').

Run lint, typecheck and test, then stage with git add. Do not commit.
```

## Phase 3: Stretch (C12 to C14, C16, C17)

Start this phase only if core is done and the clock shows under 5h. Each item is a full slice (API, UI, test) so it can be dropped cleanly. Check the cut line before starting each one.

### C12: Delete a topic, blocked while referenced

**Owner:** Agent. **Model:** Sonnet 5.5. **Est:** 15m.

**Done when:** deleting topic 3 shows the books that still use it, and a new unused topic deletes and you land back on the library.

```text
Read CLAUDE.md, then docs/spec.md sections "Deleting a topic" and "API contract".
Branch: feat/delete-topic (create it from main; see CLAUDE.md).

API:
- LibraryService.DeleteTopic(id), inside the lock. Missing -> NotFound. Referenced by any book -> HasDependents with books [{ bookId, bookTitle, referenceCount }]. Otherwise remove -> Ok.
- DELETE /topics/{id:int}: 204 | 404 | 409 ProblemDetails titled "This topic is still used in books" with extension books.
- Unit test at service level in tests/.../Domain or tests/.../Library (keep the integration suite at five): referenced topic is not deleted; unused topic is deleted.
- Add to api/requests.http.

Web:
- A secondary "Delete topic" danger button in TopicEditor.
- If usage shows bookCount > 0, the dialog explains it cannot be deleted and lists the books (links) instead of offering Delete. The server stays the authority: a 409 shows the same message from the response.
- Unused: ConfirmDialog "Delete Creating Your First Topic? This cannot be undone." Success: removeQueries topics.detail(id) and topics.usage(id), invalidate topics.all, navigate to /topics. The leave guard must not fire for this navigation.

Run all checks, then stage with git add. Do not commit.
```

### C13: Front-end tests

**Owner:** Agent. **Model:** Sonnet 5.5. **Est:** 20m.

**Done when:** `npm --prefix web test` runs 3 behaviour tests plus the existing client and outline tests, all green.

```text
Read CLAUDE.md, then docs/spec.md section "Editor and cache behaviour".
Branch: test/web-components (create it from main; see CLAUDE.md).

Task: three focused component tests with Vitest + Testing Library. Stub fetch with vi.fn returning Response objects (no new mocking library). Render inside a fresh QueryClient (retry off) and createMemoryRouter.
1. A 412 on save keeps the author's edits in the form, shows the conflict banner with the server's version, and "Reload latest" replaces the form with the fetched topic.
2. A 400 with errors.title and errors["tags[1]"] shows the title message under the title field and marks the second tag chip as an error.
3. With a usage response of bookCount 2, the reuse warning names both books and the Save label reads "Save (updates 2 books)".

Test behaviour through the UI (roles, labels, text), not implementation details. docs/spec.md "Testing" already says the app never uses mocks and only these tests stub fetch; keep that true.

Run all checks, then stage with git add. Do not commit.
```

### C14: Move a reference

**Owner:** Agent. **Model:** Opus 5.5. **Est:** 30m.

Opus because moving a block with a level shift has edge cases.

**Done when:** you can outdent "Connecting to a Library" in the Getting Started Guide, move a chapter together with its section, and an invalid move shows the API's level error.

```text
Read CLAUDE.md, then docs/spec.md sections "Outline rules" and "Moving an entry".
Branch: feat/move-reference (create it from main; see CLAUDE.md).

Domain (OutlineRules.Move, with unit tests first):
- Move(contents, referenceId, int? newPosition, int? newLevel). The block = the entry plus DescendantsOf(entry). The level change (newLevel - level) applies to the whole block. Remove the block, then insert it so the moved entry ends at newPosition (1-based position in the FINAL list; valid range 1..count - blockSize + 1, else error "position"). Run Validate on the whole result.
- Cases: outdent Getting Started position 3 (level 2 -> 1) is valid; indent Getting Started position 1 is invalid (first entry must be level 1); moving the Administrator Guide's first chapter (positions 1-2) to the end gives topics [5,3,2,3] at levels [1,2,1,2]; a move that leaves a level-3 entry after a level-1 entry is rejected.

API:
- PATCH /books/{id}/references/{referenceId:int}, body { position?, level? }, at least one required (else 400 errors.position "Provide a position or a level."). 200 with the updated BookResponse. 404 as for DELETE.
- Add to api/requests.http.

Web (BookOutlinePage):
- Per entry: "Outdent" and "Indent" buttons (level -1 / +1, disabled when obviously impossible) and "Move...", which opens a small inline form with the same Insert-at and Level selects as AddReferenceForm (reuse those pieces).
- Show API field errors inline on the entry. Success: setQueryData(books.detail(id), response) and invalidate that topic's usage.
- docs/spec.md "Moving an entry" already states that an entry moves together with its descendants; keep it true and add anything you had to decide.

Run all checks, then stage with git add. Do not commit.
```

### C16: Run with Aspire

**Owner:** Agent. **Model:** Sonnet 5.5. **Est:** 30m.

An alternative way to run the app, with the Aspire dashboard (logs, traces and health for both apps). No Docker needed. `npm run dev` stays the main documented command.

**Done when:** `dotnet run --project api/src/SteeleIT.AppHost` (or `aspire run`) shows `api` and `web` healthy in the dashboard, the app works end to end, and `npm run dev` still works unchanged.

```text
Read CLAUDE.md, README.md section "Running the project", and docs/spec.md section "Code style".
Branch: feat/aspire (create it from main; see CLAUDE.md). C17 continues on the same branch.

Task: add an optional Aspire AppHost so the whole app runs under Aspire with its dashboard. npm run dev must keep working exactly as before; Aspire is an alternative, not a replacement.

1. Add api/src/SteeleIT.AppHost (Aspire AppHost, current Aspire release) to SteeleIT.slnx. Packages: the Aspire AppHost SDK and Aspire.Hosting.JavaScript only.
2. AppHost:
   - var api = builder.AddProject<Projects.SteeleIT_Api>("api");
   - var web = builder.AddViteApp("web", "<relative path to /web>", runScriptName: "dev").WithReference(api).WithEnvironment("VITE_API_BASE_URL", api.GetEndpoint("http")).WaitFor(api);
   Check the AddViteApp signature against the installed package before relying on it.
3. CORS: Aspire assigns the Vite port, so the allowed origin can no longer be hard-coded. Read it from configuration (Cors:AllowedOrigins; default http://localhost:5173 in appsettings.Development.json) and have the AppHost pass the web endpoint to the API: api.WithEnvironment("Cors__AllowedOrigins", web.GetEndpoint("http")). Keep exposing ETag. Integration tests must still pass unchanged.
4. The JavaScript hosting APIs are experimental (ASPIREJAVASCRIPT001). Warnings are errors, so suppress it in the AppHost .csproj only, with NoWarn and a comment saying why. No #pragma.
5. Do not add ServiceDefaults and do not change the API beyond the CORS configuration.
6. README "Running the project": add a short "Alternative: run with Aspire" paragraph (the command, and that the dashboard URL is printed on start). Update the CORS line to say the origin comes from configuration.

Run npm run lint and npm test. Start the AppHost and confirm both resources are healthy and the app works, then confirm npm run dev still works. Stage with git add. Do not commit.
```

### C17: Docker Compose via Aspire

**Owner:** Agent. **Model:** Opus 5.5. **Est:** 60m.

Opus because production mode changes CORS, Swagger and how the browser reaches the API, and the generated proxy needs the right paths.

**Done when:** `aspire deploy` brings up the API and web containers, the app works end to end at the printed URL, and `aspire destroy` tears it down. Requires Docker Desktop (or Podman 5+).

```text
Read CLAUDE.md, README.md section "Running the project", and docs/spec.md sections "Errors" and "Front-end architecture". The Aspire AppHost from C16 is in place.
Branch: feat/aspire (it exists from C16: switch to it, do not create a new one).

Task: let the whole app run in Docker with one command, generated from the AppHost. Docker is required for this path only; npm run dev and the AppHost dev run must keep working.

1. Add Aspire.Hosting.Docker to the AppHost and builder.AddDockerComposeEnvironment("compose").
2. Web: publish the Vite app as a static website served by Aspire's generated YARP container (PublishAsStaticWebsite) with an API proxy to `api`, so the browser calls the API on the same origin and CORS is not involved. The web client calls /topics and /books, not /api/..., so either proxy those paths or build with VITE_API_BASE_URL set to the proxy prefix and strip it (StripPrefix). Choose the option that keeps the web code unchanged, and explain the choice in your summary.
3. The API container runs in Production, so Swagger and Scalar are off. Leave it that way and say so in the README.
4. Suppress any experimental-API diagnostics in the AppHost .csproj only, with NoWarn and a comment.
5. README "Running the project": add "Alternative: Docker" with the prerequisite, the commands (aspire deploy; aspire destroy to tear down) and the URL. Add the generated aspire-output/ folder to .gitignore.

Verify: aspire deploy succeeds; in the browser, list topics, edit and save one, and add a reference; then aspire destroy. Run npm run lint and npm test. Stage with git add. Do not commit.
```

## Phase 4: Finish (C15)

**Owner:** Person, plus one review agent. **Model:** Opus 5.5 for the review. **Est:** 25m.

The brief scores the README as heavily as the code, so this step is never cut.

**1. Independent review (agent, read-only)**

Run it in a fresh session so it has no memory of building the code, on main after every finished branch is merged.

```text
You are a senior engineer at Author-it reviewing a candidate's practical test. Read the brief summary and rubric in docs/spec.md ("Brief and rubric"), then review the whole repo. Do not change any files.

Report, ranked by how much each would cost the candidate:
1. Any brief requirement that is missing or wrong (check every Stage 1-7 bullet, the seed data, and the README items the brief requires: how to run with ports, decisions and trade-offs, status-code choices, what happens to indented entries on removal, deleting a referenced topic, and unfinished work).
2. Inconsistencies: status codes, error shapes or field names that differ from the docs/spec.md contract, and any action whose documented responses in /openapi/v1.json differ from what it actually returns.
3. Code a reviewer would question: unclear names, logic outside Domain/, duplicated rules, dead code.
4. Documentation gaps: anything another developer would need to run or extend this, any place docs/spec.md no longer matches the code, and anything in README.md that is longer than a reviewer needs.
For each issue give file:line, why it matters, and the smallest fix.
```

Fix only what is cheap and clearly right. Note the rest under "With more time".

**2. Demo run-through (person)**

Do this against a fresh clone (`git clone` into a new folder, `npm install`, `npm run dev`) to prove the run instructions work.

1. Library: filter "pdf", then click the `setup` tag chip.
2. Open "Connecting to a Library". The reuse warning names 2 books and says it appears twice in the Administrator Guide. Save reads "Save (updates 2 books)".
3. Two tabs on `/topics/3`. Tab A: change the title and save. Tab B: type an edit, then switch to it. The "newer version" notice appears. Save anyway: you get the conflict banner and your edits are still there. Reload latest.
4. Books, Getting Started Guide: the new title shows without a refresh.
5. Add "Publishing to PDF" after entry 2 at level 2. It is numbered 2.1, and "Connecting to a Library" moves to 2.2.
6. Administrator Guide: remove "Installing the Desktop Client". The dialog lists "Connecting to a Library". Confirm.
7. Edit a topic, then click Books. The leave guard asks first.
8. Stretch, if built: delete topic 3 (blocked, lists books); outdent an entry; run `npm test`.
9. Open `/scalar` and /swagger (every endpoint should list its error responses and PUT should show If-Match), then run two requests from `api/requests.http`.

**3. README completion (person)**

- Fill in the README's Status section: what is built and the total time.
- Add every plan item you did not finish (stretch items included) to "With more time", one line each on how you would approach it. Check "How I used AI" still matches what actually happened.
- Do this on a docs/final-readme branch: stage, commit with the C15 message, merge into main with --no-ff, then push or zip.

**4. Interview prep (person, outside the 6 hours)**

They will make a small change with you. Rehearse where these would land, out loud:

- Add a field to Topic (e.g. `status`): record, TopicRules, DTO + mapping, `types.ts`, `useTopicForm`, one input.
- A new outline rule (max depth 4): one line in `OutlineRules.Validate` plus a test case.
- Sort topics by title on the server: `LibraryService.ListTopics`.
- Why If-Match/412 rather than a body version with 409, and why the form never reads from the cache after load.

## Model choice: Sonnet 5.5 vs Opus 5.5

Use Opus 5.5 where a subtle mistake would still compile and pass a quick look. Use Sonnet 5.5 where the prompt fully specifies the work and the pattern already exists in the repo.

| Use | Components | Why |
| --- | --- | --- |
| Opus 5.5 | C2 domain rules, C3 service + If-Match, C9 and C10 editor, C14 move, C17 Docker, C15 review | Rule interactions, atomicity and form-vs-cache state are where plausible-looking code is wrong. Opus is also the better critic for the final review. |
| Sonnet 5.5 | C1, C4 to C8, C11 to C13, C16 | Scaffolding, CRUD endpoints and screens that follow patterns already set in C2, C3 and C7. Faster and cheaper, and the prompts leave little to interpret. |
| You | C0, C2 test cases, every review and commit, C15 | You own the decisions and must defend them live. |

If a Sonnet component goes wrong twice on the same point, rerun that prompt with Opus rather than patching it repeatedly.
