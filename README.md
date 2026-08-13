# 오늘의 틈 — Weather for Life

> 날씨 숫자를 보여주는 데서 끝나지 않고, 오늘을 언제·어디서·어떻게 보내면 좋을지 함께 제안하는 Vue 3 생활 날씨 서비스

`오늘의 틈`은 Vue 수업의 날씨 대시보드 실습을 바탕으로 직접 확장한 반응형 SPA입니다. GPS 현재 위치, 전국 17개 시·도 탐색, 시간대별 외출 플래너, 즐겨찾기 비교, 도시별 장소·음식·활동 추천을 하나의 흐름으로 연결했습니다.

외부 API가 느리거나 호출 제한(`429 Too Many Requests`)이 발생해도 화면이 멈추지 않도록 준비된 날씨 데이터로 자동 전환합니다.

## 주요 기능

- 브라우저 GPS를 가장 가까운 지원 도시와 연결하고 권한 거부 시 서울을 기본값으로 사용
- 현재 날씨, 시간별 활동 적합도, 5일 예보, 생활지수 제공
- 전국 17개 시·도 검색·필터·즐겨찾기 및 도시 간 비교
- 대한민국 일러스트 지도에서 지역을 선택하고 상세 페이지로 이동
- 도시와 날씨에 맞는 장소·음식·활동 추천
- 섭씨/화씨, 즐겨찾기, 준비물 체크 상태를 `localStorage`에 저장
- 데스크톱·태블릿·모바일 반응형 레이아웃과 키보드 포커스 지원

## 페이지

| 경로 | 화면 | 설명 |
| --- | --- | --- |
| `/` | 오늘 날씨 | GPS 날씨, 활동 추천, 시간별·주간 예보 |
| `/planner` | 오늘 플래너 | 외출 시간표, 준비물, 생활지수, 도시 비교 |
| `/cities` | 전국 도시 | 검색, 즐겨찾기 필터, 도시 날씨 카드 |
| `/map` | 전국 지도 | 지도 마커 선택과 지역 상세 패널 |
| `/weather/:cityId` | 도시 상세 | 장소·음식·활동 추천 |
| `/about` | 서비스 소개 | 서비스 가치, 데이터와 위치 권한 안내 |

존재하지 않는 경로는 `/`로 이동하며, 배포 환경에서 상세 URL을 직접 새로고침해도 SPA가 열리도록 설정했습니다.

## 수업 단원별 적용 및 커스터마이징

### 1. Vue 기본 문법과 Composition API

- `ref`로 선택 항목, 메뉴 열림처럼 하나의 UI 상태를 관리합니다.
- `reactive`로 도시 검색어와 즐겨찾기 범위처럼 함께 바뀌는 필터 값을 한 객체로 묶었습니다.
- `computed`로 검색 결과, 즐겨찾기 도시, 추천 시간, 생활지수를 원본 상태에서 파생합니다.
- `watch`로 선택 도시와 단위 변경을 감지해 저장 상태와 화면을 동기화합니다.
- `watchEffect`로 검색 조건처럼 여러 반응형 값에 의존하는 동작을 자동 추적합니다.
- 반복되는 날씨 화면 로직은 `src/components/weather/composables/useWeatherApplication.js`로 분리했습니다.

단순 예제의 온도·도시 목록에서 끝내지 않고 GPS 도시와 사용자가 탐색 중인 도시를 별도 상태로 관리해, 페이지를 이동해도 상단의 현재 위치가 바뀌지 않도록 확장했습니다.

### 2. 컴포넌트, Props, Emits, Slot

- `WeatherSearchBar.vue`: `modelValue`와 `resultCount`를 props로 받고 `update:modelValue`, `clear` 이벤트를 부모로 전달합니다.
- `WeatherCityCard.vue`: 도시 데이터를 props로 받아 표시하고 `select`, `toggle-favorite` 이벤트만 부모에 알립니다.
- `BaseDashboardCard.vue`: `controls`, 기본, `footer` named slot으로 재사용 가능한 카드 틀을 제공합니다.
- `WeatherSiteHeader.vue`: 모든 페이지가 공유하는 내비게이션과 모바일 메뉴를 담당합니다.
- 각 SFC의 표현 전용 스타일은 `scoped`로 제한하고 전역 디자인 토큰은 `src/assets/main.css`에서 관리합니다.

부모인 `WeatherCitiesView.vue`는 검색·즐겨찾기라는 업무 상태를 관리하고, 자식 컴포넌트는 표현과 사용자 이벤트에 집중하게 역할을 나눴습니다.

