// ACSM 저항운동 처방 가이드라인(2026) 기반 월간 리포트 계산
// - 세트 2~3세트/세션(근력), 주당 총 10세트 이상(근비대), 전 가동범위, 점진적 과부하
// - 수업 빈도는 트레이너와의 계약(주 N회)으로 이미 고정되는 경우가 많아 ACSM 주당 빈도 기준과 비교하지 않고,
//   월별 실제 수업 횟수(sessionCount)만 그대로 기록한다.

export type ExerciseEntry = {
  name: string;
  sets: number | null;
  reps: string | null;
  weight: number | null;
  unit: string;
  isMain: boolean;
  bodyParts: string[];
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
  totalSets: number;
  avgSetsPerSession: number;
  exercises: Map<string, ExerciseStat>;
  // 부위 태그 기준 세트수 집계 (다중 태그 시 각 부위에 동일 세트수 반영, 태그 없는 기록은 미포함)
  bodyPartVolume: Map<string, number>;
};

export type Feedback = { type: "positive" | "warning" | "info"; text: string };

export type ExerciseFeedback = {
  name: string;
  stat: string;
  checklist: string[];
};

export type MonthlyFeedback = {
  notice: Feedback[];
  improved: ExerciseFeedback[];
  stagnant: ExerciseFeedback[];
};

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
  const bodyPartVolume = new Map<string, number>();
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

      for (const part of e.bodyParts) {
        bodyPartVolume.set(part, (bodyPartVolume.get(part) ?? 0) + sets);
      }
    }
  }

  return {
    yearMonth,
    sessionCount: monthSessions.length,
    weeksInMonth,
    totalSets,
    avgSetsPerSession: monthSessions.length > 0 ? totalSets / monthSessions.length : 0,
    exercises,
    bodyPartVolume,
  };
}

// 특정 메인 운동이 정체됐을 때 함께 추천할 보조 운동 (키워드 매칭, 구체적인 것부터 순서대로 검사)
const ACCESSORY_SUGGESTIONS: { keywords: string[]; accessories: string[] }[] = [
  { keywords: ["루마니안 데드리프트", "RDL"], accessories: ["싱글레그 데드리프트", "파머스 캐리"] },
  { keywords: ["데드리프트"], accessories: ["힙 쓰러스트", "굿모닝"] },
  { keywords: ["스쿼트"], accessories: ["레그프레스", "불가리안 스플릿 스쿼트"] },
  { keywords: ["벤치프레스"], accessories: ["덤벨 벤치프레스", "딥스"] },
  { keywords: ["숄더프레스", "오버헤드프레스", "밀리터리프레스"], accessories: ["레터럴 레이즈", "페이스풀"] },
  { keywords: ["풀업", "친업", "랫풀다운"], accessories: ["시티드 로우", "스트레이트암 풀다운"] },
  { keywords: ["로우"], accessories: ["원암 덤벨로우", "시티드 로우"] },
  { keywords: ["힙 쓰러스트", "힙쓰러스트"], accessories: ["글루트 브릿지", "케이블 킥백"] },
];

function findAccessories(exerciseName: string): string[] | null {
  for (const { keywords, accessories } of ACCESSORY_SUGGESTIONS) {
    if (keywords.some((k) => exerciseName.includes(k))) return accessories;
  }
  return null;
}

type RankedExercise = { name: string; stat: ExerciseStat; prevStat: ExerciseStat; weightDiff: number; repsDiff: number; score: number };

function toExerciseFeedback(r: RankedExercise, kind: "improved" | "stagnant"): ExerciseFeedback {
  const { name, stat, prevStat, weightDiff, repsDiff } = r;
  const unit = stat.unit;

  let statLine: string;
  if (weightDiff !== 0) {
    statLine = `${prevStat.maxWeight}${unit} → ${stat.maxWeight}${unit} (${weightDiff > 0 ? "+" : ""}${weightDiff}${unit})`;
  } else if (repsDiff !== 0) {
    statLine = `${stat.maxWeight}${unit} 유지 · ${prevStat.maxReps}회 → ${stat.maxReps}회`;
  } else {
    statLine = `${stat.maxWeight}${unit} 유지`;
  }

  const checklist: string[] = [];
  if (kind === "improved") {
    checklist.push("현재 페이스를 유지하며 다음 달에도 점진적으로 중량을 늘려보세요");
    if (weightDiff > 0) checklist.push("중량이 오른 만큼 자세가 무너지지 않는지 다시 체크해보세요");
  } else {
    if (repsDiff <= 0) checklist.push("반복 횟수를 더 높이고 중량은 유지해보세요");
    checklist.push("세트 수를 1세트 늘려보세요");
    const accessories = findAccessories(name);
    if (accessories) checklist.push(`보조 운동으로 ${accessories.join(", ")} 등을 추가해보세요`);
  }

  return { name, stat: statLine, checklist };
}

export function generateFeedback(current: MonthStats, previous: MonthStats | null): MonthlyFeedback {
  const notice: Feedback[] = [];

  if (current.sessionCount === 0) {
    notice.push({ type: "warning", text: "이번 달 등록된 수업 기록이 없습니다." });
    return { notice, improved: [], stagnant: [] };
  }

  if (current.exercises.size === 0) {
    notice.push({
      type: "info",
      text: "이번 달은 '메인' 표시된 종목이 없어 세트·중량·반복수 비교를 할 수 없습니다. 비교가 필요한 종목에 메인 표시를 확인해주세요.",
    });
    return { notice, improved: [], stagnant: [] };
  }

  if (!previous) {
    notice.push({ type: "info", text: "비교할 지난달 기록이 없어 이번 달은 종목별 변화 추이를 보여줄 수 없습니다." });
    return { notice, improved: [], stagnant: [] };
  }

  const ranked: RankedExercise[] = [];
  for (const [name, stat] of current.exercises) {
    if (stat.maxWeight == null) continue;
    const prevStat = previous.exercises.get(name);
    if (!prevStat || prevStat.maxWeight == null) continue;
    const weightDiff = stat.maxWeight - prevStat.maxWeight;
    const repsDiff = (stat.maxReps ?? 0) - (prevStat.maxReps ?? 0);
    // 중량 변화를 우선 기준으로 삼고, 중량이 같을 때만 반복수 변화로 순위를 매긴다
    const score = weightDiff !== 0 ? weightDiff * 10 : repsDiff;
    ranked.push({ name, stat, prevStat, weightDiff, repsDiff, score });
  }

  if (ranked.length === 0) {
    notice.push({ type: "info", text: "지난달과 비교할 수 있는 메인 종목이 없습니다." });
    return { notice, improved: [], stagnant: [] };
  }

  const improved = [...ranked]
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => toExerciseFeedback(r, "improved"));

  const stagnant = [...ranked]
    .filter((r) => r.score <= 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((r) => toExerciseFeedback(r, "stagnant"));

  return { notice, improved, stagnant };
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
    targetFrequency: Math.max(current.sessionCount, 1),
    targetSets: 3,
    targetVolume: Math.max(10, Math.round(weeklyVolume) || 10),
    intensityGuide: parts.join(" "),
  };
}
