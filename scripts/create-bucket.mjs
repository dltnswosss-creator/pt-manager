import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase.storage.createBucket("exercise-videos", {
  public: true,
  fileSizeLimit: 52428800, // 50MB
  allowedMimeTypes: ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm", "video/mpeg"],
});

if (error) {
  if (error.message.includes("already exists")) {
    console.log("✅ 버킷 이미 존재함 (exercise-videos)");
  } else {
    console.error("❌ 버킷 생성 실패:", error.message);
    process.exit(1);
  }
} else {
  console.log("✅ 버킷 생성 완료:", data.name);
}
