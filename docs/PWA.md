# PWA 설치 가이드

PT Manager는 PWA(Progressive Web App)로 제작되어 앱스토어 없이 홈 화면에 설치할 수 있습니다.

---

## 아이폰 / 아이패드 설치 (Safari)

1. **Safari**에서 https://pt-manager-two.vercel.app 접속
2. 하단 **공유 버튼 (□↑)** 탭
3. **"홈 화면에 추가"** 선택
4. 이름 확인 후 **"추가"**

설치 후 홈 화면에서 아이콘을 탭하면 주소창 없는 전체화면 앱으로 실행됩니다.

> **참고**: iOS Safari에서만 지원. Chrome(iOS)에서는 설치 불가.

---

## 안드로이드 설치 (Chrome)

1. **Chrome**에서 https://pt-manager-two.vercel.app 접속
2. 우상단 **⋮ 메뉴** 탭
3. **"앱 설치"** 또는 **"홈 화면에 추가"** 선택
4. **"설치"** 확인

앱 서랍에 아이콘이 생기고 네이티브 앱처럼 실행됩니다.

---

## PWA 기술 구성

```
public/
├── manifest.json          앱 이름, 아이콘, 테마색 정의
├── apple-touch-icon.png   iOS 홈화면 아이콘 (180×180)
└── icons/
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png       Android 기본 아이콘
    ├── icon-384.png
    └── icon-512.png       Android 스플래시 아이콘
```

`app/layout.tsx`에 아래 메타태그 포함:
```html
<link rel="manifest" href="/manifest.json" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="theme-color" content="#4f46e5" />
```

---

## 아이콘 교체 방법

현재 아이콘은 단색(인디고 #4f46e5)입니다. 브랜드 아이콘으로 교체하려면:

### 자동 생성 (권장)
1. https://www.pwabuilder.com/imageGenerator 접속
2. 원하는 이미지(512×512 PNG) 업로드
3. 모든 사이즈 자동 생성 후 다운로드
4. `public/icons/` 폴더에 덮어쓰기
5. `public/apple-touch-icon.png` 교체 (180×180)
6. `npx vercel --prod --yes` 로 재배포

### 수동 생성
```bash
node scripts/generate-icons.mjs
```
스크립트 내 RGB 값을 수정하면 색상 변경 가능:
```js
// scripts/generate-icons.mjs
raw[off] = 79;   // R (인디고)
raw[off + 1] = 70;  // G
raw[off + 2] = 229; // B
```

---

## manifest.json 주요 설정

```json
{
  "name": "PT Manager",
  "short_name": "PT Manager",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f9fafb",
  "theme_color": "#4f46e5",
  "orientation": "portrait-primary"
}
```

- `display: "standalone"` → 주소창 없는 전체화면 실행
- `orientation: "portrait-primary"` → 세로 모드 고정
- `theme_color` → 상단 상태바 색상 (현재 인디고)
