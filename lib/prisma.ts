import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  // 로컬 개발 DB(docker)는 SSL을 지원하지 않음
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString ?? "");
  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 1, // serverless: 인스턴스당 커넥션 1개로 제한
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// 프로덕션 포함 전 환경에서 싱글톤 캐시 (커넥션 풀 소진 방지)
globalForPrisma.prisma = prisma;
