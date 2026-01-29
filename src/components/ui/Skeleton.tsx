import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animated?: boolean;
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animated = true,
}: SkeletonProps) {
  const baseClasses = 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200';
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (!animated) {
    return (
      <div
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        style={style}
      />
    );
  }

  return (
    <motion.div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{
        ...style,
        backgroundSize: '200% 100%',
      }}
      animate={{
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

// Skeleton presets for common use cases
export function SkeletonCard() {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-start gap-4">
        <Skeleton variant="circular" width={56} height={56} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" />
          <Skeleton width="40%" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton width="100%" />
        <Skeleton width="80%" />
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonPractitionerCard() {
  return (
    <div className="glass-card p-6">
      <div className="flex items-start gap-4">
        <Skeleton variant="circular" width={64} height={64} />
        <div className="flex-1 space-y-3">
          <Skeleton width="70%" height={20} />
          <Skeleton width="50%" height={16} />
          <div className="flex gap-2 mt-2">
            <Skeleton width={80} height={24} variant="rectangular" />
            <Skeleton width={60} height={24} variant="rectangular" />
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-200">
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

export function SkeletonPitchSection() {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <Skeleton width={200} height={24} />
      </div>
      <div className="space-y-2">
        <Skeleton width="100%" />
        <Skeleton width="95%" />
        <Skeleton width="90%" />
        <Skeleton width="85%" />
      </div>
    </div>
  );
}
