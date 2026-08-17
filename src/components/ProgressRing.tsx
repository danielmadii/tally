interface Props {
  /** 0–100+; values over 100 render as a full ring */
  pct: number | null;
  size?: number;
  label: string;
  sublabel: string;
}

export default function ProgressRing({ pct, size = 148, label, sublabel }: Props) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = pct === null ? 0 : Math.min(pct, 100);
  const dash = (clamped / 100) * c;
  const done = pct !== null && pct >= 100;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={done ? "#047857" : "#9d174d"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums">{label}</span>
        <span className="mt-0.5 text-xs text-slate-500">{sublabel}</span>
      </div>
    </div>
  );
}
