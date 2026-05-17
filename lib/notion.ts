import { Client } from "@notionhq/client";
import { formatDate } from "@/lib/utils";

export const notion = new Client({ auth: process.env.NOTION_API_KEY });

type Exercise = {
  name: string;
  sets: number | null;
  reps: string | null;
  weight: number | null;
  unit: string;
  memo: string | null;
  videoUrl?: string | null;
};

type SessionData = {
  clientName: string;
  date: string;
  sessionType: string;
  duration: number | null;
  memo: string | null;
  exercises: Exercise[];
};

type GroupSessionData = {
  title: string | null;
  date: string;
  participants: string[];
  memo: string | null;
  exercises: Exercise[];
};

function exerciseText(e: Exercise): string {
  const parts = [
    e.sets ? `${e.sets}세트` : null,
    e.reps ? `× ${e.reps}회` : null,
    e.weight ? `× ${e.weight}${e.unit}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "기록 없음";
}

function divider() {
  return { object: "block" as const, type: "divider" as const, divider: {} };
}

function paragraph(text: string, bold = false) {
  return {
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: {
      rich_text: [
        {
          type: "text" as const,
          text: { content: text },
          annotations: { bold },
        },
      ],
    },
  };
}

function heading3(text: string) {
  return {
    object: "block" as const,
    type: "heading_3" as const,
    heading_3: {
      rich_text: [{ type: "text" as const, text: { content: text } }],
    },
  };
}

function callout(text: string, emoji: string) {
  return {
    object: "block" as const,
    type: "callout" as const,
    callout: {
      rich_text: [{ type: "text" as const, text: { content: text } }],
      icon: { type: "emoji" as const, emoji },
    },
  };
}

function videoBlock(url: string) {
  return {
    object: "block" as const,
    type: "video" as const,
    video: { type: "external" as const, external: { url } },
  };
}

function buildExerciseBlocks(exercises: Exercise[]) {
  const blocks: object[] = [];
  exercises.forEach((e, i) => {
    const memoText = e.memo ? `  (${e.memo})` : "";
    blocks.push(
      paragraph(`${i + 1}. ${e.name}`, true),
      paragraph(`   ${exerciseText(e)}${memoText}`)
    );
    if (e.videoUrl) {
      blocks.push(videoBlock(e.videoUrl));
    }
  });
  return blocks;
}

export async function createSessionNotionPage(data: SessionData): Promise<string> {
  const parentId = process.env.NOTION_PARENT_PAGE_ID!;
  const typeLabel = data.sessionType === "individual" ? "1:1 PT" : "그룹 PT";
  const durationText = data.duration ? `  ⏱ ${data.duration}분` : "";
  const title = `${data.clientName} 수업 일지 — ${formatDate(data.date)}`;

  const children: object[] = [
    callout(`📅 ${formatDate(data.date)}   ${typeLabel}${durationText}`, "📋"),
    divider(),
    heading3("운동 목록"),
    ...buildExerciseBlocks(data.exercises),
    divider(),
  ];

  if (data.memo) {
    children.push(callout(data.memo, "💬"));
  }

  const response = await notion.pages.create({
    parent: { page_id: parentId },
    icon: { type: "emoji", emoji: "🏋️" },
    properties: {
      title: {
        title: [{ type: "text", text: { content: title } }],
      },
    },
    children: children as Parameters<typeof notion.pages.create>[0]["children"],
  });

  // 공개 공유 설정은 Notion에서 페이지를 직접 "웹에 공개"로 설정해야 합니다.
  // API로는 공유 설정 변경 불가 → 부모 페이지를 공개로 설정해두면 하위 페이지도 공개됩니다.
  return `https://notion.so/${response.id.replace(/-/g, "")}`;
}

export async function createGroupSessionNotionPage(data: GroupSessionData): Promise<string> {
  const parentId = process.env.NOTION_PARENT_PAGE_ID!;
  const participantsText = data.participants.length > 0 ? data.participants.join(", ") : "미기록";
  const title = `그룹 수업 일지 — ${formatDate(data.date)}${data.title ? ` (${data.title})` : ""}`;

  const children: object[] = [
    callout(`📅 ${formatDate(data.date)}   참여 회원: ${participantsText}`, "👥"),
    divider(),
    heading3("운동 목록"),
    ...buildExerciseBlocks(data.exercises),
    divider(),
  ];

  if (data.memo) {
    children.push(callout(data.memo, "💬"));
  }

  const response = await notion.pages.create({
    parent: { page_id: parentId },
    icon: { type: "emoji", emoji: "👥" },
    properties: {
      title: {
        title: [{ type: "text", text: { content: title } }],
      },
    },
    children: children as Parameters<typeof notion.pages.create>[0]["children"],
  });

  return `https://notion.so/${response.id.replace(/-/g, "")}`;
}
