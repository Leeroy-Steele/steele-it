interface TagChipProps {
  label: string;
  /** When given, the chip shows a remove button. */
  onRemove?: () => void;
  /** Highlights the chip, for a tag the server rejected. */
  error?: boolean;
}

export function TagChip({ label, onRemove, error = false }: TagChipProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        error
          ? 'border-red-400 bg-red-50 text-red-800'
          : 'border-slate-200 bg-slate-100 text-slate-700',
      ].join(' ')}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove tag ${label}`}
          className="rounded-full px-1 leading-none hover:bg-black/10 focus-visible:outline-2"
        >
          ×
        </button>
      )}
    </span>
  );
}
