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
// 근거: NSCA/일반 S&C 코칭에서 통용되는 약점 보완 매칭 —
//  - 스쿼트·데드리프트: 힙 쓰러스트(둔근)·굿모닝(후면 사슬)이 대표적 보조 운동으로 꼽힘
//  - 벤치프레스: 락아웃 구간이 막히면 딥스·스컬크러셔 등 삼두 고립 운동을 보조로 추가
//  - 루마니안 데드리프트: 싱글레그 데드리프트로 좌우 불균형을, 파머스 캐리로 코어·그립을 보강
//  - 바벨로우: 페이스풀·친업 등 당기기 패턴을 보조로 함께 프로그래밍
// 각 그룹의 보조 운동은 해당 그룹의 키워드와 겹치지 않는 이름으로만 구성해 "같은 운동을 자기 보조 운동으로 추천"하는 경우를 방지
const ACCESSORY_GROUPS: { keywords: string[]; reason: string; items: string[] }[] = [
  { keywords: ["루마니안 데드리프트", "RDL"], reason: "좌우 불균형과 코어·그립 안정성을 함께 보강하려면", items: ["싱글레그 데드리프트", "파머스 캐리"] },
  { keywords: ["데드리프트"], reason: "후면 사슬(등·엉덩이) 근력을 보강하려면", items: ["굿모닝", "힙 쓰러스트"] },
  { keywords: ["스쿼트"], reason: "고관절 신전력을 보강하려면", items: ["힙 쓰러스트", "레그프레스"] },
  { keywords: ["벤치프레스"], reason: "락아웃 구간의 삼두 근력을 보강하려면", items: ["딥스", "스컬크러셔"] },
  { keywords: ["숄더프레스", "오버헤드프레스", "밀리터리프레스"], reason: "어깨 안정성과 삼두 근력을 보강하려면", items: ["레터럴 레이즈", "딥스"] },
  { keywords: ["풀업", "친업", "랫풀다운"], reason: "등 상부와 후면 삼각근을 보강하려면", items: ["페이스풀", "스트레이트암 풀다운"] },
  { keywords: ["로우"], reason: "당기기 근력과 어깨 안정성을 함께 키우려면", items: ["페이스풀", "친업"] },
  { keywords: ["힙 쓰러스트", "힙쓰러스트"], reason: "둔근 활성화를 도우려면", items: ["글루트 브릿지", "케이블 킥백"] },
];

function findAccessoryGroup(exerciseName: string) {
  for (const group of ACCESSORY_GROUPS) {
    if (group.keywords.some((k) => exerciseName.includes(k))) return group;
  }
  return null;
}

// 같은 문구가 매번 반복되지 않도록, 종목명을 시드로 삼아 후보 문구 중 하나를 안정적으로 선택
function seededPick<T>(pool: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length];
}

const NO_ACCESSORY_HINT_POOL = [
  "같은 부위를 다른 각도로 자극하는 보조 운동을 1개 추가해보세요",
  "메인 세트 뒤에 가벼운 보조 운동을 더해 볼륨을 늘려보세요",
];

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
    if (weightDiff > 0) {
      const pctUp = prevStat.maxWeight ? (weightDiff / prevStat.maxWeight) * 100 : 0;
      const pool = pctUp >= 8
        ? [
            `한 달 만에 중량이 ${Math.round(pctUp)}% 늘었어요. 다음 달은 무리한 증량보다 이 무게에서 자세를 먼저 다져보세요`,
            `증가폭이 큰 편이에요. 다음 세션엔 이 무게에서 목표 반복수를 먼저 채우고 천천히 다음 단계로 올려보세요`,
          ]
        : [
            `점진적 과부하가 잘 적용되고 있어요. 다음 달도 2.5~5%씩 소폭 증량해보세요`,
            `꾸준히 늘고 있으니 같은 방식으로 계속 진행하세요`,
            `이 페이스를 유지하면서 다음 달에도 조금씩 무게를 얹어보세요`,
          ];
      checklist.push(seededPick(pool, name));
      checklist.push(
        seededPick(
          ["증량한 만큼 가동범위(ROM)가 줄지 않았는지 확인해보세요", "중량이 오른 만큼 자세가 무너지지 않는지 다시 체크해보세요"],
          name + "#form"
        )
      );
    } else if (repsDiff > 0) {
      checklist.push(
        seededPick(
          [
            "중량은 유지한 채 반복수가 늘었어요. 다음엔 목표 반복수를 다 채운 뒤 중량을 올려보세요",
            "같은 무게에서 반복수가 늘었으니 다음 달엔 중량을 한 단계 올려볼 타이밍입니다",
          ],
          name
        )
      );
    }
  } else {
    let pool: string[];
    if (weightDiff < 0) {
      pool = [
        "지난달보다 중량이 줄었어요. 무리하게 다시 올리기보다 1~2주는 이 무게에서 반복수부터 채워보세요",
        "중량이 살짝 내려갔어요. 컨디션 회복에 집중하면서 이전 중량을 다시 다져보세요",
      ];
    } else if (repsDiff < 0) {
      pool = [
        "중량은 유지했지만 반복수가 줄었어요. 세트 간 휴식을 충분히 가지면서 목표 반복수를 다시 채워보세요",
        "반복수가 살짝 줄었어요. 폼이 흔들리지 않는 선에서 반복수부터 회복해보세요",
      ];
    } else {
      pool = [
        "같은 무게·반복수에 머물러 있어요. 반복수를 1~2회 늘리거나 세트를 추가해 자극을 바꿔보세요",
        "정체기로 보여요. 세트 수를 늘리거나 휴식 시간을 줄여 볼륨을 높여보세요",
        "변화가 없는 상태예요. 템포를 늦추거나(3~4초 네거티브) 반복수를 늘려 자극을 다르게 줘보세요",
      ];
    }
    checklist.push(seededPick(pool, name));

    const group = findAccessoryGroup(name);
    // 그룹의 보조 운동이 해당 종목 자체와 이름이 겹치면(예: 종목명이 그대로 보조 운동 후보에 있는 경우) 제외
    const items = group?.items.filter((item) => item !== name) ?? [];
    if (group && items.length > 0) {
      checklist.push(`${group.reason} ${items.join(", ")} 등을 보조 운동으로 추가해보세요`);
    } else {
      checklist.push(seededPick(NO_ACCESSORY_HINT_POOL, name + "#acc"));
    }
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