### 3. Vue Router

- `createWebHistory` 기반 SPA 라우팅
- 메인을 제외한 페이지 lazy loading
- `/weather/:cityId` 동적 라우트와 route param 사용
- catch-all 경로 처리와 페이지 이동 시 스크롤 초기화
- 공통 상단 메뉴의 `RouterLink`와 앱 루트의 `RouterView`

### 4. Pinia

`src/stores/weatherStore.js`에서 다음을 한 곳에서 관리합니다.

- state: GPS 위치, 선택 도시, 날씨 목록, 온도 단위, 즐겨찾기, 로딩·오류 상태
- getters: 선택 도시 정보, 즐겨찾기 도시 목록, 데이터 출처 문구
- actions: GPS 요청, 날씨 갱신, 도시 선택, 단위 변환, 즐겨찾기 토글
- `localStorage` 연동: 마지막 위치, 선택 도시, 단위, 즐겨찾기

페이지에서는 `storeToRefs()`를 사용해 구조 분해 후에도 반응성을 유지합니다.

### 5. Axios와 외부 API

- Axios로 Open-Meteo Forecast / Air Quality API를 선택적으로 호출합니다.
- 같은 좌표의 중복 요청을 합치고 10분 캐시를 적용했습니다.
- 요청을 순차 처리하고 `Retry-After` 또는 지수 백오프로 `429`를 제한적으로 재시도합니다.
- 공유 API 제한을 고려해 Open-Meteo는 기본 비활성화하며 실패 시 준비된 데이터로 전환합니다.
- 기상청 초단기실황은 로컬 Vite 프록시 또는 Vercel 서버리스 프록시를 통해 호출합니다.

### 6. 직접 추가한 기능

- Geolocation API와 최근 좌표 캐시
- 날씨 상태별 CSS 애니메이션과 구름 고양이 스프라이트
- 전국 도시 지도, 도시별 고유 일러스트와 여행 가이드 데이터
- 반응형 모바일 메뉴, 접근 가능한 버튼 이름과 `aria-pressed`
- API 장애 시에도 탐색 가능한 fallback 설계
- ESLint와 GitHub Actions를 이용한 자동 품질 검사

## 기술 스택

- Vue 3, Composition API, Single File Components
- Vue Router, Pinia
- Axios, Browser Geolocation API
- Vite 8, ESLint 9
- CSS Grid, Flexbox, animation, glassmorphism
- 기상청 단기예보 조회 서비스, Open-Meteo(선택)

## 실행 방법

### 요구 환경

- Node.js `20.19.0` 이상 또는 `22.12.0` 이상
- npm

```bash
npm install
cp .env.example .env.local
npm run dev
```

API 키 없이도 준비된 날씨 데이터로 모든 주요 화면을 확인할 수 있습니다.

### 로컬 환경 변수

`.env.local`은 Git에서 제외되며 로컬 개발에만 사용합니다.

```env
# 공공데이터포털 일반 인증키(Decoding), 선택 사항
VITE_KMA_SERVICE_KEY=

# 공유 API 호출이 필요할 때만 true
VITE_OPEN_METEO_ENABLED=false

# 로컬에서 별도 /api/kma 서버를 사용하는 경우만 true
VITE_KMA_PROXY_ENABLED=false
```

`VITE_`로 시작하는 값은 브라우저 번들에서 확인할 수 있으므로, 실제 배포에서는 기상청 키를 이 변수에 넣지 않습니다.

## 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run lint` | Vue·JavaScript 정적 검사, 경고도 실패 처리 |
| `npm run build` | `dist/` 프로덕션 번들 생성 |
| `npm run check` | lint 후 build까지 한 번에 검증 |
| `npm run preview` | 생성된 번들 로컬 미리보기 |

## 프로젝트 구조

```text
.
├── api/
│   └── kma.js                       # Vercel용 기상청 서버리스 프록시
├── public/
│   ├── korea-illustrated-map.png
│   └── og.png
├── src/
│   ├── assets/
│   │   ├── character/cloud-cat-sprite.png
│   │   ├── cities/                  # 17개 도시 일러스트
│   │   └── main.css                 # 전역 토큰과 공통 스타일
│   ├── components/weather/
│   │   ├── BaseDashboardCard.vue    # named slot 재사용 카드
│   │   ├── WeatherSearchBar.vue      # props + emits + v-model
│   │   ├── WeatherCityCard.vue       # props + 사용자 이벤트
│   │   ├── WeatherApplication.vue
│   │   ├── WeatherCharacter.vue
│   │   ├── WeatherSiteHeader.vue
│   │   ├── composables/useWeatherApplication.js
│   │   ├── data/                    # 도시와 추천 콘텐츠
│   │   ├── services/kmaWeather.js
│   │   └── utils/                   # 격자·날씨 코드 변환
│   ├── router/index.js
│   ├── stores/weatherStore.js
│   ├── views/                       # 6개 라우트 화면
│   ├── App.vue
│   └── main.js
├── .env.example
├── eslint.config.js
├── netlify.toml
├── vercel.json
└── vite.config.js
```

