interface RadialProgressProps {
  percent: number;
  label: string;
  size?: number;
  strokeWidth?: number;
}

/** Same red/amber/green semantics as the Compliance Verdict + Confidence scale tokens (UI_Design_System.md §2.3). */
function toneForPercent(percent: number): string {
  if (percent >= 80) return 'text-green-500';
  if (percent >= 50) return 'text-accent-orange';
  return 'text-red-500';
}

export default function RadialProgress({ percent, label, size = 72, strokeWidth = 6 }: RadialProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);
  const tone = toneForPercent(clamped);

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
            className={`${tone} transition-[stroke-dashoffset] duration-slow`}
          />
        )}
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${tone}`}>
        {label}
      </span>
    </div>
  );
}
