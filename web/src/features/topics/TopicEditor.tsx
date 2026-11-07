import { useEffect, useEffectEvent, useState, type FormEvent } from 'react';
import { useBlocker } from 'react-router';
import { ApiError } from '../../api/client';
import { useTopic, useTopicUsage, useUpdateTopic } from '../../api/topics';
import type { Topic } from '../../api/types';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Field } from '../../components/Field';
import { TagInput } from '../../components/TagInput';
import { formatDateTime } from '../../lib/format';
import { TITLE_MAX_LENGTH } from '../../lib/limits';
import { ConflictBanner } from './ConflictBanner';
import { ReuseWarning } from './ReuseWarning';
import { toSaveErrors } from './saveErrors';
import { useTopicForm } from './useTopicForm';

/** The version a 412 reports in its `currentVersion` extension, if it is a usable number. */
function toCurrentVersion(error: ApiError): number | undefined {
  const value = error.extensions.currentVersion;
  return typeof value === 'number' ? value : undefined;
}

interface TopicEditorProps {
  /** Read once. Render with `key={topic.id}` so another topic gets a fresh form. */
  initial: Topic;
}

export function TopicEditor({ initial }: TopicEditorProps) {
  const form = useTopicForm(initial);
  const update = useUpdateTopic(initial.id);
  const errors = toSaveErrors(update.error);

  // A chip error only applies while that index still holds the tag that was sent, so removing an
  // earlier tag does not move the highlight onto a different one.
  const sentTags = update.variables?.input.tags ?? [];
  const tagErrorIndexes = new Set(
    [...errors.tags.keys()].filter((i) => form.values.tags[i] === sentTags[i]),
  );
  const tagMessages = [...errors.tags.values()].flat();

  // The cache, not the form: refetch on window focus keeps it current, so a save in another tab
  // shows up here before this tab tries to save.
  const latest = useTopic(initial.id);
  const usage = useTopicUsage(initial.id);
  const [reloadFailed, setReloadFailed] = useState(false);

  const staleError =
    update.error instanceof ApiError && update.error.status === 412 ? update.error : null;
  const cached = latest.data;
  const hasNewer = cached !== undefined && cached.version > form.base.version && !update.isPending;

  // An untouched form quietly follows a newer version. Adjusting state while rendering is React's
  // pattern for this; the condition turns false once the base has moved, so it runs once.
  if (hasNewer && !form.isDirty) {
    form.reset(cached);
  }

  const bookCount = usage.data?.books.length ?? 0;
  const saveLabel = bookCount > 1 ? `Save (updates ${bookCount} books)` : 'Save';

  async function reloadLatest() {
    setReloadFailed(false);
    const result = await latest.refetch();
    if (result.isSuccess) {
      form.reset(result.data);
      update.reset();
    } else {
      setReloadFailed(true);
    }
  }

  // Leaving with unsaved work asks first: in-app links through the router, closing or reloading
  // the tab through the browser's own prompt.
  const blocker = useBlocker(form.isDirty && !update.isPending);
  useEffect(() => {
    if (!form.isDirty) {
      return;
    }
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [form.isDirty]);

  function save() {
    // After a 412 nothing can be saved over the newer version until the author reloads.
    if (!form.isDirty || update.isPending || staleError !== null) {
      return;
    }
    // A tag typed but not yet added is saved too, as a chip, so a rejection can point at it.
    const input = form.commitTagDraft();
    update.mutate(
      { input, version: form.base.version },
      { onSuccess: (updated) => form.reset(updated) },
    );
  }

  function discard() {
    form.reset(form.base);
    update.reset();
  }

  const onSaveShortcut = useEffectEvent((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      save();
    }
  });
  useEffect(() => {
    window.addEventListener('keydown', onSaveShortcut);
    return () => {
      window.removeEventListener('keydown', onSaveShortcut);
    };
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    save();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">Edit topic</h1>
            {form.isDirty && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                Unsaved changes
              </span>
            )}
          </div>
          <dl className="flex gap-4 text-xs text-slate-600">
            <div className="flex gap-1">
              <dt>Created</dt>
              <dd>{formatDateTime(form.base.created)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Updated</dt>
              <dd>{formatDateTime(form.base.updated)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Version</dt>
              <dd>{form.base.version}</dd>
            </div>
          </dl>
        </div>

        {staleError !== null ? (
          <ConflictBanner
            kind="stale"
            currentVersion={toCurrentVersion(staleError)}
            onReload={() => void reloadLatest()}
            reloading={latest.isFetching}
            reloadFailed={reloadFailed}
          />
        ) : (
          hasNewer &&
          form.isDirty && (
            <ConflictBanner
              kind="newer"
              currentVersion={cached?.version}
              onReload={() => void reloadLatest()}
              reloading={latest.isFetching}
              reloadFailed={reloadFailed}
            />
          )
        )}

        {errors.general.length > 0 && (
          <div
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {errors.general.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        )}

        <Field label="Title" errors={errors.title}>
          {(control) => (
            <input
              {...control}
              type="text"
              value={form.values.title}
              maxLength={TITLE_MAX_LENGTH}
              onChange={(event) => form.setField('title', event.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          )}
        </Field>

        <Field label="Body" errors={errors.body}>
          {(control) => (
            <textarea
              {...control}
              value={form.values.body}
              rows={12}
              onChange={(event) => form.setField('body', event.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 font-mono text-sm"
            />
          )}
        </Field>

        <TagInput
          label="Tags"
          tags={form.values.tags}
          onChange={(tags) => form.setField('tags', tags)}
          draft={form.tagDraft}
          onDraftChange={form.setTagDraft}
          errorIndexes={tagErrorIndexes}
          errors={tagMessages}
        />

        <ReuseWarning
          status={usage.status}
          usage={usage.data}
          onRetry={() => void usage.refetch()}
        />

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={discard}
            disabled={!form.isDirty || update.isPending}
          >
            Discard changes
          </Button>
          <Button
            type="submit"
            disabled={!form.isDirty || staleError !== null}
            pending={update.isPending}
            pendingLabel="Saving..."
          >
            {saveLabel}
          </Button>
        </div>
      </form>

      {blocker.state === 'blocked' && (
        <ConfirmDialog
          title="Discard unsaved changes?"
          message="Your changes to this topic have not been saved."
          confirmLabel="Discard and leave"
          cancelLabel="Stay"
          onConfirm={() => blocker.proceed()}
          onCancel={() => blocker.reset()}
        />
      )}
    </>
  );
}
