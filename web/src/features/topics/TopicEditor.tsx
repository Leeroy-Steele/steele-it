import { useEffect, useEffectEvent, type FormEvent } from 'react';
import { useUpdateTopic } from '../../api/topics';
import type { Topic } from '../../api/types';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { TagInput } from '../../components/TagInput';
import { formatDateTime } from '../../lib/format';
import { TITLE_MAX_LENGTH } from '../../lib/limits';
import { toSaveErrors } from './saveErrors';
import { useTopicForm } from './useTopicForm';

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

  function save() {
    if (!form.isDirty || update.isPending) {
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

      {/* Seam: the conflict (412) and "newer version saved elsewhere" banners go here. */}

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

      {/* Seam: the reuse warning goes here, by the Save button, and can relabel it. */}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={discard} disabled={!form.isDirty || update.isPending}>
          Discard changes
        </Button>
        <Button
          type="submit"
          disabled={!form.isDirty}
          pending={update.isPending}
          pendingLabel="Saving..."
        >
          Save
        </Button>
      </div>
    </form>
  );
}
