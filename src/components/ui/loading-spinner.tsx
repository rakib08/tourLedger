type LoadingSpinnerProps = {
  size?: number;
  label?: string;
  className?: string;
};

export function LoadingSpinner({ size = 20, label = 'Loading', className }: LoadingSpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`tourledger-spinner inline-block shrink-0 ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}
