# 배포 가이드

## 아키텍처

```
[트레이너 폰/PC]
      ↓ HTTPS
[Vercel (Next.js)]
      ↓ PostgreSQL
[Supabase DB]     ← 회원/수업 데이터
[Supabase Storage] ← 운동 영상 파일
[Notion API]       ← 수업 일지 페이지 자동 생성
```

---

## Supabase 설정

### 1. 프로젝트 생성
- supabase.com → New project
- 리전: Northeast Asia (ap-northeast-1) 권장
- 비밀번호 기록 (DATABASE_URL에 사용)

### 2. Storage 버킷 생성
Supabase Dashboard → Storage → New bucket
- 이름: `exercise-videos`
- Public: ON
- 파일 크기 제한: 50MB

또는 스크립트로 자동 생성:
```bash
npx dotenv-cli -e .env -- node scripts/create-bucket.mjs
```

### 3. DB 테이블 생성
```bash
npx dotenv-cli -e .env -- npx prisma migrate deploy
```

---

## Notion 설정

### 1. Integration 생성
1. notion.so/my-integrations 접속
2. + New integration 클릭
3. 이름: `PT Manager`, 유형: Internal
4. Internal Integration Secret 복사 → `NOTION_API_KEY`

### 2. 수업 일지 페이지 설정
1. Notion에서 "PT 수업 일지" 페이지 생성
2. 페이지 우상단 `···` → 연결 → PT Manager 연결
3. 페이지 URL 마지막 32자리 복사 → `NOTION_PARENT_PAGE_ID`

### 3. 연결 테스트
```bash
npx dotenv-cli -e .env -- node scripts/test-notion.mjs
```

---

## Vercel 배포

### 1. Vercel CLI 설치 확인
```bash
npx vercel --version
```

### 2. 로그인
```bash
npx vercel login
# 브라우저에서 인증
```

### 3. 환경변수 등록 (BOM 없이)

> **중요**: PowerShell에서 파이프(`|`)로 값을 전달하면 UTF-8 BOM이 붙어서 연결 오류 발생.
> 반드시 아래 방식 사용.

```powershell
$noBomUtf8 = New-Object System.Text.UTF8Encoding $false
$tmpFile = "$env:TEMP\venv_val.txt"

$vars = [ordered]@{
  "DATABASE_URL"              = "postgresql://..."
  "DIRECT_URL"                = "postgresql://..."
  "NEXT_PUBLIC_SUPABASE_URL"  = "https://xxx.supabase.co"
  "SUPABASE_SERVICE_ROLE_KEY" = "eyJ..."
  "NOTION_API_KEY"            = "ntn_..."
  "NOTION_PARENT_PAGE_ID"     = "32자리ID"
}

foreach ($k in $vars.Keys) {
  node -e "require('fs').writeFileSync(process.argv[1], process.argv[2], 'utf8')" $tmpFile $vars[$k]
  cmd /c "npx vercel env add $k production < `"$tmpFile`""
  Write-Host "✅ $k"
}
Remove-Item $tmpFile
```

### 4. 배포

```bash
npx vercel --prod --yes
```

### 5. 환경변수 확인

```bash
npx vercel env ls production
```

---

## 재배포 (코드 변경 후)

```bash
npx vercel --prod --yes
```

---

## 주요 트러블슈팅

### P1001 DatabaseNotReachable
- 원인 1: DATABASE_URL에 BOM 문자 포함 (ï»¿ prefix)
  - 해결: 위의 Node.js + cmd 방식으로 환경변수 재등록
- 원인 2: 빌드 타임에 DB 조회 (정적 페이지 생성)
  - 해결: DB 조회 페이지에 `export const dynamic = "force-dynamic"` 추가

### Notion 연결 실패 (object_not_found)
- 원인: Notion 페이지에 Integration 연결 안 됨
- 해결: 페이지 `···` → 연결 → PT Manager 선택

### Prisma 마이그레이션 실패 (migration_lock mismatch)
- 원인: SQLite → PostgreSQL 전환 시 기존 마이그레이션 이력 충돌
- 해결: `prisma/migrations` 폴더 삭제 후 `prisma migrate dev --name init` 재실행

### Prisma schema url 오류 (P1012)
- 원인: Prisma 7에서 schema.prisma의 datasource에 `url` 필드 미지원
- 해결: schema.prisma에서 `url`/`directUrl` 제거, prisma.config.ts에서 관리
