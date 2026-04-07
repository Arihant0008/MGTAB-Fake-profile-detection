/**
 * Circular confidence gauge with SVG animation, redesigned for enterprise look.
 */

import { useEffect, useState } from 'react';

interface ConfidenceGaugeProps {
  /** Confidence value between 0 and 1. */
  confidence: number;
  /** Prediction label. */
  label: 'bot' | 'human';
  /** Gauge size in pixels. */
  size?: number;
}

export function ConfidenceGauge({ confidence, label, size = 180 }: ConfidenceGaugeProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(confidence), 100);
    return () => clearTimeout(timer);
  }, [confidence]);

  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - animatedProgress * circumference;
  const center = size / 2;

  const isBot = label === 'bot';
  const strokeColor = isBot ? 'var(--accent-bot)' : 'var(--accent-human)';
  const glowShadow = isBot 
    ? 'drop-shadow(0 0 24px rgba(244, 63, 94, 0.25))' 
    : 'drop-shadow(0 0 24px rgba(16, 185, 129, 0.25))';

  const percentage = Math.round(confidence * 100);

  return (
    <div
      className="relative flex items-center justify-center p-4 rounded-full bg-[var(--surface-0)] border border-[var(--surface-2)] shadow-xl"
      style={{ filter: glowShadow }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.4s cubic-bezier(0.1, 0.7, 0.2, 1)',
          }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-4xl font-black tabular-nums tracking-tighter"
          style={{ color: strokeColor }}
        >
          {percentage}%
        </span>
        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
          Certainty
        </span>
      </div>
    </div>
  );
}
