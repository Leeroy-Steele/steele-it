import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './Button';

interface ConfirmDialogProps {
  title: string;
  /** A node rather than a string so callers can emphasise titles in the message. */
  message: ReactNode;
  /** Shown on the confirm button. Needed only with onConfirm. */
  confirmLabel?: string;
  /** `danger` for an action that cannot be undone. */
  confirmVariant?: 'primary' | 'danger';
  cancelLabel?: string;
  /** Leave out when there is nothing to confirm: the dialog then only informs, with one button. */
  onConfirm?: () => void;
  onCancel: () => void;
}

/** Mount it to open it; unmount it (usually from onConfirm or onCancel) to close it. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmVariant = 'primary',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    return () => {
      dialog?.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      // Escape: let the parent decide, so the dialog never closes while still mounted.
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-full max-w-md rounded-lg p-6 shadow-xl backdrop:bg-black/40"
    >
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-2 text-sm text-slate-700">{message}</div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        {onConfirm && (
          <Button variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        )}
      </div>
    </dialog>
  );
}
