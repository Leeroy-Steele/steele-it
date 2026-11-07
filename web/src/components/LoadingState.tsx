interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  return (
    <p role="status" className="py-8 text-center text-sm text-slate-500">
      {label}
    </p>
  );
}
