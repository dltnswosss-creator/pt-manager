import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = "exercise-videos";
const MAX_SIZE_MB = 200;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "파일이 없습니다" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return Response.json({ error: `파일은 ${MAX_SIZE_MB}MB 이하만 업로드 가능합니다` }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "mp4";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, arrayBuffer, { contentType: file.type, upsert: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

  return Response.json({ url: data.publicUrl }, { status: 201 });
}
