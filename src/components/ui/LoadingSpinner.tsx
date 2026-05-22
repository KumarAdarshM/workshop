interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  fullPage?: boolean;
  dark?: boolean;
}

const sizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };

export function LoadingSpinner({ size = 'md', label, fullPage, dark }: LoadingSpinnerProps) {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizes[size]} animate-spin rounded-full border-2 ${
          dark ? 'border-brand-mid/40 border-t-brand-terracotta-light' : 'border-brand-mid/50 border-t-brand-terracotta'
        }`}
        role="status"
        aria-label={label ?? 'Loading'}
      />
      {label && (
        <p className={`text-sm ${dark ? 'text-brand-mid' : 'text-brand-mid'}`}>{label}</p>
      )}
    </div>
  );

  if (fullPage) {
    return <div className="flex h-64 items-center justify-center">{spinner}</div>;
  }
  return spinner;
}
