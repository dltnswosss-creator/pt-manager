export type PainArea = {
  area: string;
  side?: "left" | "right" | "both";
  intensity: "caution" | "watch" | "avoid";
};

export type MenstrualPhase = "menstrual" | "follicular" | "ovulation" | "luteal";

export function getMenstrualPhase(lastStartDate: string, cycleLength: number, periodLength: number): MenstrualPhase {
  const start = new Date(lastStartDate);
  const today = new Date();
  const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const dayInCycle = ((daysSinceStart % cycleLength) + cycleLength) % cycleLength;

  if (dayInCycle < periodLength) return "menstrual";
  if (dayInCycle < 13) return "follicular";
  if (dayInCycle < 16) return "ovulation";
  return "luteal";
}

export const PHASE_LABELS: Record<MenstrualPhase, string> = {
  menstrual: "생리기",
  follicular: "여포기",
  ovulation: "배란기",
  luteal: "황체기",
};

export const PHASE_COLORS: Record<MenstrualPhase, string> = {
  menstrual: "bg-rose-100 text-rose-700",
  follicular: "bg-emerald-100 text-emerald-700",
  ovulation: "bg-violet-100 text-violet-700",
  luteal: "bg-amber-100 text-amber-700",
};

export const PHASE_GUIDE: Record<MenstrualPhase, { title: string; tips: string[] }> = {
  menstrual: {
    title: "생리기 (1~5일)",
    tips: ["저강도 운동 권장", "스트레칭·요가 중심", "무거운 중량 피하기", "충분한 수분 섭취"],
  },
  follicular: {
    title: "여포기 (6~13일)",
    tips: ["근력 운동 강도 높이기 가능", "새로운 운동 도전에 적합", "지구력 향상 훈련", "에너지 레벨 상승"],
  },
  ovulation: {
    title: "배란기 (14~16일)",
    tips: ["최고 컨디션 시기", "최대 중량 도전 적합", "고강도 인터벌 훈련", "PR 도전 최적 시기"],
  },
  luteal: {
    title: "황체기 (17~28일)",
    tips: ["중강도 유지", "무거운 중량 주의", "체온 상승으로 수분 보충", "회복·유지 위주 트레이닝"],
  },
};

export const EXERCISE_LEVEL_LABELS: Record<string, string> = {
  none: "운동 경험 없음",
  beginner: "초보 (1년 미만)",
  intermediate: "중급 (1~3년)",
  advanced: "상급 (3년 이상)",
};

export const PAIN_INTENSITY_LABELS: Record<string, string> = {
  caution: "주의",
  watch: "관찰",
  avoid: "금지",
};

export const PAIN_INTENSITY_COLORS: Record<string, string> = {
  caution: "bg-yellow-100 text-yellow-700 border-yellow-300",
  watch: "bg-orange-100 text-orange-700 border-orange-300",
  avoid: "bg-red-100 text-red-700 border-red-300",
};

export const BODY_AREAS = [
  "목", "어깨(좌)", "어깨(우)", "팔꿈치(좌)", "팔꿈치(우)",
  "손목(좌)", "손목(우)", "흉추", "요추", "고관절(좌)", "고관절(우)",
  "무릎(좌)", "무릎(우)", "발목(좌)", "발목(우)", "기타",
];

export type BodyPart = "lower" | "back" | "chest" | "shoulder" | "arm" | "core" | "full" | "functional";

export const BODY_PART_ORDER: BodyPart[] = ["lower", "back", "chest", "shoulder", "arm", "core", "full", "functional"];

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  lower: "하체",
  back: "등",
  chest: "가슴",
  shoulder: "어깨",
  arm: "팔",
  core: "코어",
  full: "전신",
  functional: "기능적",
};

export const COMMON_EXERCISES = [
  "스쿼트", "데드리프트", "벤치프레스", "오버헤드프레스", "바벨로우",
  "풀업", "친업", "딥스", "런지", "레그프레스", "레그컬", "레그익스텐션",
  "케이블로우", "랫풀다운", "페이스풀", "사이드레터럴레이즈", "버드독",
  "플랭크", "힙쓰러스트", "글루트브릿지", "케틀벨스윙", "트레드밀", "사이클",
];
