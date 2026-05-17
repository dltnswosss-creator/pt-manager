import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const pageId = process.env.NOTION_PARENT_PAGE_ID;

try {
  const page = await notion.pages.retrieve({ page_id: pageId });
  console.log("✅ Notion 연결 성공!");
  console.log("   페이지:", page.id);

  // 테스트 하위 페이지 생성
  const test = await notion.pages.create({
    parent: { page_id: pageId },
    icon: { type: "emoji", emoji: "✅" },
    properties: {
      title: { title: [{ type: "text", text: { content: "[테스트] Notion 연동 확인" } }] },
    },
    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: "PT Manager 앱과 Notion 연동이 정상적으로 작동합니다." } }],
        },
      },
    ],
  });
  console.log("✅ 테스트 페이지 생성 성공:", test.url);
} catch (e) {
  console.error("❌ 실패:", e.message);
  process.exit(1);
}
