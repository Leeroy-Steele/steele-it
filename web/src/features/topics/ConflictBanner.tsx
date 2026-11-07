import { Button } from '../../components/Button';

interface ConflictBannerProps {
  /**
   * `stale`: Save was rejected with a 412. `newer`: the cache has a newer version than the one
   * being edited, seen before any Save.
   */
  kind: 'stale' | 'newer';
  /** The version now on the server, if known. */
  currentVersion: number | undefined;
  onReload: () => void;
  reloading: boolean;
  reloadFailed: boolean;
}

export function ConflictBanner({
  kind,
  currentVersion,
  onReload,
  reloading,
  reloadFailed,
}: ConflictBannerProps) {
  const version = currentVersion === undefined ? '' : ` (now version ${currentVersion})`;
  const message =
    kind === 'stale'
      ? `Someone else saved this topic${version} after you opened it. Your changes are still here, but they cannot be saved over the newer version.`
      : `A newer version was saved elsewhere${version}. Your changes are still here, but saving them will be rejected.`;

  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
    >
      <p>{message}</p>
      {reloadFailed && (
        <p className="text-red-700">Could not load the latest version. Try again.</p>
      )}
      <div>
        <Button
          variant="secondary"
          onClick={onReload}
          pending={reloading}
          pendingLabel="Reloading..."
        >
          Reload latest (discards your changes)
        </Button>
      </div>
    </div>
  );
}
