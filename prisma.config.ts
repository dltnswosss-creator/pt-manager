import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Next.js와 같은 순서로 .env* 파일을 로드한다.
// 로컬에서는 .env.development.local(로컬 DB)이 .env(운영 DB)보다 우선한다.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL!,
  },
});
