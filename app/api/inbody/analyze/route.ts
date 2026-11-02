import { NextRequest } from "next/server";

// 인바디 결과지 사진을 OpenAI Vision으로 분석해 5개 핵심 지표를 추출
// (기존 tesseract.js OCR + 정규식 매칭 방식은 감열지 인쇄/그래프 간섭으로 인식률이 낮아 대체)
const SYSTEM_PROMPT = `너는 인바디(InBody) 체성분 분석 결과지 사진을 읽고 수치를 추출하는 도우미야.
사진에서 아래 5개 항목의 "실제 측정값"만 찾아서 반환해.
- weight: 체중 (kg)
- skeletalMuscleMass: 골격근량 (kg)
- bodyFatMass: 체지방량 (kg)
- bodyFatPercent: 체지방률 (%)
- bmr: 기초대사량 (kcal)

주의사항:
- 괄호 안의 참고범위(예: 64.1~73.1)나 그래프 눈금 숫자는 측정값이 아니므로 사용하지 마.
- "체중조절", "목표체중" 같은 항목은 체중(weight)이 아니야.
- "체지방량"(bodyFatMass)과 "제지방량"(체지방 제외 나머지, 전혀 다른 값)을 혼동하지 마. 반드시 "체" 지방량이야.
- bodyFatPercent(체지방률)는 "비만진단" 영역에서 막대그래프와 함께 있는 숫자인데, 보통 5~50 사이의 소수점 한 자리 숫자(예: 18.5)야. 그래프 눈금(50, 100, 150, 200 같은 표준치 비율 눈금)이나 괄호 속 정상범위 숫자를 측정값으로 착각하지 마.
- bmr(기초대사량)은 "연구항목" 영역에 내장지방레벨, 인바디점수, 상완위팔둘레 같은 작은 숫자들과 함께 있어. 기초대사량은 보통 800~3000 사이의 큰 숫자(kcal)이고, 내장지방레벨(보통 1~20 사이 정수)이나 인바디점수(보통 0~100)처럼 훨씬 작은 숫자와는 다르니 반드시 "기초대사량" 또는 "BMR" 라벨 바로 옆 숫자만 사용해.
- 값을 사진에서 찾을 수 없으면 null로 반환해.
- 숫자만 반환하고 단위는 붙이지 마.`;

export async function POST(req: NextRequest) {
  const { image } = await req.json();
  if (!image || typeof image !== "string") {
    return Response.json({ error: "이미지가 없습니다" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENAI_API_KEY가 설정되지 않았습니다" }, { status: 500 });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 300,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "이 인바디 결과지 사진에서 수치를 추출해줘." },
            { type: "image_url", image_url: { url: image, detail: "high" } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "inbody_metrics",
          strict: true,
          schema: {
            type: "object",
            properties: {
              weight: { type: ["number", "null"] },
              skeletalMuscleMass: { type: ["number", "null"] },
              bodyFatMass: { type: ["number", "null"] },
              bodyFatPercent: { type: ["number", "null"] },
              bmr: { type: ["number", "null"] },
            },
            required: ["weight", "skeletalMuscleMass", "bodyFatMass", "bodyFatPercent", "bmr"],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  if (!res.ok) {
    return Response.json({ error: "사진 분석에 실패했습니다" }, { status: 502 });
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return Response.json({ error: "사진 분석에 실패했습니다" }, { status: 502 });
  }

  const parsed = JSON.parse(content);
  return Response.json(parsed);
}
