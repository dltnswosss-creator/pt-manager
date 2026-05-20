import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = "exercise-videos";
const MAX_SIZE_MB = 200;

export async function POST(req: NextRequest) {
  const { fileName, fileSize } = await req.json();

  if (!fileName) {
    return Response.json({ error: "파일 정보가 없습니다" }, { status: 400 });
  }
  if (fileSize > MAX_SIZE_MB * 1024 * 1024) {
    return Response.json({ error: `파일은 ${MAX_SIZE_MB}MB 이하만 업로드 가능합니다` }, { status: 400 });
  }

  const ext = fileName.split(".").pop() ?? "mp4";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return Response.json({
    signedUrl: data.signedUrl,
    publicUrl: pub.publicUrl,
  });
}
