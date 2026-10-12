// 인바디 결과지 사진을 OCR로 읽은 원본 텍스트에서 5개 지표를 추출
// (운동 빠른 입력 lib/quickInput.ts와 같은 "라벨 근처의 숫자 찾기" 방식)
// 상세 결과지는 막대그래프 눈금/참고범위/체크박스 범례 숫자가 많이 섞여 있어서,
// 라벨 근처 숫자 중 ① 단위가 붙은 숫자 → ② 지표별로 있을 법한 범위 안의 첫 숫자 순으로 찾는다.

export type InBodyOcrResult = {
  weight?: string;
  skeletalMuscleMass?: string;
  bodyFatMass?: string;
  bodyFatPercent?: string;
  bmr?: string;
  rawText: string;
};

// OCR 노이즈(한글 자모 사이 공백, 줄바꿈)를 감안해 글자 사이에 공백이 섞여도 매칭되도록 \s*를 끼워 넣음
// "체"가 "치"로 오인식되는 경우가 흔해서 첫 글자도 느슨하게 허용
const WEIGHT_RE = /[체치]\s*중(?!\s*조\s*절)|weight/i; // "체중조절" 항목은 실제 체중이 아니므로 제외
const SMM_RE = /골\s*격\s*근\s*량|skeletal\s*muscle|smm/i;
const BFM_RE = /[체치]\s*지\s*방\s*[량랑]|body\s*fat\s*mass|bfm/i; // "량"이 "랑"으로 오인식되는 경우가 흔함
const PBF_RE = /[체치]\s*지\s*방\s*[률율륭]|percent\s*body\s*fat|pbf/i; // "률"이 "률/율/륭"으로 오인식되는 경우가 흔함
const BMR_RE = /기\s*초\s*대\s*사\s*량|bmr/i;

// kg는 "ke"(OCR 오인식), kcal은 "gcal"/"geal"(OCR 오인식)까지 느슨하게 허용
const UNIT_NUMBER_RE = /(\d{1,4}(?:,\d{3})?(?:\.\d{1,3})?)\s*(?:kg|ke|kcal|gcal|geal|%)\b/gi;
const ANY_NUMBER_RE = /\d{1,4}(?:,\d{3})?(?:\.\d{1,3})?/g;

// 참고범위(64.1~73.1) 같은 괄호 안 숫자는 실제 측정값이 아니므로 제외
function stripParens(s: string): string {
  return s.replace(/\([^)]*\)/g, " ");
}

function findNumberInRange(lines: string[], labelRe: RegExp, min: number, max: number): string | undefined {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // "ㅁ저체중 ㅁ체중" 같은 체크박스 범례 줄은 실제 측정값이 아니므로 건너뜀
    if (!labelRe.test(line) || line.includes("ㅁ")) continue;

    const window = stripParens(`${line} ${lines[i + 1] ?? ""} ${lines[i + 2] ?? ""}`);

    for (const m of window.matchAll(UNIT_NUMBER_RE)) {
      const clean = m[1].replace(/,/g, "");
      const n = parseFloat(clean);
      if (n >= min && n <= max) return clean;
    }

    const nums = window.match(ANY_NUMBER_RE) ?? [];
    for (const raw of nums) {
      const clean = raw.replace(/,/g, "");
      const n = parseFloat(clean);
      if (n >= min && n <= max) return clean;
    }
  }
  return undefined;
}

export function parseInBodyOcrText(rawText: string): InBodyOcrResult {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  return {
    weight: findNumberInRange(lines, WEIGHT_RE, 20, 250),
    skeletalMuscleMass: findNumberInRange(lines, SMM_RE, 5, 60),
    bodyFatMass: findNumberInRange(lines, BFM_RE, 1, 80),
    bodyFatPercent: findNumberInRange(lines, PBF_RE, 3, 60),
    bmr: findNumberInRange(lines, BMR_RE, 500, 4000),
    rawText,
  };
}
