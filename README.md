# PT Manager

퍼스널 트레이너를 위한 회원 관리 + 수업 일지 자동 공유 시스템

**배포 주소:** https://pt-manager-two.vercel.app

---

## 배포 대기 중인 변경 (2026-11-11)

`master`에 아래 두 커밋이 올라가 있지만 **아직 운영에 배포되지 않았습니다.**
이 프로젝트는 GitHub에 푸시해도 자동 배포되지 않으므로, Vercel 프로젝트(`pt-manager`) 권한이 있는 계정으로 직접 배포해야 합니다.

- `6d2a7e6` 수업 녹음 → AI 수업 기록 작성 기능
- `058b537` 토스 스타일 리디자인

### 배포 순서

```bash
# 1. 최신 코드 받기
git pull origin master
npm install

# 2. 환경변수 추가 (Production)
npx vercel env add SONIOX_API_KEY production      # 필수: 새로 추가
npx vercel env ls production                      # OPENAI_API_KEY가 있는지 확인 (없으면 추가)
# 선택: 수업 기록 정리에 쓸 OpenAI 모델 (없으면 gpt-4o-mini)
# npx vercel env add OPENAI_SESSION_MODEL production

# 3. 배포
npx vercel --prod --yes
```

| 환경변수 | 필요 | 설명 |
|---|---|---|
| `SONIOX_API_KEY` | **새로 추가 (필수)** | 수업 녹음 실시간 음성 인식. [console.soniox.com](https://console.soniox.com)에서 발급하며, **Temporary API keys 권한**이 있어야 함 |
| `OPENAI_API_KEY` | 기존 값 사용 | 인바디 사진 분석 + 녹음 내용 → 수업 기록 정리 |
| `OPENAI_SESSION_MODEL` | 선택 | 기본값 `gpt-4o-mini` |

- 환경변수는 추가만 해서는 반영되지 않으니 3번(재배포)까지 해야 합니다.
- 빌드 중 `prisma migrate deploy`가 실행되어 운영 DB에 `Session.transcript` 컬럼(nullable)이 추가됩니다. 기존 데이터에는 영향 없습니다.
- 배포 후 휴대폰에서 오른쪽 아래 파란 마이크 버튼 → 버튼을 누른 채로 말해서 문장이 쌓이면 정상입니다.

배포를 마치면 이 섹션은 지워 주세요.

---

## 주요 기능

### 회원 관리
- 회원 등록 / 수정 / 삭제
- 기본 정보: 이름, 성별, 생년월일, 연락처, 직업, PT 시작일, 목표
- 건강 정보: 병력, 통증 부위 (주의/관찰/금지), 복용 약물
- 생활 습관: 식사 횟수/패턴, 수면 시간
- 운동 경험 레벨 (초보/중급/상급)
- **여성 회원 생리주기 추적** → 현재 위상(생리기/여포기/배란기/황체기) 및 운동 가이드

### 1:1 수업 기록
- 회원 선택, 날짜, 수업 시간
- 운동별 세트 / 횟수 / 중량 / 메모 입력 (카드형 UI)
- 운동명 자동완성 (30종 내장)
- 운동별 영상 첨부 (카메라롤 또는 파일, 50MB 이하)
- 저장 시 **Notion 수업 일지 자동 생성** + 링크 즉시 복사

### Notion 자동 공유
- 수업 저장 즉시 Notion 페이지 자동 생성
- 운동별 영상 → Notion 비디오 블록으로 삽입
- 저장 완료 화면에서 링크 복사 → 카카오톡 전송

### 반응형 UI + PWA
- 모바일 / 아이패드: 하단 탭 네비게이션
- 노트북 / 데스크탑: 왼쪽 사이드바
- 홈 화면에 앱으로 설치 가능 (PWA)

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS v4 |
| ORM | Prisma 7 (adapter-pg) |
| 데이터베이스 | Supabase (PostgreSQL) |
| 영상 저장 | Supabase Storage |
| 외부 연동 | Notion API |
| 배포 | Vercel |

---

## 프로젝트 구조

```
pt-manager/
├── app/
│   ├── api/
│   │   ├── clients/           회원 CRUD
│   │   ├── sessions/          1:1 수업 CRUD + Notion 자동생성
│   │   ├── upload/video/      Supabase Storage 영상 업로드
│   │   └── diagnose/          연결 진단 엔드포인트
│   ├── clients/               회원 관리 페이지
│   ├── sessions/              1:1 수업 페이지
│   └── layout.tsx             공통 레이아웃 (PWA 메타태그)
├── components/
│   ├── Sidebar.tsx            데스크탑 사이드바 + 모바일 하단 탭
│   ├── SessionForm.tsx        1:1 수업 입력 폼
│   └── ClientDetail.tsx       회원 상세 (인적사항/수업기록/생리주기)
├── lib/
│   ├── prisma.ts              Prisma 클라이언트 (pg 어댑터)
│   ├── notion.ts              Notion 페이지 자동 생성 로직
│   ├── types.ts               생리주기, 통증, 운동 타입 정의
│   └── utils.ts               날짜, 나이 계산 유틸
├── prisma/schema.prisma       DB 스키마
├── public/
│   ├── manifest.json          PWA 매니페스트
│   └── icons/                 앱 아이콘 (72~512px)
└── scripts/
    ├── migrate-to-supabase.mjs   SQLite → Supabase 데이터 이전
    ├── create-bucket.mjs         Supabase Storage 버킷 생성
    ├── generate-icons.mjs        PWA 아이콘 생성
    └── test-notion.mjs           Notion 연결 테스트
```

---

## 문서

- [로컬 개발 셋업](docs/SETUP.md)
- [배포 가이드](docs/DEPLOYMENT.md)
- [PWA 설치 방법](docs/PWA.md)
