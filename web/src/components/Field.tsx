import { useId, type ReactNode } from 'react';

/** Spread these onto the control so the label and the error messages are wired to it. */
export interface FieldControlProps {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
}

interface FieldProps {
  label: string;
  /** Error messages shown under the control; none means no error. */
  errors?: string[];
  children: (control: FieldControlProps) => ReactNode;
}

export function Field({ label, errors = [], children }: FieldProps) {
  const id = useId();
  const errorId = `${id}-errors`;
  const hasErrors = errors.length > 0;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-800">
        {label}
      </label>
      {children({
        id,
        'aria-describedby': hasErrors ? errorId : undefined,
        'aria-invalid': hasErrors ? true : undefined,
      })}
      {hasErrors && (
        <div id={errorId} className="flex flex-col gap-0.5 text-sm text-red-700">
          {errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
    </div>
  );
}
