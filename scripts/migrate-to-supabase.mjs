/**
 * SQLite → Supabase(PostgreSQL) 데이터 마이그레이션 스크립트
 *
 * 실행 전 준비:
 *   1. .env 파일에 DATABASE_URL 설정 (Supabase PostgreSQL URL)
 *   2. npx prisma migrate deploy 로 Supabase에 테이블 생성 완료
 *   3. node scripts/migrate-to-supabase.mjs 실행
 *
 * 주의: 이 스크립트는 기존 better-sqlite3 패키지가 아직 설치된 상태에서 실행해야 합니다.
 * 마이그레이션 완료 후 package.json에서 SQLite 관련 패키지를 제거하세요.
 */

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../prisma/dev.db");

const sqlite = new Database(dbPath, { readonly: true });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Prisma 없이 pg로 직접 upsert
async function upsert(table, data) {
  if (!data || data.length === 0) return;
  const keys = Object.keys(data[0]);
  const cols = keys.map(k => `"${k}"`).join(", ");
  for (const row of data) {
    const vals = keys.map((_, i) => `$${i + 1}`).join(", ");
    const updateSet = keys.filter(k => k !== "id").map((k, i) => `"${k}" = $${keys.indexOf(k) + 1}`).join(", ");
    const values = keys.map(k => row[k] ?? null);
    await pool.query(
      `INSERT INTO "${table}" (${cols}) VALUES (${vals}) ON CONFLICT (id) DO UPDATE SET ${updateSet}`,
      values
    );
  }
}

async function resetSeq(table) {
  await pool.query(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM "${table}"`);
}

async function migrate() {
  console.log("🚀 마이그레이션 시작...\n");

  // 1. Clients
  const clients = sqlite.prepare("SELECT * FROM Client").all();
  console.log(`📋 Client ${clients.length}명 마이그레이션 중...`);
  await upsert("Client", clients.map(c => ({
    id: c.id, name: c.name, gender: c.gender,
    birthDate: c.birthDate ?? null, phone: c.phone ?? null,
    email: c.email ?? null, job: c.job ?? null,
    startDate: c.startDate ?? null, goal: c.goal ?? null,
    exerciseLevel: c.exerciseLevel ?? null, exerciseHistory: c.exerciseHistory ?? null,
    medicalHistory: c.medicalHistory ?? null, painAreas: c.painAreas ?? null,
    medications: c.medications ?? null, mealCount: c.mealCount ?? null,
    mealPattern: c.mealPattern ?? null, sleepHours: c.sleepHours ?? null,
    memo: c.memo ?? null,
    createdAt: new Date(c.createdAt).toISOString(),
    updatedAt: new Date(c.updatedAt).toISOString(),
  })));
  console.log(`  ✅ ${clients.length}명 완료\n`);

  // 2. Sessions
  const sessions = sqlite.prepare("SELECT * FROM Session").all();
  console.log(`📋 Session ${sessions.length}건 마이그레이션 중...`);
  await upsert("Session", sessions.map(s => ({
    id: s.id, clientId: s.clientId, date: s.date,
    sessionType: s.sessionType, duration: s.duration ?? null,
    memo: s.memo ?? null, notionPageId: null, notionUrl: null,
    createdAt: new Date(s.createdAt).toISOString(),
  })));
  console.log(`  ✅ ${sessions.length}건 완료\n`);

  // 3. Exercises
  const exercises = sqlite.prepare("SELECT * FROM Exercise").all();
  console.log(`📋 Exercise ${exercises.length}건 마이그레이션 중...`);
  await upsert("Exercise", exercises.map(e => ({
    id: e.id, sessionId: e.sessionId, name: e.name,
    sets: e.sets ?? null, reps: e.reps ?? null,
    weight: e.weight ?? null, unit: e.unit,
    memo: e.memo ?? null, videoUrl: null, order: e.order,
  })));
  console.log(`  ✅ ${exercises.length}건 완료\n`);

  // 4. GroupSessions
  const groupSessions = sqlite.prepare("SELECT * FROM GroupSession").all();
  console.log(`📋 GroupSession ${groupSessions.length}건 마이그레이션 중...`);
  await upsert("GroupSession", groupSessions.map(gs => ({
    id: gs.id, date: gs.date, title: gs.title ?? null,
    memo: gs.memo ?? null, participants: "{}",
    notionPageId: null, notionUrl: null,
    createdAt: new Date(gs.createdAt).toISOString(),
  })));
  console.log(`  ✅ ${groupSessions.length}건 완료\n`);

  // 5. GroupExercises
  const groupExercises = sqlite.prepare("SELECT * FROM GroupExercise").all();
  console.log(`📋 GroupExercise ${groupExercises.length}건 마이그레이션 중...`);
  await upsert("GroupExercise", groupExercises.map(ge => ({
    id: ge.id, groupSessionId: ge.groupSessionId, name: ge.name,
    sets: ge.sets ?? null, reps: ge.reps ?? null,
    weight: ge.weight ?? null, unit: ge.unit,
    memo: ge.memo ?? null, videoUrl: null, order: ge.order,
  })));
  console.log(`  ✅ ${groupExercises.length}건 완료\n`);

  // 6. MenstrualCycles
  const cycles = sqlite.prepare("SELECT * FROM MenstrualCycle").all();
  console.log(`📋 MenstrualCycle ${cycles.length}건 마이그레이션 중...`);
  await upsert("MenstrualCycle", cycles.map(mc => ({
    id: mc.id, clientId: mc.clientId, lastStartDate: mc.lastStartDate,
    cycleLength: mc.cycleLength, periodLength: mc.periodLength,
    memo: mc.memo ?? null, updatedAt: new Date(mc.updatedAt).toISOString(),
  })));
  console.log(`  ✅ ${cycles.length}건 완료\n`);

  // ID 시퀀스 재설정
  console.log("🔧 ID 시퀀스 재설정 중...");
  for (const t of ["Client","Session","Exercise","GroupSession","GroupExercise","MenstrualCycle"]) {
    await resetSeq(t);
  }
  console.log("  ✅ 완료\n");

  console.log("🎉 마이그레이션 완료!");
}

migrate()
  .catch((e) => { console.error("❌ 실패:", e.message); process.exit(1); })
  .finally(() => { sqlite.close(); pool.end(); });
