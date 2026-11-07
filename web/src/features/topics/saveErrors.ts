import { ApiError } from '../../api/client';

/** A failed save, split into what each part of the editor shows. */
export interface SaveErrors {
  title: string[];
  body: string[];
  /** `tags[i]` messages keyed by i, for the chip at that index. */
  tags: Map<number, string[]>;
  /** Messages for the general banner: non-field keys, and any error that is not a 400. */
  general: string[];
}

const TAG_KEY = /^tags\[(\d+)\]$/;
const UNKNOWN_ERROR = 'Something went wrong. Try again.';

export function toSaveErrors(error: Error | null): SaveErrors {
  const result: SaveErrors = { title: [], body: [], tags: new Map(), general: [] };
  if (error === null) {
    return result;
  }
  if (!(error instanceof ApiError)) {
    result.general.push(UNKNOWN_ERROR);
    return result;
  }
  // 412 lands here for now; the conflict banner will take it over.
  if (error.status !== 400) {
    result.general.push(error.title);
    return result;
  }

  for (const [key, messages] of Object.entries(error.fieldErrors)) {
    const tagMatch = TAG_KEY.exec(key);
    if (key === 'title') {
      result.title.push(...messages);
    } else if (key === 'body') {
      result.body.push(...messages);
    } else if (tagMatch) {
      result.tags.set(Number(tagMatch[1]), messages);
    } else {
      result.general.push(...messages);
    }
  }
  // A 400 with no usable field messages still needs saying.
  if (
    result.title.length === 0 &&
    result.body.length === 0 &&
    result.tags.size === 0 &&
    result.general.length === 0
  ) {
    result.general.push(error.title);
  }
  return result;
}
