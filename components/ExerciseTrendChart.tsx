import { formatDate } from "@/lib/utils";

type Point = { date: string; weight: number; unit: string };

export default function ExerciseTrendChart({ points }: { points: Point[] }) {
  const width = 300;
  const height = 64;
  const padX = 6;
  const padY = 8;

  const weights = points.map((p) => p.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const stepX = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;

  const coords = points.map((p, i) => ({
    x: padX + i * stepX,
    y: padY + (height - padY * 2) * (1 - (p.weight - min) / range),
  }));
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  const first = points[0];
  const last = points[points.length - 1];
  const delta = Math.round((last.weight - first.weight) * 10) / 10;

  return (
    <div className="space-y-1.5">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-14" preserveAspectRatio="none">
        <path d={path} fill="none" stroke="#6366f1" strokeWidth={2} />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 3.5 : 2.5} fill={i === coords.length - 1 ? "#4338ca" : "#a5b4fc"} />
        ))}
      </svg>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{formatDate(first.date)} · {first.weight}{first.unit}</span>
        <span className={delta > 0 ? "text-emerald-600 font-medium" : delta < 0 ? "text-rose-500 font-medium" : "text-gray-400 font-medium"}>
          {delta > 0 ? "+" : ""}{delta}{last.unit}
        </span>
        <span>{formatDate(last.date)} · {last.weight}{last.unit}</span>
      </div>
    </div>
  );
}
