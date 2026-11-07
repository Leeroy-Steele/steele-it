import { useState } from 'react';
import type { Topic } from '../../api/types';

export interface TopicFormValues {
  title: string;
  body: string;
  tags: string[];
}

function toValues(topic: Topic): TopicFormValues {
  return { title: topic.title, body: topic.body, tags: [...topic.tags] };
}

function sameTags(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((tag, i) => tag === b[i]);
}

/**
 * Form state for the topic editor. `initial` is read once: later renders with a refetched topic
 * never touch `values` or `base`. Only `reset` does, so the version Save sends is always the one
 * the author started editing from.
 *
 * `tagDraft` is the text in the tag input that has not been added as a chip yet. It counts as an
 * unsaved change, and `commitTagDraft` turns it into a tag so a save never drops it.
 */
export function useTopicForm(initial: Topic) {
  const [base, setBase] = useState<Topic>(initial);
  const [values, setValues] = useState<TopicFormValues>(() => toValues(initial));
  const [tagDraft, setTagDraft] = useState('');

  const isDirty =
    values.title !== base.title ||
    values.body !== base.body ||
    !sameTags(values.tags, base.tags) ||
    tagDraft.trim() !== '';

  function setField<K extends keyof TopicFormValues>(field: K, value: TopicFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  /** Adds a non-empty draft as the last tag, clears the draft, and returns the values to save. */
  function commitTagDraft(): TopicFormValues {
    const tag = tagDraft.trim();
    if (tag === '') {
      return values;
    }
    const next = { ...values, tags: [...values.tags, tag] };
    setValues(next);
    setTagDraft('');
    return next;
  }

  function reset(topic: Topic) {
    setBase(topic);
    setValues(toValues(topic));
    setTagDraft('');
  }

  return { values, base, tagDraft, isDirty, setField, setTagDraft, commitTagDraft, reset };
}
