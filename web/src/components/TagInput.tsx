import type { KeyboardEvent } from 'react';
import { TAG_MAX_LENGTH } from '../lib/limits';
import { Field } from './Field';
import { TagChip } from './TagChip';

interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  /** Text typed but not yet added as a tag. Owned by the parent so a save can include it. */
  draft: string;
  onDraftChange: (draft: string) => void;
  /** Indexes of chips the server rejected. */
  errorIndexes?: Set<number>;
  /** Messages shown under the new-tag input. */
  errors?: string[];
}

/**
 * Enter or comma adds the trimmed tag, Backspace in the empty input removes the last one.
 * It does not dedupe or validate: the server is the source of truth.
 */
export function TagInput({
  label,
  tags,
  onChange,
  draft,
  onDraftChange,
  errorIndexes,
  errors,
}: TagInputProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      const tag = draft.trim();
      if (tag !== '') {
        onChange([...tags, tag]);
      }
      onDraftChange('');
    } else if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
      event.preventDefault();
      onChange(tags.slice(0, -1));
    }
  }

  function removeAt(index: number) {
    onChange(tags.filter((_, i) => i !== index));
  }

  return (
    <Field label={label} errors={errors}>
      {(control) => (
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1.5">
          {tags.map((tag, index) => (
            // Tags are not deduped, so the index is part of the key.
            <TagChip
              key={`${index}-${tag}`}
              label={tag}
              error={errorIndexes?.has(index) ?? false}
              onRemove={() => removeAt(index)}
            />
          ))}
          <input
            {...control}
            type="text"
            value={draft}
            maxLength={TAG_MAX_LENGTH}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a tag"
            className="min-w-24 flex-1 text-sm outline-none"
          />
        </div>
      )}
    </Field>
  );
}
