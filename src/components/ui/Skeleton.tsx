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

export function SkeletonStatCard() {
  return (
    <div className="glass-card p-6">
      <Skeleton width="50%" height={16} className="mb-3" />
      <Skeleton width="70%" height={32} className="mb-2" />
      <Skeleton width="40%" height={14} />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="glass-card p-6">
      <Skeleton width="40%" height={24} className="mb-6" />
      <div className="h-64 flex items-end justify-between gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            className="flex-1"
            height={Math.random() * 200 + 50}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="glass-card p-4 flex items-center gap-4">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton width="70%" height={16} />
            <Skeleton width="40%" height={14} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonProfilePage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="space-y-6">
        <div className="glass-card p-6">
          <Skeleton variant="circular" width={96} height={96} className="mx-auto mb-4" />
          <Skeleton width="80%" height={24} className="mx-auto mb-2" />
          <Skeleton width="60%" height={16} className="mx-auto mb-6" />

          <div className="space-y-3">
            <Skeleton height={14} />
            <Skeleton height={14} />
            <Skeleton height={14} />
          </div>
        </div>

        <div className="glass-card p-6">
          <Skeleton variant="rectangular" width="100%" height={120} className="mb-4" />
          <div className="space-y-3">
            <Skeleton height={14} />
            <Skeleton height={14} />
            <Skeleton height={14} />
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Tabs */}
        <div className="glass-card p-2 flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" className="flex-1" height={48} />
          ))}
        </div>

        {/* Content */}
        <div className="space-y-4">
          <Skeleton variant="rectangular" width="100%" height={200} />
          <Skeleton variant="rectangular" width="100%" height={150} />
          <Skeleton variant="rectangular" width="100%" height={150} />
        </div>
      </div>
    </div>
  );
}
