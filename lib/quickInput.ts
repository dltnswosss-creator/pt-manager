// "스쿼트 / 10kg / 10reps" 같은 줄글을 운동 카드 데이터로 변환

export type QuickExerciseInput = {
  name: string;
  sets: string;
  reps: string;
  weight: string;
  unit: string;
};

// 한글 단위(회/세트/킬로 등)는 JS 정규식의 \w에 포함되지 않아 \b가 먹지 않으므로
// 뒤에 영문/숫자가 이어지지 않는지로 경계를 대신 확인한다
const WEIGHT_RE = /(\d+(?:\.\d+)?)\s*(kgs?|킬로그램|킬로|lbs?|파운드)(?![a-zA-Z0-9])/i;
const REPS_RE = /(\d+)\s*(reps?|회|번)(?![a-zA-Z0-9])/i;
const SETS_RE = /(\d+)\s*(sets?|세트)(?![a-zA-Z0-9])/i;
const LBS_RE = /lbs?|파운드/i;

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function normalize(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

// 오타/띄어쓰기 차이를 기존 운동명 목록과 비교해 가장 가까운 이름으로 보정
function correctExerciseName(raw: string, known: string[]): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const norm = normalize(trimmed);

  for (const k of known) {
    if (normalize(k) === norm) return k;
  }

  let best: { name: string; dist: number } | null = null;
  for (const k of known) {
    const dist = levenshtein(norm, normalize(k));
    if (!best || dist < best.dist) best = { name: k, dist };
  }
  const threshold = best ? Math.max(1, Math.floor(normalize(best.name).length * 0.3)) : 0;
  if (best && best.dist <= threshold) return best.name;

  return trimmed;
}

export function parseQuickInput(text: string, knownExercises: string[]): QuickExerciseInput[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const results: QuickExerciseInput[] = [];

  for (const line of lines) {
    let rest = line;
    let weight = "";
    let unit = "kg";
    let reps = "";
    let sets = "";

    const weightMatch = rest.match(WEIGHT_RE);
    if (weightMatch) {
      weight = weightMatch[1];
      unit = LBS_RE.test(weightMatch[2]) ? "lbs" : "kg";
      rest = rest.replace(weightMatch[0], " ");
    }

    const repsMatch = rest.match(REPS_RE);
    if (repsMatch) {
      reps = repsMatch[1];
      rest = rest.replace(repsMatch[0], " ");
    }

    const setsMatch = rest.match(SETS_RE);
    if (setsMatch) {
      sets = setsMatch[1];
      rest = rest.replace(setsMatch[0], " ");
    }

    const name = rest
      .split(/[/,]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!name) continue;

    results.push({
      name: correctExerciseName(name, knownExercises),
      sets,
      reps,
      weight,
      unit,
    });
  }

  return results;
}

// "✅운동 피드백" / "✅영양&생활습관 피드백" 마커로 운동 목록과 피드백을 구분해 파싱
function isWorkoutFeedbackMarker(line: string): boolean {
  const t = line.trim();
  return t.includes("✅") && t.includes("피드백") && t.includes("운동") && !t.includes("영양") && !t.includes("생활");
}

function isLifestyleFeedbackMarker(line: string): boolean {
  const t = line.trim();
  return t.includes("✅") && t.includes("피드백") && (t.includes("영양") || t.includes("생활"));
}

export type QuickInputResult = {
  exercises: QuickExerciseInput[];
  feedback: string; // 노션/메모에 넣을 조합된 피드백 텍스트, 없으면 ""
};

export function parseQuickInputWithFeedback(text: string, knownExercises: string[]): QuickInputResult {
  const rawLines = text.split("\n");

  let workoutMarkerIdx = -1;
  let lifestyleMarkerIdx = -1;
  rawLines.forEach((line, i) => {
    if (workoutMarkerIdx === -1 && isWorkoutFeedbackMarker(line)) workoutMarkerIdx = i;
    else if (lifestyleMarkerIdx === -1 && isLifestyleFeedbackMarker(line)) lifestyleMarkerIdx = i;
  });

  const exerciseLinesEnd = workoutMarkerIdx !== -1 ? workoutMarkerIdx : rawLines.length;
  const exercises = parseQuickInput(rawLines.slice(0, exerciseLinesEnd).join("\n"), knownExercises);

  let workoutFeedback = "";
  let lifestyleFeedback = "";
  if (workoutMarkerIdx !== -1) {
    const end = lifestyleMarkerIdx !== -1 ? lifestyleMarkerIdx : rawLines.length;
    workoutFeedback = rawLines.slice(workoutMarkerIdx + 1, end).join("\n").trim();
  }
  if (lifestyleMarkerIdx !== -1) {
    lifestyleFeedback = rawLines.slice(lifestyleMarkerIdx + 1).join("\n").trim();
  }

  const sections: string[] = [];
  if (workoutFeedback) sections.push(`💪 운동 피드백\n${workoutFeedback}`);
  if (lifestyleFeedback) sections.push(`🍎 영양&생활습관 피드백\n${lifestyleFeedback}`);

  return { exercises, feedback: sections.join("\n\n") };
}
