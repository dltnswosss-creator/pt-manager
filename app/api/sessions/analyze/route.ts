import { NextRequest } from "next/server";
import { BODY_PART_ORDER, BODY_PART_LABELS, type SessionAnalysis } from "@/lib/types";

// 수업 녹음 전사본(STT)을 OpenAI로 분석해 수업 기록 양식(운동 목록 + 피드백)으로 변환한다.
// 결과는 바로 저장하지 않고 수업 기록 폼에 채워 넣으며, 트레이너가 확인·수정한 뒤 저장한다.

// 60분 수업 전사본 분석은 수십 초 걸릴 수 있어 기본 실행 시간보다 넉넉히 잡는다
export const maxDuration = 120;

const MODEL = process.env.OPENAI_SESSION_MODEL || "gpt-4o-mini";
const MAX_TRANSCRIPT_CHARS = 60_000;

const BODY_PART_GUIDE = BODY_PART_ORDER.map((k) => `${k}=${BODY_PART_LABELS[k]}`).join(", ");

const SYSTEM_PROMPT = `너는 PT(퍼스널 트레이닝) 트레이너가 수업 중에 녹음 버튼을 누르고 말한 내용을 음성 인식(STT)한 전사본을 읽고, 수업 기록을 작성하는 도우미야.

전사본 형식:
- 각 줄은 트레이너가 버튼을 누르고 말한 한 문장(또는 한 덩어리)이야. 시간 순서대로 쌓여 있어.
- 트레이너가 기록용으로 직접 말한 내용이 대부분이지만, 회원에게 하는 말(자세 지시, 카운트)이 섞여 있을 수 있어.
- 트레이너가 녹음 화면에서 직접 고친 문장도 있으니 그대로 믿어.
- 음성 인식 오류(비슷한 발음의 엉뚱한 단어, 숫자 오인식)가 섞여 있으니 문맥으로 보정해.
- 같은 운동이 여러 줄에 걸쳐 나오면(예: "스쿼트 20킬로 12개" → "한 세트 더" → "30킬로로 올려서 10개") 하나의 운동으로 합쳐.

작성 규칙:
1. exercises: 이번 수업에서 실제로 수행한 운동만 수행한 순서대로 나열해.
   - 같은 운동을 여러 세트 했으면 하나로 합치고 sets에 세트 수를 넣어.
   - 세트마다 중량/횟수가 다르면 가장 많이 수행한(메인) 세트 기준으로 쓰고, 차이는 memo에 적어. (예: "20kg×12 → 30kg×10 → 40kg×8")
   - reps는 문자열이야. 횟수면 "12", 시간이면 "30초", "1분"처럼 써.
   - weight는 숫자(kg 기본)이고, 맨몸 운동이거나 언급이 없으면 null. 파운드로 말했으면 unit을 "lbs"로.
   - 전사본에서 확인되지 않는 값은 지어내지 말고 null로 둬.
   - name은 "알려진 운동 이름" 목록에 같은 운동이 있으면 그 표기를 그대로 써.
   - bodyParts는 주로 쓰는 부위 키를 골라 (${BODY_PART_GUIDE}). 애매하면 빈 배열.
   - isMain: 근력 운동 본운동이면 true, 스트레칭·폼롤러·워밍업·쿨다운·유산소는 false.
   - memo: 그 운동에 대한 자세 교정 포인트, 통증 호소, 세트별 변화 등 짧게. 없으면 null.
2. workoutFeedback: 오늘 수업 전체에 대한 운동 피드백 (컨디션, 잘한 점, 보완할 점, 다음 수업 계획). 2~5줄, 트레이너가 회원에게 보내는 말투(~했어요/~해볼게요). 언급이 없으면 null.
3. lifestyleFeedback: 식단·수면·생활습관 관련 대화가 있었으면 요약. 없으면 null.
4. 잡담이나 수업과 무관한 대화는 기록하지 마.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    exercises: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          sets: { type: ["integer", "null"] },
          reps: { type: ["string", "null"] },
          weight: { type: ["number", "null"] },
          unit: { type: "string", enum: ["kg", "lbs"] },
          bodyParts: { type: "array", items: { type: "string", enum: BODY_PART_ORDER } },
          isMain: { type: "boolean" },
          memo: { type: ["string", "null"] },
        },
        required: ["name", "sets", "reps", "weight", "unit", "bodyParts", "isMain", "memo"],
        additionalProperties: false,
      },
    },
    workoutFeedback: { type: ["string", "null"] },
    lifestyleFeedback: { type: ["string", "null"] },
  },
  required: ["exercises", "workoutFeedback", "lifestyleFeedback"],
  additionalProperties: false,
} as const;

export async function POST(req: NextRequest) {
  const { transcript, knownExercises } = (await req.json()) as {
    transcript?: unknown;
    knownExercises?: unknown;
  };

  if (typeof transcript !== "string" || !transcript.trim()) {
    return Response.json({ error: "분석할 녹음 내용이 없습니다" }, { status: 400 });
  }
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    return Response.json({ error: "녹음 내용이 너무 깁니다" }, { status: 413 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENAI_API_KEY가 설정되지 않았습니다" }, { status: 500 });
  }

  const names = Array.isArray(knownExercises)
    ? knownExercises.filter((n): n is string => typeof n === "string").slice(0, 200)
    : [];

  const userContent = [
    names.length ? `알려진 운동 이름: ${names.join(", ")}` : "",
    "아래는 수업 녹음 전사본이야. 수업 기록을 작성해줘.",
    "<transcript>",
    transcript.trim(),
    "</transcript>",
  ].filter(Boolean).join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "session_record", strict: true, schema: RESPONSE_SCHEMA },
      },
    }),
  });

  if (!res.ok) {
    console.error("수업 녹음 분석 실패:", res.status, await res.text().catch(() => ""));
    return Response.json({ error: "녹음 분석에 실패했습니다" }, { status: 502 });
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return Response.json({ error: "녹음 분석에 실패했습니다" }, { status: 502 });
  }

  const parsed = JSON.parse(content) as SessionAnalysis;
  return Response.json(parsed);
}
