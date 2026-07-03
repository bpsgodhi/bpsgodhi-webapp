import React from 'react';

// Base shimmer block.
export const Skeleton = ({ className = '', style }) => <div className={`skeleton ${className}`} style={style} />;

// Card-grid placeholder (dashboard stat cards, module tiles).
export const SkeletonCards = ({ count = 4 }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-lg border border-sky-200 shadow-sm p-4 flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

// Table placeholder (Records list while first-loading).
export const SkeletonTable = ({ rows = 8, cols = 5 }) => (
  <div className="bg-white rounded-lg border border-sky-200 shadow-sm overflow-hidden">
    <div className="bg-sky-50 border-b border-sky-200 px-4 py-3 flex gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="px-4 py-3.5 flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" style={{ opacity: 1 - r * 0.06 }} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default Skeleton;
