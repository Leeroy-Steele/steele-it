import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useCreateTopic } from '../../api/topics';
import { ApiError } from '../../api/client';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { TITLE_MAX_LENGTH } from '../../lib/limits';

interface NewTopicDialogProps {
  onClose: () => void;
}

/** Mount it to open it; it unmounts itself through onClose. */
export function NewTopicDialog({ onClose }: NewTopicDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const createTopic = useCreateTopic();
  const [title, setTitle] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    return () => {
      dialog?.close();
    };
  }, []);

  const error = createTopic.error instanceof ApiError ? createTopic.error : null;
  const titleErrors = error?.fieldErrors.title ?? [];
  // Anything the title field cannot show (server down, unexpected 5xx) is shown once, for the form.
  let formError: string | null = null;
  if (createTopic.error && titleErrors.length === 0) {
    formError = error ? error.title : 'Something went wrong. Try again.';
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createTopic.mutate(
      { title, body: '', tags: [] },
      { onSuccess: (topic) => void navigate(`/topics/${topic.id}`) },
    );
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-full max-w-md rounded-lg p-6 shadow-xl backdrop:bg-black/40"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-slate-900">New topic</h2>
        <Field label="Title" errors={titleErrors}>
          {(control) => (
            <input
              {...control}
              type="text"
              value={title}
              maxLength={TITLE_MAX_LENGTH}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          )}
        </Field>
        {formError && (
          <p role="alert" className="text-sm text-red-700">
            {formError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" pending={createTopic.isPending} pendingLabel="Creating…">
            Create
          </Button>
        </div>
      </form>
    </dialog>
  );
}
