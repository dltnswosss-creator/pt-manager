import { Client } from "@notionhq/client";
import { formatDate } from "@/lib/utils";

export const notion = new Client({ auth: process.env.NOTION_API_KEY });

function sessionDateTitle(date: string): string {
  // "2026-05-12" → "2026.05.12"
  return date.replace(/-/g, ".");
}

async function getOrCreateChildPage(parentId: string, title: string, emoji: string): Promise<string> {
  let cursor: string | undefined;
  do {
    const res = await notion.blocks.children.list({
      block_id: parentId,
      start_cursor: cursor,
    });
    for (const block of res.results) {
      if ("type" in block && block.type === "child_page" && block.child_page.title === title) {
        return block.id;
      }
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);

  const page = await notion.pages.create({
    parent: { page_id: parentId },
    icon: { type: "emoji", emoji: emoji as Parameters<typeof notion.pages.create>[0]["icon"] extends { emoji: infer E } ? E : never },
    properties: {
      title: { title: [{ type: "text", text: { content: title } }] },
    },
  });
  return page.id;
}

type Exercise = {
  name: string;
  sets: number | null;
  reps: string | null;
  weight: number | null;
  unit: string;
  memo: string | null;
  videoUrls?: string[];
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
    e.videoUrls?.forEach((url) => blocks.push(videoBlock(url)));
  });
  return blocks;
}

export async function createSessionNotionPage(data: SessionData): Promise<string> {
  const rootId = process.env.NOTION_PARENT_PAGE_ID!;
  const typeLabel = data.sessionType === "individual" ? "1:1 PT" : "그룹 PT";
  const durationText = data.duration ? `  ⏱ ${data.duration}분` : "";

  // PT 수업일지 → 회원명님 → 날짜
  const clientPageId = await getOrCreateChildPage(rootId, `${data.clientName}님`, "👤");

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
    parent: { page_id: clientPageId },
    icon: { type: "emoji", emoji: "🏋️" },
    properties: {
      title: {
        title: [{ type: "text", text: { content: sessionDateTitle(data.date) } }],
      },
    },
    children: children as Parameters<typeof notion.pages.create>[0]["children"],
  });

  return `https://notion.so/${response.id.replace(/-/g, "")}`;
}

// ── Notion URL → page ID 변환 ────────────────────────────────
function notionUrlToPageId(url: string): string {
  const raw = url.split("/").pop()?.split("?")[0] ?? "";
  if (raw.length === 32) {
    return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
  }
  return raw;
}

async function clearPageBlocks(pageId: string): Promise<void> {
  let cursor: string | undefined;
  do {
    const res = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor });
    await Promise.all(res.results.map((block) => notion.blocks.delete({ block_id: block.id })));
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
}

export async function updateSessionNotionPage(notionUrl: string, data: SessionData): Promise<void> {
  const pageId = notionUrlToPageId(notionUrl);
  const typeLabel = data.sessionType === "individual" ? "1:1 PT" : "그룹 PT";
  const durationText = data.duration ? `  ⏱ ${data.duration}분` : "";

  await clearPageBlocks(pageId);

  const children: object[] = [
    callout(`📅 ${formatDate(data.date)}   ${typeLabel}${durationText}`, "📋"),
    divider(),
    heading3("운동 목록"),
    ...buildExerciseBlocks(data.exercises),
    divider(),
  ];
  if (data.memo) children.push(callout(data.memo, "💬"));

  await notion.blocks.children.append({
    block_id: pageId,
    children: children as Parameters<typeof notion.blocks.children.append>[0]["children"],
  });
}

export async function updateGroupSessionNotionPage(notionUrl: string, data: GroupSessionData): Promise<void> {
  const pageId = notionUrlToPageId(notionUrl);
  const participantsText = data.participants.length > 0 ? data.participants.join(", ") : "미기록";

  await clearPageBlocks(pageId);

  const children: object[] = [
    callout(`📅 ${formatDate(data.date)}   참여 회원: ${participantsText}`, "👥"),
    divider(),
    heading3("운동 목록"),
    ...buildExerciseBlocks(data.exercises),
    divider(),
  ];
  if (data.memo) children.push(callout(data.memo, "💬"));

  await notion.blocks.children.append({
    block_id: pageId,
    children: children as Parameters<typeof notion.blocks.children.append>[0]["children"],
  });
}

export async function createGroupSessionNotionPage(data: GroupSessionData): Promise<string> {
  const rootId = process.env.NOTION_PARENT_PAGE_ID!;
  const participantsText = data.participants.length > 0 ? data.participants.join(", ") : "미기록";
  const sessionTitle = `${sessionDateTitle(data.date)}${data.title ? ` ${data.title}` : ""}`;

  // PT 수업일지 → 그룹 수업 → 날짜
  const groupPageId = await getOrCreateChildPage(rootId, "그룹 수업", "👥");

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
    parent: { page_id: groupPageId },
    icon: { type: "emoji", emoji: "👥" },
    properties: {
      title: {
        title: [{ type: "text", text: { content: sessionTitle } }],
      },
    },
    children: children as Parameters<typeof notion.pages.create>[0]["children"],
  });

  return `https://notion.so/${response.id.replace(/-/g, "")}`;
}
