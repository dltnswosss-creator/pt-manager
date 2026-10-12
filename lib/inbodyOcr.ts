// 인바디 결과지 사진을 OCR로 읽은 원본 텍스트에서 5개 지표를 추출
// (운동 빠른 입력 lib/quickInput.ts와 같은 "라벨 근처의 숫자 찾기" 방식)

export type InBodyOcrResult = {
  weight?: string;
  skeletalMuscleMass?: string;
  bodyFatMass?: string;
  bodyFatPercent?: string;
  bmr?: string;
  rawText: string;
};

// OCR 노이즈(한글 자모 사이 공백, 줄바꿈)를 감안해 글자 사이에 공백이 섞여도 매칭되도록 \s*를 끼워 넣음
const WEIGHT_RE = /체\s*중|weight/i;
const SMM_RE = /골\s*격\s*근\s*량|smm|skeletal/i;
const BFM_RE = /체\s*지\s*방\s*량|body\s*fat\s*mass|bfm/i;
const PBF_RE = /체\s*지\s*방\s*률|체\s*지\s*방\s*율|pbf|percent\s*body\s*fat/i;
const BMR_RE = /기\s*초\s*대\s*사\s*량|bmr/i;

const KG_NUMBER_RE = /(\d{1,3}(?:\.\d{1,2})?)\s*kg/i;
const PERCENT_NUMBER_RE = /(\d{1,3}(?:\.\d{1,2})?)\s*%/;
const KCAL_NUMBER_RE = /(\d{1,4}(?:,\d{3})?)\s*kcal/i;

// 라벨이 매칭된 줄(혹은 다음 줄까지)에서 가장 먼저 나오는 숫자+단위를 찾는다
function findNumberNear(lines: string[], labelRe: RegExp, numberRe: RegExp): string | undefined {
  for (let i = 0; i < lines.length; i++) {
    if (!labelRe.test(lines[i])) continue;
    const window = `${lines[i]} ${lines[i + 1] ?? ""}`;
    const m = window.match(numberRe);
    if (m) return m[1].replace(/,/g, "");
  }
  return undefined;
}

export function parseInBodyOcrText(rawText: string): InBodyOcrResult {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  return {
    weight: findNumberNear(lines, WEIGHT_RE, KG_NUMBER_RE),
    skeletalMuscleMass: findNumberNear(lines, SMM_RE, KG_NUMBER_RE),
    bodyFatMass: findNumberNear(lines, BFM_RE, KG_NUMBER_RE),
    bodyFatPercent: findNumberNear(lines, PBF_RE, PERCENT_NUMBER_RE),
    bmr: findNumberNear(lines, BMR_RE, KCAL_NUMBER_RE),
    rawText,
  };
}
