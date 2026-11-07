import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** While true the button is disabled and shows `pendingLabel` (if given) instead of its children. */
  pending?: boolean;
  pendingLabel?: string;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-indigo-600',
  secondary:
    'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:outline-slate-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
};

export function Button({
  variant = 'primary',
  pending = false,
  pendingLabel,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || pending;
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={pending || undefined}
      className={[
        'rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
