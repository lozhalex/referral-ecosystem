interface SkeletonProps {
  variant?: 'text' | 'card' | 'circle' | 'rect' | 'avatar' | 'button';
  width?: string;
  height?: string;
  className?: string;
  lines?: number;
}

export default function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  lines = 1,
}: SkeletonProps) {
  const baseClasses = 'bg-white/5 animate-pulse rounded-lg';

  if (variant === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} h-3 ${
              i === lines - 1 ? 'w-4/5' : 'w-full'
            }`}
            style={width ? { width } : undefined}
          />
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`${baseClasses} p-4 space-y-3 ${className}`} style={{ height }}>
        <div className="flex items-center justify-between">
          <div className={`${baseClasses} h-4 w-1/3`} />
          <div className={`${baseClasses} h-4 w-1/4`} />
        </div>
        <div className={`${baseClasses} h-3 w-2/3`} />
        <div className={`${baseClasses} h-3 w-full`} />
        <div className={`${baseClasses} h-3 w-4/5`} />
      </div>
    );
  }

  if (variant === 'circle' || variant === 'avatar') {
    return (
      <div
        className={`${baseClasses} rounded-full ${className}`}
        style={{
          width: width || '64px',
          height: height || '64px',
        }}
      />
    );
  }

  if (variant === 'button') {
    return (
      <div
        className={`${baseClasses} h-10 ${className}`}
        style={{ width: width || '120px' }}
      />
    );
  }

  // rect (по умолчанию)
  return (
    <div
      className={`${baseClasses} ${className}`}
      style={{
        width: width || '100%',
        height: height || '100px',
      }}
    />
  );
}