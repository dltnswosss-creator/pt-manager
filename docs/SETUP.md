# 로컬 개발 셋업

## 사전 준비

- Node.js 20+
- npm 10+
- Supabase 계정 + 프로젝트
- Notion 계정 + Integration

---

## 1. 저장소 클론 및 패키지 설치

```bash
cd "pt manager/pt-manager"
npm install
```

---

## 2. 환경변수 설정

`.env` 파일을 루트에 생성하고 아래 값을 채웁니다.

```env
# Supabase PostgreSQL (Transaction Pooler - 앱 쿼리용)
DATABASE_URL="postgresql://postgres.프로젝트ID:비밀번호@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"

# Supabase PostgreSQL (Session Pooler - Prisma 마이그레이션용)
DIRECT_URL="postgresql://postgres.프로젝트ID:비밀번호@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="https://프로젝트ID.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Notion
NOTION_API_KEY="ntn_..."
NOTION_PARENT_PAGE_ID="32자리 페이지 ID"
```

### 값 찾는 위치

| 변수 | 위치 |
|---|---|
| DATABASE_URL | Supabase Dashboard → 프로젝트 메인 → Connect 버튼 → Transaction pooler |
| NEXT_PUBLIC_SUPABASE_URL | Supabase → Settings → API → Project URL |
| SUPABASE_SERVICE_ROLE_KEY | Supabase → Settings → API → service_role → Reveal |
| NOTION_API_KEY | notion.so/my-integrations → Integration → Internal Integration Secret |
| NOTION_PARENT_PAGE_ID | Notion 페이지 URL 마지막 32자리 |

> **주의**: 비밀번호에 `@` 가 포함된 경우 `%40` 으로 URL 인코딩 필요
> 예: `password@@!` → `password%40%40!`

---

## 3. Supabase Storage 버킷 생성

```bash
npx dotenv-cli -e .env -- node scripts/create-bucket.mjs
```

`exercise-videos` 버킷이 생성됩니다 (Public, 50MB 제한).

---

## 4. Prisma 마이그레이션 및 클라이언트 생성

```bash
# DB 테이블 생성
npx dotenv-cli -e .env -- npx prisma migrate dev --name init

# Prisma 클라이언트 생성
npx dotenv-cli -e .env -- npx prisma generate
```

---

## 5. Notion 연결 테스트

```bash
npx dotenv-cli -e .env -- node scripts/test-notion.mjs
```

`✅ Notion 연결 성공!` 이 출력되면 정상입니다.

---

## 6. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

---

## 기존 SQLite 데이터 이전 (선택)

이전에 로컬 SQLite로 데이터를 쌓았다면 Supabase로 이전합니다.

```bash
# better-sqlite3 임시 설치
npm install --no-save better-sqlite3

# 이전 실행
npx dotenv-cli -e .env -- node scripts/migrate-to-supabase.mjs
```

---

## DB 스키마 주요 모델

```
Client          회원 정보 (인적사항, 병력, 생활습관)
Session         1:1 수업 기록
Exercise        수업별 운동 (세트/횟수/중량/영상URL)
MenstrualCycle  여성 회원 생리주기 정보
```
