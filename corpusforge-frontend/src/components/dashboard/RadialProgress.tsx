interface RadialProgressProps {
  percent: number;
  label: string;
  size?: number;
  strokeWidth?: number;
}

export default function RadialProgress({ percent, label, size = 72, strokeWidth = 6 }: RadialProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border-default"
        />
        {clamped > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-accent-teal transition-[stroke-dashoffset] duration-slow"
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-text-primary">
        {label}
      </span>
    </div>
  );
}
