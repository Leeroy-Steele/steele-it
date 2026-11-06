# Agent ground rules

- docs/spec.md is the spec. Read the sections your task names before coding. If the code and the spec disagree, stop and ask.
- If your task changes behaviour, update the matching docs/spec.md section in the same change. Do not edit README.md unless the task says so: it is the human-facing overview.
- Stage your changes with `git add`. Never commit, amend, rebase or push.
- Only touch files your task needs. No new packages beyond those named in the task.
- Prefer clarity over cleverness: small functions, explicit mapping, no reflection, no generic repositories.
- Every rule lives in one place (Domain/ for the API). Controllers map requests and results only.
- Never hard-code a length limit: use `ValidationLimits` in C# (tests included) and `src/lib/limits.ts` in the web app.
- C#: members (methods, constructors, properties, accessors, indexers, operators, local functions) always use `{ }` block bodies, never `=> expression`. Lambdas passed as arguments are fine. The build enforces this.
- Every controller action has a /// summary and declares every status it can return with [ProducesResponseType] (ProblemDetails for errors, ValidationProblemDetails for 400), so /swagger stays accurate.
- Before staging: run `dotnet csharpier format .` (after `dotnet tool restore` once); then `dotnet build` and `dotnet test` must pass. From C7 on, run `npm run format`, then `npm run lint` and `npm test` at the repo root; both must pass.
- Never weaken a lint or analyzer rule to get a build through. If a rule genuinely conflicts with the docs/spec.md conventions, turn it off in `.editorconfig` or `eslint.config.js` with a one-line comment saying why, and mention it in your summary. No `#pragma`, `// eslint-disable` or per-file suppressions.
- Finish with a short summary: files changed, how to verify by hand, anything you were unsure about.
