import { motion } from "motion/react";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  lines?: number;
}

export function Skeleton({
  className = "",
  width,
  height,
  rounded = true,
  lines,
}: SkeletonProps) {
  if (lines) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <motion.div
            key={i}
            className="bg-white/10"
            style={{
              width: i === lines - 1 ? "60%" : "100%",
              height: height || 16,
              borderRadius: rounded ? 8 : 0,
            }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className={`bg-white/10 ${rounded ? "rounded-lg" : ""} ${className}`}
      style={{ width, height }}
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <Skeleton width={32} height={32} rounded />
      <div className="flex-1 space-y-2">
        <Skeleton width={120} height={16} />
        <Skeleton lines={3} />
      </div>
    </div>
  );
}

export function AgentCardSkeleton() {
  return (
    <div className="p-4 border border-white/10 rounded-xl">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton width={40} height={40} rounded />
        <div className="flex-1">
          <Skeleton width={100} height={16} />
          <Skeleton width={60} height={12} className="mt-2" />
        </div>
      </div>
      <Skeleton lines={2} />
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton width={200} height={24} />
      <Skeleton lines={4} />
      <div className="grid grid-cols-2 gap-4">
        <AgentCardSkeleton />
        <AgentCardSkeleton />
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/10">
        <Skeleton width={150} height={20} />
      </div>
      <div className="flex-1 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <MessageSkeleton key={i} />
        ))}
      </div>
      <div className="p-4 border-t border-white/10">
        <Skeleton height={48} rounded />
      </div>
    </div>
  );
}
