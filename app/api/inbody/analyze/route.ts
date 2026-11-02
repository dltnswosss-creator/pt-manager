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
