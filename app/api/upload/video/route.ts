import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest } from "next/server";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = "exercisevideos";
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export async function POST(req: NextRequest) {
  const { fileName, fileSize } = await req.json();

  if (!fileName) return Response.json({ error: "파일 정보가 없습니다" }, { status: 400 });
  if (fileSize > 200 * 1024 * 1024) return Response.json({ error: "파일은 200MB 이하만 가능합니다" }, { status: 400 });

  const ext = fileName.split(".").pop() ?? "mp4";
  const key = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const signedUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 3600 }
  );

  return Response.json({
    signedUrl,
    publicUrl: `${PUBLIC_URL}/${key}`,
  });
}
