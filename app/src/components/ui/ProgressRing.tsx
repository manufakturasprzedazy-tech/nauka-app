import { useId } from 'react';

interface ProgressRingProps {
  value: number; // 0-1
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  gradient?: boolean;
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  color = '#6366f1',
  bgColor = 'rgba(148,163,184,0.1)',
  gradient = true,
  children,
}: ProgressRingProps) {
  const gradientId = useId();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - Math.min(1, Math.max(0, value)) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
        )}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={gradient ? `url(#${gradientId})` : color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
