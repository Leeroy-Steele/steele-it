import type { ReactNode } from 'react';

interface EmptyStateProps {
  message: string;
  /** An optional action, for example a "New topic" button. */
  children?: ReactNode;
}

export function EmptyState({ message, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <p className="text-sm text-slate-500">{message}</p>
      {children}
    </div>
  );
}
