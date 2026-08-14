// ACSM 저항운동 처방 가이드라인(2026) 기반 월간 리포트 계산
// - 빈도 ≥2회/주, 세트 2~3세트/세션(근력), 주당 총 10세트 이상(근비대), 전 가동범위, 점진적 과부하

export type ExerciseEntry = {
  name: string;
  sets: number | null;
  reps: string | null;
  weight: number | null;
  unit: string;
  isMain: boolean;
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
  maxReps: number | null;
  unit: string;
};

// "8-12", "10회" 등 자유 텍스트에서 가장 큰 숫자를 반복수로 추출
function parseMaxReps(reps: string | null): number | null {
  if (!reps) return null;
  const nums = reps.match(/\d+(\.\d+)?/g);
  if (!nums || nums.length === 0) return null;
  return Math.max(...nums.map(Number));
}

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
    // 스트레칭 등 보조 운동(isMain: false)은 세트/중량/반복수 비교에서 제외
    for (const e of s.exercises.filter((ex) => ex.isMain)) {
      const sets = e.sets ?? 0;
      totalSets += sets;
      const cur = exercises.get(e.name) ?? {
        occurrences: 0,
        totalSets: 0,
        maxWeight: null,
        weightSum: 0,
        weightCount: 0,
        maxReps: null,
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
      const reps = parseMaxReps(e.reps);
      if (reps != null) {
        cur.maxReps = cur.maxReps == null ? reps : Math.max(cur.maxReps, reps);
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

  if (current.exercises.size === 0) {
    feedback.push({
      type: "info",
      text: "이번 달은 '메인' 표시된 종목이 없어 세트·중량·반복수 비교를 할 수 없습니다. 비교가 필요한 종목에 메인 표시를 확인해주세요.",
    });
    return feedback;
  }

  const avgSets = Math.round(current.avgSetsPerSession * 10) / 10;
  if (avgSets >= 2) {
    feedback.push({ type: "positive", text: `메인 운동 기준 세션당 평균 ${avgSets}세트 — ACSM 권장 세트 수(2~3세트)를 충족합니다.` });
  } else if (avgSets > 0) {
    feedback.push({ type: "warning", text: `메인 운동 기준 세션당 평균 ${avgSets}세트로 다소 부족합니다. 세션당 2~3세트를 목표로 하세요.` });
  }

  if (previous) {
    let weightUp = 0;
    let repsUpOnly = 0;
    let compared = 0;
    for (const [name, stat] of current.exercises) {
      if (stat.maxWeight == null) continue;
      const prevStat = previous.exercises.get(name);
      if (!prevStat || prevStat.maxWeight == null) continue;
      compared += 1;
      if (stat.maxWeight > prevStat.maxWeight) {
        weightUp += 1;
      } else if (stat.maxReps != null && prevStat.maxReps != null && stat.maxReps > prevStat.maxReps) {
        repsUpOnly += 1;
      }
    }
    const progressed = weightUp + repsUpOnly;
    if (compared > 0) {
      const detail = repsUpOnly > 0 ? ` (중량 증가 ${weightUp}개, 동일 중량에서 반복수 증가 ${repsUpOnly}개)` : "";
      if (progressed / compared >= 0.5) {
        feedback.push({
          type: "positive",
          text: `메인 운동 ${compared}개 종목 중 ${progressed}개에서 중량 또는 반복수가 늘었습니다${detail} — 점진적 과부하가 잘 적용되고 있습니다.`,
        });
      } else {
        feedback.push({
          type: "warning",
          text: `메인 운동 ${compared}개 종목 중 ${progressed}개만 중량·반복수가 늘었습니다${detail}. 나머지 종목은 중량·세트·반복수 중 하나를 소폭 높여보세요.`,
        });
      }
    }
  }

  return feedback;
}

export type PainAreaLite = { area: string; intensity: "caution" | "watch" | "avoid" };

export type ClientContext = {
  exerciseLevel: string | null;
  painAreas: PainAreaLite[];
};

function levelIntensityBase(level: string | null): string {
  switch (level) {
    case "advanced":
      return "숙련자이므로 주요 복합 운동은 고중량·저반복(6~8회, RIR 1~2)으로 진행하고, 정체된 종목은 세트 수나 빈도 변주(주기화)를 고려하세요.";
    case "intermediate":
      return "주요 복합 운동은 전 가동범위로, 고중량·저반복(6~10회, RIR 2~3) 위주로 진행하세요.";
    case "beginner":
      return "아직 초보 단계이므로 무거운 중량보다 정확한 동작(전 가동범위)과 꾸준한 빈도를 우선하고, 중량은 회당 2.5~5%씩 소폭 늘리세요.";
    case "none":
      return "운동 경험이 적은 만큼 가벼운 중량으로 동작을 먼저 익히고, 통증 없이 10~15회를 편하게 반복할 수 있을 때 중량을 올리세요.";
    default:
      return "주요 복합 운동은 전 가동범위로, 고중량·저반복(6~10회) 위주로 진행하세요.";
  }
}

export function suggestGoal(
  current: MonthStats,
  previous: MonthStats | null,
  ctx: ClientContext = { exerciseLevel: null, painAreas: [] }
): GoalSuggestion {
  const weeklyVolume = current.weeksInMonth > 0 ? current.totalSets / current.weeksInMonth : 0;
  const parts: string[] = [levelIntensityBase(ctx.exerciseLevel)];

  if (previous) {
    const improved: string[] = [];
    const stagnant: string[] = [];
    for (const [name, stat] of current.exercises) {
      if (stat.maxWeight == null) continue;
      const prevStat = previous.exercises.get(name);
      if (!prevStat || prevStat.maxWeight == null) continue;
      const repsUp = stat.maxReps != null && prevStat.maxReps != null && stat.maxReps > prevStat.maxReps;
      if (stat.maxWeight > prevStat.maxWeight || repsUp) improved.push(name);
      else stagnant.push(name);
    }
    if (stagnant.length > 0) {
      parts.push(
        `${stagnant.slice(0, 3).join(", ")}${stagnant.length > 3 ? " 등" : ""} 중량이 지난달과 같거나 줄었어요 — 이 종목들부터 소폭 증량을 시도해보세요.`
      );
    } else if (improved.length > 0) {
      parts.push(
        `${improved.slice(0, 3).join(", ")}${improved.length > 3 ? " 등" : ""} 종목이 잘 늘고 있으니 같은 방식으로 계속 진행하세요.`
      );
    }
  }

  const avoidAreas = ctx.painAreas.filter((p) => p.intensity === "avoid").map((p) => p.area);
  const watchAreas = ctx.painAreas.filter((p) => p.intensity !== "avoid").map((p) => p.area);
  if (avoidAreas.length > 0) {
    parts.push(`${avoidAreas.join(", ")} 부위는 통증으로 직접 부하가 가는 동작은 피하고 대체 운동을 활용하세요.`);
  }
  if (watchAreas.length > 0) {
    parts.push(`${watchAreas.join(", ")} 부위는 통증 여부를 확인하며 진행하세요.`);
  }

  return {
    targetFrequency: Math.max(2, Math.ceil(current.avgFrequency || 2)),
    targetSets: 3,
    targetVolume: Math.max(10, Math.round(weeklyVolume) || 10),
    intensityGuide: parts.join(" "),
  };
}
