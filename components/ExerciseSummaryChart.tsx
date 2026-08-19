type ExerciseSummary = { name: string; totalSets: number; maxWeight: number | null; maxReps: number | null; unit: string };

export default function ExerciseSummaryChart({ exercises, limit }: { exercises: ExerciseSummary[]; limit?: number }) {
  if (exercises.length === 0) return null;

  const shown = limit ? exercises.slice(0, limit) : exercises;
  const rest = limit ? exercises.length - shown.length : 0;
  const maxSets = Math.max(...shown.map((e) => e.totalSets), 1);

  return (
    <div className="space-y-2">
      {shown.map((e) => (
        <div key={e.name} className="flex items-center gap-3">
          <span className="text-xs text-gray-600 w-20 sm:w-24 shrink-0 truncate">{e.name}</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${Math.round((e.totalSets / maxSets) * 100)}%` }} />
          </div>
          <span className="text-xs text-gray-400 shrink-0 text-right whitespace-nowrap">
            {e.totalSets}세트{e.maxWeight != null ? ` · ${e.maxWeight}${e.unit}` : ""}
          </span>
        </div>
      ))}
      {rest > 0 && <p className="text-[11px] text-gray-400 text-right">외 {rest}개 종목</p>}
    </div>
  );
}