수업용 샘플·목업 파일과 사용하지 않는 이미지는 제출 대상에서 제거했습니다.

## 배포

### 권장: Vercel

1. 이 프로젝트를 Public GitHub 저장소에 push합니다.
2. Vercel에서 저장소를 Import합니다.
3. Framework Preset은 `Vite`, Build Command는 `npm run build`, Output Directory는 `dist`를 사용합니다.
4. 기상청 실시간 데이터가 필요하면 Vercel 프로젝트 환경 변수에 `KMA_SERVICE_KEY`를 추가합니다. 이름에 `VITE_`를 붙이지 않습니다.
5. 배포 후 `/`, `/cities`, `/weather/seoul`을 시크릿 창에서 직접 열고 새로고침합니다.

`api/kma.js`는 서버에서만 `KMA_SERVICE_KEY`를 읽습니다. `vercel.json`은 API와 정적 파일을 먼저 처리한 뒤 나머지 경로를 `index.html`로 보내므로 Vue Router의 상세 주소도 새로고침할 수 있습니다.

`netlify.toml`에도 SPA 새로고침 규칙이 들어 있습니다. 다만 현재 기상청 서버리스 프록시는 Vercel 형식이므로 Netlify 배포에서는 준비된 데이터가 표시됩니다.

### GitHub에 올리지 않는 파일

`.gitignore`로 다음 항목을 제외합니다.

- `node_modules/`, `dist/`, `coverage/`
- `.env`, `.env.local`, `.env.*.local`
- `.vercel/`, `.netlify/`
- `.DS_Store`, IDE 설정, 로그 파일

반드시 올려야 하는 파일은 `src/`, `public/`, `api/`, `package.json`, `package-lock.json`, 설정 파일, 이 README입니다.

## 데이터와 저장 정보

다음 값은 서버 데이터베이스가 아니라 사용자의 브라우저 `localStorage`에만 저장됩니다.

- 최근 GPS 좌표와 확인 시각
- 선택 도시와 온도 단위
- 즐겨찾기 도시
- 플래너 준비물 체크 상태

GPS를 가져오지 못하면 서울을 사용하며, 날씨 API에 실패하면 준비된 날씨를 사용합니다. 외부 API 장애가 내비게이션·도시 검색·추천 콘텐츠를 막지 않도록 설계했습니다.

## 문제 해결

### `429 Too Many Requests`

1. `.env.local`에서 `VITE_OPEN_METEO_ENABLED=false`로 설정합니다.
2. 개발 서버를 다시 시작합니다.
3. 브라우저를 새로고침합니다.

Open-Meteo를 꼭 사용할 때는 요청 캐시와 재시도가 적용되지만 공유 API 제한 자체를 없앨 수는 없습니다. 기본 설정에서는 준비된 날씨를 사용하므로 429 화면이 노출되지 않습니다.

### 기상청 데이터가 나오지 않음

- 로컬: `.env.local`의 `VITE_KMA_SERVICE_KEY`가 Decoding 키인지 확인합니다.
- Vercel: 프로젝트 환경 변수 이름이 `KMA_SERVICE_KEY`인지 확인하고 재배포합니다.
- 키가 없어도 오류 화면 대신 준비된 날씨가 표시되는 것이 정상입니다.

### GPS가 서울로 표시됨

주소창 옆 위치 권한과 운영체제 위치 서비스를 허용한 뒤 상단의 위치 버튼을 누릅니다. 좌표는 가장 가까운 지원 도시로 표시되므로 실제 행정구역과 약간 다를 수 있습니다.

## 검증 상태

- ✅ ESLint 검사 통과
- ✅ 프로덕션 빌드 통과
- ✅ 환경 변수 및 API 키 Git 제외
- ✅ 반응형 레이아웃 적용
- ✅ GitHub Actions 품질 검사 구성

---

날씨와 하루 사이, 좋은 틈을 여는 생활 날씨 서비스 **오늘의 틈**
