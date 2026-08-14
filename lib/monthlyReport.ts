// ACSM 저항운동 처방 가이드라인(2026) 기반 월간 리포트 계산
// - 빈도 ≥2회/주, 세트 2~3세트/세션(근력), 주당 총 10세트 이상(근비대), 전 가동범위, 점진적 과부하

export type ExerciseEntry = {
  name: string;
  sets: number | null;
  weight: number | null;
  unit: string;
};

export type SessionEntry = {
  date: string; // "YYYY-MM-DD"
  exercises: ExerciseEntry[];
};

export type ExerciseStat = {
  occurrences: number;
  totalSets: number;
  maxWeight: number | null;
  weightSum: number;
  weightCount: number;
  unit: string;
};

export type MonthStats = {
  yearMonth: string;
  sessionCount: number;
  weeksInMonth: number;
  avgFrequency: number;
  totalSets: number;
  avgSetsPerSession: number;
  exercises: Map<string, ExerciseStat>;
};

export type Feedback = { type: "positive" | "warning" | "info"; text: string };

export type GoalSuggestion = {
  targetFrequency: number;
  targetSets: number;
  targetVolume: number;
  intensityGuide: string;
};

export function yearMonthOf(dateStr: string) {
  return dateStr.slice(0, 7);
}

export function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftYearMonth(yearMonth: string, delta: number) {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatYearMonth(yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  return `${y}년 ${m}월`;
}

function daysInMonth(yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function getMonthStats(sessions: SessionEntry[], yearMonth: string): MonthStats {
  const monthSessions = sessions.filter((s) => yearMonthOf(s.date) === yearMonth);
  const weeksInMonth = daysInMonth(yearMonth) / 7;

  const exercises = new Map<string, ExerciseStat>();
  let totalSets = 0;

  for (const s of monthSessions) {
    for (const e of s.exercises) {
      const sets = e.sets ?? 0;
      totalSets += sets;
      const cur = exercises.get(e.name) ?? {
        occurrences: 0,
        totalSets: 0,
        maxWeight: null,
        weightSum: 0,
        weightCount: 0,
        unit: e.unit,
      };
      cur.occurrences += 1;
      cur.totalSets += sets;
      cur.unit = e.unit;
      if (e.weight != null) {
        cur.maxWeight = cur.maxWeight == null ? e.weight : Math.max(cur.maxWeight, e.weight);
        cur.weightSum += e.weight;
        cur.weightCount += 1;
      }
      exercises.set(e.name, cur);
    }
  }

  return {
    yearMonth,
    sessionCount: monthSessions.length,
    weeksInMonth,
    avgFrequency: weeksInMonth > 0 ? monthSessions.length / weeksInMonth : 0,
    totalSets,
    avgSetsPerSession: monthSessions.length > 0 ? totalSets / monthSessions.length : 0,
    exercises,
  };
}

export function generateFeedback(current: MonthStats, previous: MonthStats | null): Feedback[] {
  const feedback: Feedback[] = [];

  if (current.sessionCount === 0) {
    feedback.push({ type: "warning", text: "이번 달 등록된 수업 기록이 없습니다." });
    return feedback;
  }

  const freq = Math.round(current.avgFrequency * 10) / 10;
  if (current.avgFrequency >= 2) {
    feedback.push({ type: "positive", text: `주 평균 ${freq}회 운동 — ACSM 권장 빈도(주 2회 이상)를 충족하고 있습니다.` });
  } else {
    feedback.push({ type: "warning", text: `주 평균 ${freq}회로 ACSM 권장 빈도(주 2회 이상)에 못 미칩니다.` });
  }

  if (previous && previous.sessionCount > 0) {
    const freqDelta = Math.round((current.avgFrequency - previous.avgFrequency) * 10) / 10;
    if (freqDelta > 0.05) {
      feedback.push({ type: "positive", text: `지난달 대비 운동 빈도가 주 ${freqDelta}회 늘었습니다.` });
    } else if (freqDelta < -0.05) {
      feedback.push({ type: "warning", text: `지난달 대비 운동 빈도가 주 ${Math.abs(freqDelta)}회 줄었습니다.` });
    }
  }

  const avgSets = Math.round(current.avgSetsPerSession * 10) / 10;
  if (avgSets >= 2) {
    feedback.push({ type: "positive", text: `세션당 평균 ${avgSets}세트 — ACSM 권장 세트 수(2~3세트)를 충족합니다.` });
  } else if (avgSets > 0) {
    feedback.push({ type: "warning", text: `세션당 평균 ${avgSets}세트로 다소 부족합니다. 세션당 2~3세트를 목표로 하세요.` });
  }

  if (previous) {
    const tracked = Array.from(current.exercises.entries()).filter(([, s]) => s.weightCount > 0);
    let improved = 0;
    let compared = 0;
    for (const [name, stat] of tracked) {
      const prevStat = previous.exercises.get(name);
      if (!prevStat || prevStat.maxWeight == null || stat.maxWeight == null) continue;
      compared += 1;
      if (stat.maxWeight > prevStat.maxWeight) improved += 1;
    }
    if (compared > 0) {
      if (improved / compared >= 0.5) {
        feedback.push({
          type: "positive",
          text: `추적 중인 ${compared}개 종목 중 ${improved}개에서 최고 중량이 증가했습니다 — 점진적 과부하가 잘 적용되고 있습니다.`,
        });
      } else {
        feedback.push({
          type: "warning",
          text: `추적 중인 ${compared}개 종목 중 ${improved}개만 중량이 증가했습니다. 중량·세트·반복수 중 하나를 소폭 높여보세요.`,
        });
      }
    }
  }

  return feedback;
}

export function suggestGoal(current: MonthStats): GoalSuggestion {
  const weeklyVolume = current.weeksInMonth > 0 ? current.totalSets / current.weeksInMonth : 0;
  return {
    targetFrequency: Math.max(2, Math.ceil(current.avgFrequency || 2)),
    targetSets: 3,
    targetVolume: Math.max(10, Math.round(weeklyVolume) || 10),
    intensityGuide: "주요 복합 운동은 전 가동범위로, 고중량·저반복(6~10회) 위주로 진행하고 이전 달 대비 중량·세트·반복수 중 하나를 점진적으로 늘리세요.",
  };
}
