// Types the environment variables the app reads, so a typo in a name fails the type check.
interface ImportMetaEnv {
  /** Base URL of the API. Defaults to http://localhost:5080 when unset. */
  readonly VITE_API_BASE_URL?: string;
}
