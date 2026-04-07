/**
 * Shimmer loading skeleton for the result card.
 */

import { motion } from 'framer-motion';

export function LoadingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 space-y-6"
      id="loading-skeleton"
    >
      {/* Header */}
      <div className="flex justify-between">
        <div className="shimmer h-9 w-40 rounded-full" />
        <div className="shimmer h-5 w-20 rounded-md" />
      </div>

      {/* Center area */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-12">
        <div className="shimmer h-40 w-40 rounded-full" />
        <div className="space-y-4 w-44">
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="shimmer h-4 w-16 rounded" />
              <div className="shimmer h-4 w-12 rounded" />
            </div>
            <div className="shimmer h-2 w-full rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="shimmer h-4 w-12 rounded" />
              <div className="shimmer h-4 w-12 rounded" />
            </div>
            <div className="shimmer h-2 w-full rounded-full" />
          </div>
        </div>
      </div>

      {/* Feature list */}
      <div className="space-y-2">
        <div className="shimmer h-4 w-40 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="shimmer h-10 w-full rounded-lg" />
        ))}
      </div>
    </motion.div>
  );
}
