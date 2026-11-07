const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080';

const NETWORK_ERROR_TITLE = 'Cannot reach the server. Check your connection and try again.';

/** Every non-2xx response, and every network failure (status 0), becomes one of these. */
export class ApiError extends Error {
  status: number;
  title: string;
  detail: string | undefined;
  /** Validation messages keyed by field name, for example `title` or `tags[1]`. */
  fieldErrors: Record<string, string[]>;
  /** Any other problem-details members, for example `currentVersion` on a 412. */
  extensions: Record<string, unknown>;

  constructor(init: {
    status: number;
    title: string;
    detail?: string;
    fieldErrors?: Record<string, string[]>;
    extensions?: Record<string, unknown>;
  }) {
    super(init.title);
    this.name = 'ApiError';
    this.status = init.status;
    this.title = init.title;
    this.detail = init.detail;
    this.fieldErrors = init.fieldErrors ?? {};
    this.extensions = init.extensions ?? {};
  }
}

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Serialised as JSON. */
  body?: unknown;
  /** Sent as the If-Match header exactly as given, so pass the quoted ETag, for example `"3"`. */
  ifMatch?: string;
}

/** The RFC 9457 members that have their own ApiError field; the rest become extensions. */
const KNOWN_PROBLEM_MEMBERS = new Set(['type', 'title', 'status', 'detail', 'instance', 'errors']);

export async function apiFetch<T>(
  path: string,
  { method = 'GET', body, ifMatch }: ApiFetchOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (ifMatch !== undefined) {
    headers['If-Match'] = ifMatch;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError({ status: 0, title: NETWORK_ERROR_TITLE });
  }

  if (!response.ok) {
    throw await toApiError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function toApiError(response: Response): Promise<ApiError> {
  let problem: Record<string, unknown> = {};
  try {
    const parsed: unknown = await response.json();
    if (typeof parsed === 'object' && parsed !== null) {
      problem = parsed as Record<string, unknown>;
    }
  } catch {
    // The body was empty or not JSON: fall back to the status line below.
  }

  const extensions: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(problem)) {
    if (!KNOWN_PROBLEM_MEMBERS.has(key)) {
      extensions[key] = value;
    }
  }

  return new ApiError({
    status: response.status,
    title:
      typeof problem.title === 'string' && problem.title !== ''
        ? problem.title
        : `Request failed (${response.status})`,
    detail: typeof problem.detail === 'string' ? problem.detail : undefined,
    fieldErrors: toFieldErrors(problem.errors),
    extensions,
  });
}

function toFieldErrors(errors: unknown): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  if (typeof errors !== 'object' || errors === null) {
    return fieldErrors;
  }
  for (const [field, messages] of Object.entries(errors)) {
    if (Array.isArray(messages)) {
      fieldErrors[field] = messages.filter((m): m is string => typeof m === 'string');
    }
  }
  return fieldErrors;
}
