import { CheckCircle2, AlertTriangle, Info, Check } from "lucide-react";
import type { MonthlyFeedback, ExerciseFeedback } from "@/lib/monthlyReport";

export default function ExerciseFeedbackSection({ feedback }: { feedback: MonthlyFeedback }) {
  return (
    <div className="space-y-4">
      {feedback.notice.length > 0 && (
        <div className="space-y-2">
          {feedback.notice.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              {f.type === "positive" && <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />}
              {f.type === "warning" && <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />}
              {f.type === "info" && <Info size={16} className="text-gray-400 shrink-0 mt-0.5" />}
              <span className="text-gray-700">{f.text}</span>
            </div>
          ))}
        </div>
      )}

      {feedback.improved.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-emerald-600">강도가 잘 증가한 운동</p>
          <div className="space-y-2">
            {feedback.improved.map((ex) => (
              <ExerciseFeedbackCard key={ex.name} item={ex} tone="improved" />
            ))}
          </div>
        </div>
      )}

      {feedback.stagnant.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-600">보완이 필요한 운동</p>
          <div className="space-y-2">
            {feedback.stagnant.map((ex) => (
              <ExerciseFeedbackCard key={ex.name} item={ex} tone="stagnant" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseFeedbackCard({ item, tone }: { item: ExerciseFeedback; tone: "improved" | "stagnant" }) {
  const border = tone === "improved" ? "border-emerald-100 bg-emerald-50/40" : "border-amber-100 bg-amber-50/40";
  const iconColor = tone === "improved" ? "text-emerald-500" : "text-amber-500";

  return (
    <div className={`rounded-xl border p-3 ${border}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{item.name}</p>
        <span className="text-xs text-gray-500 shrink-0">{item.stat}</span>
      </div>
      <ul className="mt-1.5 space-y-1">
        {item.checklist.map((c, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
            <Check size={12} className={`shrink-0 mt-0.5 ${iconColor}`} />
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
